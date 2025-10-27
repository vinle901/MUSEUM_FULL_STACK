import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { authService } from "../services/authService";

export default function Register() {
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone_number: "",
    address: "",
    birthdate: "",
    sex: "",
    subscribe_to_newsletter: false,
  });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!validEmail(formData.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!formData.birthdate) {
      setError("Please enter your birthdate.");
      return;
    }

    if (!formData.sex) {
      setError("Please select your gender.");
      return;
    }

    setLoading(true);
    try {
      // Prepare data for API (remove confirmPassword)
      const { confirmPassword, ...userData } = formData;

      await authService.register(userData);
      // Navigate to redirect URL (or home) and reload to update navbar
      navigate(redirectUrl);
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(field, value) {
    setError("");
    setFormData({ ...formData, [field]: value });
  }

  return (
    <main className="auth-page">
      <header className="hero hero--teal">
        <div className="container hero__inner">
          <h1 className="hero__title">Create Account</h1>
          <p className="hero__sub">
            Join our museum community to shop, save favorites, and more.
          </p>
        </div>
      </header>

      <section className="container py-8 pb-16">
        <div className="card card--spacious max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="p-6" noValidate>
            {/* Error alert */}
            {error && (
              <div role="alert" className="alert alert--error mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="first_name">First Name *</label>
                  <input
                    id="first_name"
                    className="input"
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => handleChange("first_name", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="last_name">Last Name *</label>
                  <input
                    id="last_name"
                    className="input"
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => handleChange("last_name", e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email">Email *</label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password">Password *</label>
                <div className="relative">
                  <input
                    id="password"
                    className="input"
                    type={showPwd ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    aria-label={showPwd ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-0 text-gray-600 font-bold cursor-pointer"
                  >
                    {showPwd ? "Hide" : "Show"}
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-1">Must be at least 6 characters</p>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword">Confirm Password *</label>
                <input
                  id="confirmPassword"
                  className="input"
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              {/* Show Password Checkbox */}
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showPwd}
                    onChange={(e) => setShowPwd(e.target.checked)}
                  />
                  Show password
                </label>
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="phone_number">Phone Number</label>
                <input
                  id="phone_number"
                  className="input"
                  type="tel"
                  placeholder="(123) 456-7890"
                  value={formData.phone_number}
                  onChange={(e) => handleChange("phone_number", e.target.value)}
                />
              </div>

              {/* Address */}
              <div>
                <label htmlFor="address">Address</label>
                <textarea
                  id="address"
                  className="input resize-y"
                  rows="2"
                  placeholder="123 Main St, City, State ZIP"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                />
              </div>

              {/* Birthdate and Gender */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="birthdate">Birthdate *</label>
                  <input
                    id="birthdate"
                    className="input"
                    type="date"
                    placeholder="MM/DD/YYYY"
                    value={formData.birthdate}
                    onChange={(e) => handleChange("birthdate", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="sex">Gender *</label>
                  <select
                    id="sex"
                    className="input"
                    value={formData.sex}
                    onChange={(e) => handleChange("sex", e.target.value)}
                    required
                  >
                    <option value="">Select...</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="Non-Binary">Non-Binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              {/* Newsletter */}
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.subscribe_to_newsletter}
                    onChange={(e) => handleChange("subscribe_to_newsletter", e.target.checked)}
                  />
                  Subscribe to newsletter for updates and special offers
                </label>
              </div>

              {/* Submit Button */}
              <div className="flex justify-center mt-6">
                <button
                  type="submit"
                  className="btn btn--brand btn--lg"
                  disabled={loading}
                >
                  {loading ? "Creating account..." : "Create Account"}
                </button>
              </div>

              {/* Login Link */}
              <p className="text-center text-sm text-gray-600 mt-4">
                Already have an account?{" "}
                <Link to="/login" className="link">
                  Log in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
