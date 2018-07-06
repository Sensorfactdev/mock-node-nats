# `mock-node-nats`

This is a small mocking library aimed at facilitating tests of our NATS-connected services.

It exposes a `NATS` class based on the API provided by [`node-nats`](https://github.com/nats-io/node-nats). It maintains an in-memory "bus" shared accross the class' instances.

**NB**: This is very much a work in progress that fits our particular current needs. Additional development is needed to mock the `node-nats` API more faithfully, e.g. supporting options, completing the signatures of existing methods, etc.


## Installation

```
npm install @sensorfactdev/mock-node-nats
```

## Usage

```js
const NATS = require(@sensorfactdev/mock-node-nats);
const nats = NATS.connect();

// Simple Publisher
nats.publish('subject', 'message!');

// Simple Subscriber
nats.subscribe('subject', msg => {
  console.log(`Received a message: ${msg}`);
});

// Unsubscribing
const sid = nats.subscribe('subject', msg => {});
nats.unsubscribe(sid);

// Request
const sid = nats.request('request', res => {
  console.log(`Received a message: ${res}`););
});

// Access the list of subs (useful for testing)
const subs = nats.subs;

// Close connection
nats.close();

```
