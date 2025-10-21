// Minimal Express backend with a demo login
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- Demo "database": one user (email + password) ---
// ⚠️ For demo only. Replace with a real DB later.
const DEMO_USER = {
  email: "member@themuseum.org",
  password: "password123", // plain text for demo; use hashing in production
  name: "Museum Member",
};

app.post("/api/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  const ok = email.toLowerCase() === DEMO_USER.email && password === DEMO_USER.password;
  if (!ok) return res.status(401).json({ error: "Invalid email or password." });

  // pretend we issued a token
  return res.json({
    success: true,
    user: { email: DEMO_USER.email, name: DEMO_USER.name },
    token: "demo-token-123",
  });
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
