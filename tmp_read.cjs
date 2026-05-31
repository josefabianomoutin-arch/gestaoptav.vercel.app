const fs = require('fs');
console.log(fs.readFileSync('/tmp/3f571ad5c6282325efa763a64aa4cf90', 'utf8').substring(0, 500));
