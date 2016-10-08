// Import vinyl-fs@2.4.3 stream functions
const wrapWithVinylFile = require('vinyl-fs/lib/src/wrapWithVinylFile');
const filterSince = require('vinyl-fs/lib/filterSince');
const getContents = require('vinyl-fs/lib/src/getContents');


// Apply functions to the prototype
const applied = {};
function apply(Rx) {
  if (applied[Rx]) return applied[Rx];
  const func = applied[Rx] = use(Rx);
  Rx.Observable.prototype.vinylify = func.vinylify;
  return func;
}


// Use the specific library entity from outside
function use(Rx) {
  
  return { vinylify };
  
  // `vinylify()` will filter the file event and then map a passed value to Vinyl.
  //
  // @param filter An array or a string. The possible values are `add`, `change`,
  // `unlink`, `addDir`, `unlinkDir`, and `all` (default is `['add', 'change']`).
  function vinylify(opt = {}) {
    
    const debug = (false) ? console.log : (() => {}) ;
    
    const options = Object.assign({
      // For whitelist filter
      eventFilter: ['add', 'change', 'unlink'],
      
      // For creating vinyl file (followSymlinks)
      followSymlinks: true,
      
      // For reading the file into buffer (getContents)
      read: true,
      buffer: true,
      stripBOM: true,
      
    }, opt);
    
    debug('vinylify options:', options);
    
    // whitelist: list the fs.events which we allow to pass the filter.
    const eventFilter = extract(options, "eventFilter");
    const filtered$ = filterByWhitelist(this, eventFilter);
    
    // Map to a vinyl file for gulp stream.
    const vinyl$ = mapToVinyl(filtered$, options);
    
    return vinyl$;
    
    // ---------
    // Functions
    // ---------
    
    function extract(obj, key) { 
      const val = obj[key];
      delete obj[key];
      return val;
    };
    
    // Whitelist
    // 
    // * Filter the proerty `type` of the stream values from this Observable 
    //   against the whitelist parameter `filter`.
    // * ['all', ...] or 'all' will not filter stream values (pass_all_mode).
    // * [...] or single string value, e.g. 'add', will filter stream values by
    //   the whitelist (filter_mode).
    // * If the stream value doesn't contain the `type` property, then it won't
    //   do filter.
    function normalizeWhitelist(eventTypes) {
      let whitelist = eventTypes;
      
      // Normalize into an array
      if (typeof whitelist === 'string' || whitelist instanceof String) {
        whitelist = [whitelist];
        
      } else if (!Array.isArray(whitelist)) {
        const err = new Error('The parameter `filter` of `vinylify()` should be an valid array or string.');
        throw(err);
        // Returning an empty array will filter out all event types.
        whitelist = [];
      }
      
      // Replace for keywords
      const validList = ['add', 'change', 'unlink', 'addDir', 'unlinkDir'];
      if (whitelist.includes('allValid')) {
        // All valid file/dir event types having a path.
        whitelist = validList;
        
      } else if (whitelist.includes('passAll')) {
        // Returning a null will allow to pass all event types.
        whitelist = null;
        
      } else {
        whitelist = intersect(validList, whitelist);
      }
      
      return whitelist;
      
      function union(...arrays) {
        const _union = {};
        arrays.forEach(array => {
          array.forEach(v => {
            var x = _union[v];
            _union[v] = (x) ? (x+1) : 1;
          });
        });
        return Object.keys(_union);
      }
      
      function intersect(...arrays) {
        const _union = {};
        const count = arrays.length;
        arrays.forEach(array => {
          array.forEach(v => {
            var x = _union[v];
            _union[v] = (x) ? (x+1) : 1;
          });
        });
        return Object.keys(_union).filter(v => _union[v] === count);
      }
    };
    
    function filterByWhitelist(source, whitelist) {
      const normalizedWhitelist = normalizeWhitelist(eventFilter);
      // an empty whitelist will filter out all event types.
      // a null whitelist will allow to pass all event types.
      return (normalizedWhitelist) 
        ? source.filter(match => normalizedWhitelist.includes(match.event))
        : source;  // don't filter
    }
    
    // We follow gulp using vinyl-fs to generate a Vinyl file:
    // 
    // * use Vinyl to create a vinyl file
    // * use graceful-fs to update `stat`
    // 
    // @see https://github.com/gulpjs/vinyl-fs/blob/v2.4.3/lib/src/index.js#L15
    function mapToVinyl(source, options) {
      // Don't pass `read` option on to through2
      const read = extract(options, "read");
    
      let vinyl$ = source.pipe(wrapWithVinylFile(options));
      
      if (options.since != null) {
        vinyl$ = vinyl$.pipe(filterSince(options.since));
      }
      
      if (read) {
        vinyl$ = vinyl$.pipe(getContents(options));
      }
      return vinyl$;
    }
  }
}



module.exports = { use, apply };
