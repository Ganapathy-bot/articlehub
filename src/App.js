import React from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AdminDashboard from "./Components/AdminDashboard";
import BlogDetail from "./Components/BlogDetail";
import Blogs from "./Components/Blogs";
import Homepage from "./Components/Homepage";
import Login from "./Components/Login";
import Navbar from "./Components/Navbar";
import Register from "./Components/Register";
import "./styling/app.css";

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Navbar />
          <Switch>
            <Route exact path="/">
              <Homepage />
              <Blogs />
            </Route>
            <Route path="/article/:id">
              <BlogDetail />
            </Route>
            <Route exact path="/login">
              <Login />
            </Route>
            <Route exact path="/register">
              <Register />
            </Route>
            <Route exact path="/admin/login">
              <Login />
            </Route>
            <Route exact path="/admin">
              <AdminDashboard />
            </Route>
          </Switch>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
