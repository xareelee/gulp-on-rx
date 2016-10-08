# Gulp-on-Rx

[Gulp](https://github.com/gulpjs/gulp) is a streaming build system based on Node streams, and [**gulp-on-rx**](https://github.com/xareelee/gulp-on-rx) makes the streaming build system based on [RxJS](https://github.com/ReactiveX/rxjs).

## Why Gulp-on-Rx

* `gulp.src()` will only watch the initial files and `gulp.watch()` will *run a whole gulp task* when detecting a file changed, which is inefficient. **Gulp-on-Rx** allows you to watch **the initial files and/or the following changes** to pipe file events into the same stream line. 
* **Gulp-on-Rx** provides `Rx.Observable.prototype.pipe()` method to pipe upstream values into a Node stream and send the output to the downstream `Rx.Observable` (`Rx.Observable` -> `Node.Stream` -> `Rx.Observable`).
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
    .pipe(sourcemaps.init())        // Rx.Observable
      .pipe(coffee())               // Rx.Observable
      .pipe(uglify())               // Rx.Observable
      .pipe(concat('all.min.js'))   // Rx.Observable
    .pipe(sourcemaps.write())       // Rx.Observable
    .pipe(gulp.dest('build/js'))    // Rx.Observable
    .subscribe();                   // Start running
});
```

From gulp to gulp-on-rx:

* Import gulp-on-rx by using `require('gulp-on-rx').apply(Rx)` to add `.vinylify()` and `.pipe()` to the prototype of the target `Rx` entity.
* Replace `gulp.src()` with `fsWatch.onInitial().vinylify()` to watch fs events and map them to [vinyl objects](https://github.com/gulpjs/vinyl). 
    * You can use `fsWatch.onAll()` or `fsWatch.onChange()` to watch whole fs events or only changes.
    * The two-step of `fsWatch.on-().vinylify()` separates the watching and wrapping handler.
* Still use `.pipe()` to pipe values into a node stream, but it will return an `Rx.Observable` instead of a `Node.Stream`.
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
    .pipe(...)...;
```

The parameter `options` will be passed to [vinyl-fs](https://github.com/gulpjs/vinyl-fs#options) methods to create vinyl objects.

**Note: `vinylify()` uses functions in vinyl-fs which are async.**



## `Rx.Observable.prototype.pipe(stream)`

Pipe `Rx.Observable` events into a node stream which should be both `Writable` and `Readable`, and send the results to downstream `Rx.Observable`.



## Contribution

Any contribution is welcome.


## Lisence

**Gulp-on-Rx** is released under MIT.

