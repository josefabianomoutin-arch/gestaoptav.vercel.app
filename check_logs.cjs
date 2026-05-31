const fs = require('fs');
try {
  console.log(fs.readdirSync('/.gemini/antigravity/brain/17789a0c-cae7-4825-80e3-69ad79e7f5a6/.system_generated/logs/'));
} catch (e) {
  console.log(e.message);
}
