import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import { Readable } from "stream";
import path from "path";
import * as fs from "fs";

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/upload-invoice", upload.single("file"), async (req, res) => {
    console.log("--- UPLOAD ROUTE REACHED ---");
    console.log("Request body:", req.body);
    console.log("Request file:", req.file ? req.file.originalname : "No file");
    try {
      if (!req.file) {
        console.log("No file in request");
        return res.status(400).json({ error: "No file uploaded" });
      }
      console.log("File received:", req.file.originalname);

      const { fileName } = req.body;
      console.log("File name:", fileName);
      console.log("Folder ID:", process.env.GOOGLE_DRIVE_FOLDER_ID);
      console.log("Service Account Email:", process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);

      // Load credentials
      let clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

      if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        try {
          const parsed = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
          clientEmail = parsed.client_email || clientEmail;
          privateKey = parsed.private_key || privateKey;
          console.log("Loaded credentials from GOOGLE_APPLICATION_CREDENTIALS_JSON");
        } catch (e) {
          console.error("Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON", e);
        }
      }

      if (!clientEmail || !privateKey) {
        throw new Error("Faltam as credenciais do Google Cloud (client_email ou private_key). Verifique as configurações do app.");
      }

      // Ensure private key is properly formatted
      privateKey = privateKey.replace(/\\n/g, '\n');

      // Prevent GoogleAuth from trying to use the environment variable
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

      // Use JWT directly for service account authentication
      // This bypasses all the automatic credential loading logic that is failing
      const auth = new google.auth.JWT({
        email: clientEmail.trim(),
        key: privateKey.trim(),
        scopes: ["https://www.googleapis.com/auth/drive.file"],
      });

      console.log("Auth initialized using google.auth.JWT");
      const drive = google.drive({ version: "v3", auth });

      const fileMetadata = {
        name: fileName || req.file.originalname,
        parents: process.env.GOOGLE_DRIVE_FOLDER_ID ? [process.env.GOOGLE_DRIVE_FOLDER_ID] : undefined,
      };
      console.log("File metadata:", fileMetadata);

      const media = {
        mimeType: req.file.mimetype,
        body: Readable.from(req.file.buffer),
      };

      console.log("Starting drive.files.create...");
      const file = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id, webViewLink",
      });
      console.log("File created successfully:", file.data.id);

      res.json({ id: file.data.id, webViewLink: file.data.webViewLink });
    } catch (error: any) {
      console.error("Error uploading to Google Drive:", error);
      // Ensure we get the full error details
      const errorMessage = error.errors ? JSON.stringify(error.errors) : (error.message || String(error));
      res.status(500).json({ error: "Erro no Google Drive", details: errorMessage });
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
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
