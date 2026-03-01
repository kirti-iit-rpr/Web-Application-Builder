import { useState } from "react";
import { useLocation } from "wouter";
import { setToken } from "@/lib/auth";
import "@/styles/reho.css";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Login failed");
        return;
      }
      setToken(data.token);
      navigate("/admin");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="reho-screen" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 380, padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span className="reho-brand" style={{ fontSize: "2rem" }}>
            <span className="reho-brand-re">Re</span>
            <span className="reho-brand-ho">ho</span>
          </span>
          <p style={{ color: "var(--reho-soft)", fontSize: "0.75rem", fontFamily: "'DM Mono', monospace", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 8 }}>
            Admin Login
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="username"
              style={{ display: "block", color: "var(--reho-soft)", fontSize: "0.7rem", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}
            >
              Username
            </label>
            <input
              id="username"
              data-testid="input-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              style={{
                width: "100%",
                padding: "12px 14px",
                background: "var(--reho-surface)",
                border: "1px solid var(--reho-border)",
                borderRadius: 10,
                color: "var(--reho-text)",
                fontSize: "0.95rem",
                fontFamily: "'DM Sans', sans-serif",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor="password"
              style={{ display: "block", color: "var(--reho-soft)", fontSize: "0.7rem", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}
            >
              Password
            </label>
            <input
              id="password"
              data-testid="input-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                width: "100%",
                padding: "12px 14px",
                background: "var(--reho-surface)",
                border: "1px solid var(--reho-border)",
                borderRadius: 10,
                color: "var(--reho-text)",
                fontSize: "0.95rem",
                fontFamily: "'DM Sans', sans-serif",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <div
              data-testid="text-login-error"
              style={{
                color: "#ef4444",
                fontSize: "0.85rem",
                textAlign: "center",
                marginBottom: 16,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            data-testid="button-login"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: "var(--reho-orange)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontSize: "0.95rem",
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
