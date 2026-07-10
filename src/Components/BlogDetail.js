import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchArticleById } from "../api/articlesApi";

import "../styling/blogs.css";

const BlogDetail = () => {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchArticleById(id);
        if (!cancelled) setArticle(data);
      } catch (err) {
        if (!cancelled) {
          setArticle(null);
          setError(err.message || "Article not found.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="article__page">
        <Link to="/" className="article__back">
          ← Back to library
        </Link>
        <p className="article__loading">Loading article…</p>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="article__page">
        <Link to="/" className="article__back">
          ← Back to library
        </Link>
        <h1 className="no__blogs">{error || "Article not found."}</h1>
      </div>
    );
  }

  const paragraphs = (article.content || "")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="article__page">
      <Link to="/" className="article__back">
        ← Back to library
      </Link>

      <div className={`article__hero blog__cover--${article.topic}`}>
        <span className="article__topic">{article.topic}</span>
        <h1>{article.title}</h1>
        <p className="article__meta">
          {article.source} · {article.publishedAt}
        </p>
      </div>

      <div className="article__body">
        {paragraphs.map((paragraph, index) => (
          <p key={`${article.id}-${index}`}>{paragraph}</p>
        ))}
      </div>

      <div className="article__actions">
        {article.pdfUrl && (
          <a
            className="article__pdf"
            href={article.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open PDF
          </a>
        )}
        <Link to="/" className="article__more">
          Browse more topics
        </Link>
      </div>
    </div>
  );
};

export default BlogDetail;
