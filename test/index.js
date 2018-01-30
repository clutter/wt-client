import { assert } from 'chai';
import QS from 'qs';
import { omit } from 'lodash';
import wt, { DEBOUNCE_MAX, DEBOUNCE_MIN } from '../src';

const LOAD_WAIT = 100;
const BUFFER = 10;

let loggedEvents = [];

wt('initialize', {
  trackerUrl: 'pixel.test.url',
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

describe('wt-tracker.', () => {
  it('should load without error', (done) => {
    wt('test', { hello: 'world' });
    setTimeout(done, LOAD_WAIT + DEBOUNCE_MIN + BUFFER);
  });
  it('should log one call', (done) => {
    const events = [{hello: 'world'}];
    loggedEvents = [];

    events.forEach(event => wt('event', event));

    setTimeout(() => {
      const parsedEvents = loggedEvents.map(url => QS.parse(url.split('?').pop()))
      const withoutTs = parsedEvents.map(
        parsedEvent => omit({
          ...parsedEvent,
          events: parsedEvent.events.map(p => omit(p, ['ts'])),
        }, ['rts']),
      );
      assert.deepEqual(events, withoutTs[0].events.map(e => e.metadata));
      done();
    }, LOAD_WAIT + DEBOUNCE_MIN + BUFFER);
  });
});
