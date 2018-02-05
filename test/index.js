import { assert } from 'chai';
import QS from 'qs';
import { omit } from 'lodash';
import wt, { DEBOUNCE_MAX, DEBOUNCE_MIN } from '../src';

import { debounce } from '../src/utils';

const LOAD_WAIT = 100;
const BUFFER = 10;

let loggedEvents = [];

const parseLoggedEvents = () => {
  const parsedEvents = loggedEvents.map(url => QS.parse(url.split('?').pop()));
  const withoutTs = parsedEvents.map(
    parsedEvent => omit({
      ...parsedEvent,
      events: parsedEvent.events.map(p => omit(p, ['ts'])),
    }, ['rts']),
  );
  return withoutTs[0].events.map(e => e.metadata);
};

function runEvents(events, cb, timeOffset = 0) {
  setTimeout(() => {
    events.forEach(event => wt('event', event));
    setTimeout(() => {
      cb(parseLoggedEvents());
    }, LOAD_WAIT + DEBOUNCE_MIN + BUFFER + (timeOffset / 2));
  }, (timeOffset / 2));
}

describe('wt-tracker.', () => {
  before(() => {
    wt('initialize', {
      trackerUrl: 'pixel.test.url',
      stringifyOptions: {},
    },{
      location: {
        hostname: 'www.test.url',
        href: 'https://www.test.url/test-path'
      },
      navigator: {
        userAgent: 'test agent'
      },
      Image: class {
        get src() {
          return this._url;
        }
        set src(url) {
          if (url === this._url) {
            return;
          }
          clearTimeout(this._to);
          this._to = setTimeout(() => {
            loggedEvents.push(url);
            if (this.onload) {
              this.onload();
            }
          }, LOAD_WAIT);
          this._url = url;
        }
      }
    });
  });

  beforeEach(() => {
    loggedEvents = [];
    return wt.clear();
  });

  it('should load without error', (done) => {
    wt('test', { hello: 'world' });
    setTimeout(done, LOAD_WAIT + DEBOUNCE_MIN + BUFFER);
  });
  it('should log one call', (done) => {
    const events = [{hello: 'world'}];
    runEvents(events, (result) => {
      assert.deepEqual(events, result);
      done();
    });
  });
  it('should enqueue calls while networking', (done) => {
    const events = [{hello: 'world'}];
    events.forEach(event => wt('event', event));
    wt('flush');
    events.forEach(event => wt('event', event));
    wt('flush');
    setTimeout(() => {
      const parsedEvents = parseLoggedEvents();
      assert.deepEqual(events.concat(events), parsedEvents);
      done();
    }, 1 + LOAD_WAIT + DEBOUNCE_MIN + BUFFER);
  });
  it('should update defaults', (done) => {
    const events = [{hello: 'world'}];

    wt('set', { userId: '1' });

    runEvents(events, (result) => {
      assert.deepEqual(events.map(r => Object.assign(r, { userId: '1' })), result);
      done();
    });
  });
  it('should update defaults with a function', (done) => {
    const events = [{hello: 'world'}];

    wt('set', () => ({ userId: '1' }));

    runEvents(events, (result) => {
      assert.deepEqual(events.map(r => Object.assign(r, { userId: '1' })), result);
      done();
    });
  });
});

describe('utils.', () => {
  it('debounce should work', (done) => {
    let flipped = false;
    const flipTrue = () => {
      flipped = true;
    };
    const debouncedFlip = debounce(flipTrue, DEBOUNCE_MIN);
    debouncedFlip();
    setTimeout(() => {
      assert(flipped);
      done();
    }, DEBOUNCE_MIN + 1)
  });
  it('debounce flush should work', (done) => {
    let flipped = false;
    const flipTrue = () => {
      flipped = true;
    };
    const debouncedFlip = debounce(flipTrue, DEBOUNCE_MIN);
    debouncedFlip();
    debouncedFlip.flush();
    setTimeout(() => {
      assert(flipped);
      done();
    }, 1)
  });
  it('debounce flush should not work with clear', (done) => {
    let flipped = false;
    const flipTrue = () => {
      flipped = true;
    };
    const debouncedFlip = debounce(flipTrue, DEBOUNCE_MIN);
    debouncedFlip();
    debouncedFlip.clear();
    debouncedFlip.flush();
    setTimeout(() => {
      assert(flipped === false);
      done();
    }, 1)
  });
});
