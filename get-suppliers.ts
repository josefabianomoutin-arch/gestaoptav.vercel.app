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
  console.log("Fetching suppliers...");
  const snap = await get(ref(db, 'suppliers'));
  if (snap.exists()) {
    const data = snap.val();
    console.log("Found", Object.keys(data).length, "suppliers:");
    for (const [key, val] of Object.entries(data)) {
      const s = val as any;
      console.log(`- CPF/CNPJ: ${key}, Name: ${s.name}, Type: ${s.type || 'N/A'}`);
      console.log(`  contractItems type: ${typeof s.contractItems}, isArray: ${Array.isArray(s.contractItems)}`);
      if (s.contractItems) {
        console.log(`  contractItems keys/length:`, Object.keys(s.contractItems));
        console.log(`  contractItems sample:`, JSON.stringify(s.contractItems).substring(0, 300));
      }
    }
  } else {
    console.log("No suppliers found.");
  }
}

run().catch(console.error);
