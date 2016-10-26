function filterSinceSync(d) {
  var isValid = typeof d === 'number' ||
    d instanceof Number ||
    d instanceof Date;

  if (!isValid) {
    throw new Error('expected since option to be a date or a number');
  }
  
  return file.stat && file.stat.mtime > d;  
};

module.exports = filterSinceSync;