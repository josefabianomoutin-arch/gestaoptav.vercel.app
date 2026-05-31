const fs = require('fs');
const files = ['src/App.tsx', 'src/components/AlmoxarifadoDashboard.tsx'];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/([a-zA-Z]+)\.cpfCnpj\s*===\s*([a-zA-Z0-9_.]+)/g, '($1.cpfCnpj === $2 || $1.cpf === $2)');
  fs.writeFileSync(file, code);
  console.log(`Replaced in ${file}`);
}
