const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { requireAdmin } = require("../auth");
const { slugify } = require("../slug");
const { pdfsDir } = require("../config");
const store = require("../db/store");

const router = express.Router();

if (!fs.existsSync(pdfsDir)) {
  fs.mkdirSync(pdfsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, pdfsDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_+/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

router.get("/", async (req, res) => {
  try {
    const articles = await store.listArticles({
      topic: req.query.topic,
      q: req.query.q,
    });
    res.json(articles);
  } catch (err) {
    console.error("GET /api/articles failed:", err);
    res.status(500).json({ error: "Failed to load articles", detail: err.message });
  }
});

router.get("/topics", async (_req, res) => {
  try {
    res.json(await store.getTopics());
  } catch (err) {
    console.error("GET /api/articles/topics failed:", err);
    res.status(500).json({ error: "Failed to load topics", detail: err.message });
  }
});

router.post("/", requireAdmin, (req, res) => {
  upload.single("pdf")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Upload failed" });
    }
    try {
      const title = (req.body.title || "").trim();
      if (!title) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Title is required" });
      }

      let slug = slugify(req.body.slug || title) || `article-${Date.now()}`;
      const existing = await store.getArticleBySlug(slug);
      if (existing) slug = `${slug}-${Date.now()}`;

      const pdfFilename = req.file ? req.file.filename : "";
      const row = {
        slug,
        title,
        topic: (req.body.topic || "general").toLowerCase().trim(),
        description: (req.body.description || "").trim(),
        content: (req.body.content || "").trim(),
        published_at:
          req.body.publishedAt || new Date().toISOString().slice(0, 10),
        image: (req.body.image || "").trim(),
        pdf_filename: pdfFilename,
        pdf_url: pdfFilename
          ? `/api/files/${encodeURIComponent(pdfFilename)}`
          : "",
        source: (req.body.source || "ArticleHub Library").trim(),
      };

      const article = await store.createArticle(row);
      res.status(201).json(article);
    } catch (e) {
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (_) {
          /* ignore */
        }
      }
      console.error("POST /api/articles failed:", e);
      res.status(500).json({ error: "Failed to create article", detail: e.message });
    }
  });
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const article = await store.deleteArticle(req.params.id);
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }
    const filename = article.pdf_filename;
    if (filename) {
      const filePath = path.join(pdfsDir, path.basename(filename));
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.warn("Could not delete PDF:", e.message);
        }
      }
    }
    res.json({ ok: true, deleted: req.params.id });
  } catch (err) {
    console.error("DELETE /api/articles/:id failed:", err);
    res.status(500).json({ error: "Failed to delete article", detail: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const article = await store.getArticleBySlug(req.params.id);
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }
    res.json(article);
  } catch (err) {
    console.error("GET /api/articles/:id failed:", err);
    res.status(500).json({ error: "Failed to load article", detail: err.message });
  }
});

module.exports = router;
