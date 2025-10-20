import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const Home = () => {
  const [exhibitions, setExhibitions] = useState([]);
  const [artworks, setArtworks] = useState([]);

  useEffect(() => {
    // Fetch exhibitions
    fetch("http://localhost:3000/exhibitions")
      .then((res) => res.json())
      .then((data) => setExhibitions(data.filter(e => e.is_active).slice(0, 3)))
      .catch((err) => console.error(err));

    // Fetch artworks
    fetch("http://localhost:3000/artworks")
      .then((res) => res.json())
      .then((data) => setArtworks(data.filter(a => a.is_on_display)))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="bg-white text-gray-800">
      {/* Hero Section */}
      <section
        className="relative h-[80vh] bg-cover bg-center flex items-center justify-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1504198266285-165a13c0c72e?w=1200')",
        }}
      >
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="relative text-center text-white px-4">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            Welcome to the Aurora Museum
          </h1>
          <p className="text-xl mb-6">Explore the beauty of art and history</p>
          <Link
            to="/exhibitions"
            className="bg-brand hover:bg-brand-dark px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Explore Exhibitions
          </Link>
        </div>
      </section>

      {/* Current Exhibitions */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold mb-8 text-center">
          Current Exhibitions
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {exhibitions.map((exhibit) => {
            // Find first artwork in this exhibition
            const artwork = artworks.find((a) => a.exhibition_id === exhibit.id);
            return (
              <Link
                to={`/exhibitions/${exhibit.id}`}
                key={exhibit.id}
                className="rounded-xl overflow-hidden shadow-md hover:scale-105 transition-transform"
              >
                {artwork && (
                  <img
                    src={artwork.picture_url}
                    alt={exhibit.exhibition_name}
                    className="w-full h-56 object-cover"
                  />
                )}
                <div className="p-4">
                  <h3 className="text-xl font-semibold">
                    {exhibit.exhibition_name}
                  </h3>
                  <p className="text-gray-600">{exhibit.location}</p>
                </div>
              </Link>
            );
          })}
        </div>
        <div className="text-center mt-8">
          <Link
            to="/exhibitions"
            className="text-brand font-semibold hover:underline"
          >
            View All Exhibitions →
          </Link>
        </div>
      </section>

      {/* Featured Artworks */}
      <section className="bg-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-8 text-center">
            Featured Artworks
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {artworks.slice(0, 3).map((art) => (
              <Link
                to={`/artworks/${art.id}`}
                key={art.id}
                className="rounded-xl overflow-hidden bg-white shadow hover:shadow-lg transition-shadow"
              >
                <img
                  src={art.picture_url}
                  alt={art.title}
                  className="w-full h-56 object-cover"
                />
                <div className="p-4">
                  <h3 className="text-lg font-semibold">{art.title}</h3>
                  <p className="text-gray-500">{art.artist}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              to="/artworks"
              className="text-brand font-semibold hover:underline"
            >
              See More Artworks →
            </Link>
          </div>
        </div>
      </section>

      {/* Plan Your Visit */}
      <section className="py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Plan Your Visit</h2>
        <p className="text-gray-600 mb-6">
          Open Tuesday–Sunday, 10 AM – 6 PM. Closed on Mondays.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            to="/visit"
            className="bg-brand hover:bg-brand-dark text-white px-6 py-3 rounded-lg font-semibold"
          >
            Get Tickets
          </Link>
          <Link
            to="/parking"
            className="border border-brand text-brand hover:bg-brand/10 px-6 py-3 rounded-lg font-semibold"
          >
            Parking Info
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8 text-center">
        <p>© {new Date().getFullYear()} Aurora Museum. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Home;
