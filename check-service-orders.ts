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
  console.log('Querying serviceOrders directly...');
  const snapshot = await get(ref(db, 'serviceOrders'));
  const orders = snapshot.val();
  if (orders) {
    console.log('serviceOrders found. Total count:', Object.keys(orders).length);
    console.log('Keys:', Object.keys(orders).slice(0, 10));
  } else {
    console.log('serviceOrders is empty or null.');
  }

  console.log('Querying other tables to check integrity...');
  for (const table of ['suppliers', 'cleaningLogs', 'epiLogs', 'financialRecords', 'vehicleExitOrders']) {
    const snap = await get(ref(db, table));
    const val = snap.val();
    console.log(`Table '${table}': count=`, val ? Object.keys(val).length : 0);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
