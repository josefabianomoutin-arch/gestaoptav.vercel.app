import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig.firebase);
const db = getDatabase(app);

async function main() {
  const snapshot = await get(ref(db, 'perCapitaConfig'));
  if (snapshot.exists()) {
    const data = snapshot.val();
    console.log("PPAIS Producers:", data.ppaisProducers?.map(p => ({
        name: p?.name,
        cpfCnpj: p?.cpfCnpj
    })));
  } else {
    console.log("No data");
  }
  process.exit(0);
}

main();
