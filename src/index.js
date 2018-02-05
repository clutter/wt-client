import QS from 'qs';
import { debounce, isFunction, assign, defaults, omitBy, isNil } from './utils';

export const DEBOUNCE_MIN = 500;
export const DEBOUNCE_MAX = 1500;

const DEFAULT_STRINGIFY_OPTIONS = { arrayFormat: 'brackets', skipNulls: true, encode: false };

const DEFAULT_CONTEXT_VARIABLES = {
  eventQueue: [],
  loading: false,
  paramDefaults: {},
  config: {},
};

// global constants
const BATCH_MAX = 100;

// usually window
let context;

// eslint-disable-next-line no-undef
function initialize(_config = {}, _context = window) {
  context = _context;
  defaults(context, DEFAULT_CONTEXT_VARIABLES);
  context.loaderImage = new context.Image();
  context.config = _config;
}

const getRequestEnvironmentArgs = () => ({
  dimensions: {
    width: context.innerWidth,
    height: context.innerHeight,
  },
  agent: context.navigator.userAgent,
  rts: (new Date()).valueOf(),
});

function getRoot() {
  const hostParts = context.location.hostname.split('.').slice(-2);
  const [clutter, topLevel] = hostParts;
  const tempHost = ['www', clutter, topLevel].join('.');
  return `//${tempHost}`;
}

function getUrl() {
  if (context.config.trackerUrl) {
    return context.config.trackerUrl;
  }
  return `${getRoot()}/track.gif`;
}

// main
function processEvents() {
  if (context.loading) {
    return;
  }

  const events = context.eventQueue.slice(0, BATCH_MAX);
  context.eventQueue = context.eventQueue.slice(BATCH_MAX);
  if (!events.length) {
    return;
  }
  const query = QS.stringify(
    assign({ events }, getRequestEnvironmentArgs()),
    { addQueryPrefix: false, ...(context.config.stringifyOptions || DEFAULT_STRINGIFY_OPTIONS) },
  );

  context.loaderImage.onload = () => {
    context.loading = false;
    delete context.loaderImage.onload;
    if (context.eventQueue.length) {
      // eslint-disable-next-line no-use-before-define
      processEventsDebounced();
    }
  };
  context.loading = true;
  context.loaderImage.src = `${getUrl()}?${query}`;
}

const processEventsDebounced = debounce(processEvents, DEBOUNCE_MIN, {
  maxWait: DEBOUNCE_MAX,
});

// overrides
function setDefaults(data) {
  if (isFunction(data)) {
    return assign(context.paramDefaults, data(context.paramDefaults));
  }
  return assign(context.paramDefaults, data);
}

const getEventEnvironmentArgs = () => ({
  url: context.location.href,
});

// event interface
export default function wt(kind, payload = {}, options) {
  if (kind === 'init' || kind === 'initialize') {
    initialize(payload, options);
    return;
  }
  if (!context) {
    initialize();
  }
  if (kind === 'flush') {
    processEventsDebounced.flush();
    return;
  }
  if (kind === 'set') {
    setDefaults(payload);
    return;
  }
  if (kind === 'clear') {
    context.paramDefaults = {};
    return;
  }
  const {
    category,
    action,
    label,
    value,
    ...args
  } = payload;
  context.eventQueue.push(omitBy({
    kind,
    category,
    action,
    label,
    value,
    metadata: assign({}, args, context.paramDefaults),
    ...getEventEnvironmentArgs(),
    ts: (new Date()).valueOf(),
  }, isNil));
  processEventsDebounced();
}

wt.event = payload => wt('event', payload);
wt.pageView = payload => wt('pageview', payload);
wt.clear = () => wt('clear');
wt.set = payload => wt('set', payload);
wt.initialize = (...args) => wt('initialize', ...args);
