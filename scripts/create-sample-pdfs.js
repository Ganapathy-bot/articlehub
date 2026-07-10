/**
 * Creates simple text PDFs for sample articles (no external API keys).
 * Run: node scripts/create-sample-pdfs.js
 */
const fs = require("fs");
const path = require("path");

const articlesPath = path.join(__dirname, "..", "src", "data", "articles.json");
const outDir = path.join(__dirname, "..", "public", "pdfs");

const articles = JSON.parse(fs.readFileSync(articlesPath, "utf8"));

function escapePdfText(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapLines(text, maxLen = 70) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLen) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines;
}

function buildPdf({ title, topic, content }) {
  const lines = [
    title,
    `Topic: ${topic}`,
    "",
    ...content.split(/\n+/).flatMap((p) => (p ? [...wrapLines(p), ""] : [""])),
  ].slice(0, 40);

  let y = 750;
  const contentOps = lines
    .map((line) => {
      const escaped = escapePdfText(line);
      const op = `BT /F1 11 Tf 50 ${y} Td (${escaped}) Tj ET`;
      y -= 16;
      return op;
    })
    .join("\n");

  const stream = contentOps + "\n";
  const objects = [];

  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push(
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
  );
  objects.push(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
  );
  objects.push(
    `4 0 obj\n<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}endstream\nendobj\n`
  );
  objects.push(
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
  );

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((obj) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj;
  });

  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF\n`;

  return pdf;
}

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

let wrote = 0;
let skipped = 0;

articles.forEach((article) => {
  if (!article.pdfUrl) return;
  const filename = path.basename(article.pdfUrl);
  const outPath = path.join(outDir, filename);

  // Never overwrite a real PDF the user already placed in public/pdfs/
  if (fs.existsSync(outPath)) {
    console.log("Skip (already exists):", outPath);
    skipped += 1;
    return;
  }

  // Only generate placeholder PDFs for built-in sample library entries
  if (article.source === "Your PDFs") {
    console.log("Skip (user PDF missing — place file in public/pdfs/):", filename);
    skipped += 1;
    return;
  }

  const pdf = buildPdf(article);
  fs.writeFileSync(outPath, pdf, "utf8");
  console.log("Wrote", outPath);
  wrote += 1;
});

console.log(`Sample PDFs: wrote ${wrote}, skipped ${skipped}`);
