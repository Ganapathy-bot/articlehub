import React, { useCallback, useEffect, useState } from "react";
import { Link, Redirect } from "react-router-dom";
import {
  createArticle,
  deleteArticle,
  fetchArticles,
} from "../api/articlesApi";
import { fetchUsers } from "../api/authApi";
import { useAuth } from "../context/AuthContext";
import "../styling/admin.css";

const emptyForm = {
  title: "",
  topic: "general",
  description: "",
  content: "",
  source: "ArticleHub Library",
  publishedAt: new Date().toISOString().slice(0, 10),
};

const AdminDashboard = () => {
  const { isAdmin, loading, user, logout } = useAuth();
  const [articles, setArticles] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [pdfFile, setPdfFile] = useState(null);
  const [listError, setListError] = useState("");
  const [formError, setFormError] = useState("");
  const [formOk, setFormOk] = useState("");
  const [busy, setBusy] = useState(false);
  const [listLoading, setListLoading] = useState(true);

  const load = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const [list, userList] = await Promise.all([
        fetchArticles(),
        fetchUsers().catch(() => []),
      ]);
      setArticles(list);
      setUsers(userList);
    } catch (err) {
      setListError(err.message || "Failed to load data");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (loading) {
    return (
      <div className="admin__page">
        <p>Checking admin session…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return <Redirect to="/login" />;
  }

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onCreate = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormOk("");
    setBusy(true);
    try {
      await createArticle(form, pdfFile);
      setForm(emptyForm);
      setPdfFile(null);
      setFormOk("Article saved to the database.");
      await load();
    } catch (err) {
      setFormError(err.message || "Could not create article");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id, title) => {
    if (!window.confirm(`Remove “${title}” from the database?`)) return;
    try {
      await deleteArticle(id);
      await load();
    } catch (err) {
      setListError(err.message || "Delete failed");
    }
  };

  return (
    <div className="admin__page">
      <div className="admin__header">
        <div>
          <h1>Admin dashboard</h1>
          <p className="admin__lead">
            Signed in as <strong>{user.username}</strong> · full privileges ·
            data in Supabase
          </p>
        </div>
        <div className="admin__header__actions">
          <Link to="/" className="admin__link">
            View library
          </Link>
          <button
            type="button"
            className="admin__btn admin__btn--ghost"
            onClick={logout}
          >
            Log out
          </button>
        </div>
      </div>

      <div className="admin__grid">
        <section className="admin__card">
          <h2>Add article</h2>
          <form className="admin__form" onSubmit={onCreate}>
            <label>
              Title *
              <input
                name="title"
                value={form.title}
                onChange={onChange}
                required
                placeholder="Article title"
              />
            </label>
            <label>
              Topic
              <select name="topic" value={form.topic} onChange={onChange}>
                <option value="general">general</option>
                <option value="tech">tech</option>
                <option value="design">design</option>
                <option value="career">career</option>
                <option value="science">science</option>
              </select>
            </label>
            <label>
              Description
              <textarea
                name="description"
                value={form.description}
                onChange={onChange}
                rows={2}
                placeholder="Short summary for the card"
              />
            </label>
            <label>
              Content
              <textarea
                name="content"
                value={form.content}
                onChange={onChange}
                rows={6}
                placeholder="Full article body"
              />
            </label>
            <label>
              Source
              <input name="source" value={form.source} onChange={onChange} />
            </label>
            <label>
              Published date
              <input
                type="date"
                name="publishedAt"
                value={form.publishedAt}
                onChange={onChange}
              />
            </label>
            <label>
              PDF file (optional)
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setPdfFile(e.target.files[0] || null)}
              />
            </label>
            {formError && <p className="admin__error">{formError}</p>}
            {formOk && <p className="admin__ok">{formOk}</p>}
            <button type="submit" className="admin__btn" disabled={busy}>
              {busy ? "Saving…" : "Publish to database"}
            </button>
          </form>
        </section>

        <section className="admin__card">
          <h2>Articles ({articles.length})</h2>
          {listLoading && <p>Loading…</p>}
          {listError && <p className="admin__error">{listError}</p>}
          <ul className="admin__list">
            {articles.map((a) => (
              <li key={a.id} className="admin__list__item">
                <div>
                  <strong>{a.title}</strong>
                  <span className="admin__meta">
                    {a.topic} · {a.publishedAt} · {a.source}
                  </span>
                </div>
                <div className="admin__list__actions">
                  <Link to={`/article/${a.id}`} className="admin__link">
                    View
                  </Link>
                  <button
                    type="button"
                    className="admin__btn admin__btn--danger"
                    onClick={() => onDelete(a.id, a.title)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {!listLoading && articles.length === 0 && (
            <p className="admin__empty">No articles in the database yet.</p>
          )}
        </section>
      </div>

      <section className="admin__card" style={{ marginTop: 24 }}>
        <h2>Registered users ({users.length})</h2>
        <p className="admin__lead">
          Accounts stored in the <code>users</code> table (passwords hashed).
        </p>
        <ul className="admin__list">
          {users.map((u) => (
            <li key={u.id} className="admin__list__item">
              <div>
                <strong>
                  {u.fullName || u.username}{" "}
                  {u.role === "admin" ? (
                    <span className="admin__badge">admin</span>
                  ) : null}
                </strong>
                <span className="admin__meta">
                  @{u.username} · {u.email}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default AdminDashboard;
