const fs = require('fs');
const path = require('path');

function findFileSync(startDir, fileName) {
    const files = fs.readdirSync(startDir, { withFileTypes: true });
    for (const file of files) {
        if (file.isDirectory()) {
            const found = findFileSync(path.join(startDir, file.name), fileName);
            if (found) return found;
        } else if (file.name === fileName) {
            return path.join(startDir, file.name);
        }
    }
    return null;
}

try {
  console.log(findFileSync('/', 'transcript.jsonl'));
} catch(e) {}
try {
  console.log(findFileSync('/app', 'transcript.jsonl'));
} catch(e) {}
