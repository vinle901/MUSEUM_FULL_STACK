import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Membership() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    first: "",
    last: "",
    email: "",
    phone: "",
    address: "",
    birthdate: "",
    sex: "",
    subscribe: false,
    password: "",
    confirm: "",
    plan: "None",
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState("");

  const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const validPhone = (p) => !p || /^[0-9()+\-\s]{7,20}$/.test(p);
  const validPassword = (pwd) =>
    /[A-Za-z]/.test(pwd) && /\d/.test(pwd) && pwd.length >= 8;

  function onChange(e) {
    const { id, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [id]: type === "checkbox" ? checked : value }));
    setErrors((er) => ({ ...er, [id]: "" }));
    setAlert("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setAlert("");

    const nextErrors = {};
    if (!form.first.trim()) nextErrors.first = "First name is required.";
    if (!form.last.trim()) nextErrors.last = "Last name is required.";
    if (!form.email.trim()) nextErrors.email = "Email is required.";
    else if (!validEmail(form.email)) nextErrors.email = "Enter a valid email.";
    if (!validPhone(form.phone)) nextErrors.phone = "Enter a valid phone number.";

    if (!form.birthdate) nextErrors.birthdate = "Birthdate is required.";
    if (!form.sex) nextErrors.sex = "Please select a value for sex.";

    if (!validPassword(form.password)) {
      nextErrors.password =
        "Use at least 8 characters with at least 1 letter and 1 number.";
    }
    if (form.confirm !== form.password) nextErrors.confirm = "Passwords do not match.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setAlert("Please fix the errors below and try again.");
      return;
    }

    setSubmitting(true);
    try {
      // Build payload matching your DB column names
      const payload = {
        first_name: form.first.trim(),
        last_name: form.last.trim(),
        email: form.email.trim(),
        password: form.password, // hash on server
        phone_number: form.phone.trim() || null,
        address: form.address.trim() || null,
        birthdate: form.birthdate, // YYYY-MM-DD
        sex: form.sex,             // 'M' | 'F' | 'Non-Binary' | 'Prefer not to say'
        subscribe_to_newsletter: !!form.subscribe,
        plan: form.plan,           // optional: keep if your API uses it
      };

      // TODO: replace with your real API
      // await fetch("/api/signup", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(payload) })
      await new Promise((r) => setTimeout(r, 600));

      navigate("/login");
    } catch (err) {
      setAlert("Sign up failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <header className="hero hero--teal">
        <div className="container hero__inner">
          <h1 className="hero__title">Membership Sign Up</h1>
          <p className="hero__sub">
            Join The Museum for unlimited admission, exclusive previews, and more.
          </p>
        </div>
      </header>

      <section className="container" style={{ padding: "32px 0 60px" }}>
        <div className="card card--spacious" style={{ maxWidth: 920, margin: "0 auto" }}>
          <h2 className="card__title">Create your account</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Tell us a bit about you, choose a membership plan, and set a password.
          </p>

          {alert && (
            <div className="alert alert--error" role="alert" style={{ marginBottom: 12 }}>
              {alert}
            </div>
          )}

          <form className="form" onSubmit={handleSubmit} noValidate>
            {/* First & Last */}
            <div className="plan-row">
              <div>
                <label htmlFor="first">First Name</label>
                <input
                  id="first"
                  className="input"
                  placeholder="First"
                  value={form.first}
                  onChange={onChange}
                  required
                />
                {errors.first && <small style={{ color: "#b91c1c", fontWeight: 600 }}>{errors.first}</small>}
              </div>
              <div>
                <label htmlFor="last">Last Name</label>
                <input
                  id="last"
                  className="input"
                  placeholder="Last"
                  value={form.last}
                  onChange={onChange}
                  required
                />
                {errors.last && <small style={{ color: "#b91c1c", fontWeight: 600 }}>{errors.last}</small>}
              </div>
            </div>

            {/* Email & Phone */}
            <div className="plan-row">
              <div>
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={onChange}
                  autoComplete="email"
                  required
                />
                {errors.email && <small style={{ color: "#b91c1c", fontWeight: 600 }}>{errors.email}</small>}
              </div>
              <div>
                <label htmlFor="phone">Phone</label>
                <input
                  id="phone"
                  className="input"
                  placeholder="(555) 123-4567"
                  inputMode="tel"
                  value={form.phone}
                  onChange={onChange}
                />
                {errors.phone && <small style={{ color: "#b91c1c", fontWeight: 600 }}>{errors.phone}</small>}
              </div>
            </div>

            {/* Address (optional) */}
            {/* Address Section */}
<div className="plan-row">
  <div>
    <label htmlFor="address">Street Address</label>
    <input
      id="address"
      className="input"
      placeholder="123 Main St"
      value={form.address}
      onChange={onChange}
    />
  </div>
  <div>
    <label htmlFor="city">City</label>
    <input
      id="city"
      className="input"
      placeholder="City"
      value={form.city || ""}
      onChange={onChange}
    />
  </div>
</div>

<div>
  <label htmlFor="state">State</label>
  <select
    id="state"
    className="input"
    value={form.state || ""}
    onChange={onChange}
  >
    <option value="">Select State…</option>
    <option value="AL">Alabama</option>
    <option value="AK">Alaska</option>
    <option value="AZ">Arizona</option>
    <option value="AR">Arkansas</option>
    <option value="CA">California</option>
    <option value="CO">Colorado</option>
    <option value="CT">Connecticut</option>
    <option value="DE">Delaware</option>
    <option value="FL">Florida</option>
    <option value="GA">Georgia</option>
    <option value="HI">Hawaii</option>
    <option value="ID">Idaho</option>
    <option value="IL">Illinois</option>
    <option value="IN">Indiana</option>
    <option value="IA">Iowa</option>
    <option value="KS">Kansas</option>
    <option value="KY">Kentucky</option>
    <option value="LA">Louisiana</option>
    <option value="ME">Maine</option>
    <option value="MD">Maryland</option>
    <option value="MA">Massachusetts</option>
    <option value="MI">Michigan</option>
    <option value="MN">Minnesota</option>
    <option value="MS">Mississippi</option>
    <option value="MO">Missouri</option>
    <option value="MT">Montana</option>
    <option value="NE">Nebraska</option>
    <option value="NV">Nevada</option>
    <option value="NH">New Hampshire</option>
    <option value="NJ">New Jersey</option>
    <option value="NM">New Mexico</option>
    <option value="NY">New York</option>
    <option value="NC">North Carolina</option>
    <option value="ND">North Dakota</option>
    <option value="OH">Ohio</option>
    <option value="OK">Oklahoma</option>
    <option value="OR">Oregon</option>
    <option value="PA">Pennsylvania</option>
    <option value="RI">Rhode Island</option>
    <option value="SC">South Carolina</option>
    <option value="SD">South Dakota</option>
    <option value="TN">Tennessee</option>
    <option value="TX">Texas</option>
    <option value="UT">Utah</option>
    <option value="VT">Vermont</option>
    <option value="VA">Virginia</option>
    <option value="WA">Washington</option>
    <option value="WV">West Virginia</option>
    <option value="WI">Wisconsin</option>
    <option value="WY">Wyoming</option>
  </select>
</div>


            {/* Birthdate & Sex */}
            <div className="plan-row">
              <div>
                <label htmlFor="birthdate">Birthdate</label>
                <input
                  id="birthdate"
                  className="input"
                  type="date"
                  value={form.birthdate}
                  onChange={onChange}
                  required
                />
                {errors.birthdate && <small style={{ color: "#b91c1c", fontWeight: 600 }}>{errors.birthdate}</small>}
              </div>
              <div>
                <label htmlFor="sex">Sex</label>
                <select
                  id="sex"
                  className="input"
                  value={form.sex}
                  onChange={onChange}
                  required
                >
                  <option value="">Select…</option>
                  <option value="Male">M</option>
                  <option value="Female">F</option>
                </select>
                {errors.sex && <small style={{ color: "#b91c1c", fontWeight: 600 }}>{errors.sex}</small>}
              </div>
            </div>

            {/* Password & Confirm */}
            <div className="plan-row">
              <div>
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  className="input"
                  type="password"
                  placeholder="Create a password"
                  value={form.password}
                  onChange={onChange}
                  autoComplete="new-password"
                  required
                />
                <small className="muted">At least 8 characters, with 1 letter and 1 number.</small>
                {errors.password && <small style={{ color: "#b91c1c", fontWeight: 600 }}>{errors.password}</small>}
              </div>
              <div>
                <label htmlFor="confirm">Confirm Password</label>
                <input
                  id="confirm"
                  className="input"
                  type="password"
                  placeholder="Re-enter password"
                  value={form.confirm}
                  onChange={onChange}
                  autoComplete="new-password"
                  required
                />
                {errors.confirm && <small style={{ color: "#b91c1c", fontWeight: 600 }}>{errors.confirm}</small>}
              </div>
            </div>

            {/* Plan */}
            <div>
              <label htmlFor="plan">Plan</label>
              <select id="plan" className="input" value={form.plan} onChange={onChange}>
                <option>None</option>
                <option>Individual - $70</option>
                <option>Dual - $95</option>
                <option>Family — $115</option>
                <option>Patron — $200</option>
              </select>
            </div>

            {/* Newsletter subscribe */}
            <div className="check" style={{ marginTop: 12 }}>
              <input
                id="subscribe"
                type="checkbox"
                checked={form.subscribe}
                onChange={onChange}
              />
              <label htmlFor="subscribe">Subscribe to our newsletter</label>
            </div>

            {/* Continue button */}
            <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
              <button type="submit" className="btn btn--brand btn--lg" disabled={submitting}>
                {submitting ? "Creating your membership..." : "Continue"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
