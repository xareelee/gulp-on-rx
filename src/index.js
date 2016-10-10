function use(Rx) {
  const vinylify = require('./Rx.Observable.vinylify.js').use(Rx);
  const hook = require('./Rx.Observable.pipe.js').use(Rx);
  const fsWatch = require('./FSWatchRxify.js').use(Rx);
  return Object.assign({}, vinylify, hook, fsWatch);
}

// Apply functions to the prototype
const applied = {};
function apply(Rx) {
  if (applied[Rx]) return applied[Rx];
  
  const func = applied[Rx] = use(Rx);
  
  if (!Rx.Observable.fsWatch) Rx.Observable.fsWatch = {};
  Rx.Observable.fsWatch.watch = func.watch;
  Rx.Observable.fsWatch.onAll = func.onAll;
  Rx.Observable.fsWatch.onInitial = func.onInitial;
  Rx.Observable.fsWatch.onChange = func.onChange;
  Rx.Observable.prototype.hook = func.hook;
  Rx.Observable.prototype.pipe = func.pipe;
  Rx.Observable.prototype.vinylify = func.vinylify;
  
  return func;
}

module.exports = { use, apply };