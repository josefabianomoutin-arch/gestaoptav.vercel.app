import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import os from "os";

async function startServer() {
  console.log("Starting server...");
  const app = express();
  const PORT = 3000;
  console.log(`Environment: ${process.env.NODE_ENV}`);

  // API routes FIRST
  app.use(express.json({ limit: '200mb' }));
  app.use(express.urlencoded({ limit: '200mb', extended: true }));

  // Pastas de arquivos públicos e uploads locais
  const publicDir = path.join(process.cwd(), 'public');
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const serverDataDir = path.join(process.cwd(), 'server-data');
  const dbPath = path.join(serverDataDir, 'db.json');

  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(serverDataDir)) fs.mkdirSync(serverDataDir, { recursive: true });

  // Banco de dados em memória para performance, sincronizado com o arquivo
  let database: any = {};
  if (fs.existsSync(dbPath)) {
    try {
      database = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      console.log(`Banco de dados carregado: ${dbPath} (${(fs.statSync(dbPath).size / (1024 * 1024)).toFixed(2)} MB)`);
    } catch (e) {
      console.error("Erro ao carregar banco de dados, iniciando novo:", e);
    }
  }

  const saveDatabase = () => {
    try {
      fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));
      const internalDbPath = path.join(process.cwd(), 'servidor-interno-estoque-percapita', 'server-data', 'db.json');
      if (fs.existsSync(path.dirname(internalDbPath))) {
        fs.writeFileSync(internalDbPath, JSON.stringify(database, null, 2));
      }
    } catch (e) {
      console.error("Erro ao salvar banco de dados:", e);
    }
  };

  // Helper para download com Streaming Chunked (Ignora limite de 32MB do Cloud Run)
  const streamZipFile = (res: express.Response, filePath: string, filename: string) => {
    let targetPath = filePath;
    if (!fs.existsSync(targetPath)) {
      const candidates = [
        path.join(publicDir, filename),
        path.join(process.cwd(), filename),
        path.join(process.cwd(), 'public', filename)
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          targetPath = cand;
          break;
        }
      }
    }

    if (!fs.existsSync(targetPath)) {
      return res.status(404).send(`Arquivo ${filename} não encontrado no servidor.`);
    }
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.removeHeader('Content-Length'); // Forçar Transfer-Encoding: chunked no Cloud Run
    const stream = fs.createReadStream(targetPath);
    stream.on('error', (err) => {
      console.error(`Erro ao transmitir ${filename}:`, err);
      if (!res.headersSent) res.status(500).send("Erro na transmissão do arquivo.");
    });
    stream.pipe(res);
  };

  // Rota do Servidor Interno On-Premise 100% Offline (Disponível em ambos os caminhos)
  app.get(["/download-servidor-interno", "/sistema_estoque_percapita_servidor_interno.zip"], (req, res) => {
    const filePath = path.join(publicDir, "sistema_estoque_percapita_servidor_interno.zip");
    streamZipFile(res, filePath, "sistema_estoque_percapita_servidor_interno.zip");
  });

  // Download do Código-Fonte Completo
  app.get(["/download-codigo-fonte", "/codigo_fonte_completo.zip"], (req, res) => {
    const filePath = path.join(publicDir, "codigo_fonte_completo.zip");
    streamZipFile(res, filePath, "codigo_fonte_completo.zip");
  });

  // Download da Planilha Excel Oficial
  app.get("/download-planilha", (req, res) => {
    const filePath = path.join(publicDir, "Planilha_Ordens_de_Saida_e_Banco_Completo.xlsx");
    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", 'attachment; filename="Planilha_Ordens_de_Saida_e_Banco_Completo.xlsx"');
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.status(404).send("Planilha não encontrada");
    }
  });

  // Download dos Inicializadores de Desktop
  app.get("/download-app-linux", (req, res) => {
    const filePath = path.join(publicDir, "iniciar_como_aplicativo_linux.sh");
    res.download(filePath, "iniciar_como_aplicativo_linux.sh");
  });

  app.get(["/download-atalho-linux", "/instalar_atalho_area_de_trabalho_linux.sh"], (req, res) => {
    const filePath = path.join(publicDir, "instalar_atalho_area_de_trabalho_linux.sh");
    res.download(filePath, "instalar_atalho_area_de_trabalho_linux.sh");
  });

  app.get("/download-app-windows", (req, res) => {
    const filePath = path.join(publicDir, "Abrir_Como_Aplicativo_Windows.bat");
    res.download(filePath, "Abrir_Como_Aplicativo_Windows.bat");
  });

  app.use(express.static(publicDir));
  app.use('/uploads', express.static(uploadsDir));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // --- Rotas de Banco de Dados Local (Para Servidor Interno Offline) ---
  app.get("/api/db", (req, res) => {
    const { path: dbPathQuery } = req.query;
    if (!dbPathQuery || dbPathQuery === "/") return res.json(database || {});
    
    const parts = (dbPathQuery as string).split('/').filter(Boolean);
    let current = database;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return res.json(null);
      }
    }
    res.json(current !== undefined ? current : null);
  });

  app.post("/api/db/update", (req, res) => {
    const { path: dbPathUpdate, data } = req.body;
    if (!dbPathUpdate) return res.status(400).json({ error: "Caminho obrigatório" });

    const parts = (dbPathUpdate as string).split('/').filter(Boolean);
    let current = database;
    
    // Caminho root
    if (parts.length === 0) {
      database = { ...database, ...data };
    } else {
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part] || typeof current[part] !== 'object') current[part] = {};
        current = current[part];
      }
      const lastPart = parts[parts.length - 1];
      if (!current[lastPart] || typeof current[lastPart] !== 'object') {
        current[lastPart] = data;
      } else {
        current[lastPart] = { ...current[lastPart], ...data };
      }
    }
    
    saveDatabase();
    res.json({ success: true });
  });

  app.post("/api/db/set", (req, res) => {
    const { path: dbPathSet, data } = req.body;
    if (!dbPathSet) return res.status(400).json({ error: "Caminho obrigatório" });

    const parts = (dbPathSet as string).split('/').filter(Boolean);
    let current = database;
    
    if (parts.length === 0) {
      database = data === null || data === undefined ? {} : data;
    } else {
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part] || typeof current[part] !== 'object') current[part] = {};
        current = current[part];
      }
      const lastKey = parts[parts.length - 1];
      if (data === null || data === undefined) {
        if (Array.isArray(current)) {
          const idx = parseInt(lastKey, 10);
          if (!isNaN(idx)) current.splice(idx, 1);
        } else if (typeof current === 'object') {
          delete current[lastKey];
        }
      } else {
        current[lastKey] = data;
      }
    }
    
    saveDatabase();
    res.json({ success: true });
  });

  app.post("/api/db/push", (req, res) => {
    const { path: dbPathPush, data } = req.body;
    const parts = (dbPathPush as string).split('/').filter(Boolean);
    let current = database;
    
    for (const part of parts) {
      if (!current[part] || typeof current[part] !== 'object') current[part] = {};
      current = current[part];
    }
    
    const newId = `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    if (typeof data === 'object' && data !== null) {
      current[newId] = { ...data, id: data.id || newId };
    } else {
      current[newId] = data;
    }
    
    saveDatabase();
    res.json({ success: true, id: newId });
  });

  // Proxy de upload de arquivos (Salva localmente para o Servidor Interno)
  app.post("/api/proxy-storage-upload", async (req, res) => {
    try {
      const { path: filePath, base64 } = req.body;
      if (!base64 || !filePath) {
        return res.status(400).json({ success: false, error: "Dados incompletos para upload" });
      }

      console.log(`Recebendo upload: ${filePath} (${(base64.length / 1024).toFixed(2)} KB)`);

      const base64Data = base64.replace(/^data:.*?;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');

      const safePath = filePath.replace(/[^a-zA-Z0-9./-]/g, '_');
      const fullLocalPath = path.join(uploadsDir, safePath);
      const dir = path.dirname(fullLocalPath);

      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullLocalPath, buffer);

      console.log(`Arquivo salvo localmente: ${fullLocalPath}`);

      const fileUrl = `/uploads/${safePath}`;
      res.json({ success: true, url: fileUrl });
    } catch (error: any) {
      console.error("Erro no proxy-storage-upload:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Rotas desativadas
  app.all(["/api/gemini", "/api/gemini-extract", "/api/gemini-compare"], (req, res) => {
    res.status(404).send();
  });

  // Status do servidor interno e rede local
  app.get("/api/status", (req, res) => {
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
      mode: 'INTERNAL_SERVER',
      uptime: Math.floor(process.uptime()),
      ips: ipList
    });
  });

  // Exportar backup completo do banco de dados local
  app.get("/api/backup/export", (req, res) => {
    if (fs.existsSync(dbPath)) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="backup_servidor_interno.json"');
      fs.createReadStream(dbPath).pipe(res);
    } else {
      res.status(404).json({ error: "Banco de dados local não encontrado" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }


  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
