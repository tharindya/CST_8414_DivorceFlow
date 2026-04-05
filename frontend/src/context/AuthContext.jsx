import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, clearToken, getToken, setToken } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(getToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // initial auth check

  async function loadMe() {
    const t = getToken();
    if (!t) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api.me();
      setUser(data.user);
    } catch (e) {
      // token invalid/expired
      clearToken();
      setTokenState(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email, password) {
    const data = await api.login({ email, password });
    setToken(data.token);
    setTokenState(data.token);
    setUser(data.user);
    return data.user;
  }

  async function register(name, email, password) {
    const data = await api.register({ name, email, password });
    setToken(data.token);
    setTokenState(data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    clearToken();
    setTokenState(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({ token, user, loading, login, register, logout }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}