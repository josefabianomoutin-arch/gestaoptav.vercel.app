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
  console.log("Searching for Lucimara in perCapitaConfig...");
  const snap = await get(ref(db, 'perCapitaConfig'));
  if (snap.exists()) {
    const data = snap.val();
    for (const key of Object.keys(data)) {
      const list = data[key];
      if (Array.isArray(list)) {
        list.forEach((item, idx) => {
          if (item && item.name && item.name.includes("LUCIMARA")) {
            console.log(`FOUND in key: ${key}, idx: ${idx}`);
            console.log(`Item structure:`, JSON.stringify(item, null, 2));
          }
          if (item && item.name && item.name.includes("WALACE")) {
            console.log(`FOUND WALACE in key: ${key}, idx: ${idx}`);
            console.log(`Item structure:`, JSON.stringify(item, null, 2));
          }
        });
      } else if (list && typeof list === 'object') {
        for (const [subKey, subVal] of Object.entries(list)) {
          const item = subVal as any;
          if (item && item.name && item.name.includes("LUCIMARA")) {
            console.log(`FOUND in key: ${key}, subKey: ${subKey}`);
            console.log(`Item structure:`, JSON.stringify(item, null, 2));
          }
          if (item && item.name && item.name.includes("WALACE")) {
            console.log(`FOUND WALACE in key: ${key}, subKey: ${subKey}`);
            console.log(`Item structure:`, JSON.stringify(item, null, 2));
          }
        }
      }
    }
  } else {
    console.log("No perCapitaConfig found.");
  }
  process.exit(0);
}

run().catch(console.error);
