# wt-javascript

Browser client for clutter wt.

## Installation

`yarn add @clutter/wt`

## Usage

Within a browser environment, `@clutter/wt` will  

```js
import wt from '@clutter/wt';

// optional
wt('initialize', {
  trackerUrl: 'www.my-pixel-endpoint.com/track.gif',
});

// optional - this will be sent with every event
wt('set', {
  user: 'userId',
});

// now track events!
wt('event', {
  custom: 'data',
  action: 'click',
});

// or wt.event({ action: 'click', custom: 'data' });

// now track events!
wt('pageview');
// or wt.pageview()
```

## Api

### wt(*string* kind, *object* params)

Enqueues an event to be sent to the `tracker.gif`

```js
import wt from '@clutter/wt';

wt('event', { hello: 'world' });
// http://pixel.test.com?payload[][kind]=event&payload[][data][hello]=world&payload[][url]=https://<my browser url>&payload[][ts]=1517356691057&agent=<my browser agent>&rts=1517356691561
// sent to tracker.gif
```

### Configuration

#### initialize

Sets global options for analytics.

```js
import wt from '@clutter/wt';

wt('initialize', { trackerUrl: 'https://pixel.clutter.com/tracker.gif' });

wt('event', { hello: 'world' });
// http://pixel.clutter.com?payload[][kind]=event&payload[][metadata][hello]=world&payload[][url]=https://<my browser url>&payload[][ts]=1517356691057&agent=<my browser agent>&rts=1517356691561
// sent to tracker.gif
```

Initialize can be called at any time to change core configuration. The only config option is **trackerUrl**

`wt('inititalize', config: { trackerUrl: string });`

- `inititalized`: string
- **config**: object
  - **trackerUrl**: string - the url of the tracker pixel gif


#### set

Sets default metadata that gets sent with every analytics event.

```js
import wt from '@clutter/wt';

wt('set', { hello: 'world' });

wt('event');
// http://pixel.clutter.com?payload[][kind]=event
//   &payload[][metadata][hello]=world
//   &payload[][url]=https://<my browser url>
//   &payload[][ts]=1517356691057&agent=<my browser agent>
//   &rts=1517356691561
```

Set can be called at any time to change default metadata properties. The resolved property from the set call will be **assigned** to the default metadata properties.

`wt('set', metadata: any);`

- `set`: string
- **metadata**: object | function<object>(metadata: object) - function calls behave like `React.Component().setState()`. Metadata defaults will be passed as the first argument and the result of this function will be assigned to metadata.  

##### Example: Metadata counter with set

```js
import wt from '@clutter/wt';

button.addEventListener(
  'click',
  () => wt(
    'set',
    ({ clickCounter = 0 }) => ({ clickCounter: clickCounter + 1 }),
  ),
);

button.addEventListener(
  'click',
  () => wt('event'),
);

button.click();
// http://pixel.clutter.com?payload[][kind]=event
//   &payload[][clickCounter]=1
//   ...

button.click();
// http://pixel.clutter.com?payload[][kind]=event
//   &payload[][clickCounter]=2
//   ...

```

#### clear 

Resets default metadata that gets sent with every analytics event.

```js
import wt from '@clutter/wt';

wt('set', { hello: 'world' });

wt('clear');

wt('pageview');
// http://pixel.clutter.com?payload[][kind]=pageview
//   &payload[][url]=https://<my browser url>
//   &payload[][ts]=1517356691057
//   &agent=<my browser agent>
//   &rts=1517356691561
```

## License

`wt-javascript` is free software under the MIT license.
