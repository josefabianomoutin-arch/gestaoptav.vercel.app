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
  console.log('--- ALL PPAIS PRODUCERS ---');
  if (pConfig.ppaisProducers) {
    pConfig.ppaisProducers.forEach((p: any, idx: number) => {
      console.log(`PPAIS [${idx}]: name=${p.name}, monthlySchedule=${JSON.stringify(p.monthlySchedule)}`);
    });
  }
  console.log('--- ALL PERECIVEIS SUPPLIERS ---');
  if (pConfig.pereciveisSuppliers) {
    pConfig.pereciveisSuppliers.forEach((p: any, idx: number) => {
      console.log(`PERECIVEIS [${idx}]: name=${p.name}, monthlySchedule=${JSON.stringify(p.monthlySchedule)}`);
    });
  }
  console.log('--- ALL ESTOCAVEIS SUPPLIERS ---');
  if (pConfig.estocaveisSuppliers) {
    pConfig.estocaveisSuppliers.forEach((p: any, idx: number) => {
      console.log(`ESTOCAVEIS [${idx}]: name=${p.name}, monthlySchedule=${JSON.stringify(p.monthlySchedule)}`);
    });
  }
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
