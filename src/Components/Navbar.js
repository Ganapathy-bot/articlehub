import React, { useState } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setInput } from "../features/uiSlice";
import { useAuth } from "../context/AuthContext";

import "../styling/navbar.css";

const Navbar = () => {
  const [inputValue, setInputValue] = useState("");
  const dispatch = useDispatch();
  const history = useHistory();
  const location = useLocation();
  const { isAdmin, isLoggedIn, user, logout } = useAuth();

  const handleClick = (e) => {
    e.preventDefault();
    dispatch(setInput(inputValue.trim()));
    if (location.pathname !== "/") {
      history.push("/");
    }
  };

  const hideSearch =
    location.pathname.startsWith("/admin") ||
    location.pathname === "/login" ||
    location.pathname === "/register";

  return (
    <div className="navbar">
      <Link to="/" className="navbar__header">
        ArticleHub{" "}
        <span role="img" aria-label="books">
          📚
        </span>
      </Link>

      {!hideSearch && (
        <form className="blog__search" onSubmit={handleClick}>
          <input
            className="search"
            placeholder="Search by title, topic, or keyword"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button className="submit" type="submit">
            Search
          </button>
        </form>
      )}

      <div className="navbar__actions">
        <span className="navbar__tagline">
          {isAdmin
            ? "Admin privileges"
            : isLoggedIn
            ? `Hi, ${user.fullName || user.username}`
            : "Readers · register free"}
        </span>
        {isLoggedIn ? (
          <>
            {isAdmin && (
              <Link to="/admin" className="navbar__admin">
                Dashboard
              </Link>
            )}
            <button
              type="button"
              className="navbar__admin-btn"
              onClick={logout}
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="navbar__admin">
              Sign in
            </Link>
            <Link to="/register" className="navbar__admin-btn-link">
              Register
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default Navbar;
