import React, { useState, useEffect } from "react";
import "./Support.css";
import { Link } from "react-router-dom";
import cafeteriaService from "../services/cafeteriaService";
import { getImageUrl } from "../utils/imageHelpers";

const Cafeteria = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        setLoading(true);
        const items = await cafeteriaService.getAllItems();
        setMenuItems(items);
        setError(null);
      } catch (err) {
        console.error('Error fetching cafeteria items:', err);
        setError('Failed to load menu items. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchMenuItems();
  }, []);

  // Transform backend data to match frontend structure
  const MENU = menuItems.reduce((acc, item) => {
    // Map backend category names to frontend display names
    const categoryMap = {
      'Hot Beverages': 'Coffee & Tea',
      'Cold Beverages': 'Coffee & Tea',
      'Sandwiches': 'Sandwiches & Salads',
      'Salads': 'Sandwiches & Salads',
      'Main Dishes': 'Kids',
      'Desserts': 'Desserts'
    };

    const displayCategory = categoryMap[item.category] || item.category;

    // Find or create category
    let categoryObj = acc.find(cat => cat.category === displayCategory);
    if (!categoryObj) {
      categoryObj = { category: displayCategory, items: [] };
      acc.push(categoryObj);
    }

    // Transform item data
    const transformedItem = {
      name: item.item_name,
      desc: item.description,
      price: parseFloat(item.price),
      cals: item.calories,
      prepTime: item.preparation_time_minutes,
      img: getImageUrl(item.image_url) || 'https://via.placeholder.com/400x220?text=Menu+Item',
    };

    // Add dietary tags
    const tags = [];
    if (item.is_vegetarian) tags.push('Vegetarian');
    if (item.is_vegan) tags.push('Vegan');

    // Add special tags for specific items based on original hardcoded data
    if (item.item_name === 'Yogurt Parfait') {
      tags.push('Gluten-Free');
    } else if (item.item_name === 'Artisan Veggie Sandwich') {
      tags.push('Vegetarian Options');
    } else if (item.item_name === 'Garden Salad Bowl') {
      tags.push('Gluten-Free');
    } else if (item.item_name === 'Mini Pasta Bowl') {
      tags.push('Vegetarian Options');
    }

    if (tags.length > 0) {
      transformedItem.tags = tags;
    }

    categoryObj.items.push(transformedItem);
    return acc;
  }, []);

  // Ensure categories are in the correct order
  const categoryOrder = ['Coffee & Tea', 'Breakfast & Pastries', 'Sandwiches & Salads', 'Kids', 'Desserts'];
  const displayMenu = categoryOrder.map(catName => {
    return MENU.find(cat => cat.category === catName);
  }).filter(Boolean);

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

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Loading menu items...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
            <p>{error}</p>
          </div>
        ) : displayMenu.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>No menu items available at this time.</p>
          </div>
        ) : (
          displayMenu.map((section, idx) => (
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
                    {typeof it.prepTime === "number" && it.prepTime > 0 && (
                        <span
                        style={{
                            fontSize: ".78rem",
                            color: "#059669",
                            fontWeight: 700,
                        }}
                        aria-label="Preparation Time"
                        >
                        {it.prepTime} min
                        </span>
                    )}
                    </div>
                </div>
                </article>
            ))}
            </div>
        </div>
        ))
        )}

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
        <p>Take a moment to relax — your table's waiting at the Museum Café.</p>
        <Link to="/visit">
          <button className="btn btn-primary mt-3" style={{ backgroundColor: "#355c7d", color: "white", border: "none" }}>
            Explore Museum Hours
          </button>
        </Link>
      </section>
    </div>
  );
};

export default Cafeteria;
