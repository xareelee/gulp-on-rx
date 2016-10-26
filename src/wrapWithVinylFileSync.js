var fs = require('graceful-fs');
var File = require('vinyl');

// sync version of `wrapWithVinylFile` in `vinyl-fs` library.
function wrapWithVinylFileSync(options) {
  return function resolveFile(globFile) {
    
    const stat = fs.lstatSync(globFile.path);
    globFile.stat = stat;
    
    // recursively find the real path if needs to follow symlinks
    if (stat.isSymbolicLink() && options.followSymlinks) {
      const filePath = fs.realpathSync(globFile.path);
      if (!globFile.originalSymlinkPath) {
        // Store the original symlink path before the recursive call
        // to later rewrite it back.
        globFile.originalSymlinkPath = globFile.path;
      }
      globFile.path = filePath;
      return resolveFile(globFile);
    }
    
    const vinylFile = new File(globFile);
    
    if (globFile.originalSymlinkPath) {
      // If we reach here, it means there is at least one
      // symlink on the path and we need to rewrite the path
      // to its original value.
      // Updated file stats will tell getContents() to actually read it.
      vinylFile.path = globFile.originalSymlinkPath;
    }

    return vinylFile;
  };
};



module.exports = wrapWithVinylFileSync;