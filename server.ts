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

  // Rotas desativadas
  app.all(["/api/proxy-storage-upload", "/api/gemini", "/api/gemini-extract", "/api/gemini-compare"], (req, res) => {
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
