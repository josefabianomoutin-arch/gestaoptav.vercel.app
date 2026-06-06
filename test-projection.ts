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

const superNormalize = (text: string) => {
    return (text || "")
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") 
        .replace(/[^a-z0-9]/g, "") 
        .trim();
};

async function run() {
  const pConfigSnapshot = await get(ref(db, 'perCapitaConfig'));
  const pConfig = pConfigSnapshot.val() || {};
  
  const suppliersSnapshot = await get(ref(db, 'suppliers'));
  const suppliersMap = suppliersSnapshot.val() || {};
  const suppliers = Object.values(suppliersMap);

  const allPCSupers = [
      ...(pConfig.ppaisProducers || []).map((p: any) => ({...p, sourceCategory: 'PPAIS'})),
      ...(pConfig.pereciveisSuppliers || []).map((p: any) => ({...p, sourceCategory: 'PERECÍVEIS'})),
      ...(pConfig.estocaveisSuppliers || []).map((p: any) => ({...p, sourceCategory: 'ESTOCÁVEIS'}))
  ];

  console.log(`Loaded ${allPCSupers.length} suppliers from perCapitaConfig.`);
  console.log(`Loaded ${suppliers.length} suppliers from main collection.`);

  let matchCpfCount = 0;
  let matchNameCount = 0;
  let noMatchCount = 0;

  allPCSupers.forEach((s: any) => {
    const pcCpf = (s.cpfCnpj || s.cpf || '').replace(/\D/g, '');
    const pcNameNormalized = superNormalize(s.name || '');

    const realSup = suppliers.find((sup: any) => {
        const supCpf = (sup.cpf || sup.cpfCnpj || '').replace(/\D/g, '');
        const supNameNormalized = superNormalize(sup.name || '');
        
        if (pcCpf && supCpf && pcCpf === supCpf) return true;
        if (pcNameNormalized && supNameNormalized && pcNameNormalized === supNameNormalized) return true;
        return false;
    });

    if (realSup) {
        const items = realSup.contractItems || [];
        console.log(`SUCESSO - Match para [${s.sourceCategory}] ${s.name}: itens=${items.length}`);
        if (pcCpf && (realSup.cpf || realSup.cpfCnpj)?.replace(/\D/g, '') === pcCpf) {
            matchCpfCount++;
        } else {
            matchNameCount++;
        }
    } else {
        console.log(`FALHA - Sem match para [${s.sourceCategory}] ${s.name}`);
        noMatchCount++;
    }
  });

  console.log(`Resultados: CpfMatch=${matchCpfCount}, NameMatch=${matchNameCount}, NoMatch=${noMatchCount}`);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
