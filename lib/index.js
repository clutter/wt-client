"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.withContext = withContext;
exports.default = exports.WT = exports.QUEUE_CONTINUED = exports.QUEUE_COMPLETED = exports.SEND_COMPLETED = exports.SEND_STARTED = exports.DEBOUNCE_MAX = exports.DEBOUNCE_MIN = void 0;

var _qs = _interopRequireDefault(require("qs"));

var _jsCookie = _interopRequireDefault(require("js-cookie"));

var _events = _interopRequireDefault(require("events"));

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var DEBOUNCE_MIN = 500;
exports.DEBOUNCE_MIN = DEBOUNCE_MIN;
var DEBOUNCE_MAX = 1500;
exports.DEBOUNCE_MAX = DEBOUNCE_MAX;
var DEFAULT_STRINGIFY_OPTIONS = {
  arrayFormat: 'brackets',
  skipNulls: true,
  encode: true
}; // global constants

var BATCH_MAX = 100;

function resolveMethod(val) {
  for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }

  return (0, _utils.isFunction)(val) ? val.apply(void 0, args) : val;
}

var SEND_STARTED = 'send:started';
exports.SEND_STARTED = SEND_STARTED;
var SEND_COMPLETED = 'send:completed';
exports.SEND_COMPLETED = SEND_COMPLETED;
var QUEUE_COMPLETED = 'queue:completed';
exports.QUEUE_COMPLETED = QUEUE_COMPLETED;
var QUEUE_CONTINUED = 'queue:continued';
exports.QUEUE_CONTINUED = QUEUE_CONTINUED;
var COOKIE_KEY = 'wt_visitor_token';

var retrieveVisitorToken = function retrieveVisitorToken() {
  var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var token = _jsCookie.default.get(COOKIE_KEY);

  if (!token) {
    token = (0, _utils.uuid)();

    _jsCookie.default.set(COOKIE_KEY, token, config);
  }

  return token;
};

