/* global describe, it */

var processBatches = require('..');
var assert = require('chai').assert;

function delay (time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

function fromArray (array, batchSize = 1) {
  return i => {
    var fromIndex = i * batchSize;
    var toIndex = fromIndex + batchSize;
    return array.slice(fromIndex, toIndex);
  };
}

describe('processBatches', function () {
  it('maps empty iterator', function () {
    return processBatches(() => null, 2, batch => {
      throw new Error('shouldn\'t be called');
    });
  });

  it('passes index', function () {
    var indices = [];
    return processBatches(fromArray([1, 2, 3, 4, 5], 2), (batch, offset) => {
      indices.push(offset);
    })
      .then(() => assert.deepEqual(indices, [0, 1, 2]));
  });

  it('does promises', function () {
    var batches = [];
    var counter = 0;
    return processBatches(fromArray([1, 2, 3, 4, 5, 6], 2), batch => {
      assert.strictEqual(counter, 0);
      batches.push(batch);
      counter += 1;
      return delay(100)
        .then(() => {
          counter -= 1;
        });
    })
      .then(() => {
        assert.deepEqual(batches, [[1, 2], [3, 4], [5, 6]]);
      });
  });

  it('fails on error', function () {
    var batches = [];
    var error = new Error('test');
    return processBatches(fromArray([1, 2], 1), batch => {
      batches.push(batch);
      return Promise.reject(error);
    })
      .then(() => {
        throw new Error('expected to fail');
      }, err => {
        assert.deepEqual(batches, [[1]]);
        assert.strictEqual(err, error);
      });
  });

  it('fails on synchronous error', function () {
    var batches = [];
    var error = new Error('test');
    return processBatches(fromArray([1, 2], 1), batch => {
      batches.push(batch);
      throw error;
    })
      .then(() => {
        throw new Error('expected to fail');
      }, err => {
        assert.deepEqual(batches, [[1]]);
        assert.strictEqual(err, error);
      });
  });

  it('can use a fetch function', function () {
    var batches = [];
    var input = [[1, 2], [3, 4, 5], []];
    return processBatches(() => {
      return input.shift();
    }, 2, batch => {
      batches.push(batch);
    })
      .then(() => {
        assert.deepEqual(batches, [[1, 2], [3, 4, 5]]);
      });
  });

  it('can use an async fetch function', function () {
    var batches = [];
    var input = [[1, 2], [3, 4, 5], []];
    return processBatches(() => {
      return Promise.resolve(input.shift());
    }, 2, batch => {
      batches.push(batch);
    })
      .then(() => {
        assert.deepEqual(batches, [[1, 2], [3, 4, 5]]);
      });
  });

  it('handles exceptions in the fetch function', function () {
    var error = new Error('test');
    return processBatches(() => {
      throw error;
    }, 2, batch => {
      throw new Error('not supposed to be called');
    })
      .then(() => {
        throw new Error('not supposed to be resolved');
      }, err => assert.strictEqual(err, error));
  });

  it('handles rejections in the fetch function', function () {
    var error = new Error('test');
    return processBatches(() => {
      return Promise.reject(error);
    }, 2, batch => {
      throw new Error('not supposed to be called');
    })
      .then(() => {
        throw new Error('not supposed to be resolved');
      }, err => assert.strictEqual(err, error));
  });

  it('can end the sequence on null', function () {
    var batches = [];
    var input = [[1, 2], [3, 4, 5], null];
    return processBatches(() => {
      return Promise.resolve(input.shift());
    }, 2, batch => {
      batches.push(batch);
    })
      .then(() => {
        assert.deepEqual(batches, [[1, 2], [3, 4, 5]]);
      });
  });

  it('can process concurrently', function () {
    var batches = [];
    var indices = [];
    var counter = 0;
    var delays = [50, 100, 70, 30, 30];
    var counts = [];
    return processBatches(fromArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 2), {
      concurrency: 3
    }, (batch, offset) => {
      counter += 1;
      counts.push(counter);
      batches.push(batch);
      indices.push(offset);
      return delay(delays.shift())
        .then(() => {
          counter -= 1;
        });
    })
      .then(() => {
        assert.deepEqual(batches, [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]]);
        assert.deepEqual(indices, [0, 1, 2, 3, 4]);
        assert.deepEqual(counts, [1, 2, 3, 3, 3]);
      });
  });
});
