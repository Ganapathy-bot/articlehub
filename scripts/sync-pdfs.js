/**
 * Scans public/pdfs for PDF files and writes src/data/discovered-pdfs.json
 * so any PDF you drop in shows up as a card (no API keys).
 *
 * Catalog entries in articles.json still win when ids/pdfUrls match.
 */
const fs = require("fs");
const path = require("path");

const pdfsDir = path.join(__dirname, "..", "public", "pdfs");
const outPath = path.join(__dirname, "..", "src", "data", "discovered-pdfs.json");
const articlesPath = path.join(__dirname, "..", "src", "data", "articles.json");

function titleFromFilename(filename) {
  return filename
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function idFromFilename(filename) {
  return filename
    .replace(/\.pdf$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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

let catalogPdfUrls = new Set();
if (fs.existsSync(articlesPath)) {
  try {
    const articles = JSON.parse(fs.readFileSync(articlesPath, "utf8"));
    catalogPdfUrls = new Set(
      articles.map((a) => (a.pdfUrl || "").replace(/^\//, "").toLowerCase())
    );
  } catch (e) {
    console.warn("Could not read articles.json:", e.message);
  }
}

if (!fs.existsSync(pdfsDir)) {
  fs.mkdirSync(pdfsDir, { recursive: true });
}

const files = fs
  .readdirSync(pdfsDir)
  .filter((f) => f.toLowerCase().endsWith(".pdf"));

const discovered = files
  .filter((filename) => {
    const rel = `pdfs/${filename}`.toLowerCase();
    // Skip if already fully described in articles.json
    return !catalogPdfUrls.has(rel);
  })
  .map((filename) => {
    const id = idFromFilename(filename);
    const title = titleFromFilename(filename);
    const topic = guessTopic(filename);
    const stats = fs.statSync(path.join(pdfsDir, filename));

    return {
      id,
      title,
      topic,
      description: `PDF document: ${title}. Open the article to read or download the file.`,
      content: `${title}\n\nThis card was created automatically from the PDF you placed in public/pdfs/.\n\nUse the “Open PDF” button to view the full document in your browser.`,
      publishedAt: stats.mtime.toISOString().slice(0, 10),
      image: "",
      pdfUrl: `/pdfs/${filename}`,
      source: "Your PDFs",
    };
  });

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(discovered, null, 2) + "\n", "utf8");

console.log(
  `Synced ${files.length} PDF(s) in public/pdfs/ → ${discovered.length} auto card(s) in discovered-pdfs.json`
);
discovered.forEach((d) => console.log("  +", d.title, "→", d.pdfUrl));
