import { apiRequest, setToken, clearToken } from "./client";

export async function login(username, password) {
  const data = await apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  return data;
}

export async function register({ username, email, password, fullName }) {
  const data = await apiRequest("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password, fullName }),
  });
  setToken(data.token);
  return data;
}

export function logout() {
  clearToken();
}

export function fetchMe() {
  return apiRequest("/api/auth/me");
}

export function fetchUsers() {
  return apiRequest("/api/auth/users");
}
