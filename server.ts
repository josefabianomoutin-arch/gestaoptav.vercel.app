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
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // Pastas de arquivos públicos e uploads locais
  const publicDir = path.join(process.cwd(), 'public');
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const serverDataDir = path.join(process.cwd(), 'server-data');
  const dbPath = path.join(serverDataDir, 'db.json');

  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(serverDataDir)) fs.mkdirSync(serverDataDir, { recursive: true });

  app.use(express.static(publicDir));
  app.use('/uploads', express.static(uploadsDir));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Rota de download forçado da planilha com Content-Disposition attachment
  app.get("/download-planilha", (req, res) => {
    const filePath = path.join(publicDir, "Planilha_Ordens_de_Saida_e_Banco_Completo.xlsx");
    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", 'attachment; filename="Planilha_Ordens_de_Saida_e_Banco_Completo.xlsx"');
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.status(404).send("Arquivo não encontrado");
    }
  });

  // Download do Servidor Interno On-Premise 100% Offline
  app.get("/download-servidor-interno", (req, res) => {
    const filePath = path.join(publicDir, "sistema_estoque_percapita_servidor_interno.zip");
    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", 'attachment; filename="sistema_estoque_percapita_servidor_interno.zip"');
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.status(404).send("Arquivo ZIP do servidor interno não encontrado");
    }
  });

  // Download do Código-Fonte Completo do Projeto
  app.get("/download-codigo-fonte", (req, res) => {
    const filePath = path.join(publicDir, "codigo_fonte_completo.zip");
    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", 'attachment; filename="codigo_fonte_completo.zip"');
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.status(404).send("Arquivo ZIP do código-fonte não encontrado");
    }
  });

  // Proxy de upload de arquivos (Salva localmente para o Servidor Interno)
  app.post("/api/proxy-storage-upload", async (req, res) => {
    try {
      const { path: filePath, base64 } = req.body;
      if (!base64 || !filePath) {
        return res.status(400).json({ success: false, error: "Dados incompletos para upload" });
      }

      // Remover prefixo base64 se existir (ex: data:application/pdf;base64,)
      const base64Data = base64.split(';base64,').pop();
      const buffer = Buffer.from(base64Data, 'base64');

      // Sanitizar o caminho e garantir que a pasta existe
      // Substituir barras por subpastas locais
      const safePath = filePath.replace(/[^a-zA-Z0-9./-]/g, '_');
      const fullLocalPath = path.join(uploadsDir, safePath);
      const dir = path.dirname(fullLocalPath);

      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(fullLocalPath, buffer);

      console.log(`Arquivo salvo localmente: ${fullLocalPath}`);

      // Retornar URL acessível via /uploads/
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
