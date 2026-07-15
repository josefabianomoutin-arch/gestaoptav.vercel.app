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
  console.log("Checking for producers with missing or empty contractItems/monthlySchedule...");
  const snapPc = await get(ref(db, 'perCapitaConfig'));
  if (snapPc.exists()) {
    const data = snapPc.val();
    const list = data.ppaisProducers;
    if (Array.isArray(list)) {
      list.forEach((item, idx) => {
        if (item) {
          const hasItems = Array.isArray(item.contractItems) && item.contractItems.length > 0;
          const hasSchedule = item.monthlySchedule && typeof item.monthlySchedule === 'object' && Object.keys(item.monthlySchedule).length > 0;
          if (!hasItems || !hasSchedule) {
            console.log(`Producer [${idx}] "${item.name}" (CPF: ${item.cpfCnpj || item.cpf}): hasItems=${hasItems}, hasSchedule=${hasSchedule}`);
          }
        }
      });
    }
  }
  process.exit(0);
}

run().catch(console.error);
