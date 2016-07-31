function fromFetchFn (fetchFn, options, processFn) {
  var optionsObject;
  if (typeof options === 'function') {
    optionsObject = {};
    processFn = options;
  } else {
    optionsObject = options;
  }
  return processBatches(fetchFn, optionsObject, processFn);
}

function tryPromise (fn) {
  try {
    var result = fn();
    return Promise.resolve(result);
  } catch (error) {
    return Promise.reject(error);
  }
}

function processBatches (fetchFn, options, processFn) {
  var concurrency = options.concurrency || 1;
  var currIndex = 0;

  function fetchNextBatch () {
    var index = currIndex;
    var batch = tryPromise(() => fetchFn(index));
    currIndex += 1;
    return batch.then(batch => [batch, index]);
  }

  function processNextBatch () {
    return fetchNextBatch()
      .then(fetchResult => {
        var batch = fetchResult[0];
        var offset = fetchResult[1];

        if (!batch || batch.length <= 0) {
          return Promise.resolve();
        }

        return tryPromise(() => processFn(batch, offset))
          .then(() => processNextBatch());
      });
  }

  var workers = [];
  for (var i = 0; i < concurrency; i++) {
    workers.push(processNextBatch());
  }
  return Promise.all(workers);
}

function fromArray (array, options, processFn) {
  var size = typeof options === 'number' ? options : (options.size || 1);
  return fromFetchFn(i => {
    var fromIndex = i * size;
    var toIndex = fromIndex + size;
    return array.slice(fromIndex, toIndex);
  }, options, processFn);
}

module.exports = fromFetchFn;
module.exports.fromArray = fromArray;
