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

  // Remover zip anterior para evitar duplicação ou lock
  if (fs.existsSync(outFile)) {
    try { fs.unlinkSync(outFile); } catch (e) {}
  }

  console.log(`[ZIP] Compactando servidor interno em: ${outFile}...`);

  const output = fs.createWriteStream(outFile);
  const archive = archiver('zip', {
    zlib: { level: 5 } // Compressão balanceada rápida e leve
  });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      const sizeMB = (archive.pointer() / (1024 * 1024)).toFixed(2);
      console.log(`[ZIP] ✅ Arquivo ZIP gerado com sucesso: ${outFile} (${sizeMB} MB)`);
      
      // Sincronizar cópia com dist para servir tanto em prod quanto em dev
      const distDir = path.join(__dirname, 'dist');
      if (fs.existsSync(distDir)) {
        try {
          fs.copyFileSync(outFile, path.join(distDir, 'sistema_estoque_percapita_servidor_interno.zip'));
          console.log('[ZIP] ✅ Cópia sincronizada para pasta dist com sucesso.');
        } catch (copyErr) {
          console.warn('[ZIP] Aviso ao copiar para dist:', copyErr);
        }
      }
      resolve();
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('Aviso:', err);
      } else {
        reject(err);
      }
    });

    archive.on('error', (err) => reject(err));

    archive.pipe(output);

    // Adicionar diretório inteiro com filtros de exclusão rigorosos
    archive.directory(sourceDir, false, (data) => {
      // 1. Ignorar arquivos zip aninhados para não inchar o pacote
      if (data.name.endsWith('.zip')) {
        return false;
      }
      // 2. Ignorar uploads antigos pesados para não inflar o download
      if (data.name.startsWith('uploads/') && data.name !== 'uploads/') {
        return false;
      }
      // 3. Ignorar logs e temporários
      if (data.name.endsWith('.log') || data.name.endsWith('.pid') || data.name.includes('.tmp')) {
        return false;
      }
      // 4. Garantir permissões de execução nos scripts Linux
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
