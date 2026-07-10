/** Map a Supabase row to the frontend article shape */
function toArticle(row) {
  if (!row) return null;
  return {
    id: row.slug,
    title: row.title,
    topic: row.topic,
    description: row.description || "",
    content: row.content || "",
    publishedAt: row.published_at || "",
    image: row.image || "",
    pdfUrl: row.pdf_url || "",
    source: row.source || "ArticleHub Library",
  };
}

module.exports = { toArticle };
