const fs = require("fs");
const path = require("path");
const { createSupabase } = require("./supabase");
const { seedFile, pdfsDir } = require("./config");

function slugFromFilename(filename) {
  return filename
    .replace(/\.pdf$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function titleFromFilename(filename) {
  return filename
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function guessTopic(name) {
  const lower = name.toLowerCase();
  if (/(bio|stat|math|science|lecture|medical|chem|physics)/.test(lower)) {
    return "science";
  }
  if (/(design|css|color|typo|ui|ux)/.test(lower)) return "design";
  if (/(career|writing|habit|resume)/.test(lower)) return "career";
  if (/(react|tech|code|web|app|js|python)/.test(lower)) return "tech";
  return "general";
}

function pdfFilenameFromUrl(pdfUrl) {
  if (!pdfUrl) return "";
  return path.basename(String(pdfUrl).replace(/^\/+/, ""));
}

function buildRows() {
  const bySlug = new Map();

  if (fs.existsSync(seedFile)) {
    const catalog = JSON.parse(fs.readFileSync(seedFile, "utf8"));
    for (const item of catalog) {
      const slug = item.id || slugFromFilename(item.pdfUrl || item.title);
      const pdfFilename =
        pdfFilenameFromUrl(item.pdfUrl) || item.pdfFilename || "";
      bySlug.set(slug, {
        slug,
        title: item.title,
        topic: (item.topic || "general").toLowerCase(),
        description: item.description || "",
        content: (item.content || "").replace(/ArticleHub/g, "ArticleHub"),
        published_at: item.publishedAt || new Date().toISOString().slice(0, 10),
        image: item.image || "",
        pdf_filename: pdfFilename,
        pdf_url: pdfFilename
          ? `/api/files/${encodeURIComponent(pdfFilename)}`
          : "",
        source: (item.source || "ArticleHub Library").replace(
          /ArticleHub/g,
          "ArticleHub"
        ),
      });
    }
  }

  if (fs.existsSync(pdfsDir)) {
    const files = fs
      .readdirSync(pdfsDir)
      .filter((f) => f.toLowerCase().endsWith(".pdf"));

    for (const filename of files) {
      const slug = slugFromFilename(filename);
      if (bySlug.has(slug)) {
        const existing = bySlug.get(slug);
        existing.pdf_filename = filename;
        existing.pdf_url = `/api/files/${encodeURIComponent(filename)}`;
        continue;
      }

      const stats = fs.statSync(path.join(pdfsDir, filename));
      const title = titleFromFilename(filename);
      bySlug.set(slug, {
        slug,
        title,
        topic: guessTopic(filename),
        description: `PDF document: ${title}. Open the article to read or download the file.`,
        content: `${title}\n\nThis card was created from a PDF stored for ArticleHub.\n\nUse “Open PDF” to view the full document.`,
        published_at: stats.mtime.toISOString().slice(0, 10),
        image: "",
        pdf_filename: filename,
        pdf_url: `/api/files/${encodeURIComponent(filename)}`,
        source: "ArticleHub Library",
      });
    }
  }

  return Array.from(bySlug.values());
}

/**
 * Upserts seed catalog + PDFs on disk into Supabase `articles` table.
 */
async function seedArticles({ force = false } = {}) {
  const supabase = createSupabase();

  const { count, error: countError } = await supabase
    .from("articles")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.error("Could not read articles table:", countError.message);
    console.error(
      "Run supabase/schema.sql in the Supabase SQL Editor, then restart."
    );
    throw countError;
  }

  if (count > 0 && !force) {
    console.log(
      `Supabase already has ${count} article(s); skip seed (set SEED_FORCE=1 to reseed).`
    );
    return { seeded: 0, skipped: count };
  }

  if (force) {
    const { error: delError } = await supabase
      .from("articles")
      .delete()
      .neq("slug", "");
    if (delError) throw delError;
    console.log("Cleared articles table (SEED_FORCE).");
  }

  const rows = buildRows();
  if (rows.length === 0) {
    console.log("No seed articles or PDFs found.");
    return { seeded: 0, skipped: 0 };
  }

  const { error } = await supabase.from("articles").upsert(rows, {
    onConflict: "slug",
  });

  if (error) {
    console.error("Seed upsert failed:", error.message);
    throw error;
  }

  console.log(`Seeded ${rows.length} article(s) into Supabase.`);
  return { seeded: rows.length, skipped: 0 };
}

module.exports = { seedArticles };
