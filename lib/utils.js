"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.uuid = exports.omitBy = exports.isNil = exports.debounce = exports.assign = exports.isFunction = void 0;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

var isFunction = function isFunction(val) {
  return Object.prototype.toString.call(val) === '[object Function]';
};

exports.isFunction = isFunction;

var assign = function assign(target) {
  var _arguments = arguments;
  var to = Object(target);

  var _loop = function _loop(index) {
    var nextSource = index + 1 < 1 || _arguments.length <= index + 1 ? undefined : _arguments[index + 1];
    Object.keys(nextSource).forEach(function (key) {
      to[key] = nextSource[key];
    });
  };

  for (var index = 0; index < (arguments.length <= 1 ? 0 : arguments.length - 1); index += 1) {
    _loop(index);
  }

  return to;
};

exports.assign = assign;

var debounce = function debounce(fn, min) {
  var _ref = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
      maxWait = _ref.maxWait;

  var minTo;
  var maxTo;
  var flushFn;
  var active = false;

  var clear = function clear() {
    clearTimeout(minTo);
    clearTimeout(maxTo);
    active = false;
    flushFn = null;
  };

  var run = function run() {
    clear();
    return fn.apply(void 0, arguments);
  };

  return assign(function () {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    clearTimeout(minTo);
    minTo = setTimeout.apply(void 0, [run, min].concat(args));

    if (!active && maxWait) {
      maxTo = setTimeout.apply(void 0, [run, maxWait].concat(args));
      active = true;
    }

    flushFn = function flushFn() {
      return fn.apply(void 0, args);
    };
  }, {
    clear: clear,
    flush: function flush() {
      if (flushFn) {
        return flushFn();
      }

      return null;
    }
  });
};

exports.debounce = debounce;

var isNil = function isNil(val) {
  return val === null || val === undefined;
};

exports.isNil = isNil;

var omitBy = function omitBy(obj, fn) {
  return Object.keys(obj).reduce(function (memo, key) {
    return fn(obj[key], key, obj) ? memo : _extends({}, memo, _defineProperty({}, key, obj[key]));
  }, {});
};

exports.omitBy = omitBy;

var uuid = function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (character) {
    /* eslint-disable no-bitwise, no-mixed-operators */
    var seed = Math.random() * 16 | 0;
    var value = character === 'x' ? seed : seed & 0x3 | 0x8;
    /* eslint-enable no-bitwise, no-mixed-operators */

    return value.toString(16);
  });
};

exports.uuid = uuid;