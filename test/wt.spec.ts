import QS from "qs";
import { omit } from "lodash";
import {
  withContext,
  SEND_COMPLETED,
  WTPayload,
  WTContext,
  PAGE_UUID_KEY,
} from "../src/wt";

import { debounce, uuid } from "../src/utils";
import Cookies from "js-cookie";

const LOAD_WAIT = 10;
const BUFFER = 10;
const DEBOUNCE_MIN_DEFAULT = 1;

const HREF = "https://www.test.url/test-path?hello=world&hi=mom";

let loggedEvents: string[] = [];

class MockImage {
  _url: string | undefined;
  _to: ReturnType<typeof setTimeout>;
  onerror: undefined | (() => void);
  onload: undefined | (() => void);

  get src() {
    return this._url;
  }
  set src(url) {
    if (url === this._url) {
      return;
    }
    clearTimeout(this._to);
    this._to = setTimeout(() => {
      loggedEvents.push(url);
      const query = url.split("?").pop();
      const parsed = QS.parse(query) as unknown as WTPayload;
      if (parsed.events.some((e) => e.metadata.error)) {
        if (this.onerror) {
          this.onerror();
        }
        return;
      }
      if (this.onload) {
        this.onload();
      }
    }, LOAD_WAIT);
    this._url = url;
  }
}

const context = {
  location: {
    hostname: "www.test.url",
    href: HREF,
    search: "wvt=testvisitortoken",
  },
  innerWidth: 0,
  innerHeight: 0,
  document: {
    referrer: "test",
  },
  navigator: {
    userAgent: "test agent",
  },
  Image: MockImage,
} as unknown as WTContext;

let wt = withContext(context);

const parseLoggedEvents = () => {
  const parsedEvents = loggedEvents.map(
    (url) => QS.parse(url.split("?").pop()) as unknown as WTPayload
  );
  const withoutTs = parsedEvents.map((parsedEvent) =>
    omit(
      {
        ...parsedEvent,
        events: parsedEvent.events.map((p) => omit(p, ["ts"])),
      },
      ["rts"]
    )
  );
  return withoutTs
    .map((e) => e.events)
    .reduce(
      (memo, arr) => (Array.isArray(arr) ? [...memo, ...arr] : [...memo, arr]),
      []
    );
};

const waitFor = (time) => new Promise((resolve) => setTimeout(resolve, time));

function runEvents(events, cb, timeOffset = 0) {
  setTimeout(() => {
    events.forEach((event) => wt.track("event", event));
    setTimeout(() => {
      cb(parseLoggedEvents());
    }, LOAD_WAIT + DEBOUNCE_MIN_DEFAULT + BUFFER + timeOffset / 2);
  }, timeOffset / 2);
}

// TODO: Rewrite specs to use fetch (this falls back to the image loader)
global.fetch = jest.fn(() =>
  Promise.reject()
) as unknown as typeof window.fetch;

