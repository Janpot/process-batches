/* global describe, it */

var batchProcess = require('..');
var assert = require('chai').assert;

function delay (time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

describe('batchProcess', function () {
  it('maps arrays in batches', function () {
    var batches = [];
    return batchProcess([1, 2, 3, 4, 5, 6], 2, batch => batches.push(batch))
      .then(() => assert.deepEqual(batches, [[1, 2], [3, 4], [5, 6]]));
  });

  it('maps empty array', function () {
    return batchProcess([], 2, batch => {
      throw new Error('shouldn\'t be called');
    });
  });

  it('passes offset', function () {
    var offsets = [];
    return batchProcess([1, 2, 3, 4, 5], 2, (batch, offset) => {
      offsets.push(offset);
    })
      .then(() => assert.deepEqual(offsets, [0, 2, 4]));
  });

  it('larger batch size than source array', function () {
    var batches = [];
    return batchProcess([1, 2, 3], 4, batch => batches.push(batch))
      .then(() => assert.deepEqual(batches, [[1, 2, 3]]));
  });

  it('cuts off last batch', function () {
    var batches = [];
    return batchProcess([1, 2, 3, 4, 5], 3, batch => batches.push(batch))
      .then(() => assert.deepEqual(batches, [[1, 2, 3], [4, 5]]));
  });

  it('does promises', function () {
    var batches = [];
    var counter = 0;
    return batchProcess([1, 2, 3, 4, 5, 6], 2, batch => {
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
    return batchProcess([1, 2], 1, batch => {
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
    return batchProcess([1, 2], 1, batch => {
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
    return batchProcess((offset, limit) => {
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
    return batchProcess((offset, limit) => {
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
    return batchProcess((offset, limit) => {
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
    return batchProcess((offset, limit) => {
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
    return batchProcess((offset, limit) => {
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
    var offsets = [];
    var counter = 0;
    var delays = [50, 100, 70, 30, 30];
    var counts = [];
    return batchProcess([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], {
      size: 2,
      concurrency: 3
    }, (batch, offset) => {
      counter += 1;
      counts.push(counter);
      batches.push(batch);
      offsets.push(offset);
      return delay(delays.shift())
        .then(() => {
          counter -= 1;
        });
    })
      .then(() => {
        assert.deepEqual(batches, [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]]);
        assert.deepEqual(offsets, [0, 2, 4, 6, 8]);
        assert.deepEqual(counts, [1, 2, 3, 3, 3]);
      });
  });
});