var WT =
/*#__PURE__*/
function () {
  function WT(context) {
    _classCallCheck(this, WT);

    this.emitter = new _events.default();
    this.wtConfig = {};
    this.context = context;
    this.paramDefaults = {};
    this.eventQueue = [];
    this.loading = false;
    this.elapsedTime = 0;
    this.processEventsDebounced = (0, _utils.debounce)(this.processEvents.bind(this), DEBOUNCE_MIN, {
      maxWait: DEBOUNCE_MAX
    });
    this.resetFirstLoad();
  }

  _createClass(WT, [{
    key: "resetFirstLoad",
    value: function resetFirstLoad() {
      var _this = this;

      this.firstLoaded = false;

      if (this.unsubFirstLoadCb) {
        this.unsubFirstLoadCb();
      }

      if (this.unsubFirstLoad) {
        this.unsubFirstLoad();
      }

      this.unsubFirstLoad = this.subscribe(SEND_COMPLETED, function () {
        _this.firstLoaded = true;

        _this.unsubFirstLoad();

        delete _this.unsubFirstLoad;
      });
    }
  }, {
    key: "afterFirstLoad",
    value: function afterFirstLoad(cb) {
      var _this2 = this;

      if (this.firstLoaded) {
        cb();
      } else {
        this.unsubFirstLoadCb = this.subscribe(SEND_COMPLETED, function () {
          cb();

          _this2.unsubFirstLoadCb();

          delete _this2.unsubFirstLoadCb;
        });
      }
    }
  }, {
    key: "initialize",
    value: function initialize(payload) {
      this.elapsedTime = 0;
      this.wtConfig = resolveMethod(payload, this.wtConfig, this);

      if (this.wtConfig.cookies) {
        this.getVisitorToken();
      }
    }
  }, {
    key: "pageview",
    value: function pageview() {
      var t = this;

      for (var _len2 = arguments.length, payload = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        payload[_key2] = arguments[_key2];
      }

      t.handleEvent.apply(t, ['pageview'].concat(payload));

      if (t.wtConfig.pingInterval) {
        setInterval(function () {
          t.elapsedTime += t.wtConfig.pingInterval / 1000;
          t.handleEvent('ping', {
            value: t.elapsedTime
          });
        }, t.wtConfig.pingInterval);
      }
    }
  }, {
    key: "getVisitorToken",
    value: function getVisitorToken() {
      return retrieveVisitorToken(this.wtConfig.cookies);
    }
  }, {
    key: "getLoaderImage",
    value: function getLoaderImage() {
      return new this.context.Image();
    }
  }, {
    key: "getUrl",
    value: function getUrl() {
      if (this.wtConfig.trackerUrl) {
        return this.wtConfig.trackerUrl;
      }

      return "".concat(this.getRoot(), "/track.gif");
    }
  }, {
    key: "getRoot",
    value: function getRoot() {
      if (this.wtConfig.trackerDomain) {
        return this.wtConfig.trackerDomain;
      }

      return "//".concat(this.context.location.hostname);
    }
  }, {
    key: "sendToServer",
    value: function sendToServer(payload, resolve, reject) {
      var _this3 = this;

      this.loaderImage = this.loaderImage || this.getLoaderImage();

      var query = _qs.default.stringify(payload, _extends({
        addQueryPrefix: false
      }, this.wtConfig.stringifyOptions || DEFAULT_STRINGIFY_OPTIONS));

      this.loaderImage.onload = function () {
        delete _this3.loaderImage.onerror;
        delete _this3.loaderImage.onload;
        resolve();
      };

      this.loaderImage.onerror = function () {
        delete _this3.loaderImage.onerror;
        delete _this3.loaderImage.onload;
        reject();
      };

      this.loaderImage.src = "".concat(this.getUrl(), "?").concat(query);
    }
  }, {
    key: "getRequestEnvironmentArgs",
    value: function getRequestEnvironmentArgs() {
      return {
        dimensions: {
          width: this.context.innerWidth,
          height: this.context.innerHeight
        },
        agent: this.context.navigator.userAgent,
        rts: new Date().valueOf()
      };
    }
  }, {
    key: "getEventEnvironmentArgs",
    value: function getEventEnvironmentArgs() {
      return {
        url: this.context.location.href,
        referrer: this.context.document.referrer
      };
    }
  }, {
    key: "processEvents",
    value: function processEvents() {
      var _this4 = this;

      if (this.loading) {
        return;
      }

      var events = this.eventQueue.slice(0, BATCH_MAX);
      this.eventQueue = this.eventQueue.slice(BATCH_MAX);

      if (!events.length) {
        return;
      }

      var payload = (0, _utils.assign)({
        events: events
      }, this.getRequestEnvironmentArgs());
      this.loading = true;
      this.emitter.emit(SEND_STARTED);

      var resolve = function resolve() {
        _this4.emitter.emit(SEND_COMPLETED);

        if (_this4.eventQueue.length) {
          // eslint-disable-next-line no-use-before-define
          _this4.processEventsDebounced();

          _this4.emitter.emit(QUEUE_CONTINUED);
        } else {
          _this4.emitter.emit(QUEUE_COMPLETED);
        }

        _this4.loading = false;
      };

      var reject = function reject() {
        _this4.loading = false;
      };

      this.sendToServer(payload, resolve, reject);
    }
  }, {
    key: "handleEvent",
    value: function handleEvent(kind) {
      var payload = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var category = payload.category,
          action = payload.action,
          label = payload.label,
          value = payload.value,
          pageName = payload.pageName,
          container = payload.container,
          position = payload.position,
          objectType = payload.objectType,
          objectName = payload.objectName,
          args = _objectWithoutProperties(payload, ["category", "action", "label", "value", "pageName", "container", "position", "objectType", "objectName"]);

      this.eventQueue.push((0, _utils.omitBy)(_extends({
        kind: kind,
        category: category,
        action: action,
        label: label,
        value: value,
        page_name: pageName,
        container: container,
        position: position,
        object_type: objectType,
        object_name: objectName,
        metadata: (0, _utils.assign)({}, args, this.paramDefaults)
      }, this.getEventEnvironmentArgs(), {
        ts: new Date().valueOf()
      }), _utils.isNil));
      this.signalEventChange();
    }
  }, {
    key: "signalEventChange",
    value: function signalEventChange() {
      this.processEventsDebounced();
    }
  }, {
    key: "flush",
    value: function flush() {
      this.processEventsDebounced.flush();
    }
  }, {
    key: "clear",
    value: function clear() {
      this.paramDefaults = {};
    }
  }, {
    key: "set",
    value: function set(payload) {
      (0, _utils.assign)(this.paramDefaults, resolveMethod(payload, this.paramDefaults, this));
    }
  }, {
    key: "config",
    value: function config(payload) {
      (0, _utils.assign)(this.wtConfig, resolveMethod(payload, this.wtConfig, this));
    }
  }, {
    key: "subscribe",
    value: function subscribe(eventName, cb) {
      var _this5 = this;

      this.emitter.on(eventName, cb);
      return function () {
        _this5.emitter.removeListener(eventName, cb);
      };
    }
  }, {
    key: "instance",
    value: function instance() {
      return this;
    }
  }]);

  return WT;
}();

exports.WT = WT;

function withContext(context) {
  var wt = new WT(context);
  return function run(cmd) {
    for (var _len3 = arguments.length, args = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
      args[_key3 - 1] = arguments[_key3];
    }

    if (wt[cmd]) {
      return wt[cmd].apply(wt, args);
    }

    return wt.handleEvent.apply(wt, [cmd].concat(args));
  };
}

var _default = withContext(global);

exports.default = _default;