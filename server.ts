import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  console.log("Starting server...");
  const app = express();
  const PORT = 3000;
  console.log(`Environment: ${process.env.NODE_ENV}`);

  // API routes FIRST
  app.use(express.json({ limit: '10mb' }));
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);


  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
