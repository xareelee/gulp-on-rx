const Path = require('path');
const chokidar = require('chokidar');
const globParent = require('glob-parent');
const resolveGlob = require('to-absolute-glob');

// Apply functions to the prototype
const applied = {};
function apply(Rx) {
  if (applied[Rx]) return applied[Rx];
  const func = applied[Rx] = use(Rx);
  Rx.Observable.fsWatch = func;
  return func;
}


// Use the specific library entity from outside
function use(Rx) {
  
  // To support both RxJS 4 and RxJS 5
  const proto = Rx.Subject.prototype;
  var rxjs5Supported = !!proto.next && !!proto.error && !!proto.complete;
  const callOnNext = (rxjs5Supported) ? "next" : "onNext";
  const callOnError = (rxjs5Supported) ? "error" : "onError";
  const callOnCompleted = (rxjs5Supported) ? "complete" : "onCompleted";

  return { watch, onAll, onInitial, onChange };
  
  /*
   * Use chokidar to observe file system events and send events by Rx.Observable.
   * 
   * The `next` value of Observable should be an object containing `event` and 
   * `path`. Possible event types:
   * 
   * - `add`: file has been added.
   * - `change`: file has been changed/modified.
   * - `unlink`: file has been removed.
   * - `addDir`: directory has been added.
   * - `unlinkDir`: directory has been removed.
   * - `ready`: initial scan completes; ready for changes (only for `onAll()`). 
   *   The event doesn't have `path` value.
   * 
   * @param  {(string|string[])} globs - A glob pattern for `chokidar.watch()` to match files/dirs.
   * @param  {Object} options - For `chokidar.watch()`.
   * @param  {Function} eventBindings - A callback for binding node stream events with `subscriber`.
   * @return {Observable} - a Rx.Observable sending events from `chokidar.watch()`.
   * 
   * @see {@link https://github.com/paulmillr/chokidar}
   */
  function watch(globs, opt, eventBindings) {
    const sepRe = (process.platform === 'win32' ? /[\/\\]/ : /\/+/);
    const cwd = opt.cwd || process.cwd();
    const base = (opt.cwdbase) ? cwd : getBasePath(globs, opt);
    
    // Match to the glob-stream format with extra prop `event`.
    // 
    // @see {@link https://github.com/gulpjs/glob-stream/blob/v5.3.4/index.js#L49}
    function fileEventWrapper(event, filename) {
      const path = (filename) ? Path.normalize(filename) : undefined
      return { event, path, cwd, base };
    };
    
    // @see {@link https://github.com/gulpjs/glob-stream/blob/v5.3.4/index.js#L193}
    function getBasePath(ourGlob, opt) {
      var basePath;
      var parent = globParent(ourGlob);
      
      if (parent === '/' && opt && opt.root) {
        basePath = Path.normalize(opt.root);
      } else {
        basePath = resolveGlob(parent, opt);
      }
      
      if (!sepRe.test(basePath.charAt(basePath.length - 1))) {
        basePath += Path.sep;
      }
      
      return basePath;
    }

    return Rx.Observable.create((subscriber) => {
      const fsWatcher = chokidar.watch(globs, opt);
      const bindings = eventBindings(subscriber, fileEventWrapper);
      Object.keys(bindings).forEach(event => {
        fsWatcher.on(event, bindings[event])
      });
      return () => {
        fsWatcher.close();
      }
    });
  }
  
  
  /**
   * An Observable sending file/dir events for both **initials** and **changes**.
   * 
   * - i: initials (files/dirs)
   * - r: ready for emitting changes
   * - c: changes (files/dirs)
   * 
   * real-event:       '-i--i--i--i--r--c-----c--'
   * fsWatch-sending:  '-i--i--i--i--r--c-----c--'
   */
  function onAll(globs, options) {
    
    const overridingOpts = {
      persistent: true,
      ignoreInitial: false
    };
    const opts = Object.assign({}, options, overridingOpts);
    
    return watch(globs, opts, (subscriber, wrapFileEvent) => ({
      all: (event, path) => subscriber[callOnNext](wrapFileEvent(event, path)),
      ready: () => subscriber[callOnNext](wrapFileEvent('ready')),   // send ready as next
      error: (error) => subscriber[callOnError](error)
    }));  
  }

  /**
   * An Observable sending file/dir events for **ONLY initials**. Drop the change 
   * events and send `complete` when ready.
   * 
   * - i: initials (files/dirs)
   * - r: ready for emitting changes
   * - c: changes (files/dirs)
   * - |: complete
   * 
   * real-event:       '-i--i--i--i--r--c-----c--'
   * fsWatch-sending:  '-i--i--i--i--|'
   */
  function onInitial(globs, options) {
    
    const overridingOpts = {
      persistent: false,
      ignoreInitial: false
    };
    const opts = Object.assign({}, options, overridingOpts);
    
    return watch(globs, opts, (subscriber, wrapFileEvent) => ({
      all: (event, path) => subscriber[callOnNext](wrapFileEvent(event, path)),
      ready: () => subscriber[callOnCompleted](),       // send ready as complete
      error: (error) => subscriber[callOnError](error)
    }));
  }

  /*
   * An Observable sending file/dir events for **ONLY changes**. Drop the initials
   * and ready events.
   * 
   * - i: initials (files/dirs)
   * - r: ready for emitting changes
   * - c: changes (files/dirs)
   * 
   * real-event:       '-i--i--i--i--r--c-----c--'
   * fsWatch-sending:  '             ---c-----c--'
   */
  function onChange(globs, options) {
    
    const overridingOpts = {
      persistent: true,
      ignoreInitial: true
    };
    const opts = Object.assign({}, options, overridingOpts);
    
    return watch(globs, opts, (subscriber, wrapFileEvent) => ({
      all: (event, path) => subscriber[callOnNext](wrapFileEvent(event, path)),
      error: (error) => subscriber[callOnError](error)       // don't send ready
    }));
  };
}



module.exports = { use, apply };
