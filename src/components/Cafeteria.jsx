import React from "react";
import "./Support.css";
import { Link } from "react-router-dom";

const Cafeteria = () => {
  // 1) Keep MENU here (inside the component, but BEFORE return)
  const MENU = [
    {
      category: "Coffee & Tea",
      items: [
        {
          name: "House Latte",
          desc: "Double shot espresso, velvety micro-foam.",
          price: 5.25,
          cals: 160,
          img: "https://www.deathwishcoffee.com/cdn/shop/articles/haydn-golden-latte-unsplash_1a08c7ab-fcba-4b0c-8001-692edad1fe02.jpg?v=1740665931&width=1100",
        },
        {
          name: "Cold Brew",
          desc: "Slow-steeped, chocolatey finish.",
          price: 4.75,
          cals: 10,
          img: "https://t3.ftcdn.net/jpg/03/16/01/48/360_F_316014817_EC1KN7mAD86ALYhhwGUUeSsQoJIVMtfQ.jpg",
        },
        {
          name: "Loose-Leaf Tea",
          desc: "Earl Grey, Jasmine, Peppermint, Chamomile.",
          price: 3.95,
          cals: 0,
          img: "https://loveincstatic.blob.core.windows.net/lovefood/2020/Loose-leaf-tea/loose-leaf-vs-tea-bags.jpg",
        },
      ],
    },
    {
      category: "Breakfast & Pastries",
      items: [
        {
          name: "Seasonal Croissant",
          desc: "Baked in-house, rotating fillings.",
          price: 4.50,
          cals: 280,
          img: "https://balthazar-bakery.myshopify.com/cdn/shop/collections/breakfast_retail_new-1120x862.jpg?v=1706678805&width=750",
        },
        {
          name: "Yogurt Parfait",
          desc: "Greek yogurt, museum granola, local honey, berries.",
          price: 6.50,
          cals: 320,
          tags: ["Vegetarian", "Gluten-Free"],
          img: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1200&q=80",
        },
      ],
    },
    {
      category: "Sandwiches & Salads",
      items: [
        {
          name: "Artisan Veggie Sandwich",
          desc: "Roasted peppers & zucchini, basil-lemon aioli, country loaf.",
          price: 11.50,
          cals: 520,
          tags: ["Vegetarian Options"],
          img: "https://chiliandtonic.com/wp-content/uploads/2021/06/grilled-veggie-sandwich-05-500x375.jpg",
        },
        {
          name: "Roast Chicken Ciabatta",
          desc: "Herb-roasted chicken, pickled onion, arugula, garlic aioli.",
          price: 12.75,
          cals: 610,
          img: "https://media.istockphoto.com/id/157647007/photo/panini-sandwiches.jpg?s=612x612&w=0&k=20&c=zui410-M0L0NvLB4KKE-B1stSZDjRw8FSe2Xi1yOwEA=",
        },
        {
          name: "Garden Salad Bowl",
          desc: "Local greens, cucumber, radish, toasted seeds, citrus vinaigrette.",
          price: 10.25,
          cals: 280,
          tags: ["Vegan", "Gluten-Free"],
          img: "https://media.istockphoto.com/id/1454741285/photo/roast-fish-and-vegetable-salad-on-wooden-background.jpg?s=612x612&w=0&k=20&c=Slmk-RLvdR3317E5W2UKLul4y1ZH3axjL2XCNOBZbhE=",
        },
      ],
    },
    {
      category: "Kids",
      items: [
        {
          name: "Grilled Cheese",
          desc: "Mild cheddar on buttered sourdough. Served with apple slices.",
          price: 7.50,
          cals: 450,
          img: "https://images.purplecarrot.com/uploads/product/image/1751/_1400_700_Vegan_IndianStyleGrilledCheese_Horizontal-94c1ec28c62513396bb735774966ec21.jpg",
        },
        {
            name: "Mini Pasta Bowl",
            desc: "Butter or tomato sauce over penne, served with fruit cup and milk.",
            price: 8.25,
            cals: 510,
            tags: ["Vegetarian Options"],
            img: "https://as1.ftcdn.net/jpg/03/09/68/14/1000_F_309681406_riA81IvbTM12ryVMFjygv1Wi8hSjOAq5.jpg",
        },
      ],
    },
    {
      category: "Desserts",
      items: [
        {
          name: "Citrus Olive-Oil Cake",
          desc: "Fragrant, moist crumb; powdered sugar finish.",
          price: 5.95,
          cals: 420,
          img: "https://temeculaoliveoil.com/wp-content/uploads/2025/09/Blood-Orange-Citrus-Olive-Oil-Cake.png",
        },
        {
          name: "Chocolate Tart",
          desc: "Dark chocolate ganache, flaky crust, sea-salt.",
          price: 6.50,
          cals: 480,
          img: "https://thumbs.dreamstime.com/b/no-bake-healthy-pastry-chocolate-tart-top-view-decorated-strawberries-blueberries-coconut-chips-served-dark-concrete-180802708.jpg",
        },
      ],
    },
  ];

  // 2) All JSX must be inside return
  return (
    <div className="cafeteria-page">
      {/* HERO BANNER */}
      <section
        className="hero-banner"
        style={{
          position: "relative",
          backgroundImage:
            "url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1950&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: "#fefcf9",
          padding: "7rem 0",
          textAlign: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(20, 20, 20, 0.45)",
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1
            className="page-title"
            style={{
              fontSize: "3.2rem",
              fontWeight: 800,
              color: "#f9e5b3",
              letterSpacing: "1px",
            }}
          >
            Museum Café
          </h1>
          <p
            className="subtitle"
            style={{ color: "#f8f8f8", fontSize: "1.25rem", marginTop: ".75rem" }}
          >
            Where art and comfort meet over coffee.
          </p>
        </div>
      </section>

      {/* ABOUT */}
      <section className="container py-5" style={{ maxWidth: 900, margin: "0 auto" }}>
        <h2 className="section-title text-center mb-4">About the Café</h2>
        <p className="text-center mb-4" style={{ lineHeight: 1.7, fontSize: "1.05rem" }}>
          Nestled in the heart of the museum, the <strong>Museum Café</strong> offers
          an inviting retreat with freshly brewed espresso, handcrafted pastries,
          and locally sourced lunch options. Relax beneath natural light, surrounded
          by art and soft music — the perfect pause during your museum day.
        </p>
      </section>

      {/* MENU (with images/prices/tags) */}
      {/* MENU (with images/prices/tags) — STRUCTURED VERSION */}
    <section style={{ backgroundColor: "#fffdf7", padding: "3.5rem 0 4.5rem" }}>
    <div className="container" style={{ maxWidth: 1150, margin: "0 auto" }}>
        <h2
        className="section-title"
        style={{
            textAlign: "center",
            color: "#164e63",
            fontWeight: 900,
            marginBottom: "1.25rem",
        }}
        >
        Café Menu
        </h2>
        <p style={{ textAlign: "center", color: "#475569", marginBottom: "2.25rem" }}>
        Prices include tax. Availability may vary daily. Ask about seasonal specials.
        </p>

        {MENU.map((section, idx) => (
        <div key={idx} style={{ marginBottom: "2.75rem" }}>
            {/* category header */}
            <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                margin: "0 0 1.1rem",
            }}
            >
            <h3
                style={{
                fontFamily: "Playfair Display, serif",
                fontSize: "1.35rem",
                color: "#0f172a",
                margin: 0,
                fontWeight: 800,
                }}
            >
                {section.category}
            </h3>
            <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
            </div>

            <div
            className="menu-grid"
            style={{
                display: "grid",
                gap: "1.25rem",
                gridTemplateColumns:
                "repeat(auto-fit, minmax(320px, 1fr))", // structured, wider min width
                alignItems: "stretch",
            }}
            >
            {section.items.map((it, i) => (
                <article
                key={i}
                className="card-soft"
                style={{
                    background: "#fff",
                    borderRadius: 16,
                    overflow: "hidden",
                    boxShadow: "0 6px 18px rgba(0,0,0,.08)",
                    display: "flex",
                    flexDirection: "column",
                }}
                >
                {/* image: fixed height → uniform row heights */}
                <div
                    style={{
                    position: "relative",
                    overflow: "hidden",
                    height: 220, // <- fixed image height for structure
                    background: "#f3f4f6",
                    }}
                >
                    <img
                    src={it.img}
                    alt={it.name}
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                        transition: "transform .25s ease",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
                    onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    />
                </div>

                {/* text */}
                <div
                    style={{
                    padding: "0.9rem 1rem 1.05rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: ".45rem",
                    minHeight: 150, // <- content zone kept consistent
                    }}
                >
                    <div
                    style={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: ".5rem",
                    }}
                    >
                    <h4 style={{ margin: 0, color: "#0f172a", fontWeight: 800 }}>{it.name}</h4>
                    <div style={{ fontWeight: 800, color: "#145262" }}>
                        ${it.price.toFixed(2)}
                    </div>
                    </div>

                    <p style={{ margin: 0, color: "#475569", lineHeight: 1.45 }}>{it.desc}</p>

                    <div style={{ marginTop: "auto", display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
                    {it.tags?.map((t) => (
                        <span
                        key={t}
                        className="tag"
                        style={{
                            fontSize: ".78rem",
                            padding: ".18rem .5rem",
                            borderRadius: 999,
                            background: "#e6f3f6",
                            color: "#0b4a5a",
                            fontWeight: 700,
                        }}
                        >
                        {t}
                        </span>
                    ))}
                    {typeof it.cals === "number" && (
                        <span
                        style={{
                            marginLeft: "auto",
                            fontSize: ".78rem",
                            color: "#64748b",
                            fontWeight: 700,
                        }}
                        aria-label="Calories"
                        >
                        {it.cals} cal
                        </span>
                    )}
                    </div>
                </div>
                </article>
            ))}
            </div>
        </div>
        ))}

        <p style={{ color: "#6b7280", marginTop: ".75rem", fontSize: ".95rem" }}>
        * We proudly feature local roasters and bakers. Please inform us of any allergies.
        </p>
    </div>
    </section>


      {/* HOURS & LOCATION */}
      <section className="info-section py-5" style={{ textAlign: "center", backgroundColor: "#f8f8f8" }}>
        <h2 className="section-title mb-3">Hours & Location</h2>
        <p><strong>Monday – Saturday:</strong> 10 AM – 5 PM</p>
        <p><strong>Sunday:</strong> 12 PM – 5 PM</p>
        <p className="mt-3"><strong>Ground Floor</strong> • Near the Sculpture Gallery</p>
        <p><em>Open to all visitors — museum admission not required.</em></p>
      </section>

      {/* CTA */}
      <section className="cta-section py-5" style={{ backgroundColor: "#eae4da", textAlign: "center" }}>
        <h2 className="section-title mb-3">Plan Your Visit</h2>
        <p>Take a moment to relax — your table’s waiting at the Museum Café.</p>
        <Link to="/visit">
          <button className="btn btn-primary mt-3" style={{ backgroundColor: "#355c7d", border: "none" }}>
            Explore Museum Hours
          </button>
        </Link>
      </section>
    </div>
  );
};

export default Cafeteria;
