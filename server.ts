import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  console.log("Starting server...");
  const app = express();
  const PORT = 3000;
  console.log(`Environment: ${process.env.NODE_ENV}`);

  // API routes FIRST
  app.use(express.json({ limit: '50mb' }));
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/proxy-storage-upload", async (req, res) => {
    try {
      const { bucket, path, base64, contentType, token } = req.body;
      if (!bucket || !path || !base64) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }

      // Base64 comes as data URL or pure base64. Let's extract the bare base64 string
      const b64Data = base64.replace(/^data:.*?;base64,/, '');
      const buffer = Buffer.from(b64Data, 'base64');

      const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${encodeURIComponent(path)}`;
      
      const headers: any = {
        'Content-Type': contentType || 'application/pdf',
      };
      
      if (token) {
        headers['Authorization'] = `Firebase ${token}`;
      }

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: buffer,
        headers,
      });

      const data = await (response.json() as Promise<any>);
      if (!response.ok) {
        console.error("Firebase Storage API Error:", data);
        return res.status(response.status).json({ success: false, error: data.error?.message || 'Storage upload failed', code: response.status });
      }

      // Return the download URL compatible with Firebase Storage convention
      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${data.downloadTokens}`;
      res.json({ success: true, url: downloadUrl });
    } catch (e: any) {
      console.error("Proxy storage upload error:", e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/gemini", async (req, res) => {
    try {
      const { image, prompt } = req.body;
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const result = await ai.models.generateContent({
        model: "gemini-1.5-flash", 
        contents: [{
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data: image } }
          ]
        }]
      });
      res.json({ text: result.text });
    } catch (error) {
      console.error("Gemini API error:", error);
      res.status(500).json({ error: "Failed to process image" });
    }
  });
  
  app.post("/api/gemini-extract", async (req, res) => {
    try {
      const { image, mimeType, prompt } = req.body;
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const result = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: image } }
          ]
        }]
      });
      
      const text = result.text || '{}';
      res.json(JSON.parse(text.replace(/```json/g, '').replace(/```/g, '')));
    } catch (error) {
      console.error("Gemini Extraction error:", error);
      res.status(500).json({ error: "Failed to process invoice" });
    }
  });

  app.post("/api/gemini-compare", async (req, res) => {
    try {
      const { image1, image2, prompt } = req.body;
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const result = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data: image1 } },
            { inlineData: { mimeType: "image/jpeg", data: image2 } }
          ]
        }]
      });
      
      const text = result.text || '{}';
      res.json(JSON.parse(text.replace(/```json/g, '').replace(/```/g, '')));
    } catch (error) {
      console.error("Gemini Compare error:", error);
      res.status(500).json({ error: "Failed to compare images" });
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
