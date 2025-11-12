import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import ExhibitionSpotlightCard from './ExhibitionSpotlightCard'
import EventPreview from './EventPreview'
import ArtworkCard from './ArtworkCard'
import { useArtworkData } from '../hooks/useArtworkData'
import { getArtistName } from '../utils/artworkHelpers'

const Home = () => {
  const [exhibitions, setExhibitions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)
  const navigate = useNavigate()

  // Artworks data for Featured Artworks section
  const {
    artworks,
    artists,
    loading: artworksLoading,
    error: artworksError,
  } = useArtworkData()

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const { data } = await api.get('/api/exhibitions?include_inactive=true')
        setExhibitions(Array.isArray(data) ? data : [])
      } catch (e) {
        console.error(e)
        setError('Failed to load exhibitions')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const toDateOnly = (d) => {
    if (!d) return null
    const t = new Date(d)
    if (isNaN(t)) return null
    return new Date(t.getFullYear(), t.getMonth(), t.getDate())
  }

  const isActiveFlag = (it) => (it?.is_active === undefined || it?.is_active === null) ? true : !!it.is_active

  const isCurrent = (ex) => {
    if (!ex) return false
    if (ex.exhibition_type && String(ex.exhibition_type).toLowerCase() === 'permanent') return true
    const today = new Date()
    const start = toDateOnly(ex.start_date)
    const end = toDateOnly(ex.end_date)
    const active = isActiveFlag(ex)
    if (!active) return false
    if (start && end) return start <= today && end >= today
    if (start && !end) return start <= today
    return false
  }

  const currentTop3 = exhibitions
    .filter(isCurrent)
    .sort((a, b) => (toDateOnly(b.start_date)?.getTime() || 0) - (toDateOnly(a.start_date)?.getTime() || 0))
    .slice(0, 3)

  // Pick ~3 artworks to feature (prefer items currently on display with images)
  const featuredArtworks = (() => {
    if (!Array.isArray(artworks)) return []
    const withImages = artworks.filter(a => !!a?.picture_url)
    const onDisplay = withImages.filter(a => !!a?.is_on_display)
    const pool = onDisplay.length >= 3 ? onDisplay : withImages
    return pool.slice(0, 3)
  })()

  // Determine today's open hours: Sun-Thu 10–5, Fri-Sat 10–8
  const dayOfWeek = new Date().getDay() // 0=Sun ... 6=Sat
  const isFriSat = dayOfWeek === 5 || dayOfWeek === 6
  const openHoursToday = isFriSat ? '10:00 am – 8:00 pm' : '10:00 am – 5:00 pm'

  return (
    <div
      className="text-gray-800"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at top, rgba(17,70,85,0.06), transparent 60%), linear-gradient(180deg, #ffffff 0%, #f7faf9 60%, #ffffff 100%)',
      }}
    >
      {/* Hero Section (Banner) - Modern Design */}
      <section className="relative min-h-[600px] h-[75vh] max-h-[800px] overflow-hidden">
        {/* Background Image with Parallax Effect */}
        <div
          className="absolute inset-0 bg-cover transform scale-110 transition-transform duration-1000"
          style={{
            backgroundImage:
              "url('https://media.cntraveler.com/photos/5a99866499c77f4533dfc047/16:9/w_2240,c_limit/Braccio-Nuovo-Sculpture-Gallery-J9FA8C.jpg')",
            backgroundPosition: 'center 75%',
          }}
        ></div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-transparent"></div>

        {/* Animated Shapes */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-yellow-300/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-32 left-20 w-96 h-96 bg-[#164e63]/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

        {/* Hero Content */}
        <div className="relative h-full flex items-center justify-center px-4">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-8 animate-fade-in">
              <span className="w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></span>
              <span className="text-white/90 text-sm font-medium tracking-wide">Experience Art & Culture</span>
            </div>

            {/* Main Heading with Stagger Animation */}
            <h1
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-6 leading-tight animate-slide-up"
              style={{
                fontFamily: 'Playfair Display, serif',
                letterSpacing: '1px',
                textShadow: '0 4px 20px rgba(0,0,0,0.5)',
              }}
            >
              Welcome to
              <br />
              <span className="bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
                The Museum
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className="text-xl sm:text-2xl md:text-3xl text-white/90 mb-12 max-w-3xl mx-auto animate-slide-up-delay"
              style={{
                fontFamily: 'Merriweather, serif',
                letterSpacing: '0.5px',
                textShadow: '0 2px 10px rgba(0,0,0,0.5)',
              }}
            >
              Explore masterpieces, discover history, and immerse yourself in timeless beauty
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-delay">
              <Link
                to="/tickets/checkout"
                className="group relative px-8 py-4 bg-gradient-to-r from-[#164e63] to-[#0a3847] text-white font-semibold rounded-full overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-[#164e63]/50"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Get Tickets
                  <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>

              <Link
                to="/calendar"
                className="group px-8 py-4 bg-white/50 backdrop-blur-md text-gray-500 font-semibold rounded-full border-2 border-white/50 hover:bg-white hover:text-[#164e63] transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <span className="flex items-center gap-2">
                  Explore Exhibitions
                  <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }

        .animate-fade-in-delay {
          animation: fade-in 1s ease-out 0.4s both;
        }

        .animate-slide-up {
          animation: slide-up 0.8s ease-out 0.2s both;
        }

        .animate-slide-up-delay {
          animation: slide-up 0.8s ease-out 0.4s both;
        }

        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>

      {/* Info Header Bar */}
  <section className="text-white" style={{ backgroundColor: 'rgb(17, 70, 85)' }}>
        <div className="max-w-8xl mx-auto px-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/20">
            {/* Open Today */}
            <div className="flex flex-col items-center justify-center text-center gap-1.4 py-4 md:py-5">
              {/* Clock icon */}
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="text-base md:text-lg font-semibold">Open Today: {openHoursToday}</div>
              <Link to="/visit" className="group inline-flex items-center text-white/90">
                <span>Plan a Visit</span>
                <svg className="ml-1 w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </Link>
              <div className="h-[1px] w-24 bg-yellow-300"></div>
            </div>

            {/* Admission */}
            <div className="flex flex-col items-center justify-center text-center gap-1.4 py-4 md:py-5">
              {/* Ticket icon */}
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 8a2 2 0 012-2h12a2 2 0 012 2v1a2.5 2.5 0 110 5v1a2 2 0 01-2 2H6a2 2 0 01-2-2v-1a2.5 2.5 0 110-5V8z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 7v10" strokeDasharray="2 2" />
              </svg>
              <div className="text-base md:text-lg font-semibold">Adults $25, Children $10</div>
              <Link to="/visit#ticket-section" className="group inline-flex items-center text-white/90">
                <span>See Tickets</span>
                <svg className="ml-1 w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </Link>
              <div className="h-[1px] w-28 bg-yellow-300"></div>
            </div>

            {/* Location */}
            <div className="flex flex-col items-center justify-center text-center gap-1.4 py-4 md:py-5">
              {/* Pin icon */}
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 21s-6-5.686-6-10a6 6 0 1112 0c0 4.314-6 10-6 10z" />
                <circle cx="12" cy="11" r="2.5" />
              </svg>
              <div className="text-base md:text-lg font-semibold">Nested in Museum District</div>
              <Link to="/visit" className="group inline-flex items-center text-white/90">
                <span>Directions & Parking</span>
                <svg className="ml-1 w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </Link>
              <div className="h-[1px] w-28 bg-yellow-300"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Current Exhibitions Section */}
      <section className="relative mx-auto px-8 sm:px-12 lg:px-16 py-16 bg-gradient-to-b from-white to-gray-50">
        {/* Decorative background elements */}
        <div className="absolute top-10 right-10 w-64 h-64 bg-[#164e63]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-yellow-100/30 rounded-full blur-3xl"></div>

        <div className="relative max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <div className="inline-block mb-4">
              <span className="px-4 py-2 bg-[#164e63]/10 text-[#164e63] rounded-full text-sm font-semibold tracking-wide uppercase">
                On View Now
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              Current Exhibitions
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Explore our latest exhibitions and immersive experiences
            </p>
          </div>

          {loading && <p className="text-gray-500 text-center">Loading…</p>}
          {error && <p className="text-red-600 text-center">{error}</p>}
          {!loading && !error && currentTop3.length === 0 && (
            <p className="text-gray-600 text-center">No current exhibitions at this time.</p>
          )}

          <div className="space-y-20">
            {currentTop3.map((ex, idx) => (
              <ExhibitionSpotlightCard
                key={ex.exhibition_id}
                exhibition={ex}
                align={idx % 2 === 0 ? 'left' : 'right'}
                onDetails={() => setPreview(ex)}
              />
            ))}
          </div>

          {/* Explore more button centered at end */}
          {!loading && !error && currentTop3.length > 0 && (
            <div className="mt-12 flex justify-center">
              <Link
                to="/calendar"
                className="px-6 py-3 mt-10 bg-brand text-white hover:bg-brand-dark rounded-lg"
              >
                Explore More
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Featured Artworks Section */}
      <section className="relative mx-auto px-8 sm:px-12 lg:px-16 py-16 bg-gradient-to-b from-gray-50 to-white">
        {/* Decorative background elements */}
        <div className="absolute top-10 left-10 w-64 h-64 bg-yellow-100/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-[#164e63]/5 rounded-full blur-3xl"></div>

        <div className="relative max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <div className="inline-block mb-4">
              <span className="px-4 py-2 bg-[#164e63]/10 text-[#164e63] rounded-full text-sm font-semibold tracking-wide uppercase">
                Gallery Highlights
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              Featured Artworks
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Discover masterpieces from our curated collection
            </p>
          </div>

          {artworksLoading && (
            <p className="text-gray-500 text-center">Loading artworks…</p>
          )}
          {artworksError && (
            <p className="text-red-600 text-center">Failed to load artworks.</p>
          )}

          {!artworksLoading && !artworksError && featuredArtworks.length === 0 && (
            <p className="text-gray-600 text-center">No featured artworks available right now.</p>
          )}

          {!artworksLoading && !artworksError && featuredArtworks.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
                {featuredArtworks.map((art) => (
                  <ArtworkCard
                    key={art.artwork_id}
                    artwork={art}
                    artistName={getArtistName(art.artist_id, artists)}
                    className="h-full"
                    imageClassName="h-72 sm:h-80 lg:h-96 object-cover"
                    onClick={() => navigate(`/artworks/${art.artwork_id}`)}
                  />
                ))}
              </div>
              <div className="mt-12 flex justify-center">
                <Link
                  to="/artworks"
                  className="px-6 py-3 bg-brand text-white hover:bg-brand-dark rounded-lg"
                >
                  Explore More
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
      {/* Membership Banner */}
      <section className="mx-auto px-16 py-10">
        <div
          className="w-full bg-[rgb(17,70,85)] text-white px-8 py-12"
        >
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <h3 className="text-3xl md:text-4xl font-bold">Become a Member</h3>
                <p className="mt-2 text-white/90 text-base md:text-lg">
                  Enjoy free admission, member-only events, and exclusive benefits throughout the year.
                </p>    
              </div>
              <div className="mt-4 md:mt-0">
                <Link
                  to="/membershipinfo"
                  className="px-6 py-3 bg-white text-[rgb(25,102,124)] hover:bg-yellow-300 font-bold"
                >
                  Explore Membership
                </Link>
              </div>
            </div>
        </div>
      </section>

      {/* Final Callout Banner (below Membership) */}
      <section className="mx-auto">
        <div
          className="relative w-full h-[320px] sm:h-[360px] md:h-[420px] lg:h-[460px] bg-center bg-cover"
          style={{ backgroundImage: "url('https://www.marquette.edu/.ldp/.private_ldp/a11572/production/master/4c327237-0cba-42a3-95ea-b87e9751b500.jpg')" }}
        >
          <div className="absolute inset-0 bg-black/60"></div>
          <div className="relative h-full flex items-center justify-center">
            <div className="text-center text-white max-w-3xl px-6">
              <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
                Art lives with your support
              </h3>
              <p className="mt-3 md:mt-4 text-lg md:text-xl text-white/90">
                Help us present inspiring exhibitions, care for the collection, and keep programs accessible to all.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <Link to="/donate" className="px-6 py-3 bg-brand text-white hover:bg-brand-dark rounded-lg">
                  Donate Now
                </Link>
                <Link to="/gift-shop" className="px-6 py-3 bg-white text-[rgb(17,70,85)] hover:bg-yellow-300 rounded-lg">
                  Shop Gift Shop
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {preview && (
        <EventPreview item={preview} type="Exhibition" onClose={() => setPreview(null)} />
      )}
    </div>
    );
}

export default Home;