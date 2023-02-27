import {
  withContext,
  SEND_COMPLETED,
  WTPayload,
  WTContext,
  PAGE_UUID_KEY,
  WTEventParams,
} from '../src/client';

import { uuid } from '../src/utils';
import Cookies from 'js-cookie';

const LOAD_WAIT = 10;
const BUFFER = 10;
const DEBOUNCE_MIN_DEFAULT = 1;

const HREF = 'https://www.test.url/test-path?hello=world&hi=mom';

const fetch = jest.fn<{}, [string, { body: string }]>(async (url, { body }) => {
  if (typeof body !== 'string') throw new Error('Invalid request body');
  lastPayload = JSON.parse(body);
  loggedEvents.push(...lastPayload!.events);
  if (lastPayload!.events.some((e) => e.metadata?.error)) {
    throw new Error('Event with error!');
  }
  return Promise.resolve({ ok: true } as any);
});

let loggedEvents: WTPayload['events'] = [];
let lastPayload: WTPayload;

const context: WTContext = {
  location: {
    hostname: 'www.test.url',
    href: HREF,
    search: 'wvt=testvisitortoken',
  },
  innerWidth: 0,
  innerHeight: 0,
  document: {
    referrer: 'test',
  },
  navigator: {
    userAgent: 'test agent',
  },
  fetch: fetch as any,
};

let wt = withContext(context);

const parseLoggedEvents = () => {
  return loggedEvents.flat().map(({ ts, ...rest }) => rest);
};

const waitFor = (time) => new Promise((resolve) => setTimeout(resolve, time));

function runEvents(events, cb) {
  events.forEach((event: string | WTEventParams) => wt.track(event));
  setTimeout(() => {
    cb(parseLoggedEvents());
  }, LOAD_WAIT + DEBOUNCE_MIN_DEFAULT + BUFFER);
}

