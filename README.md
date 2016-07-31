# process-batches

Asynchronously process series in batches.

This module allows you to process series of jobs in chunks of predefined size.
It can process them in parallel.

[![Build Status](https://travis-ci.org/Janpot/process-batches.svg?branch=master)](https://travis-ci.org/Janpot/process-batches)

## Example

```js
var processBatches = require('process-batches');
var BATCH_SIZE = 100;

processBatches(i => {
  var offset = i * BATCH_SIZE;
  var limit = BATCH_SIZE;
  return db.getUsers(offset, limit);
}, {
  concurrency: 5
}, users => {
  console.log(`sending email to ${users.length} users`);
  return Promise.all(users.map(user => {
    return mailSvc.sendEmail(user.email);
  }));
})
  .then(() => {
    console.log('done sending emails');
  });
```

## API

### `processBatches`

```js
processBatches(fetchFn, [options], processFn)
```

Returns a promise that is fulfilled when all the batches are processed.

#### `fetchFn`

```
Function(number index) -> Promise<Array>|Array
```

Function that takes one parameters, the `index` of the batch.
It is used to fetch the batches. It can either return an array or a promise for an array.
To signal the end, either return `null` or an empty array.

#### `options`

This parameter is optional.

```
Object {
  number concurrency = 1
}
```

Configuration for processing. `size` determines the batch sizes.
Use `concurrency` to specify how many batches should be processed in parallel.
Alternatively you can also just pass the batch size as a number.

#### `processFn`

```
Function(Array batch, number index) processFn -> Promise
```

The function that will process the batch. It is passed the current `batch` and `index` of the batch.
If you return a promise, the module will wait until the promise is fulfilled before starting the next batch.

### `processBatches.fromArray`

Same as `processBatches` but accepts an array as the first parameter.
Batches will be constructed from this array. The `options` object accepts a `size` parameter which controls the size of the array chunks to be processed.
The `options` parameter can also be passed as a number as a shorthand for the size.

**Example:**

```js
processBatches([1, 2, 3, 4, 5, 6, 7], 3, batch => {
  console.log(`this batch: [${batch.join(', ')}]!`);
});
// prints:
//   this batch: [1, 2, 3]!
//   this batch: [4, 5, 6]!
//   this batch: [7]!
```
