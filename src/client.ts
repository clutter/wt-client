import QS from "qs";
import Cookie from "js-cookie";
import EventEmitter from "events";
import { debounce, isFunction, omitBy, isNil, uuid } from "./utils";

const DEBOUNCE_MIN_DEFAULT = 500;
const DEBOUNCE_MAX_DEFAULT = 1500;

const DEFAULT_STRINGIFY_OPTIONS = {
  arrayFormat: "brackets",
  skipNulls: true,
  encode: true,
} as const;

// global constants
const BATCH_MAX = 100;
const EXPIRES_IN_DAYS = 7300; // Expires in 20 years

function resolveMethod<V>(val: V | ((...a: any[]) => V), ...args: any[]) {
  return isFunction(val) ? val(...args) : val;
}

export const SEND_STARTED = "send:started";
export const SEND_COMPLETED = "send:completed";
export const QUEUE_COMPLETED = "queue:completed";
export const QUEUE_CONTINUED = "queue:continued";

export const VISITOR_TOKEN_KEY = "wt_visitor_token";
export const PAGE_UUID_KEY = "wt_page_uuid";

function retrieveFromCookie(key: string, config: Cookie.CookieAttributes = {}) {
  let token = Cookie.get(key);
  if (!token) {
    token = uuid();
    Cookie.set(key, token, config);
  }
  return token;
}

const retrieveFromQueryString = (search: string) => {
  const qs = QS.parse(search, { ignoreQueryPrefix: true });
  return qs.wvt as string | undefined;
};

const retrieveVisitorToken = (
  config: Cookie.CookieAttributes = {},
  search: string
) =>
  retrieveFromQueryString(search) ||
  retrieveFromCookie(VISITOR_TOKEN_KEY, config);

const retrievePageUUIDToken = () => retrieveFromCookie(PAGE_UUID_KEY);

type WTConfig = {
  cookieOptions?: Cookies.CookieAttributes;
  trackerUrl?: string;
  trackerDomain?: string;
  stringifyOptions?: QS.IStringifyOptions;
  debounce?: {
    min?: number;
    max?: number;
  };
};

/** @internal */
export type WTContext = {
  location: {
    hostname: string;
    href: string;
    search: string;
  };
  document: {
    referrer: string;
  };
  navigator: {
    userAgent: string;
  };
  innerWidth: number;
  innerHeight: number;
  Image: typeof window.Image;
};

type WTEvent = {
  kind?: string;
  category?: string;
  action?: string;
  label?: string;
  value?: string | number | boolean | null;
  page_name?: string;
  container?: string;
  position?: string | number;
  object_type?: string;
  object_name?: string;
  metadata?: Record<string, any>;
  url: string;
  referrer: string | undefined;
  page_uuid: string | null;
  ts: number;
};

export type WTEventParams = {
  kind?: string;
  category?: string;
  action?: string;
  label?: string;
  value?: string | number | boolean | null;
  pageName?: string;
  container?: string;
  position?: string | number;
  objectType?: string;
  objectName?: string;
  [metadataKey: string]: any;
};

export type WTPayload = {
  events: WTEvent[];
  dimensions: {
    width: number;
    height: number;
  };
  agent: string;
  rts: number;
  wvt: string | undefined;
};

export class WT {
  public loading = false;

  private emitter = new EventEmitter();
  private wtConfig: WTConfig = {
    cookieOptions: { expires: EXPIRES_IN_DAYS },
  };
  private paramDefaults = {};
  private eventQueue: WTEvent[] = [];
  private pageUuid: string | null = null;
  private context: WTContext;
  private loaderImage: HTMLImageElement | undefined;
  private processEventsDebounced!: ReturnType<typeof debounce>;

  constructor(context: WTContext) {
    this.context = context;
    this.updateProcessEventsDebounced();
  }

  public initialize(config: WTConfig | ((config: WTConfig) => WTConfig)) {
    this.config(config);
    if (this.wtConfig.cookieOptions) {
      this.getUUIDToken();
      this.getVisitorToken();
    }
  }

  public getVisitorToken() {
    return retrieveVisitorToken(
      this.wtConfig.cookieOptions,
      this.context.location && this.context.location.search
    );
  }

  public getUUIDToken() {
    this.pageUuid = retrievePageUUIDToken();
    return this.pageUuid;
  }

  public track(kindOrParams: string | WTEventParams) {
    const resolvedParams =
      typeof kindOrParams === "string" ? { kind: kindOrParams } : kindOrParams;

    this.addToQueue({
      ...resolvedParams,
      kind: resolvedParams.kind ?? "event",
    });
  }

