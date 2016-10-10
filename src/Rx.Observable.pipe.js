const Stream = require('stream');

// # Dev Note
//
// ## Mimic Node stream's `.pipe()` to pipe the stream I/O.
// 
// Node stream's `.pipe()` is implemented in `Readable.prototype.pipe()`.
// 
// The practical approach to pipe a stream is not to implement a Rx's pipe 
// function like what `Readable.prototype.pipe()` does. Just transform the Rx
// observable into a writable Node stream, then pipe into the dest stream, and
// observe the events of the dest stream.
// 
// @see https://github.com/nodejs/readable-stream/blob/v2.1.5/lib/_stream_readable.js#L467
//
// 
// ## Examples about sending the Observable's next value to a writable stream 
//   and turn a readble stream into Observable.
// 
// - `Rx.Node.writeToStream()` - An example from Rx.Observable to Node.Stream
// - `Rx.Node.fromStream()` - An example from Node.Stream to Rx.Observable 
// 
// @see https://github.com/Reactive-Extensions/rx-node/blob/v1.0.1/index.js#L117
// @see https://github.com/Reactive-Extensions/rx-node/blob/master/index.js#L52
// 
// 
// ## Value IO on piping streams of a gulp plugin
//
// A gulp plugin always returns a stream in object mode that does the following:
// 
// 1. Takes in vinyl File objects
// 2. Outputs vinyl File objects (via transform.push() and/or the plugin's callback function)
// 
// @see https://github.com/gulpjs/gulp/blob/master/docs/writing-a-plugin/README.md
// @see https://github.com/gulpjs/vinyl
//


// Use the specific library entity from outside
function use(Rx) {
  
  const debug = (false) ? console.log : (() => {}) ;
  const proto = Rx.Subject.prototype;
  const rxjs5Supported = !!proto.next && !!proto.error && !!proto.complete;
  const callOnNext = (rxjs5Supported) ? "next" : "onNext";
  const callOnError = (rxjs5Supported) ? "error" : "onError";
  const callOnCompleted = (rxjs5Supported) ? "complete" : "onCompleted";
  
  return { pipe, hook };
  
  // ---------------- //
  // Export functions //
  // ---------------- //
  
  // Turn into cold signal; only triggered when it is subscribed.
  function pipe(stream, pipeOpts) {
    const source = this;
    return Rx.Observable.defer(() => {
      const hookFn = (source) => source.pipe(stream);
      return _hook.call(source, hookFn, pipeOpts);
    });
  };
  
  // Turn into cold signal; only triggered when it is subscribed.
  function hook(stream, hookOpts) {
    const source = this;
    return Rx.Observable.defer(() => {
      return _hook.call(source, stream, hookOpts);
    });
  };
  
  // ----------------- //
  // Private functions //
  // ----------------- //
  
  // # How this method works (Rx.Observable -> Node.Stream -> Rx.Observable):
  // 
  // 1. Send the next value to the node stream via `stream.write()` when this 
  //    Rx.Observable receive a next value.
  // 2. Listen any callback from the node stream which we hook in; on specific
  //    callbacks, we transform the events into RxJS world through Rx.Subject;
  // 3. Any subscriber of this returned Rx.Observable will subscribe to the 
  //    Rx.Subject.
  function _hook(hookFn, hookOpts) {
    
    const source$ = this;
    const subject$ = new Rx.Subject();
    
    const writableHook = new Stream.Transform(hookOpts || {objectMode: true});
    writableHook._transform = (chunk, encoding, callback) => { callback(null, chunk); };
    const readableHook = hookFn(writableHook);
    
    const writableListeners = {
      drain: () => {
        // ???: unknown/untested behavior
        debug('> hook(w).onDrain > not handled');
        // source$.resume(); // for pausableBuffered source$
      },
      error: (err) => {
        subjectSendError(subject$, err, cleanup);
      },
      close: (...e) => {
        // ???: unknown/untested behavior
        debug('> hook(B).close > not handled', ...e);
        disposable.unsubscribe();
      }
    };
    
    const readableListeners = {
      data: (chunk) => {
        subjectSendNext(subject$, chunk);
      },
      end: () => {
        subjectSendComplete(subject$, cleanup);
      },      
      error: (err) => {
        subjectSendError(subject$, err, cleanup);
      },
      close: (...e) => {
        // ???: unknown/untested behavior
        debug('> hook(B).close > not handled', ...e);
        disposable.unsubscribe();
      }
    };
    
    const cleanup = () => {
      cleanupListener(writableHook, writableListeners);
      cleanupListener(readableHook, readableListeners);
    };
    
    setupListener(writableHook, writableListeners);
    setupListener(readableHook, readableListeners);
    
    const disposable = source$.subscribe(
      (next) => {
        !writableHook.write(next) /* && source$.pause() // for pausableBuffered source$ */;
      },
      (err) => {
        subjectSendError(subject$, err, cleanup);
      },
      () => {
        // not send complete directly; just tell stream to end.
        writableHook.end();
      }
    );
    
    return subject$;
  };
  
    
  // -------------- //
  // Help functions //
  // -------------- //
  
  function setupListener(stream, eventListeners) {
    Object.keys(eventListeners).forEach(event => {
      stream.addListener(event, eventListeners[event]);
    });
  };
  
  function cleanupListener(stream, eventListeners) {
    Object.keys(eventListeners).forEach(event => {
      stream.removeListener(event, eventListeners[event]);
    });
  };

  function subjectSendNext(subject, next){
    subject[callOnNext](next);
  };
  
  function subjectSendError(subject, err, cleanup) {
    cleanup();
    subject[callOnError](err);
  };
  
  function subjectSendComplete(subject, cleanup) {
    cleanup();
    subject[callOnCompleted]();
  };
}



module.exports = { use };
