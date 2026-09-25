const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

async function createZip() {
  const sourceDir = path.join(__dirname, 'servidor-interno-estoque-percapita');
  const outDir = path.join(__dirname, 'public');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outFile = path.join(outDir, 'sistema_estoque_percapita_servidor_interno.zip');

  console.log(`Compactando ${sourceDir} para ${outFile}...`);

  const output = fs.createWriteStream(outFile);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Nível máximo de compressão
  });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      const sizeMB = (archive.pointer() / (1024 * 1024)).toFixed(2);
      console.log(`✅ Arquivo ZIP criado com sucesso: ${outFile} (${sizeMB} MB)`);
      resolve();
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('Alerta:', err);
      } else {
        reject(err);
      }
    });

    archive.on('error', (err) => reject(err));

    archive.pipe(output);

    // Adicionar diretório inteiro preservando permissões de execução
    archive.directory(sourceDir, false, (data) => {
      // Ignorar binários pesados de uploads para respeitar o limite de 32MB do Cloud Run
      if (data.name.startsWith('uploads/') && data.name !== 'uploads/') {
        return false;
      }
      if (data.name.endsWith('.sh')) {
        data.mode = 0o755;
      }
      return data;
    });

    archive.finalize();
  });
}

createZip().catch(err => {
  console.error('Falha ao gerar ZIP:', err);
  process.exit(1);
});
