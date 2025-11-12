// src/components/MembershipInfo.jsx
import { Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { fetchBenefits, getDetailedBenefits, getMembershipImage } from "../services/benefitsService";
import { authService } from "../services/authService";
import { ticketService } from "../services/ticketService";
import { formatDate } from "../utils/dateHelpers";

// Reusable CheckIcon component
const CheckIcon = ({ className = "w-5 h-5 text-brand flex-shrink-0 mt-0.5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);

export default function MembershipInfo() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [membership, setMembership] = useState(null);
  const [memLoading, setMemLoading] = useState(true);
  const isLoggedIn = useMemo(() => !!(currentUser && localStorage.getItem('accessToken')), [currentUser]);

  useEffect(() => {
    async function loadBenefits() {
      try {
        const benefits = await fetchBenefits();
        setPlans(benefits);
      } catch (err) {
        setError("Failed to load membership benefits");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadBenefits();
  }, []);

  // Determine logged in user and active membership status
  useEffect(() => {
    const loadUserAndMembership = async () => {
      try {
        const user = await authService.getCurrentUser();
        setCurrentUser(user);
        if (user?.user_id || user?.id) {
          try {
            const uid = user.user_id || user.id;
            const res = await ticketService.getUserMembership(uid);
            if (Array.isArray(res) && res.length > 0) setMembership(res[0]);
            else setMembership(null);
          } catch {
            setMembership(null);
          }
        } else {
          setMembership(null);
        }
      } catch {
        setCurrentUser(null);
        setMembership(null);
      } finally {
        setMemLoading(false);
      }
    };
    loadUserAndMembership();
  }, []);

  const hasActiveMembership = useMemo(() => {
    if (!membership) return false;
    const activeVal = membership.is_active;
    const isActive = (activeVal === 1 || activeVal === true || activeVal === '1');
    if (!isActive) return false;
    // Treat null expiration as non-expiring (active). Otherwise require not in the past.
    if (!membership.expiration_date) return true;
    const exp = new Date(membership.expiration_date);
    const today = new Date(); today.setHours(0,0,0,0);
    return exp >= today;
  }, [membership]);

  if (loading) {
    return (
      <main className="auth-page" style={{ background: "#f7fafc" }}>
        <header className="hero hero--teal">
          <div className="container hero__inner">
            <h1 className="hero__title">Membership</h1>
          </div>
        </header>
        <section className="container" style={{ padding: "32px 0" }}>
          <p className="text-center text-gray-600">Loading...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="auth-page" style={{ background: "#f7fafc" }}>
        <header className="hero hero--teal">
          <div className="container hero__inner">
            <h1 className="hero__title">Membership</h1>
          </div>
        </header>
        <section className="container" style={{ padding: "32px 0" }}>
          <div className="alert alert--error">{error}</div>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page" style={{ background: "#f7fafc" }}>
      {/* Hero */}
      <header className="hero hero--teal">
        <div className="container hero__inner">
          <h1 className="hero__title">Membership Levels & Benefits</h1>
          <p className="hero__sub">
            Enjoy year-round admission, exclusive previews, special events, and more.
          </p>
        </div>
      </header>

      {/* Intro + Contact */}
      <section className="container" style={{ padding: "32px 0 12px" }}>
        {/* Guard banner if already a member */}
        {!memLoading && hasActiveMembership && (
          <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 mb-6">
            <p className="text-green-900 font-semibold">
              You already have an active membership{membership?.membership_type ? ` (${membership.membership_type})` : ''}.
            </p>
            {membership?.expiration_date && (
              <p className="text-green-800 text-sm mt-1">Expires on {formatDate(membership.expiration_date)}.</p>
            )}
          </div>
        )}
        <div className="grid grid-cols-[1.4fr_0.8fr] gap-6">
          <div className="card card--spacious bg-gradient-to-br from-white to-gray-50 border-2 border-gray-100 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <h2 className="page-title text-3xl font-bold text-brand mb-3 mt-0">
              Levels & Benefits
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-4">
              See extraordinary exhibitions, get free admission, enjoy complimentary
              entry at premium nights, take members-only tours, and support one of the
              city's premier museums. <strong className="text-brand">Select your membership level below.</strong>
            </p>

            <ul className="space-y-3 mt-6 pl-0 list-none">
              <li className="flex items-start gap-3 text-gray-700">
                <CheckIcon />
                <span>Free year-round admission</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700">
                <CheckIcon />
                <span>Members preview nights for select exhibitions</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700">
                <CheckIcon />
                <span>Access to the Members Lounge</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700">
                <CheckIcon />
                <span>Members-only lectures, programs, and tours</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700">
                <CheckIcon />
                <span>Discounted tickets for guests and museum films</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700">
                <CheckIcon />
                <span>Admission to our house museums</span>
              </li>
            </ul>
          </div>

          <aside className="card card--spacious bg-white border-2 border-gray-100 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <h3 className="text-xl font-bold text-brand mb-4 mt-0">Questions?</h3>
            <div className="space-y-3">
              <div className="bg-gradient-to-br from-brand/5 to-brand/10 rounded-xl p-4 border-l-4 border-brand hover:shadow-md transition-all duration-300 hover:translate-x-1">
                <strong className="text-gray-900 block mb-1">Call for Questions</strong>
                <span className="text-gray-600 text-sm">713-639-7550</span>
              </div>
              <div className="bg-gradient-to-br from-brand/5 to-brand/10 rounded-xl p-4 border-l-4 border-brand hover:shadow-md transition-all duration-300 hover:translate-x-1">
                <strong className="text-gray-900 block mb-1">Email Your Questions</strong>
                <span className="text-gray-600 text-sm">membership@themuseum.org</span>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Plan Cards */}
      <section className="container" style={{ padding: "12px 0 56px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0,1fr))",
            gap: 20,
          }}
        >
          {plans.map((p) => (
            <article 
              key={p.membership_type} 
              className="bg-white border-2 border-gray-200 hover:border-brand rounded-xl overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1 cursor-pointer group break-inside-avoid relative" 
              style={{ 
                display: "flex", 
                flexDirection: "column"
              }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-brand/0 via-brand/30 to-brand/0 translate-x-[-100%] group-hover:translate-x-[100%] group-hover:transition-transform group-hover:duration-700 group-hover:ease-in-out z-10 pointer-events-none"></div>
              
              <div
                className="relative overflow-hidden group"
                style={{
                  height: 160,
                  background: `url(${getMembershipImage(p.membership_type)}) center/cover no-repeat`,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: `url(${getMembershipImage(p.membership_type)})` }} />
                {/* Price badge */}
                <div className="absolute top-3 right-3 bg-white rounded-full px-4 py-2 shadow-lg">
                  <span className="text-brand font-bold text-lg">${parseFloat(p.annual_fee).toFixed(0)}</span>
                </div>
              </div>
              <div className="card--spacious" style={{ borderRadius: 0, display: "flex", flexDirection: "column", flex: 1 }}>
                <h3
                  className="mb-4"
                  style={{
                    fontFamily: "Montserrat, sans-serif",
                    fontWeight: 800,
                    fontSize: "1.35rem",
                    margin: 0,
                    color: "#0f172a",
                  }}
                >
                  {p.membership_type}
                </h3>

                <ul style={{ paddingLeft: 0, marginBottom: 20, flex: 1, listStyle: "none" }}>
                  {getDetailedBenefits(p).map((perk, i) => (
                    <li key={i} className="flex items-start gap-2 mb-2" style={{ fontSize: "0.9rem", lineHeight: 1.5 }}>
                      <CheckIcon className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{perk}</span>
                    </li>
                  ))}
                </ul>

                {hasActiveMembership ? (
                  <button
                    type="button"
                    disabled
                    className="btn btn--lg w-full font-bold cursor-not-allowed opacity-60"
                    style={{ justifyContent: "center" }}
                    title="You already have an active membership"
                  >
                    Already a Member
                  </button>
                ) : !isLoggedIn ? (
                  <Link
                    to="/register?redirect=/membership"
                    className="btn btn--brand btn--lg w-full font-bold"
                    style={{ justifyContent: "center" }}
                  >
                    Join
                  </Link>
                ) : (
                  <Link
                    to="/checkout/membership"
                    state={{ checkoutType: 'membership', membershipData: { plan: p, user: currentUser } }}
                    className="btn btn--brand btn--lg w-full font-bold"
                    style={{ justifyContent: "center" }}
                  >
                    Join Now
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="container" style={{ padding: "8px 0 28px" }}>
      <article
        className="card"
        style={{
          overflow: "hidden",
          background: "#eef3f5",
          border: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
            gap: 0,
          }}
        >
          {/* Left: image */}
          <div
            style={{
              minHeight: 360,
              background:
                "url(https://www.visitlongbeach.com/imager/files_idss_com/C244/d3cdbcfd-624d-4a7e-9a27-925e05116d2f_e45adf5f6bc0c5c2a30a39868f44eab6.jpg) center/cover no-repeat",
            }}
            aria-hidden="true"
          />

          {/* Right: copy */}
          <div style={{ padding: "36px 36px" }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: ".06em",
                textTransform: "uppercase",
                color: "#0f172a",
                margin: "0 0 10px",
              }}
            >
              Special Event
            </p>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                lineHeight: 1.1,
                fontWeight: 900,
                fontSize: "clamp(28px, 4vw, 52px)",
                margin: "0 0 18px",
                color: "#0f172a",
              }}
            >
              Members Tour | Latin American and Latino Art Since 1920
            </h2>
            <p className="muted" style={{ fontSize: "1.05rem", marginBottom: 22 }}>
              Members are invited to take part in this special Saturday tour
              highlighting the museum’s collection of modern and contemporary Latin
              American and Latino art—one of the most significant collections of its
              kind in the world.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {/* Discover more could link to your events page or a detail route */}
              <Link
                to="/calendar"
                className="btn btn--light btn--lg"
                style={{ justifyContent: "center" }}
              >
                Discover More
              </Link>

              {/* Optional: quick CTA to join */}
              {hasActiveMembership ? (
                <button
                  type="button"
                  disabled
                  className="btn btn--lg cursor-not-allowed opacity-60"
                  style={{ justifyContent: "center" }}
                  title="You already have an active membership"
                >
                  Already a Member
                </button>
              ) : !isLoggedIn ? (
                <Link
                  to="/register?redirect=/membership"
                  className="btn btn--brand btn--lg"
                  style={{ justifyContent: "center" }}
                >
                  Become a Member
                </Link>
              ) : (
                <Link
                  to="/membership"
                  state={{ checkoutType: 'membership' }}
                  className="btn btn--brand btn--lg"
                  style={{ justifyContent: "center" }}
                >
                  Become a Member
                </Link>
              )}
            </div>
          </div>
        </div>
      </article>
    </section>
    </main>
  );
}