describe("wt-tracker.", () => {
  const pageUuid = uuid();

  beforeEach(() => {
    loggedEvents = [];
    Cookies.set(PAGE_UUID_KEY, pageUuid);
    wt = withContext(context);
    wt.initialize({
      trackerUrl: "pixel.test.url/pixel.gif",
      stringifyOptions: {},
      debounce: {
        min: DEBOUNCE_MIN_DEFAULT,
      },
    });
    wt.clear();
  });

  it("should load without error", (done) => {
    wt.track("test", { hello: "world" });
    setTimeout(done, LOAD_WAIT + DEBOUNCE_MIN_DEFAULT + BUFFER);
  });

  it("should log one call", (done) => {
    const events = [{ hello: "world", url: HREF }];
    runEvents(events, (result) => {
      expect(result).toEqual([
        {
          kind: "event",
          metadata: {
            hello: "world",
            url: HREF,
          },
          page_uuid: pageUuid,
          referrer: "test",
          url: HREF,
        },
      ]);
      done();
    });
  });

  it("should hit the event emitter", (done) => {
    const events = [{ hello: "world", url: HREF }];
    let touched = false;
    const unsub = wt.subscribe(SEND_COMPLETED, () => {
      touched = true;
    });
    runEvents(events, () => {
      expect(touched).toBe(true);
      unsub();
      done();
    });
  });

  it("should respect unsub", (done) => {
    const events = [{ hello: "world", url: HREF }];
    let touched = false;
    const unsub = wt.subscribe(SEND_COMPLETED, () => {
      touched = true;
    });
    unsub();
    runEvents(events, () => {
      expect(touched).toBe(false);
      done();
    });
  });

  it("should enqueue calls while networking", () => {
    const events = [{ hello: "world", url: HREF }];
    events.forEach((event) => wt.track("event", event));
    wt.flush();
    // now loading
    return waitFor(LOAD_WAIT - 1)
      .then(() => {
        events.forEach((event) => wt.track("event", event));
      })
      .then(() => waitFor(1 + LOAD_WAIT + BUFFER + DEBOUNCE_MIN_DEFAULT))
      .then(() => {
        const parsedEvents = parseLoggedEvents();
        expect(parsedEvents).toEqual([
          {
            kind: "event",
            metadata: {
              hello: "world",
              url: HREF,
            },
            page_uuid: pageUuid,
            referrer: "test",
            url: HREF,
          },
          {
            kind: "event",
            metadata: {
              hello: "world",
              url: HREF,
            },
            page_uuid: pageUuid,
            referrer: "test",
            url: HREF,
          },
        ]);
      });
  });

  it("should override metadata defaults with event data", (done) => {
    const events = [
      { pageName: "Account", direction: "up" },
      { objectName: "Box", objectType: "Button", meta: "new" },
    ];

    wt.set({ meta: "default", page_name: "Settings" });

    runEvents(events, (result) => {
      expect(result).toEqual([
        {
          kind: "event",
          page_name: "Account",
          metadata: {
            direction: "up",
            meta: "default",
            page_name: "Settings",
          },
          url: HREF,
          page_uuid: pageUuid,
          referrer: "test",
        },
        {
          kind: "event",
          object_name: "Box",
          object_type: "Button",
          metadata: {
            meta: "new",
            page_name: "Settings",
          },
          url: HREF,
          page_uuid: pageUuid,
          referrer: "test",
        },
      ]);
      done();
    });
  });

  it("should handle errors", (done) => {
    const events = [{ error: true }];

    runEvents(events, () => {
      expect(wt.loading).toBe(false);
      done();
    });
  });

  /* eslint-disable no-shadow */

  it("should not double load", (done) => {
    const wt = withContext(context);

    wt["sendToServer"] = () => waitFor(100);
    const events = [];
    for (let i = 0; i < 1000; i++) {
      events.push({ hello: "world", url: HREF });
    }
    events.forEach((event) => wt.track("event", event));
    wt.flush();
    setTimeout(() => {
      const eventQueueLength = wt["eventQueue"].length;
      wt["processEvents"]();
      expect(eventQueueLength).toEqual(wt["eventQueue"].length);
      done();
    }, 1);
  });

  it("should process an empty queue", (done) => {
    const wt = withContext(context);

    wt["sendToServer"] = () => waitFor(1);
    const events = [];
    for (let i = 0; i < 10; i++) {
      events.push({ hello: "world", url: HREF });
    }
    events.forEach((event) => wt.track("event", event));
    wt.flush();
    setTimeout(() => {
      wt["sendToServer"] = () => {
        throw new Error("Should not call");
      };
      wt["processEvents"]();
      setTimeout(() => done(), 100);
    }, 100);
  });

  /* eslint-enable no-shadow */

  it("should update config", () => {
    const config = { trackerUrl: "https://google.com" };
    wt.config(config);

    expect(wt["wtConfig"].trackerUrl).toEqual(config.trackerUrl);
  });

  it("should guess root url based on context", () => {
    wt.initialize({
      trackerDomain: null,
      trackerUrl: null,
    });
    let root = wt["getRoot"]();
    expect(root).toEqual(`//${context.location.hostname}`);

    let url = wt["getUrl"]();
    expect(url).toEqual(`//${context.location.hostname}/track.gif`);

    const trackerDomain = "test.domain.com";
    wt.initialize({ trackerDomain });
    root = wt["getRoot"]();
    expect(root).toEqual(trackerDomain);
  });

  it("should update defaults with a function", () => {
    const paramDefaults = { userId: "1" };
    wt.set(() => paramDefaults);
    expect(paramDefaults).toEqual(wt["paramDefaults"]);
  });

  it("should have uuid set for event", () => {
    const currentConfig = wt["wtConfig"];
    currentConfig.cookies = {};
    wt.initialize(currentConfig);
    wt.track("pageview");
    const events = wt["eventQueue"];
    expect(events[0].page_uuid).toMatch(/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/);
    wt.track("event");
    expect(events[1].page_uuid).toMatch(/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/);
  });
});

// TODO: write test to check cookie is properly set for wt_visitor_token and wt_page_uuid;
describe("wt-visitor-token", () => {
  it("should favor the visitor token in the query string", () => {
    const qs = QS.parse(context.location.search);
    const wvt = qs.wvt;

    expect(wt.getVisitorToken()).toBe(wvt);
  });
});

describe("utils.debounce", () => {
  it("debounce should work", (done) => {
    let flipped = false;
    const flipTrue = () => {
      flipped = true;
    };
    const debouncedFlip = debounce(flipTrue, DEBOUNCE_MIN_DEFAULT);
    debouncedFlip();
    setTimeout(() => {
      expect(flipped).toBe(true);
      done();
    }, DEBOUNCE_MIN_DEFAULT + 1);
  });

  it("debounce flush should work", (done) => {
    let flipped = false;
    const flipTrue = () => {
      flipped = true;
    };
    const debouncedFlip = debounce(flipTrue, DEBOUNCE_MIN_DEFAULT);
    debouncedFlip();
    debouncedFlip.flush();
    setTimeout(() => {
      expect(flipped).toBe(true);
      done();
    }, 1);
  });

  it("debounce flush should not work with clear", (done) => {
    let flipped = false;
    const flipTrue = () => {
      flipped = true;
    };
    const debouncedFlip = debounce(flipTrue, DEBOUNCE_MIN_DEFAULT);
    debouncedFlip();
    debouncedFlip.clear();
    debouncedFlip.flush();
    setTimeout(() => {
      expect(flipped).toBe(false);
      done();
    }, 1);
  });
});
