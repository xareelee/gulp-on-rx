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



// Apply functions to the prototype
const applied = {};
function apply(Rx) {
  if (applied[Rx]) return applied[Rx];
  const func = applied[Rx] = use(Rx);
  Rx.Observable.prototype.pipe = func.pipe;
  return func;
}


// Use the specific library entity from outside
function use(Rx) {
  
  const debug = (false) ? console.log : (() => {}) ;
  const proto = Rx.Subject.prototype;
  const rxjs5Supported = !!proto.next && !!proto.error && !!proto.complete;
  const callOnNext = (rxjs5Supported) ? "next" : "onNext";
  const callOnError = (rxjs5Supported) ? "error" : "onError";
  const callOnCompleted = (rxjs5Supported) ? "complete" : "onCompleted";
  
  return { pipe };
  
  // ---------------- //
  // Export functions //
  // ---------------- //
  
  // # How this method works (Rx.Observable -> Node.Stream -> Rx.Observable):
  // 
  // 1. Send the next value to the node stream via `stream.write()` when this 
  //    Rx.Observable receive a next value.
  // 2. Listen any callback from the node stream which we pipe to; on specific
  //    callbacks, we transform the events into RxJS world through Rx.Subject;
  // 3. Any subscriber of this returned Rx.Observable will subscribe to the 
  //    Rx.Subject.
  function _pipe(stream, pipeOpts) {
    
    const source$ = this; // should call `.pausableBuffered()`;
    const subject$ = new Rx.Subject();
    
    // Build the stream line (Rx.Observable -> Node.Stream -> Rx.Observable)
    // Possible stream events:
    // @see https://nodejs.org/api/stream.html#stream_event_pipe
    const streamEventListeners = {
      // writable events
      drain: () => {
        // ???: unknown/untested behavior
        debug('> pipe(w).onDrain > not handled');
        // source$.resume(); // for pausableBuffered source$
      },
      
      // readable events
      data: (chuck) => {
        subjectSendNext(subject$, chuck);
      },
      end: () => {
        subjectSendComplete(subject$);
      },
      
      // both writable and readable events
      error: (err) => {
        subjectSendError(subject$, err);
      },
      close: (...e) => {
        // ???: unknown/untested behavior
        debug('> pipe(B).close > not handled', ...e);
        disposable.unsubscribe();
      }
    };
    setupListener(stream, streamEventListeners);
    
    const disposable = source$.subscribe(
      (next) => {
        !stream.write(next) /* && source$.pause() // for pausableBuffered source$ */;
      },
      (err) => {
        subjectSendError(subject$, err);
      },
      () => {
        // not send complete directly; just tell stream to end.
        stream.end();
      }
    );
    
    return subject$;
  };


  // Turn into cold signal; only triggered when it is subscribed.
  function pipe(stream, pipeOpts) {
    const source = this;
    return Rx.Observable.defer(() => {
      return _pipe.call(source, stream, pipeOpts);
    });
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
  
  function subjectSendError(subject, err) {
    cleanupListener(stream, streamEventListeners);
    subject[callOnError](err);
  };
  
  function subjectSendComplete(subject) {
    cleanupListener(stream, streamEventListeners);
    subject[callOnCompleted]();
  };
}



module.exports = { use, apply };