describe('wt-tracker.', () => {
  const pageUuid = uuid();

  beforeEach(() => {
    loggedEvents = [];
    Cookies.set(PAGE_UUID_KEY, pageUuid);
    wt = withContext(context);
    wt.initialize({
      trackerDomain: 'pixel.test.com',
      debounce: {
        min: DEBOUNCE_MIN_DEFAULT,
      },
    });
    wt.clear();
  });

  it('should load without error', (done) => {
    wt.track({ objectName: 'world' });
    setTimeout(done, LOAD_WAIT + DEBOUNCE_MIN_DEFAULT + BUFFER);
  });

  it('works with event params as a hash', (done) => {
    const events: WTEventParams[] = [{ objectName: 'world' }];
    runEvents(events, (result) => {
      expect(result).toEqual([
        {
          kind: 'event',
          object_name: 'world',
          page_uuid: pageUuid,
          referrer: 'test',
          url: HREF,
        },
      ]);
      done();
    });
  });

  it('works with only event kind', (done) => {
    const events = ['pageview'];
    runEvents(events, (result) => {
      expect(result).toEqual([
        {
          kind: 'pageview',
          page_uuid: pageUuid,
          referrer: 'test',
          url: HREF,
        },
      ]);
      done();
    });
  });

  it('should hit the event emitter', (done) => {
    const events = [{ hello: 'world', url: HREF }];
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

  it('should respect unsub', (done) => {
    const events = [{ hello: 'world', url: HREF }];
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

  it('should enqueue calls while networking', () => {
    const events = [{ objectName: 'world' }];
    events.forEach((event) => wt.track(event));
    wt.flush();
    // now loading
    return waitFor(LOAD_WAIT - 1)
      .then(() => {
        events.forEach((event) => wt.track(event));
      })
      .then(() => waitFor(1 + LOAD_WAIT + BUFFER + DEBOUNCE_MIN_DEFAULT))
      .then(() => {
        const parsedEvents = parseLoggedEvents();
        expect(parsedEvents).toEqual([
          {
            kind: 'event',
            object_name: 'world',
            page_uuid: pageUuid,
            referrer: 'test',
            url: HREF,
          },
          {
            kind: 'event',
            object_name: 'world',
            page_uuid: pageUuid,
            referrer: 'test',
            url: HREF,
          },
        ]);
      });
  });

  it('should override metadata defaults with event data', (done) => {
    const events: WTEventParams[] = [
      { pageName: 'Account', metadata: { user_id: 1 } },
      { objectName: 'Box', objectType: 'Button' },
    ];

    wt.set({ pageName: 'Settings', metadata: { user_id: 2 } });

    runEvents(events, (result) => {
      expect(result).toEqual([
        {
          kind: 'event',
          page_name: 'Account',
          metadata: {
            user_id: 1,
          },
          url: HREF,
          page_uuid: pageUuid,
          referrer: 'test',
        },
        {
          kind: 'event',
          object_name: 'Box',
          object_type: 'Button',
          page_name: 'Settings',
          metadata: {
            user_id: 2,
          },
          url: HREF,
          page_uuid: pageUuid,
          referrer: 'test',
        },
      ]);
      done();
    });
  });

  it('should handle errors', (done) => {
    const events = [{ error: true }];

    runEvents(events, () => {
      expect(wt.loading).toBe(false);
      done();
    });
  });

  /* eslint-disable no-shadow */

  it('should not double load', (done) => {
    const wt = withContext(context);

    wt['sendToServer'] = () => waitFor(100);
    const events: WTEventParams[] = [];
    for (let i = 0; i < 1000; i++) {
      events.push({ objectName: 'world' });
    }
    events.forEach((event) => wt.track(event));
    wt.flush();
    setTimeout(() => {
      const eventQueueLength = wt['eventQueue'].length;
      wt['processEvents']();
      expect(eventQueueLength).toEqual(wt['eventQueue'].length);
      done();
    }, 1);
  });

  it('should process an empty queue', (done) => {
    const wt = withContext(context);

    wt['sendToServer'] = () => waitFor(1);
    const events: WTEventParams[] = [];
    for (let i = 0; i < 10; i++) {
      events.push({ objectName: 'world' });
    }
    events.forEach((event) => wt.track(event));
    wt.flush();
    setTimeout(() => {
      wt['sendToServer'] = () => {
        throw new Error('Should not call');
      };
      wt['processEvents']();
      setTimeout(() => done(), 100);
    }, 100);
  });

  /* eslint-enable no-shadow */

  it('should update config', () => {
    const config = { trackerDomain: 'https://google.com' };
    wt.config(config);

    expect(wt['wtConfig'].trackerDomain).toEqual(config.trackerDomain);
  });

  it('should guess root url based on context', () => {
    wt.initialize({
      trackerDomain: undefined,
    });
    let root = wt['getRoot']();
    expect(root).toEqual(`//${context.location.hostname}`);
    const trackerDomain = 'test.domain.com';
    wt.initialize({ trackerDomain });
    root = wt['getRoot']();
    expect(root).toEqual(trackerDomain);
  });

  it('should update defaults with a function', () => {
    const paramDefaults = { metadata: { userId: '1' } };
    wt.set(paramDefaults);
    expect(paramDefaults).toEqual(wt['paramDefaults']);
  });

  it('should have uuid set for event', () => {
    const currentConfig = wt['wtConfig'];
    currentConfig.cookieOptions = {};
    wt.initialize(currentConfig);
    wt.track('pageview');
    const events = wt['eventQueue'];
    expect(events[0].page_uuid).toMatch(/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/);
    wt.track('event');
    expect(events[1].page_uuid).toMatch(/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/);
  });

  it('sends the visitor token if provided via config', () => {
    wt.config({ visitorToken: 'new_token' });
    wt.track('pageload');
    wt.flush();
    expect(JSON.parse(fetch.mock.calls[0][1].body).visitor_token).toBe(
      'new_token'
    );
  });
});

// TODO: write test to check cookie is properly set for wt_visitor_token and wt_page_uuid;
describe('wt-visitor-token', () => {
  it('favors the visitor token in the query string', () => {
    const wt = withContext(context);
    expect(wt.getVisitorToken()).toBe('testvisitortoken');
  });

  it('favors the visitor token provided via config', () => {
    const wt = withContext(context);
    wt.config({ visitorToken: 'a_new_visitor_token' });

    expect(wt.getVisitorToken()).toBe('a_new_visitor_token');
  });
});
