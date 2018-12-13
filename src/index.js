import QS from 'qs';
import Cookie from 'js-cookie';
import EventEmitter from 'events';
import { debounce, isFunction, assign, omitBy, isNil, uuid } from './utils';

export const DEBOUNCE_MIN = 500;
export const DEBOUNCE_MAX = 1500;

const DEFAULT_STRINGIFY_OPTIONS = { arrayFormat: 'brackets', skipNulls: true, encode: true };

// global constants
const BATCH_MAX = 100;

function resolveMethod(val, ...args) {
  return isFunction(val) ? val(...args) : val;
}

export const SEND_STARTED = 'send:started';
export const SEND_COMPLETED = 'send:completed';
export const QUEUE_COMPLETED = 'queue:completed';
export const QUEUE_CONTINUED = 'queue:continued';

const COOKIE_KEY = 'wt_visitor_token';
const PAGE_UUID = 'wt_page_uuid';

const retrieveVisitorToken = (config = {}) => {
  let token = Cookie.get(COOKIE_KEY);
  if (!token) {
    token = uuid();
    Cookie.set(COOKIE_KEY, token, config);
  }
  return token;
};

const retrievePageUUIDToken = () => {
  let token = Cookie.get(PAGE_UUID);
  if (!token) {
    token = uuid();
  }
  return token;
};

export class WT {
  constructor(context) {
    this.emitter = new EventEmitter();
    this.wtConfig = {};
    this.context = context;
    this.paramDefaults = {};
    this.eventQueue = [];
    this.loading = false;
    this.pageUuid = null;
    this.processEventsDebounced = debounce(this.processEvents.bind(this), DEBOUNCE_MIN, {
      maxWait: DEBOUNCE_MAX,
    });
    this.resetFirstLoad();
  }

  resetFirstLoad() {
    this.firstLoaded = false;
    if (this.unsubFirstLoadCb) {
      this.unsubFirstLoadCb();
    }
    if (this.unsubFirstLoad) {
      this.unsubFirstLoad();
    }
    this.unsubFirstLoad = this.subscribe(SEND_COMPLETED, () => {
      this.firstLoaded = true;
      this.unsubFirstLoad();
      delete this.unsubFirstLoad;
    });
  }

  afterFirstLoad(cb) {
    if (this.firstLoaded) {
      cb();
    } else {
      this.unsubFirstLoadCb = this.subscribe(SEND_COMPLETED, () => {
        cb();
        this.unsubFirstLoadCb();
        delete this.unsubFirstLoadCb;
      });
    }
  }

  initialize(payload) {
    this.wtConfig = resolveMethod(payload, this.wtConfig, this);
    if (this.wtConfig.cookies) {
      this.getUUIDToken();
      this.getVisitorToken();
    }
  }

  getVisitorToken() {
    return retrieveVisitorToken(this.wtConfig.cookies);
  }

  getUUIDToken() {
    this.uuid = retrievePageUUIDToken();
    return this.uuid;
  }

  getLoaderImage() {
    return new this.context.Image();
  }

  getUrl() {
    if (this.wtConfig.trackerUrl) {
      return this.wtConfig.trackerUrl;
    }
    return `${this.getRoot()}/track.gif`;
  }

  getRoot() {
    if (this.wtConfig.trackerDomain) {
      return this.wtConfig.trackerDomain;
    }
    return `//${this.context.location.hostname}`;
  }

  sendToServer(payload, resolve, reject) {
    this.loaderImage = this.loaderImage || this.getLoaderImage();
    const query = QS.stringify(
      payload,
      { addQueryPrefix: false, ...(this.wtConfig.stringifyOptions || DEFAULT_STRINGIFY_OPTIONS) },
    );

    this.loaderImage.onload = () => {
      delete this.loaderImage.onerror;
      delete this.loaderImage.onload;
      resolve();
    };
    this.loaderImage.onerror = () => {
      delete this.loaderImage.onerror;
      delete this.loaderImage.onload;
      reject();
    };
    this.loaderImage.src = `${this.getUrl()}?${query}`;
  }

  getRequestEnvironmentArgs() {
    return {
      dimensions: {
        width: this.context.innerWidth,
        height: this.context.innerHeight,
      },
      agent: this.context.navigator.userAgent,
      rts: (new Date()).valueOf(),
    };
  }

  getEventEnvironmentArgs() {
    return {
      url: this.context.location.href,
      referrer: this.context.document.referrer,
      page_uuid: this.pageUuid || this.getUUIDToken(),
    };
  }

  processEvents() {
    if (this.loading) {
      return;
    }

    const events = this.eventQueue.slice(0, BATCH_MAX);
    this.eventQueue = this.eventQueue.slice(BATCH_MAX);
    if (!events.length) {
      return;
    }
    const payload = assign({ events }, this.getRequestEnvironmentArgs());
    this.loading = true;
    this.emitter.emit(SEND_STARTED);

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

  handleEvent(kind, payload = {}) {
    const {
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
    } = payload;
    this.eventQueue.push(omitBy({
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
      metadata: assign({}, args, this.paramDefaults),
      ...this.getEventEnvironmentArgs(),
      ts: (new Date()).valueOf(),
    }, isNil));
    this.signalEventChange();
  }

  signalEventChange() {
    this.processEventsDebounced();
  }

  flush() {
    this.processEventsDebounced.flush();
  }

  clear() {
    this.paramDefaults = {};
  }

  set(payload) {
    assign(this.paramDefaults, resolveMethod(payload, this.paramDefaults, this));
  }

  config(payload) {
    assign(this.wtConfig, resolveMethod(payload, this.wtConfig, this));
  }

  subscribe(eventName, cb) {
    this.emitter.on(eventName, cb);
    return () => {
      this.emitter.removeListener(eventName, cb);
    };
  }

  instance() {
    return this;
  }
}

export function withContext(context) {
  const wt = new WT(context);
  return function run(cmd, ...args) {
    if (wt[cmd]) {
      return wt[cmd](...args);
    }
    return wt.handleEvent(cmd, ...args);
  };
}

export default withContext(global);
