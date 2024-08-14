/** @internal */
export const isFunction = (val: any): val is (...args: any[]) => any =>
  Object.prototype.toString.call(val) === '[object Function]';

/** @internal */
export const debounce = <F extends (...args: any) => any>(
  fn: F,
  min: number,
  { maxWait }: { maxWait?: number } = {},
) => {
  let minTo: number | undefined;
  let maxTo: number | undefined;
  let flushFn: (() => void) | undefined;
  let active = false;

  const clear = () => {
    clearTimeout(minTo);
    clearTimeout(maxTo);
    active = false;
    flushFn = undefined;
  };

  const run = (...args: Parameters<F>) => {
    clear();
    return fn(...args);
  };

  return Object.assign(
    (...args: Parameters<F>) => {
      clearTimeout(minTo);
      minTo = window.setTimeout(run, min, ...args);
      if (!active && maxWait) {
        maxTo = window.setTimeout(run, maxWait, ...args);
        active = true;
      }
      flushFn = () => fn(...args);
    },
    {
      clear,
      flush() {
        if (flushFn) {
          return flushFn();
        }
        return null;
      },
    },
  );
};
/** @internal */
export const isNil = (val: any) => val === null || val === undefined;

/** @internal */
export const omitBy = <
  O extends Record<string, any>,
  K extends keyof O,
  V extends O[K],
>(
  obj: O,
  fn: (value: V, key: K, obj: Record<K, V>) => boolean,
) =>
  Object.keys(obj).reduce(
    (memo, key) =>
      fn(obj[key], key as K, obj)
        ? memo
        : {
            ...memo,
            [key]: obj[key as K],
          },
    {} as O,
  );

/** @internal */
export const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    /* eslint-disable no-bitwise, no-mixed-operators */
    const seed = (Math.random() * 16) | 0;
    const value = character === 'x' ? seed : (seed & 0x3) | 0x8;
    /* eslint-enable no-bitwise, no-mixed-operators */

    return value.toString(16);
  });

/** @internal */
export const snakeCaseKeys = <T extends Record<string, any>>(obj: T) =>
  Object.keys(obj).reduce<Record<string, any>>((acc, key) => {
    acc[key.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()] = obj[key];
    return acc;
  }, {});
