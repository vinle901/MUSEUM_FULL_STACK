import artworkBanner from '/artwork_banner.jpeg'

const HeroBanner = ({ scrollY, title, description }) => {
  return (
    <div className="relative h-[800px] overflow-visible flex items-center bg-white">
      <img
        src={artworkBanner}
        alt="Artwork Banner"
        className="absolute inset-0 w-full h-full object-cover z-0"
        style={{
          transform: `translateY(${scrollY * 0.5}px)`,
          transition: 'transform 0.1s ease-out'
        }}
      />

      {/* Sliding white background on scroll */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-white transition-all duration-300 ease-out z-20 shadow-2xl"
        style={{
          height: '120%',
          transform: `translateY(${Math.max(0, 100 - (scrollY / 4))}%)`
        }}
      ></div>

      <div
        className="container mx-auto px-8 lg:px-16 relative z-30"
        style={{
          transform: `translateY(${Math.min(scrollY * 0.3, 150)}px)`,
          transition: 'transform 0.1s ease-out'
        }}
      >
        <div className="max-w-3xl">
          <h1
            className="text-7xl lg:text-8xl font-bold mb-6 leading-tight transition-all duration-300"
            style={{
              color: scrollY > 100 ? '#000000ff' : '#ffffff',
              textShadow: scrollY > 100 ? 'none' : '3px 3px 12px rgba(0,0,0,0.9)'
            }}
          >
            {title}
          </h1>
          <p
            className="text-2xl lg:text-3xl font-light leading-relaxed transition-all duration-300"
            style={{
              color: scrollY > 100 ? '#000000ff' : '#ffffff',
              textShadow: scrollY > 100 ? 'none' : '2px 2px 8px rgba(0,0,0,0.9)'
            }}
          >
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}

export default HeroBanner
