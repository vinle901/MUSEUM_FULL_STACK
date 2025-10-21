import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    if (!validEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Login failed.");
      }

      navigate("/");
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      {/* Teal hero header (same as Membership page) */}
      <header className="hero hero--teal">
        <div className="container hero__inner">
          <h1 className="hero__title">Login</h1>
          <p className="hero__sub">
            Access your Museum account to manage visits, view perks, and more.
          </p>
        </div>
      </header>

      {/* Login form section */}
      <section className="container" style={{ padding: "32px 0 60px" }}>
        <div className="card card--spacious" style={{ maxWidth: 480, margin: "0 auto" }}>
          <form onSubmit={handleSubmit} className="card-soft" style={{ padding: "1.5rem" }} noValidate>
            {/* Error alert */}
            {error && (
              <div
                role="alert"
                className="alert alert--error"
                style={{ marginBottom: 12 }}
              >
                {error}
              </div>
            )}

            <label htmlFor="email">Email</label>
            <input
              id="email"
              className="input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 12,
              }}
            >
              <label htmlFor="password" style={{ margin: 0 }}>
                Password
              </label>
              <button
                type="button"
                className="link-button"
                onClick={() => alert("Hook this up to your password reset flow")}
              >
                Forgot password?
              </button>
            </div>

            <div style={{ position: "relative" }}>
              <input
                id="password"
                className="input"
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                aria-label={showPwd ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: 0,
                  color: "#475569",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {showPwd ? "Hide" : "Show"}
              </button>
            </div>

            <div style={{ margin: "8px 0 16px" }}>
              <label>
                <input
                  type="checkbox"
                  checked={showPwd}
                  onChange={(e) => setShowPwd(e.target.checked)}
                />{" "}
                Show password
              </label>
            </div>

            {/* Log In Button */}
            <div style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}>
              <button type="submit" className="btn btn--brand btn--lg" disabled={loading}>
                {loading ? "Logging in..." : "Log in"}
              </button>
            </div>

            <p className="help muted" style={{ marginTop: 12, textAlign: "center" }}>
              Don’t have an account?{" "}
              <Link to="/membership" className="link">Become a member</Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
