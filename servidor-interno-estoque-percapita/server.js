import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'server-data', 'db.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DIST_DIR = path.join(__dirname, 'dist');

// Garantir diretórios necessários
if (!fs.existsSync(path.join(__dirname, 'server-data'))) {
  fs.mkdirSync(path.join(__dirname, 'server-data'), { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Carregar ou inicializar Banco de Dados JSON Local
let database = {};
function loadDatabase() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      database = JSON.parse(data);
      console.log(`[DB] Banco de dados carregado com sucesso. Coleções: ${Object.keys(database).length}`);
    } else {
      database = {
        suppliers: [],
        warehouseLog: [],
        perCapitaConfig: {},
        cleaningLogs: [],
        dailyMenus: {},
        standardMenu: {},
        acquisitionItems: [],
        systemPasswords: { admin: "admin123", almoxarife: "almox123", nutri: "nutri123" }
      };
      saveDatabase();
      console.log('[DB] Novo banco de dados inicializado em', DB_PATH);
    }
  } catch (err) {
    console.error('[DB] Erro ao ler banco de dados:', err.message);
    database = {};
  }
}

// Gravação atômica / com debounce
let saveTimeout = null;
function scheduleSaveDatabase() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveDatabase();
  }, 100);
}

function saveDatabase() {
  try {
    const tempPath = `${DB_PATH}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(database, null, 2), 'utf8');
    fs.renameSync(tempPath, DB_PATH);
  } catch (err) {
    console.error('[DB] Erro ao salvar banco de dados:', err.message);
  }
}

loadDatabase();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Servir arquivos estáticos locais (Uploads de NF, comprovantes, etc.)
app.use('/uploads', express.static(UPLOADS_DIR));

// -------------------------------------------------------------
// ROTAS DA API LOCAL (REST) - SERVIDOR INTERNO FECHADO (SEM INTERNET)
// -------------------------------------------------------------

// Status do Servidor e Diagnóstico da Rede Interna
app.get('/api/status', (req, res) => {
  const networkInterfaces = os.networkInterfaces();
  const ipList = [];
  for (const name of Object.keys(networkInterfaces)) {
    for (const net of networkInterfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        ipList.push({ iface: name, ip: net.address });
      }
    }
  }

  res.json({
    status: 'ONLINE',
    mode: 'STANDALONE_INTERNAL_CLOSED_SERVER',
    nodeVersion: process.version,
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    localIPs: ipList,
    collections: Object.keys(database),
    timestamp: new Date().toISOString()
  });
});

// Obter dados de uma coleção completa
app.get('/api/data/:collection', (req, res) => {
  const { collection } = req.params;
  const data = database[collection] || null;
  res.json({ success: true, collection, data });
});

// Obter item específico de uma coleção
app.get('/api/data/:collection/:id', (req, res) => {
  const { collection, id } = req.params;
  const col = database[collection];
  if (!col) {
    return res.status(404).json({ success: false, error: 'Coleção não encontrada' });
  }

  if (Array.isArray(col)) {
    const item = col.find(item => String(item.id || item.cpf || item.name) === String(id));
    if (!item) return res.status(404).json({ success: false, error: 'Item não encontrado' });
    return res.json({ success: true, item });
  } else if (typeof col === 'object') {
    const item = col[id];
    if (item === undefined) return res.status(404).json({ success: false, error: 'Item não encontrado' });
    return res.json({ success: true, item });
  }

  res.status(400).json({ success: false, error: 'Formato inválido' });
});

// Criar / Inserir item em coleção
app.post('/api/data/:collection', (req, res) => {
  const { collection } = req.params;
  const payload = req.body;

  if (!database[collection]) {
    database[collection] = Array.isArray(payload) ? [] : (typeof payload === 'object' && !payload.id ? {} : []);
  }

  if (Array.isArray(database[collection])) {
    const newItem = {
      id: payload.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: payload.createdAt || new Date().toISOString(),
      ...payload
    };
    database[collection].push(newItem);
    scheduleSaveDatabase();
    return res.json({ success: true, item: newItem });
  } else if (typeof database[collection] === 'object') {
    const key = payload.id || payload.key || `entry_${Date.now()}`;
    database[collection][key] = payload;
    scheduleSaveDatabase();
    return res.json({ success: true, key, item: payload });
  }

  res.status(400).json({ success: false, error: 'Erro ao inserir dados' });
});

// Atualizar item existente por ID
app.put('/api/data/:collection/:id', (req, res) => {
  const { collection, id } = req.params;
  const updateData = req.body;

  if (!database[collection]) {
    database[collection] = [];
  }

  if (Array.isArray(database[collection])) {
    const index = database[collection].findIndex(item => String(item.id || item.cpf || item.name) === String(id));
    if (index === -1) {
      // Inserir se não existir
      const newItem = { id, ...updateData, updatedAt: new Date().toISOString() };
      database[collection].push(newItem);
      scheduleSaveDatabase();
      return res.json({ success: true, item: newItem, inserted: true });
    }
    database[collection][index] = { ...database[collection][index], ...updateData, updatedAt: new Date().toISOString() };
    scheduleSaveDatabase();
    return res.json({ success: true, item: database[collection][index] });
  } else if (typeof database[collection] === 'object') {
    database[collection][id] = { ...database[collection][id], ...updateData, updatedAt: new Date().toISOString() };
    scheduleSaveDatabase();
    return res.json({ success: true, item: database[collection][id] });
  }

  res.status(400).json({ success: false, error: 'Erro ao atualizar' });
});

// Substituir coleção inteira
app.put('/api/data/:collection', (req, res) => {
  const { collection } = req.params;
  database[collection] = req.body;
  scheduleSaveDatabase();
  res.json({ success: true, message: `Coleção ${collection} atualizada com sucesso` });
});

// Remover item por ID
app.delete('/api/data/:collection/:id', (req, res) => {
  const { collection, id } = req.params;
  if (!database[collection]) {
    return res.status(404).json({ success: false, error: 'Coleção não encontrada' });
  }

  if (Array.isArray(database[collection])) {
    const prevLen = database[collection].length;
    database[collection] = database[collection].filter(item => String(item.id || item.cpf || item.name) !== String(id));
    scheduleSaveDatabase();
    return res.json({ success: true, deleted: prevLen !== database[collection].length });
  } else if (typeof database[collection] === 'object') {
    delete database[collection][id];
    scheduleSaveDatabase();
    return res.json({ success: true, deleted: true });
  }

  res.status(400).json({ success: false, error: 'Erro ao deletar' });
});

// Upload local de arquivos (fotos, comprovantes, notas em base64)
app.post('/api/upload', (req, res) => {
  try {
    const { filename, base64, contentType } = req.body;
    if (!base64) {
      return res.status(400).json({ success: false, error: 'Dados base64 não fornecidos' });
    }

    const cleanBase64 = base64.replace(/^data:.*?;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const safeName = `${Date.now()}_${(filename || 'arquivo.pdf').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const targetFile = path.join(UPLOADS_DIR, safeName);

    fs.writeFileSync(targetFile, buffer);
    const localUrl = `/uploads/${safeName}`;

    res.json({
      success: true,
      url: localUrl,
      filename: safeName,
      sizeBytes: buffer.length,
      contentType: contentType || 'application/octet-stream'
    });
  } catch (err) {
    console.error('[UPLOAD] Erro ao salvar arquivo:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Exportar Backup Completo (Download JSON)
app.get('/api/backup/export', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="backup_servidor_interno_${new Date().toISOString().slice(0, 10)}.json"`);
  res.send(JSON.stringify(database, null, 2));
});

// Restaurar Backup Completo
app.post('/api/backup/restore', (req, res) => {
  try {
    const importedData = req.body;
    if (!importedData || typeof importedData !== 'object') {
      return res.status(400).json({ success: false, error: 'Arquivo de backup inválido' });
    }

    // Criar cópia de segurança antes de restaurar
    const backupPrev = path.join(__dirname, 'server-data', `db_backup_pre_restore_${Date.now()}.json`);
    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, backupPrev);
    }

    database = importedData;
    saveDatabase();

    res.json({
      success: true,
      message: 'Banco de dados restaurado com sucesso!',
      collectionsRestored: Object.keys(database).length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// FRONTEND STATIC (SERVIÇO WEB INTEGRADO)
// -------------------------------------------------------------
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Servidor Interno - Estoque e Per Capita</title>
        <style>
          body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; display: flex; justify-content: center; }
          .card { background: #1e293b; padding: 32px; border-radius: 12px; max-width: 600px; border: 1px solid #334155; }
          h1 { color: #38bdf8; margin-top: 0; }
          code { background: #090d16; padding: 4px 8px; border-radius: 4px; color: #4ade80; }
          a { color: #38bdf8; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🚀 Servidor Interno Ativo!</h1>
          <p>O backend e o banco de dados local estão <strong>ONLINE</strong> e operando em rede fechada.</p>
          <p>Para gerar o frontend de produção, execute no terminal:</p>
          <pre><code>npm run build</code></pre>
          <p>Ou para iniciar em modo de desenvolvimento integrado com Vite:</p>
          <pre><code>npm run dev</code></pre>
          <hr style="border: 0; border-top: 1px solid #334155; margin: 24px 0;">
          <p><strong>Status da API:</strong> <a href="/api/status" target="_blank">/api/status</a></p>
          <p><strong>Exportar Backup:</strong> <a href="/api/backup/export">/api/backup/export</a></p>
        </div>
      </body>
      </html>
    `);
  });
}

// Iniciar escuta
app.listen(PORT, '0.0.0.0', () => {
  const networkInterfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(networkInterfaces)) {
    for (const net of networkInterfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }

  console.log('================================================================');
  console.log('   SISTEMA DE ESTOQUE / ALMOXARIFADO E PER CAPITA');
  console.log('   SERVIDOR INTERNO FECHADO (ON-PREMISE / SEM INTERNET)');
  console.log('================================================================');
  console.log(`📡 Servidor iniciado com sucesso na porta: ${PORT}`);
  console.log(`🌐 Acesso Local no Servidor:   http://localhost:${PORT}`);
  if (ips.length > 0) {
    ips.forEach(ip => {
      console.log(`💻 Acesso na Rede Interna:     http://${ip}:${PORT}`);
    });
  } else {
    console.log(`💻 Acesso na Rede Interna:     http://[IP-DO-SERVIDOR]:${PORT}`);
  }
  console.log(`📁 Banco de Dados Local:        ${DB_PATH}`);
  console.log(`📁 Pasta de Arquivos/Uploads:  ${UPLOADS_DIR}`);
  console.log('================================================================');
});
