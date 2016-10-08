function use(Rx) {
  const vinylify = require('./Rx.Observable.vinylify.js').use(Rx);
  const hook = require('./Rx.Observable.pipe.js').use(Rx);
  const fsWatchRxify = require('./FSWatchRxify.js').use(Rx);
  return Object.assign({}, vinylify, hook, fsWatchRxify);
}

function apply(Rx) {
  const vinylify = require('./Rx.Observable.vinylify.js').apply(Rx);
  const hook = require('./Rx.Observable.pipe.js').apply(Rx);
  const fsWatchRxify = require('./FSWatchRxify.js').apply(Rx);
  return Object.assign({}, vinylify, hook, fsWatchRxify);
}

module.exports = { use, apply };