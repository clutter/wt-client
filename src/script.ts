import wt from './client';

const script = document.currentScript;

const trackerDomain = script?.getAttribute('data-tracker-domain');
const cookieDomain = script?.getAttribute('data-cookie-domain');

wt.initialize({
  trackerDomain: trackerDomain!,
  cookieOptions: { cookieDomain: cookieDomain! },
});

wt.track('pageview');