  public flush() {
    this.processEventsDebounced.flush();
  }

  public clear() {
    this.paramDefaults = {};
  }

  public set(defaults: Record<string, any>) {
    this.paramDefaults = {
      ...this.paramDefaults,
      ...resolveMethod(defaults, this.paramDefaults, this),
    };
  }

  public config(config: WTConfig | ((currentConfig: WTConfig) => WTConfig)) {
    this.wtConfig = {
      ...this.wtConfig,
      ...resolveMethod(config, this.wtConfig, this),
    };
    this.updateProcessEventsDebounced();
  }

  public subscribe(eventName: string, cb: () => void) {
    this.emitter.on(eventName, cb);
    return () => {
      this.emitter.removeListener(eventName, cb);
    };
  }

  private addToQueue(params: WTEventParams) {
    const {
      kind,
      category,
      action,
      label,
      value,
      pageName,
      container,
      position,
      objectType,
      objectName,
      ...args
    } = params;
    this.eventQueue.push(
      omitBy(
        {
          kind,
          category,
          action,
          label,
          value,
          page_name: pageName,
          container,
          position,
          object_type: objectType,
          object_name: objectName,
          metadata: { ...this.paramDefaults, ...args },
          ...this.getEventEnvironmentArgs(),
          ts: new Date().valueOf(),
        },
        isNil
      )
    );
    this.processEventsDebounced();
  }

  private getLoaderImage() {
    return new this.context.Image();
  }

  private getUrl() {
    if (this.wtConfig.trackerUrl) {
      return this.wtConfig.trackerUrl;
    }
    return `${this.getRoot()}/track.gif`;
  }

  private getRoot() {
    if (this.wtConfig.trackerDomain) {
      return this.wtConfig.trackerDomain;
    }
    return `//${this.context.location.hostname}`;
  }

  private sendToServer(
    payload: WTPayload,
    resolve: () => void,
    reject: () => void
  ) {
    this.loaderImage = this.loaderImage || this.getLoaderImage();
    const query = QS.stringify(payload, {
      addQueryPrefix: false,
      ...(this.wtConfig.stringifyOptions || DEFAULT_STRINGIFY_OPTIONS),
    });

    this.loaderImage.onload = () => {
      this.loaderImage!.onerror = null;
      this.loaderImage!.onload = null;
      resolve();
    };
    this.loaderImage.onerror = () => {
      this.loaderImage!.onerror = null;
      this.loaderImage!.onload = null;
      reject();
    };

    fetch(`${this.getRoot()}/wt/t`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: query,
    })
      .then(() => {
        resolve();
      })
      .catch(() => {
        this.loaderImage!.src = `${this.getUrl()}?fallback=true&${query}`;
      });
    this.emitter.emit(SEND_STARTED);
  }

  private getRequestEnvironmentArgs() {
    return {
      dimensions: {
        width: this.context.innerWidth,
        height: this.context.innerHeight,
      },
      agent: this.context.navigator.userAgent,
      rts: new Date().valueOf(),
      wvt: retrieveFromQueryString(
        this.context.location && this.context.location.search
      ),
    };
  }

  private getEventEnvironmentArgs() {
    return {
      url: this.context.location.href,
      referrer: this.context.document.referrer,
      page_uuid: this.pageUuid,
    };
  }

  private processEvents() {
    if (this.loading) {
      return;
    }

    const events = this.eventQueue.slice(0, BATCH_MAX);
    this.eventQueue = this.eventQueue.slice(BATCH_MAX);
    if (!events.length) {
      return;
    }
    const payload = { events, ...this.getRequestEnvironmentArgs() };
    this.loading = true;

    const resolve = () => {
      this.emitter.emit(SEND_COMPLETED);
      if (this.eventQueue.length) {
        // eslint-disable-next-line no-use-before-define
        this.processEventsDebounced();
        this.emitter.emit(QUEUE_CONTINUED);
      } else {
        this.emitter.emit(QUEUE_COMPLETED);
      }
      this.loading = false;
    };

    const reject = () => {
      this.loading = false;
    };

    this.sendToServer(payload, resolve, reject);
  }

  private updateProcessEventsDebounced() {
    this.processEventsDebounced = debounce(
      this.processEvents.bind(this),
      this.wtConfig.debounce?.min ?? DEBOUNCE_MIN_DEFAULT,
      {
        maxWait: this.wtConfig.debounce?.max ?? DEBOUNCE_MAX_DEFAULT,
      }
    );
  }
}

export function withContext(context: WTContext) {
  return new WT(context);
}

export default withContext(global);
