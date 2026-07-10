import { apiRequest } from "./client";

export function fetchArticles({ topic, q } = {}) {
  const params = new URLSearchParams();
  if (topic && topic !== "all") params.set("topic", topic);
  if (q) params.set("q", q);
  const query = params.toString();
  return apiRequest(`/api/articles${query ? `?${query}` : ""}`);
}

export function fetchArticleById(id) {
  return apiRequest(`/api/articles/${encodeURIComponent(id)}`);
}

export function fetchTopics() {
  return apiRequest("/api/articles/topics");
}

/** Admin: create article (optional PDF file) */
export function createArticle(fields, pdfFile) {
  const form = new FormData();
  Object.keys(fields).forEach((key) => {
    if (fields[key] !== undefined && fields[key] !== null) {
      form.append(key, fields[key]);
    }
  });
  if (pdfFile) form.append("pdf", pdfFile);
  return apiRequest("/api/articles", {
    method: "POST",
    body: form,
  });
}

/** Admin: remove article */
export function deleteArticle(id) {
  return apiRequest(`/api/articles/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
