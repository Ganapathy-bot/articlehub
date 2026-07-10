import React, { useState } from "react";
import { Link, Redirect, useHistory } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styling/admin.css";

const Login = () => {
  const { login, isLoggedIn, isAdmin } = useAuth();
  const history = useHistory();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isLoggedIn) {
    return <Redirect to={isAdmin ? "/admin" : "/"} />;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await login(username.trim(), password);
      if (data.user?.role === "admin" || data.role === "admin") {
        history.push("/admin");
      } else {
        history.push("/");
      }
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin__page">
      <div className="admin__card admin__card--narrow">
        <h1>Sign in</h1>
        <p className="admin__lead">
          <strong>Admin:</strong> username <code>admin</code>, password{" "}
          <code>admin123</code> (full privileges).
          <br />
          Other users must <Link to="/register">register</Link> first — accounts
          are stored in the database.
        </p>
        <form className="admin__form" onSubmit={onSubmit}>
          <label>
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="admin__error">{error}</p>}
          <button type="submit" className="admin__btn" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="admin__lead" style={{ marginTop: 16 }}>
          No account? <Link to="/register">Create one</Link>
        </p>
        <Link to="/" className="admin__back">
          ← Back to library
        </Link>
      </div>
    </div>
  );
};

export default Login;
