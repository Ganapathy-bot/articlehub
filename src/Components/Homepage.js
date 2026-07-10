import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import "../styling/home.css";

const Homepage = () => {
  const { isLoggedIn, isAdmin } = useAuth();

  return (
    <div className="home__page home__page--compact">
      <div className="hero__message">
        <h1>ArticleHub library</h1>
        <p>
          Articles and PDFs stored in Supabase. Readers can browse freely.
          Create an account to join, or sign in as admin to manage content.
        </p>
        <div className="hero__actions">
          <a href="#blogs" className="hero__button">
            View articles
          </a>
          {!isLoggedIn && (
            <Link to="/register" className="hero__button hero__button--ghost">
              Register
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin" className="hero__button hero__button--ghost">
              Admin dashboard
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Homepage;
