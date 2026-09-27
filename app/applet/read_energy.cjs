const fs = require("fs");
const db = JSON.parse(fs.readFileSync("servidor-interno-estoque-percapita/server-data/db.json", "utf8"));
console.log(JSON.stringify(db.energyAccountingRecords, null, 2));
