import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="bg-white text-gray-800">
      {/* Hero Section (Banner) */}
      <section
        className="relative h-[80vh] bg-cover bg-center flex items-center justify-center"
        style={{
          backgroundImage:
            "url('https://www.cultureowl.com/storage/editorials/92RU8yhFzIjYk7UzynEx1DuJgtTiXa9SPTa1ZQ4y.jpg')",
        }}
      >
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="relative text-center text-white px-4">
        <h1
            className="text-8xl md:text-6xl lg:text-8xl font-bold mb-10"
            style={{ fontFamily: 'Playfair Display, serif', letterSpacing: '2px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}
            >
            Welcome to The Museum
        </h1>
        <p
            className="text-4xl md:text-4xl mb-12"
            style={{ fontFamily: 'Merriweather, serif', letterSpacing: '1px', textShadow: '1px 1px 3px rgba(0,0,0,0.2)' }}
            >
            Explore the beauty of art and history
        </p>
        </div>
      </section>

        {/* Current Exhibitions Section */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        {/* Left-aligned heading */}
        <h2 className="text-4xl font-bold mb-5 text-left">
          Current Exhibitions
        </h2>
      </section>

        {/* Featured Artworks Section */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        {/* Left-aligned heading */}
        <h2 className="text-4xl font-bold mb-5 text-left">
          Featured Artworks
        </h2>
      </section>
    </div>
    );
}

export default Home;