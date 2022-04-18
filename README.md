# What is wt

`wt` is a JavaScript library to track events in the browser.

[![build status](https://img.shields.io/circleci/project/github/clutter/wt-client.svg)](https://circleci.com/gh/clutter/wt-client)
[![npm version](https://img.shields.io/npm/v/@clutter/wt.svg?style=flat-square)](https://www.npmjs.com/package/@clutter/wt)

# Installation

The easiest way to install `wt` is through Yarn:

```
yarn add @clutter/wt
```

# How to use WT

Events can be tracked with the function `wt.track(params: WTEventParams & Record<string, any>)`.

```js
wt.track({ action: "hover" });
```

All events have a `kind` property that defaults to `"event"`. For events that don't require any additional data (e.g. pageview events), there is a simplified syntax to set _only_ the `kind` property:

```js
wt.track("pageview");
```

### Multiple events

Multiple events can be tracked by calling `wt` several times:

```js
wt.track({ action: "hover" });
// after 0.2 seconds
wt.track({ action: "click" });
```

Under the hood, `wt` is optimized to deal with multiple events.

`wt` bundles multiple consecutive events into one request, if they occur within 1.5 seconds.
The goal is to avoid hitting the server too many times.
If multiple events are sent in the same request, each request has its own payload.

### Data

`wt` includes a list of recognized properties, detailed in `WTEventParams` (also see [Server Implementation](#server-implementation) below). Custom properties can also be tracked and will be grouped under a single `metadata` property.

# React Integration

`@clutter/wt` includes a React integration that supports providing event parameters via React context, validating events, and hooks to easily track events and inspect the current context parameters.

WT exports a default `WTProvider` component, and two hooks: `useTrack` and `useWT`. The provided hooks can only be used within a `WTProvider` (calling `useWT` or `useTrack` will not error, but attempting to track an event will).

```tsx
const TrackedButton = ({ children }) => {
  const track = useTrack();
  return <button onClick={() => track()}>{children}</button>;
};

<>
  <TrackedButton>I will throw if you click me!</TrackedButton>
  <WTProvider>
    <TrackedButton>I will not throw!</TrackedButton>
  </WTProvider>
</>;
```

If additional customization is desired, there is also a `createProvider` utility which allows for custom typing and added
event control. Each call to `createProvider` creates a new, distinct React context meaning that the returned hooks _will not work_ with the default `WTProvider`.

```tsx
type EventParams = WTEventParams & {
  customParamA: string;
  customParamB?: string;
};

// The returned provider and hooks share a single context and respect the EventParams type
const { WTProvider, useTrack, useWT } = createProvider((params: EventParams) =>
  wt.track(params)
);
```

### Context

Context providers may be nested to build event parameters contextually:

```tsx
const TrackedButton = ({ children }) => {
  const track = useTrack();

  return <button onClick={() => track()}>{children}</button>;
};

<WTProvider params={{ pageName: "home" }}>
  <WTProvider params={{ container: "hero" }}>
    {/* Events tracked here will receive the params { pageName: 'home', container: 'hero' } */}
    <TrackedButton>I am a hero!</TrackedButton>
  </WTProvider>
  <WTProvider params={{ container: "body" }}>
    {/* Events tracked here will receive the params { pageName: 'home', container: 'body' } */}
    <TrackedButton>I have a body!</TrackedButton>
  </WTProvider>
</WTProvider>;
```

### Hooks

`useTrack` provides the most flexible interface to track an event in a context aware manner

```tsx
function List({ children }) {
  // Parameters passed to `useTrack` will be merged into each call to `track`
  const track = useTrack({ container: "list" });

  return (
    <ul>
      <li>
        {/* Parameters can also be passed to individual `track` calls */}
        <button onClick={() => track({ position: 1 })}>Item 1</button>
        <button onClick={() => track({ position: 2 })}>Item 2</button>
      </li>
    </ul>
  );
}
```

`useWT` can be used if seeing the context event parameters is desired

```tsx
function List({ children }) {
  const { track, params } = useWT();

  doSomethingWithPageName(params.pageName);

  return (
    <button onClick={() => track({ label: "Track me!" })}>Track me!</button>
  );
}
```

### Validation

Because event parameters can be spread across nested contexts, it can be useful to validate that required params are present.

```tsx
const validateEvent = (params: any) => {
  // Throw an error in severe cases if desired
  if (params.name === "John Doe") {
    throw new Error("John Doe must remain anonymous!");
  }

  // Returning a false-y value will bypass sending the event.
  return !!params.pageName;
};

const { WTProvider } = createProvider((params) => wt.track(params), {
  validateEvent,
});
```

# Configuration

### Changing the location of the tracking endpoint

By default, `wt` expects the tracker domain to be the same host as the current page.
This can be changed by initializing `wt` with a different `trackerDomain` before tracking:

```js
wt.initialize({
  trackerDomain: "www.my-pixel-endpoint.com",
});
```

### Configuring the tracking cookie

By default, `wt` generates a cookie as a pixel to keep track of a visitor.
This can be changed by initializing `wt` with a different `domain` and `expires` prior to tracking:

```js
wt.initialize({
  cookies: {
    domain: ".example.com",
    expires: 365,
  },
});
```

### Submitting default data for every event

If part of the payload is the same for every event, it can be set once using `set`. For instance calling:

```js
wt.set({
  user: {
    id: 1,
  },
});
```

ensures that the user ID is sent as part of the payload in any event.

Calling `set` multiple times merges values together, preferring new values.

Values already set can be cleared with:

```js
wt.clear();
```

### Lifecycle Events

You may want to subscribe to lifecycle events for the tracker.

```js
import wt, { SEND_COMPLETED } from "@clutter/wt";
wt.subscribe(SEND_COMPLETED, () => {
  console.log("Analytics data sent");
});
```

The lifecycle events are:

- `SEND_STARTED: "send:started"` - the tracker has started sending data via the tracker pixel
- `SEND_COMPLETED: "send:completed"` - the tracker has finished sending data via the tracker pixel
- `QUEUE_COMPLETED: "queue:completed"` - the tracker has finished sending data via the tracker pixel and no additional events are queued
- `QUEUE_CONTINUED: "queue:continued"` - the tracker has finished sending data via the tracker pixel and some additional events are queued

Calling this method will return an `unsubscribe` method. You can use it to stop listening to the event.

```js
import wt, { SEND_COMPLETED } from "@clutter/wt";

const unsub = wt.subscribe(SEND_COMPLETED, () => {
  console.log("Analytics data sent - you'll only see this once");
  unsub();
});
```

# Server Implementation

Events will be sent to the server by one of two methods:

1. A post request with URL encoded query string
2. If the post is unsuccessful, a get request with the same query string to a pixel image

The query string will use the following structure:

```js
{
  events: [
    {
      // The url of the page triggering the event
      url: 'https://www.clutter.com/',
      // Referrer of the page if present
      referrer: '',
      // A uuid which connects all events in a single "pageview" (this is only
      // regenerated on browser navigation, not SPA navigation)
      page_uuid: '5bf86c66-1d3a-4b69-9a4e-e33ce421d791',
      // Epoch MS at the time of the event
      ts: '1634596872864'
      // Known parameters passed to wt.track are converted to snake case and merged with the event
      kind: 'event',
      category: 'user_interaction',
      action: 'click',
      label: 'What\'s your zip code?',
      value: '90232',
      page_name: 'home',
      container: 'hero',
      position: '1',
      object_type: 'button',
      object_name: 'hero_cta',
      // Parameters not included in the above list will be grouped under
      // a single metadata key (without any transformation).
      metadata: {
        variant: 'jungle',
        button_color: 'toucan'
      }
    }
  ],
  dimensions: { width: '1680', height: '916' },
  agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36',
  rts: '1634596873615'
}
```
