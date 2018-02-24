import QS from 'qs';
import EventEmitter from 'events';
import { debounce, isFunction, assign, omitBy, isNil } from './utils';

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

export class Wt {
  // eslint-disable-next-line no-undef
  constructor(context) {
    this.emitter = new EventEmitter();
    this.wtConfig = {};
    this.context = context;
    this.paramDefaults = {};
    this.eventQueue = [];
    this.loading = false;
    this.processEventsDebounced = debounce(this.processEvents.bind(this), DEBOUNCE_MIN, {
      maxWait: DEBOUNCE_MAX,
    });
  }
  initialize(payload) {
    this.wtConfig = resolveMethod(payload, this.wtConfig, this);
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
  sendToServer(payload) {
    this.loaderImage = this.loaderImage || this.getLoaderImage();
    const query = QS.stringify(
      payload,
      { addQueryPrefix: false, ...(this.wtConfig.stringifyOptions || DEFAULT_STRINGIFY_OPTIONS) },
    );

    return new Promise((resolve, reject) => {
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
    });
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
    this.sendToServer(payload)
      .then(() => {
        this.emitter.emit(SEND_COMPLETED);
        if (this.eventQueue.length) {
          // eslint-disable-next-line no-use-before-define
          this.processEventsDebounced();
          this.emitter.emit(QUEUE_CONTINUED);
        } else {
          this.emitter.emit(QUEUE_COMPLETED);
        }
        this.loading = false;
      })
      .catch(() => {
        this.loading = false;
      });
  }
  handleEvent(kind, payload = {}) {
    const {
      category,
      action,
      label,
      value,
      ...args
    } = payload;
    this.eventQueue.push(omitBy({
      kind,
      category,
      action,
      label,
      value,
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
  const wt = new Wt(context);
  return function run(cmd, ...args) {
    if (wt[cmd]) {
      return wt[cmd](...args);
    }
    return wt.handleEvent(cmd, ...args);
  };
}

export default withContext(global);
