import QS from 'qs';
import debounce from 'lodash/debounce';
import isFunction from 'lodash/isFunction';
import assign from 'lodash/assign';
import omitBy from 'lodash/omitBy';
import isNil from 'lodash/isNil';

export const DEBOUNCE_MIN = 500;
export const DEBOUNCE_MAX = 1500;

// global constants
const BATCH_MAX = 100;

// global variables
let eventQueue = [];
let loading = false;
let paramDefaults = {};

// usually window.Image
let loaderImage;
// usually window
let context;

let config = {};

// eslint-disable-next-line no-undef
function initialize(_config = {}, _context = window) {
  context = _context;
  loaderImage = new context.Image();
  config = _config;
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
  if (config.trackerUrl) {
    return config.trackerUrl;
  }
  return `${getRoot()}/track.gif`;
}

// main
function processEvents() {
  if (loading) {
    return;
  }

  const events = eventQueue.slice(0, BATCH_MAX);
  eventQueue = eventQueue.slice(BATCH_MAX);
  if (!events.length) {
    return;
  }
  const query = QS.stringify(
    assign({ events }, getRequestEnvironmentArgs()),
    { arrayFormat: 'brackets', addQueryPrefix: false, skipNulls: true, encode: false },
  );

  loaderImage.onload = () => {
    loading = false;
    delete loaderImage.onload;
    if (eventQueue.length) {
      // eslint-disable-next-line no-use-before-define
      processEventsDebounced();
    }
  };
  loading = true;
  loaderImage.src = `${getUrl()}?${query}`;
}

const processEventsDebounced = debounce(processEvents, DEBOUNCE_MIN, {
  maxWait: DEBOUNCE_MAX,
});

// overrides
function setDefaults(data) {
  if (isFunction(data)) {
    return assign(paramDefaults, data(paramDefaults));
  }
  return assign(paramDefaults, data);
}

const getEventEnvironmentArgs = () => ({
  url: context.location.href,
});

// event interface
export default function wt(kind, payload = {}, options = {}) {
  if (kind === 'init' || kind === 'initialize') {
    initialize(payload, options);
  } else if (!context) {
    initialize();
  }
  if (kind === 'set') {
    setDefaults(payload);
    return;
  }
  if (kind === 'clear') {
    paramDefaults = {};
    return;
  }
  const {
    category,
    action,
    label,
    value,
    ...args
  } = payload;
  eventQueue.push(omitBy({
    kind,
    category,
    action,
    label,
    value,
    metadata: assign({}, args, paramDefaults),
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
