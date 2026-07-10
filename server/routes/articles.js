const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { createSupabase } = require("../supabase");
const { toArticle } = require("../mappers");
const { requireAdmin } = require("../auth");
const { slugify } = require("../slug");
const { pdfsDir } = require("../config");

const router = express.Router();
const supabase = createSupabase();

if (!fs.existsSync(pdfsDir)) {
  fs.mkdirSync(pdfsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, pdfsDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_+/g, "_");
    const stamp = Date.now();
    cb(null, `${stamp}-${safe}`);
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

/** GET /api/articles?topic=&q= — public read */
router.get("/", async (req, res) => {
  try {
    const { topic, q } = req.query;
    let query = supabase
      .from("articles")
      .select(
        "slug, title, topic, description, content, published_at, image, pdf_url, source"
      )
      .order("published_at", { ascending: false });

    if (topic && topic !== "all") {
      query = query.eq("topic", String(topic).toLowerCase());
    }

    if (q && String(q).trim()) {
      const term = String(q).trim().replace(/%/g, "\\%");
      query = query.or(
        `title.ilike.%${term}%,description.ilike.%${term}%,content.ilike.%${term}%,topic.ilike.%${term}%,source.ilike.%${term}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json((data || []).map(toArticle));
  } catch (err) {
    console.error("GET /api/articles failed:", err);
    res.status(500).json({
      error: "Failed to load articles from Supabase",
      detail: err.message || String(err),
    });
  }
});

/** GET /api/articles/topics — public read */
router.get("/topics", async (_req, res) => {
  try {
    const { data, error } = await supabase.from("articles").select("topic");
    if (error) throw error;

    const topics = Array.from(
      new Set((data || []).map((r) => r.topic).filter(Boolean))
    ).sort();

    res.json(["all", ...topics]);
  } catch (err) {
    console.error("GET /api/articles/topics failed:", err);
    res.status(500).json({
      error: "Failed to load topics from Supabase",
      detail: err.message || String(err),
    });
  }
});

/** POST /api/articles — admin only (JSON or multipart with optional PDF) */
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

      let slug = slugify(req.body.slug || title);
      if (!slug) slug = `article-${Date.now()}`;

      // Ensure unique slug
      const { data: existing } = await supabase
        .from("articles")
        .select("slug")
        .eq("slug", slug)
        .maybeSingle();
      if (existing) {
        slug = `${slug}-${Date.now()}`;
      }

      const pdfFilename = req.file ? req.file.filename : "";
      const pdfUrl = pdfFilename
        ? `/api/files/${encodeURIComponent(pdfFilename)}`
        : "";

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
        pdf_url: pdfUrl,
        source: (req.body.source || "ArticleHub Library").trim(),
      };

      const { data, error } = await supabase
        .from("articles")
        .insert(row)
        .select(
          "slug, title, topic, description, content, published_at, image, pdf_url, source"
        )
        .single();

      if (error) {
        if (req.file) fs.unlinkSync(req.file.path);
        throw error;
      }

      res.status(201).json(toArticle(data));
    } catch (e) {
      console.error("POST /api/articles failed:", e);
      res.status(500).json({
        error: "Failed to create article",
        detail: e.message || String(e),
      });
    }
  });
});

/** DELETE /api/articles/:id — admin only */
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const slug = req.params.id;
    const { data: article, error: findError } = await supabase
      .from("articles")
      .select("slug, pdf_filename")
      .eq("slug", slug)
      .maybeSingle();

    if (findError) throw findError;
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    const { error } = await supabase.from("articles").delete().eq("slug", slug);
    if (error) throw error;

    if (article.pdf_filename) {
      const filePath = path.join(pdfsDir, path.basename(article.pdf_filename));
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkErr) {
          console.warn("Could not delete PDF file:", unlinkErr.message);
        }
      }
    }

    res.json({ ok: true, deleted: slug });
  } catch (err) {
    console.error("DELETE /api/articles/:id failed:", err);
    res.status(500).json({
      error: "Failed to delete article",
      detail: err.message || String(err),
    });
  }
});

/** GET /api/articles/:id — public read */
router.get("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("articles")
      .select(
        "slug, title, topic, description, content, published_at, image, pdf_url, source"
      )
      .eq("slug", req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: "Article not found" });
    }

    res.json(toArticle(data));
  } catch (err) {
    console.error("GET /api/articles/:id failed:", err);
    res.status(500).json({
      error: "Failed to load article from Supabase",
      detail: err.message || String(err),
    });
  }
});

module.exports = router;
