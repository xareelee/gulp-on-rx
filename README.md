# Gulp-on-Rx

[![GitHub version](https://img.shields.io/github/tag/xareelee/gulp-on-rx.svg)](https://github.com/xareelee/gulp-on-rx)
[![npm version](https://img.shields.io/npm/v/gulp-on-rx.svg?maxAge=86400)](https://www.npmjs.com/package/gulp-on-rx)

[Gulp](https://github.com/gulpjs/gulp) is a streaming build system based on Node streams, and [**gulp-on-rx**](https://github.com/xareelee/gulp-on-rx) makes the streaming build system based on [RxJS](https://github.com/ReactiveX/rxjs).

> Currently, **gulp-on-rx** supports both RxJS 4 and RxJS 5.

## Why Gulp-on-Rx

* `gulp.src()` will only watch the initial files and `gulp.watch()` will *run a whole gulp task* when detecting a file changed, which is inefficient. **Gulp-on-Rx** allows you to watch **the initial files and/or the following changes** to pipe file events into the same stream line. 
* **Gulp-on-Rx** provides `Rx.Observable.prototype.hook()` method to pipe upstream values into a Node stream and send the output to the downstream `Rx.Observable` (`Rx.Observable` -> `Node.Stream` -> `Rx.Observable`).
* **Gulp-on-Rx** will always return `Rx.Observable`. You can leverage Rx to compose a complex workflow with *parallel* and/or *sequential* easily.


## How to use gulp-on-rx

Using **gulp-on-rx** is similar to use gulp. 

This is gulp style:

```js
gulp.task('scripts', () => {
  return gulp.src('client/js/**/*.coffee')  // Node.Stream
    .pipe(sourcemaps.init())        // Node.Stream
      .pipe(coffee())               // Node.Stream
      .pipe(uglify())               // Node.Stream
      .pipe(concat('all.min.js'))   // Node.Stream
    .pipe(sourcemaps.write())       // Node.Stream
    .pipe(gulp.dest('build/js'));   // Node.Stream
});
```

This is **gulp-on-rx** style:

```js
var Rx = require('rxjs');
var fsWatch = require('gulp-on-rx').apply(Rx);

gulp.task('scripts', () => {
  return fsWatch.onInitial('client/js/**/*.coffee').vinylify()  // Rx.Observable
    .hook(sourcemaps.init())        // Rx.Observable
      .hook(coffee())               // Rx.Observable
      .hook(uglify())               // Rx.Observable
      .hook(concat('all.min.js'))   // Rx.Observable
    .hook(sourcemaps.write())       // Rx.Observable
    .hook(gulp.dest('build/js'))    // Rx.Observable
    .subscribe();                   // Start running
});
```

or using `.hook()` for a whole node stream pipeline:

```js
var Rx = require('rxjs');
var fsWatch = require('gulp-on-rx').apply(Rx);

gulp.task('scripts', () => {
  return fsWatch.onInitial('client/js/**/*.coffee').vinylify()  // Rx.Observable
    .hook(stream => { return stream   // Using hook block for stream pipeline
      .pipe(sourcemaps.init())          // Node.Stream pipeline
        .pipe(coffee())                 // Node.Stream pipeline
        .pipe(uglify())                 // Node.Stream pipeline
        .pipe(concat('all.min.js'))     // Node.Stream pipeline
      .pipe(sourcemaps.write())         // Node.Stream pipeline
      .pipe(gulp.dest('build/js'));     // Node.Stream pipeline
    })                                // Transform into Rx.Observable
    .subscribe();                     // Start running
});
```




From gulp to gulp-on-rx:

* Import gulp-on-rx by using `require('gulp-on-rx').apply(Rx)` to add `.vinylify()` and `.pipe()` to the prototype of the target `Rx` entity.
* Replace `gulp.src()` with `fsWatch.onInitial().vinylify()` to watch fs events and map them to [vinyl objects](https://github.com/gulpjs/vinyl). 
    * You can use `fsWatch.onAll()` or `fsWatch.onChange()` to watch whole fs events or only changes.
    * The two-step of `fsWatch.on-().vinylify()` separates the watching and wrapping handler.
* Use `.hook()` to hook values with a node stream, and it will return an `Rx.Observable` instead of a `Node.Stream`. `.hook()` accept a node stream or a callback to compose a node stream pipeline.
* Add `.subscribe()` to the last of `Rx.Observable` to start upsteram running.



## API

### `fsWatch.on-(globs, options)` or `Rx.Observable.fsWatch.on-(globs, options)`

`fsWatch` uses [chokidar](https://github.com/paulmillr/chokidar) to watch fs events. It has three kinds of fs events to watch:

* `fsWatch.onAll()`: watch both initial file event and changes.
* `fsWatch.onInitial()`: watch only initial file events; ignore changes.
* `fsWatch.onChange()`: watch only file changes; ignore initial file events.

> Calling `require('gulp-on-rx').apply(Rx)` will inject methods to `Rx.Observable.fsWatch`. You can use `Rx.Observable.fsWatch.onAll`, `Rx.Observable.fsWatch.onInitial`, and `Rx.Observable.fsWatch.onChange` to create the fs watch observable.

The fs events are composed of initial files, a ready signal, and following change after ready.

```
- i: initials (files/dirs)
- r: ready for emitting changes (no path)
- c: changes (files/dirs)
- |: a complete signal in Rx

* Real fs events:     '-i--i--i--i--r--c-----c--'
* fsWatch.onAll:      '-i--i--i--i--r--c-----c--'
* fsWatch.onInitial:  '-i--i--i--i--|'
* fsWatch.onChange:   '             ---c-----c--'
```

Both parameter `globs` and `options` will be passed to [`chokidar.watch`](https://github.com/paulmillr/chokidar#api). You can also set `cwd` and `base` in the `options` for the results.


## `Rx.Observable.prototype.vinylify(options)`

Map a file name to a vinyl object which is used for gulp plugins. It will filter out event other than files by default. You can change `eventFilter` in the `options`:

```js
const vinylifyOpt = {
  eventFilter: ['add', 'change', 'unlink', 'addDir', 'unlinkDir'],  // allow to pass
  ...
};

Rx.Observable.fsWatch.onAll('./src/**/.js')
    .vinylify(vinylifyOpt)
    .hook(...)...;
```

The parameter `options` will be passed to [vinyl-fs](https://github.com/gulpjs/vinyl-fs#options) methods to create vinyl objects.

**Note: `vinylify()` uses functions in vinyl-fs which are async.**


## `Rx.Observable.prototype.hook(pipelinFn)`

Use a callback to compose a node stream pipeline. The method `.hook()` will push `Rx.Observable` values into the node stream pipeline which the block returns, and listen and send the results to downstream observables.

```js
fsWatch.onInitial('client/js/**/*.coffee').vinylify()  // Rx.Observable
  .hook(stream => { // Compose a node stream pipeline
    return stream
      .pipe(...)    // Use Node.Stream's pipe()
      .pipe(...)    // Use Node.Stream's pipe()
      .pipe(...)    // Use Node.Stream's pipe()
  })                // `hook()` returns a Rx.Observable for the pipeline
  .pipe(...)        // Use Rx.Observable's pipe()
  .pipe(...)        // Use Rx.Observable's pipe()
  ...
```

`.hook()` also accept a stream parameter, it will automatically wrap it into a callback to process. The following is an example to hook just one node stream.

```js
fsWatch.onInitial('client/js/**/*.coffee').vinylify()  // Rx.Observable
  .hook(coffee())  // hook a node steram
  ...
```

same as

```js
fsWatch.onInitial('client/js/**/*.coffee').vinylify()  // Rx.Observable
  .hook(stream => stream.pipe(coffee()))   // hook a node stream pipeline with a callback
  ...
```




## Contribution

Any contribution is welcome.


## Lisence

**Gulp-on-Rx** is released under MIT.

