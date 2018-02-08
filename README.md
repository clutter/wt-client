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

When `button` is clicked, this code will instantiate an `<img>` tag with the `src` attribute set to:
`/track.gif?payload[][kind]=event&payload[][url]=CURRENT_URL&payload[][ts]=1517356691057&agent=Mozilla&rts=1517356691561`

On the server, the endpoint `track.gif` is expected to return a valid image (for instance, a transparent pixel)
and to parse all the provided parameters, keeping track of the events sent by `wt`.

# Why use wt

The concept of `wt` is the same as Google Analytics: to use a transparent pixel to track events in the browser.
The main difference is that `wt` is highly customizable and can send events to your own server, rather than to Google.

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
For a single event, sent `kind` to `'event'` and pass any parameters you want to track in `params`.
For instance:

```js
wt('event', { action: 'hover' })
```

will instantiate an `<img>` tag with the `src` attribute set to

```
/track.gif
 ?payload[][kind]=event
 &payload[][url]=CURRENT_URL
 &payload[][action]=hover
 &payload[][ts]=1517356691057
 &agent=Mozilla
 &rts=1517356691561
```

Breaking the URL down, `/track.gif` is followed by these query parameters:

- `payload[][kind]`: the kind of tracking; in this case: `'event'`
- `payload[][url]`: the URL of the page where the event occurred
- `payload[][action]`: the only param to track in this case: `'hover'`
- `payload[][ts]`: the timestamp when the event occurred (Unix-time milliseconds)
- `agent`: the User Agent of the request
- `rts`: the timestamp when the event was sent (that is, when the `src` attribute of the image was set)

### How to track multiple events

Multiple events can be tracked by calling `wt` several times:

```js
wt('event', { action: 'hover' })
// after 0.2 seconds
wt('event', { action: 'click' })
```

Under the hood, `wt` is optimized to deal with multiple events.

Firstly, `wt` instantiates a *new* image only the first time `wt` is invoked.
Every other time, `wt` changes the `src` attribute without creating a new image.

Secondly, `wt` bundles multiple consecutive events into one request, if they occur within 1.5 seconds.
The goal is to avoid hitting the server too many times.
If multiple events are sent in the same request, each request has its own payload.
For instance, the URL for the two events above looks like this:

```
/track.gif
 ?payload[][kind]=event
 &payload[][url]=CURRENT_URL
 &payload[][action]=hover
 &payload[][ts]=1517356691057
 ?payload[][kind]=event
 &payload[][url]=CURRENT_URL
 &payload[][action]=click
 &payload[][ts]=1517356691257
 &agent=Mozilla
 &rts=1517356691561
```

This format of array in query parameters is particularly optimized for Rails.

### How to track a pageview

```js
wt('pageview')
```

### How to change the location of the tracking image

By default, `wt` expects the image to be located at `/track.gif` in the same host as the current page.
This can be changed by initializing `wt` with a different `trackerUrl` before tracking:

```js
wt('initialize', {
  trackerUrl: 'www.my-pixel-endpoint.com/track.gif',
});
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

# How to implement the server

In order for `wt` to fully work, a server must be running that provides a `track.gif` endpoint.
This can be built in Rails, node.js or any other technology.
An example is provided inside the repo at `examples/index.server.js`
