export const isFunction = val => Object.prototype.toString.call(val) === '[object Function]';

export const assign = (target, ...vals) => {
  const to = Object(target);
  for (let index = 0; index < vals.length; index += 1) {
    const nextSource = vals[index];
    Object.keys(nextSource).forEach((key) => {
      to[key] = nextSource[key];
    });
  }
  return to;
};

export const debounce = (fn, min, { maxWait } = {}) => {
  let minTo;
  let maxTo;
  let flushFn;
  let active = false;

  const clear = () => {
    clearTimeout(minTo);
    clearTimeout(maxTo);
    active = false;
    flushFn = null;
  };

  const run = (...args) => {
    clear();
    return fn(...args);
  };

  return assign((...args) => {
    clearTimeout(minTo);
    minTo = setTimeout(run, min, ...args);
    if (!active && maxWait) {
      maxTo = setTimeout(run, maxWait, ...args);
      active = true;
    }
    flushFn = () => fn(...args);
  }, {
    clear,
    flush() {
      if (flushFn) {
        return flushFn();
      }
      return null;
    },
  });
};

export const isNil = val => val === null || val === undefined;

export const omitBy = (obj, fn) => Object.keys(obj).reduce(
  (memo, key) => (
    fn(obj[key], key, obj)
      ? memo
      : ({
        ...memo,
        [key]: obj[key],
      })
  ),
  {},
);

export const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    /* eslint-disable no-bitwise, no-mixed-operators */
    const seed = Math.random() * 16 | 0;
    const value = character === 'x' ? seed : (seed & 0x3 | 0x8);
    /* eslint-enable no-bitwise, no-mixed-operators */

    return value.toString(16);
  });
