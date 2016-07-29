# batch-process

Asynchronously process series in batches.

This module allows you to process series of jobs in chunks of predefined size.
It can process them in parallel.

[![Build Status](https://travis-ci.org/Janpot/batch-process.svg?branch=master)](https://travis-ci.org/Janpot/batch-process)

## Example

```js
var processBatches = require('batch-process');

processBatches((offset, limit) => {
  return db.getUsers(offset, limit);
}, {
  size: 10,
  concurrency: 5
}, users => {
  console.log(`sending email to ${users.length} users`);
  return Promise.all(users.map(user => {
    return sendEmail(user.email);
  }));
})
  .then(() => {
    console.log('done sending emails')
  });
```

## API

```js
processBatches(source, options, processFn)
```

Returns a promise that is fulfilled when all the batches are processed.

### `source`

```
Function(number offset, number limit) -> Promise<Array>|Array
```

```
Array
```

Function that takes two parameters, `offset` and `limit`.
It is used to fetch the batches. It can either return an array or a promise.
To signal the end, either return `null` or an empty array.
Alternatively this parameter can also be just a array which will be sliced to form the batches.

### `options`

```
Object {
  number size,
  number concurrency = 1
}
```

```
number
```

Configuration for processing. `size` determines the batch sizes.
Use `concurrency` to specify how many batches should be processed in parallel.
Alternatively you can also just pass the batch size as a number.

### `processFn`

```
Function(Array batch, number offset) processFn -> Promise
```

The function that will process the batch. It is passed the current `batch` and `offset`.
If you return a promise, the module will wait until the promise is fulfilled before starting the next batch.
