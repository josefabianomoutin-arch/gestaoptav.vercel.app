const fs = require('fs');
fs.readdirSync('/tmp').forEach(f => console.log(f));
