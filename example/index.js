import wt from '../src';

wt('initialize', {
  trackerUrl: 'http://localhost:3000/track.gif',
});

wt('pageview');
wt('pageview');
wt('pageview');
wt('pageview');
wt('pageview');
setTimeout(() => wt('pageview'), 100);
