function _processBatches (source, options, processFn) {
  var optionsObject;
  var fetchFn;
  if (typeof options === 'number') {
    optionsObject = { size: options };
  } else {
    optionsObject = options;
  }
  if (Array.isArray(source)) {
    fetchFn = (offset, limit) => source.slice(offset, offset + limit);
  } else {
    fetchFn = source;
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
  var size = options.size;
  var concurrency = options.concurrency || 1;
  var currIndex = 0;

  function fetchNextBatch () {
    var offset = currIndex;
    currIndex = offset + size;
    var batch = tryPromise(() => fetchFn(offset, size));
    return batch.then(batch => [batch, offset]);
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

module.exports = _processBatches;
