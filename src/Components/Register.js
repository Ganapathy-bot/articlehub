import React, { useState } from "react";
import { Link, Redirect, useHistory } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styling/admin.css";

const Register = () => {
  const { register, isLoggedIn, isAdmin } = useAuth();
  const history = useHistory();
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isLoggedIn) {
    return <Redirect to={isAdmin ? "/admin" : "/"} />;
  }

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await register({
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      history.push("/");
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin__page">
      <div className="admin__card admin__card--narrow">
        <h1>Create account</h1>
        <p className="admin__lead">
          Register as a reader. Your details are stored securely in the database.
          Only the admin can add or remove articles.
        </p>
        <form className="admin__form" onSubmit={onSubmit}>
          <label>
            Full name
            <input
              name="fullName"
              value={form.fullName}
              onChange={onChange}
              autoComplete="name"
              placeholder="Your name"
            />
          </label>
          <label>
            Username *
            <input
              name="username"
              value={form.username}
              onChange={onChange}
              autoComplete="username"
              required
              minLength={3}
            />
          </label>
          <label>
            Email *
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password *
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={onChange}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </label>
          <label>
            Confirm password *
            <input
              type="password"
              name="confirm"
              value={form.confirm}
              onChange={onChange}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </label>
          {error && <p className="admin__error">{error}</p>}
          <button type="submit" className="admin__btn" disabled={busy}>
            {busy ? "Creating…" : "Register"}
          </button>
        </form>
        <p className="admin__lead" style={{ marginTop: 16 }}>
          Already registered? <Link to="/login">Sign in</Link>
        </p>
        <Link to="/" className="admin__back">
          ← Back to library
        </Link>
      </div>
    </div>
  );
};

export default Register;
