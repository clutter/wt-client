import wt from '../src';

wt('initialize', {
  trackerUrl: 'http://localhost:3000/track.gif',
  pingInterval: 10000,
});

wt('pageview');
