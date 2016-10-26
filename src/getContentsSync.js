var fs = require('graceful-fs');
var stripBom = require('strip-bom');
var lazystream = require('lazystream');

// ----------------------------------------------------
// sync version of `getContents` in `vinyl-fs` library.
// ----------------------------------------------------
function getContentsSync(opt) {
  
  return function mapContent(file) {
    // Don't fail to read a directory
    if (file.isDirectory()) {
      return readDirSync(file, opt);
    }

    // Process symbolic links included with `followSymlinks` option
    if (file.stat && file.stat.isSymbolicLink()) {
      return readSymbolicLinkSync(file, opt);
    }
    
    // Read and pass full contents
    if (opt.buffer !== false) {
      return bufferFileSync(file, opt);
    }
    
    // Don't buffer anything - just pass streams
    return streamFileSync(file, opt);
  }
  
}

function readDirSync(file, opt) {
  // Do nothing for now
  return file;
}

function readSymbolicLinkSync(file, opt) {
  const target = fs.readlinkSync(file.path);
  file.symlink = target;
  return file;
}

function bufferFileSync(file, opt) {
  const data = fs.readFileSync(file.path);
  file.contents = (opt.stripBOM) ? stripBom(data) : data;
  return file;
}

function streamFileSync(file, opt) {

  var filePath = file.path;

  file.contents = new lazystream.Readable(function() {
    return fs.createReadStream(filePath);
  });

  if (opt.stripBOM) {
    file.contents = file.contents.pipe(stripBom());
  }

  return file;
}


module.exports = getContentsSync;
