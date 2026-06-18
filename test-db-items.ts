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
  const acqItemsSnapshot = await get(ref(db, 'acquisitionItems'));
  const acqItems = acqItemsSnapshot.val() || {};
  
  console.log("== ACQUISITION ITEMS BY CATEGORY ==");
  const categoryCounts: Record<string, number> = {};
  Object.values(acqItems).forEach((item: any) => {
    if (item && item.category) {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    }
  });
  console.log(categoryCounts);

  const suppliersSnapshot = await get(ref(db, 'suppliers'));
  const suppliers = suppliersSnapshot.val() || {};
  console.log("\n== SUPPLIERS IN '/suppliers' ==");
  Object.entries(suppliers).forEach(([id, sup]: [string, any]) => {
    const contractItems = sup.contractItems || [];
    console.log(`Supplier: ${sup.name} | CPF/CNPJ: ${sup.cpfCnpj || sup.cpf || id} | contractItems: ${contractItems.length} items`);
    contractItems.forEach((ci: any) => {
      console.log(`   - ${ci.name} (${ci.category || 'NO_CAT'}) | qty: ${ci.totalKg} | val: ${ci.valuePerKg}`);
    });
  });

  const configSnapshot = await get(ref(db, 'perCapitaConfig'));
  const config = configSnapshot.val() || {};
  console.log("\n== PER CAPITA CONFIG SUPPLIERS ==");
  ['ppaisProducers', 'pereciveisSuppliers', 'estocaveisSuppliers'].forEach(key => {
    const list = config[key] || [];
    console.log(`Key ${key}: ${list.length} suppliers`);
    list.forEach((sup: any) => {
      const contractItems = sup.contractItems || [];
      console.log(`   Supplier: ${sup.name} | CPF: ${sup.cpfCnpj || sup.cpf} | contractItemsCount: ${contractItems.length}`);
    });
  });

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

