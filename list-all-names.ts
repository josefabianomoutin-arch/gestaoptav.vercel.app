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
  console.log("=== MAIN SUPPLIERS ===");
  const snapSup = await get(ref(db, 'suppliers'));
  if (snapSup.exists()) {
    const data = snapSup.val();
    for (const [key, val] of Object.entries(data)) {
      const s = val as any;
      console.log(`Main Supplier - CPF: ${s.cpf}, ID: ${s.id}, Name: "${s.name}"`);
    }
  }

  console.log("\n=== PER CAPITA CONFIG ===");
  const snapPc = await get(ref(db, 'perCapitaConfig'));
  if (snapPc.exists()) {
    const data = snapPc.val();
    for (const listKey of ['ppaisProducers', 'pereciveisSuppliers', 'estocaveisSuppliers']) {
      const list = data[listKey];
      if (Array.isArray(list)) {
        list.forEach((item, idx) => {
          if (item) {
            console.log(`PC ${listKey} [${idx}] - CPF: ${item.cpfCnpj || item.cpf}, Name: "${item.name}"`);
          }
        });
      } else if (list && typeof list === 'object') {
        for (const [subKey, subVal] of Object.entries(list)) {
          const item = subVal as any;
          if (item) {
            console.log(`PC ${listKey} [${subKey}] - CPF: ${item.cpfCnpj || item.cpf}, Name: "${item.name}"`);
          }
        }
      }
    }
  }
  process.exit(0);
}

run().catch(console.error);
