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
  const pConfigSnapshot = await get(ref(db, 'perCapitaConfig'));
  const pConfig = pConfigSnapshot.val() || {};
  
  if (pConfig.ppaisProducers) {
    pConfig.ppaisProducers.forEach((p: any) => {
      if (p.contractItems && p.contractItems.length > 0) {
         console.log(`Producer in perCapitaConfig WITH items: ${p.name}`);
         p.contractItems.forEach((it: any) => {
            console.log(`  - Item: ${it.name} (${it.totalKg} kg)`);
         });
      }
    });
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
