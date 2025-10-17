import artworkBanner from '/artwork_banner.jpeg'

const HeroBanner = ({ scrollY, title, description }) => {
  return (
    <div className="relative h-[900px] overflow-visible flex items-center bg-white">
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
          height: '60%',
          transform: `translateY(${Math.max(0, 100 - (scrollY / 4))}%)`
        }}
      ></div>

      <div
        className="container mx-auto pl-4 lg:pl-8 relative z-30"
        style={{
          transform: `translateY(250px)`,
          transition: 'transform 0.1s ease-out'
        }}
      >
        <div className="max-w-3xl">
          <h1
            className="text-7xl lg:text-8xl font-black mb-6 leading-tight transition-all duration-300 tracking-tight"
            style={{
              color: scrollY > 170 ? '#000000ff' : '#ffffff',
              textShadow: scrollY > 170 ? 'none' : '3px 3px 12px rgba(0,0,0,0.9)',
              fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif'
            }}
          >
            {title}
          </h1>
          <p
            className="text-2xl lg:text-3xl font-semibold leading-relaxed transition-all duration-300"
            style={{
              color: scrollY > 50 ? '#000000ff' : '#ffffff',
              textShadow: scrollY > 50 ? 'none' : '2px 2px 8px rgba(0,0,0,0.9)',
              fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif'
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
