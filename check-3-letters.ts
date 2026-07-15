import { getDatabase, ref, get } from 'firebase/database';
import { initializeApp } from 'firebase/app';
import fs from 'fs';

const firebaseAppletConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const firebaseConfig = {
  ...firebaseAppletConfig,
  databaseURL: `https://${firebaseAppletConfig.projectId}-default-rtdb.firebaseio.com`
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function run() {
  console.log("Checking all collections for 3-letter supplier names or similar...");
  
  // 1. Suppliers
  const snapSup = await get(ref(db, 'suppliers'));
  if (snapSup.exists()) {
    const data = snapSup.val();
    for (const [key, val] of Object.entries(data)) {
      const s = val as any;
      if (s.name && s.name.trim().length <= 4) {
        console.log(`Supplier under key ${key} has short name: "${s.name}"`);
      }
    }
  }

  // 2. perCapitaConfig
  const snapPc = await get(ref(db, 'perCapitaConfig'));
  if (snapPc.exists()) {
    const data = snapPc.val();
    for (const listKey of ['ppaisProducers', 'pereciveisSuppliers', 'estocaveisSuppliers']) {
      const list = data[listKey];
      if (Array.isArray(list)) {
        list.forEach((item, idx) => {
          if (item && item.name && item.name.trim().length <= 4) {
            console.log(`PerCapita ${listKey} [${idx}] has short name: "${item.name}"`);
          }
        });
      } else if (list && typeof list === 'object') {
        for (const [subKey, subVal] of Object.entries(list)) {
          const item = subVal as any;
          if (item && item.name && item.name.trim().length <= 4) {
            console.log(`PerCapita ${listKey} [${subKey}] has short name: "${item.name}"`);
          }
        }
      }
    }
  }

  // 3. Let's see if there is any other place, like a truncation function in the frontend code
  console.log("Done checking database.");
  process.exit(0);
}

run().catch(console.error);
