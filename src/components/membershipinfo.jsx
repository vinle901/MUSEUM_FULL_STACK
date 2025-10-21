// src/components/MembershipInfo.jsx
import { Link } from "react-router-dom";
const PLANS = [
  {
    key: "individual",
    title: "Individual",
    price: 70,
    img: "https://www.famsf.org/storage/images/5266a91b-7b8c-4a50-9b70-091624408128/deyoung-190930-0182-032-henrik-kam-2019-5.jpg?crop=3000,1688,x0,y312&format=jpg&quality=80&width=1000",
    perks: [
      "One free single-use parking pass + discounted parking thereafter",
      "Free parking when dining at Café Leonelli or Le Jardinier",
      "15% discount at Café Leonelli",
      "10% discount at the Museum Shop",
    ],
  },
  {
    key: "dual",
    title: "Dual",
    price: 95,
    img: "https://pensacolamuseum.org/wp-content/uploads/2025/04/PMA_25_DUAL-9810-scaled.jpg",
    perks: [
      "All Individual benefits for two adults",
      "Invitation to the annual Members Holiday Party",
    ],
  },
  {
    key: "family",
    title: "Family",
    price: 115,
    img: "https://media.istockphoto.com/id/1399195000/photo/mother-and-daughter-in-art-gallery.jpg?s=612x612&w=0&k=20&c=r_r2UMdb4hELHGxqx_3RAHZWiBPyUI1k2Gg23xE7A5o=",
    perks: [
      "All Dual benefits",
      "Admission privileges for children 18 and under in the same household",
      "Discounts on children’s art classes",
      "Invitations to family art-making programs",
    ],
  },
  {
    key: "patron",
    title: "Patron",
    price: 200,
    img: "https://media.istockphoto.com/id/538359000/photo/family-on-trip-to-museum-looking-at-map-together.jpg?s=612x612&w=0&k=20&c=6ry6SAPOAdVhhz3dccXCnwSck4ikASCLRZ0Z_cQW2tU=",
    perks: [
      "All Family benefits",
      "Exhibition preview invitations (Patron+ levels)",
      "Museum publication subscription",
      "Glassell School of Art discounts",
      "Reciprocal privileges at 70+ U.S. museums",
    ],
  },
];

export default function MembershipInfo() {
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
      {/* Special event banner */}
    

      {/* Intro + Contact */}
      <section className="container" style={{ padding: "32px 0 12px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr .8fr",
            gap: 24,
          }}
        >
          <div className="card card--spacious">
            <h2 className="page-title" style={{ marginTop: 0, marginBottom: 8 }}>
              Levels & Benefits
            </h2>
            <p className="muted" style={{ fontSize: "1.05rem" }}>
              See extraordinary exhibitions, get free admission, enjoy complimentary
              entry at premium nights, take members-only tours, and support one of the
              city’s premier museums. <strong>Select your membership level below.</strong>
            </p>

            <ul style={{ marginTop: 12, paddingLeft: "1.25rem" }}>
              <li>Free year-round admission</li>
              <li>Members preview nights for select exhibitions</li>
              <li>Access to the Members Lounge</li>
              <li>Members-only lectures, programs, and tours</li>
              <li>Discounted tickets for guests and museum films</li>
              <li>Admission to our house museums</li>
            </ul>
          </div>

          <aside className="card card--spacious">
            <h3 className="card__title" style={{ marginTop: 0 }}>Questions?</h3>
            <div style={{ display: "grid", gap: 12 }}>
              <div
                className="card"
                style={{ borderRadius: 12, padding: 12, display: "grid", gap: 4 }}
              >
                <strong>Call for Questions</strong>
                <span className="muted">713-639-7550</span>
              </div>
              <div
                className="card"
                style={{ borderRadius: 12, padding: 12, display: "grid", gap: 4 }}
              >
                <strong>Email Your Questions</strong>
                <span className="muted">membership@themuseum.org</span>
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
          {PLANS.map((p) => (
            <article key={p.key} className="card" style={{ overflow: "hidden" }}>
              <div
                style={{
                  height: 160,
                  background: `url(${p.img}) center/cover no-repeat`,
                }}
              />
              <div className="card--spacious" style={{ borderRadius: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <h3
                    style={{
                      fontFamily: "Montserrat, sans-serif",
                      fontWeight: 800,
                      fontSize: "1.25rem",
                      margin: 0,
                    }}
                  >
                    {p.title}
                  </h3>
                  <div style={{ fontWeight: 800, fontSize: "1.2rem" }}>
                    ${p.price}
                  </div>
                </div>

                <ul style={{ paddingLeft: "1.15rem", marginBottom: 16 }}>
                  {p.perks.map((perk, i) => (
                    <li key={i} style={{ marginBottom: 6 }}>
                      {perk}
                    </li>
                  ))}
                </ul>

                <div style={{ display: "grid", gap: 8 }}>
                  <Link
                    to="/membership/join"
                    className="btn btn--brand btn--lg"
                    style={{ justifyContent: "center" }}
                  >
                    Join / Renew
                  </Link>

                  <Link
                    to="/membership/join"
                    className="link"
                    style={{ textAlign: "center" }}
                  >
                  </Link>
                </div>
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
              <a
                href="#"
                className="btn btn--light btn--lg"
                style={{ justifyContent: "center" }}
              >
                Discover More
              </a>

              {/* Optional: quick CTA to join */}
              <Link
                to="/membership/join"
                className="btn btn--brand btn--lg"
                style={{ justifyContent: "center" }}
              >
                Become a Member
              </Link>
            </div>
          </div>
        </div>
      </article>
    </section>
    </main>
  );
}
