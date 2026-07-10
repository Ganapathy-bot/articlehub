import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchArticles, fetchTopics } from "../api/articlesApi";
import {
  selectSelectedTopic,
  selectUserInput,
  setSelectedTopic,
} from "../features/uiSlice";

import "../styling/blogs.css";

const Blogs = () => {
  const searchInput = useSelector(selectUserInput);
  const selectedTopic = useSelector(selectSelectedTopic);
  const dispatch = useDispatch();

  const [articles, setArticles] = useState([]);
  const [topics, setTopics] = useState(["all"]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [list, topicList] = await Promise.all([
          fetchArticles(),
          fetchTopics(),
        ]);
        if (!cancelled) {
          setArticles(list);
          setTopics(topicList.length ? topicList : ["all"]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message ||
              "Could not load articles. Is the ArticleHub server connected to Supabase?"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = (searchInput || "").toLowerCase().trim();

    return articles.filter((article) => {
      const topicOk =
        selectedTopic === "all" || article.topic === selectedTopic;

      if (!topicOk) return false;
      if (!query) return true;

      const haystack = [
        article.title,
        article.topic,
        article.description,
        article.content,
        article.source,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [articles, searchInput, selectedTopic]);

  return (
    <div className="blog__page" id="blogs">
      <div className="blog__page__top">
        <h1 className="blog__page__header">Articles</h1>
        <p className="blog__page__sub">
          {loading
            ? "Loading from Supabase…"
            : `${filtered.length} article${filtered.length === 1 ? "" : "s"}`}
          {!loading && selectedTopic !== "all" ? ` in “${selectedTopic}”` : ""}
          {!loading && searchInput ? ` matching “${searchInput}”` : ""}
        </p>
      </div>

      <div className="topic__filters">
        {topics.map((topic) => (
          <button
            key={topic}
            type="button"
            className={
              selectedTopic === topic
                ? "topic__chip topic__chip--active"
                : "topic__chip"
            }
            onClick={() => dispatch(setSelectedTopic(topic))}
          >
            {topic}
          </button>
        ))}
      </div>

      {error && (
        <div className="blog__error">
          <p>{error}</p>
          <p className="blog__error__hint">
            Start the API with <code>npm run server</code> and set{" "}
            <code>SUPABASE_URL</code> + keys in <code>.env</code>.
          </p>
        </div>
      )}

      <div className="blogs">
        {filtered.map((blog) => (
          <Link className="blog" key={blog.id} to={`/article/${blog.id}`}>
            <div
              className={`blog__cover blog__cover--${blog.topic}`}
              aria-hidden="true"
            >
              <span>{blog.topic}</span>
            </div>
            <div>
              <h3 className="sourceName">
                <span>{blog.source}</span>
                <p>{blog.publishedAt}</p>
              </h3>
              <h1>{blog.title}</h1>
              <p>{blog.description}</p>
            </div>
          </Link>
        ))}
      </div>

      {!loading && !error && filtered.length === 0 && (
        <h1 className="no__blogs">
          No articles found{" "}
          <span role="img" aria-label="sad">
            😞
          </span>
          . Try another topic or search term, or re-seed Supabase from your PDF
          folder.
        </h1>
      )}
    </div>
  );
};

export default Blogs;
