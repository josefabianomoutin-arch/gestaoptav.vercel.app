import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', system: 'Gestao de Per Capita Standalone', timestamp: new Date().toISOString() });
  });

  // Serve static files from dist
  const distPath = join(__dirname, 'dist');
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Servidor Per Capita] Rodando na porta ${PORT}`);
  });
}

startServer();
