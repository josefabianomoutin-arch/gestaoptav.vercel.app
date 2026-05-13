const fs = require('fs');
const glob = require('glob');

const files = [
    'src/components/AdminInvoices.tsx',
    'src/components/AdminPerCapita.tsx',
    'src/components/AdminPerCapitaSuppliers.tsx',
    'src/components/AdminScheduleView.tsx',
    'src/components/AdminWarehouseLog.tsx',
    'src/components/AlmoxarifadoDashboard.tsx',
    'src/components/Dashboard.tsx',
    'src/components/ViewDeliveryModal.tsx'
];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/\{([a-zA-Z0-9]+)\.item\}/g, "{$1.item || $1.itemName || ''}");
  fs.writeFileSync(file, code);
  console.log(`Replaced in ${file}`);
}
