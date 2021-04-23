# What is wt

`wt` is a JavaScript library to track events in the browser.

[![build status](https://img.shields.io/circleci/project/github/clutter/wt-client.svg)](https://circleci.com/gh/clutter/wt-client)
[![npm version](https://img.shields.io/npm/v/@clutter/wt.svg?style=flat-square)](https://www.npmjs.com/package/@clutter/wt)

It provides a single function `wt` that can be used as follows:

```js
import wt from '@clutter/wt';
button.addEventListener(
  'click',
  () => wt('event'),
);
```

When `button` is clicked, this code will send event data to the server asynchronously using the polyfilled window.fetch() method.

On the server, the endpoint `/wt/t` is expected to return a valid response
and to parse all the provided parameters, keeping track of the events sent by `wt`.

# Why use wt

The benefit of `wt` is to reliably track visitor events in the browser.
`wt` is highly customizable and can send events to your own server, rather than third-party trackers.

# How to install and load wt

The easiest way to install `wt` is through Yarn:

```
yarn add @clutter/wt
```

Before calling the `wt` method, import from the library:

```js
import wt from '@clutter/wt';
```

# How to use wt

Events can be tracked with the function `wt(*string* kind, *object* params)`.
For a single event, set `kind` to `'event'` and pass any parameters you want to track in `params`.
For instance:

```js
wt('event', { action: 'hover' })
```

The data sent to the server will contain the following:
- `events[][kind]`: the kind of tracking; in this case: `'event'`
- `events[][url]`: the URL of the page where the event occurred
- `events[][action]`: the only param to track in this case: `'hover'`
- `events[][ts]`: the timestamp when the event occurred (Unix-time milliseconds)
- `agent`: the User Agent of the request
- `rts`: the timestamp when the event was sent

### How to track multiple events

Multiple events can be tracked by calling `wt` several times:

```js
wt('event', { action: 'hover' })
// after 0.2 seconds
wt('event', { action: 'click' })
```

Under the hood, `wt` is optimized to deal with multiple events.

`wt` bundles multiple consecutive events into one request, if they occur within 1.5 seconds.
The goal is to avoid hitting the server too many times.
If multiple events are sent in the same request, each request has its own payload.

### How to track a pageview

```js
wt('pageview')
```

### How to change the location of the tracking endpoint

By default, `wt` expects the tracker domain to be the same host as the current page.
This can be changed by initializing `wt` with a different `trackerDomain` before tracking:

```js
wt('initialize', {
  trackerDomain: 'www.my-pixel-endpoint.com',
});
```

### How to configure the tracking cookie

By default, `wt` generates a cookie as a pixel to keep track of a visitor.
This can be changed by initializing `wt` with a different `domain` and `expires` prior to tracking:

```js
wt('initial', {
  cookies: {
    domain: '.example.com',
    expires: 365,
  }
})
```

### How to track more data for each event

Any object can be passed when tracking an event, for instance:

```js
wt('event', {
  action: 'click',
  user: {
    id: 1,
    email: 'user@example.com'
  },
  custom: false,
});
```

### How to submit default data for every event

If part of the payload is the same for every event, it can be set once using `set`. For instance calling:

```js
wt('set', {
  user: {
   id: 1
  },
});
```

ensures that the user ID is sent as part of the payload in any event.

Calling `set` multiple times adds new values without clearing the old ones.
In this sense, `set` behaves like `React.Component().setState()`.
All the values already set can be cleared with:

```js
wt('clear')
```

### Events

You may want to subscribe to lifecycle events for the tracker.

```js
import wt, { SEND_COMPLETED } from '@clutter/wt'
wt('subscribe', SEND_COMPLETED, () => {
  console.log('Analytics data sent');
});
```

The lifecycle events are:

- `SEND_STARTED: "send:started"` - the tracker has started sending data via the tracker pixel
- `SEND_COMPLETED: "send:completed"` - the tracker has finished sending data via the tracker pixel
- `QUEUE_COMPLETED: "queue:completed"` - the tracker has finished sending data via the tracker pixel and no additional events are queued
- `QUEUE_CONTINUED: "queue:continued"` - the tracker has finished sending data via the tracker pixel and some additional events are queued

Calling this method will return an `unsubscribe` method. You can use it to stop listening to the event.

```js
import wt, { SEND_COMPLETED } from '@clutter/wt'

const unsub = wt('subscribe', SEND_COMPLETED, () => {
  console.log('Analytics data sent - you\'ll only see this once');
  unsub();
});
```

### First Load

You may be sending a cookie back from your server. If you want to wait for an event to complete before performing actions, use the `afterFirstLoad` command.

```js
import wt from '@clutter/wt'

wt('afterFirstLoad', () => {
  console.log('You\'ve sent your page view request!');
});

wt('pageview');

// if you call it later
wt('afterFirstLoad', () => {
  console.log('This is invoked immediately');
});

```

# How to implement the server

In order for `wt` to fully work, a server must be running that provides a `/wt/t` endpoint.
This can be built in Rails, node.js or any other technology.
An example is provided inside the repo at `examples/index.server.js`
