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
  const suppliersSnapshot = await get(ref(db, 'suppliers'));
  const suppliersMap = suppliersSnapshot.val() || {};
  const suppliers = Object.values(suppliersMap);

  console.log(`Loaded ${suppliers.length} suppliers from main database.`);
  
  const supWithItems = suppliers.filter((s: any) => s.contractItems && s.contractItems.length > 0);
  console.log(`Found ${supWithItems.length} suppliers containing contractItems.`);
  
  supWithItems.forEach((s: any) => {
    console.log(`- Supplier: ${s.name} (CPF/CNPJ: ${s.cpf || s.cpfCnpj}), Items count: ${s.contractItems.length}`);
    s.contractItems.forEach((item: any) => {
        console.log(`   Item: ${item.name} (${item.totalKg} kg)`);
    });
  });

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
