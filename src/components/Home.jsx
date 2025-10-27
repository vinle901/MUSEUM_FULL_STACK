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

  return (
    <div
      className="text-gray-800"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at top, rgba(17,70,85,0.06), transparent 60%), linear-gradient(180deg, #ffffff 0%, #f7faf9 60%, #ffffff 100%)',
      }}
    >
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

      {/* Info Header Bar (below banner) */}
  <section className="text-white" style={{ backgroundColor: 'rgb(17, 70, 85)' }}>
        <div className="max-w-8xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/20">
            {/* Open Today */}
            <div className="flex flex-col items-center justify-center text-center gap-1.5 py-4 md:py-5">
              {/* Clock icon */}
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="text-base md:text-lg font-semibold">Open Today: 10:00 am – 5:00 pm</div>
              <Link to="/visit" className="group inline-flex items-center text-white/90">
                <span>Plan a Visit</span>
                <svg className="ml-1 w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </Link>
              <div className="h-[1px] w-24 bg-yellow-300"></div>
            </div>

            {/* Admission */}
            <div className="flex flex-col items-center justify-center text-center gap-1.5 py-4 md:py-5">
              {/* Ticket icon */}
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 8a2 2 0 012-2h12a2 2 0 012 2v1a2.5 2.5 0 110 5v1a2 2 0 01-2 2H6a2 2 0 01-2-2v-1a2.5 2.5 0 110-5V8z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 7v10" strokeDasharray="2 2" />
              </svg>
              <div className="text-base md:text-lg font-semibold">Adults $25, Children $16</div>
              <Link to="/tickets/checkout" className="group inline-flex items-center text-white/90">
                <span>See Tickets</span>
                <svg className="ml-1 w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </Link>
              <div className="h-[1px] w-28 bg-yellow-300"></div>
            </div>

            {/* Location */}
            <div className="flex flex-col items-center justify-center text-center gap-1.5 py-4 md:py-5">
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
      <section className="mx-auto px-16 py-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-4xl font-bold text-left">Current Exhibitions</h2>
            <p className="text-gray-500 text-2xl mt-5 mb-5">What’s on view now</p>
          </div>
        </div>

        {loading && <p className="text-gray-500">Loading…</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && currentTop3.length === 0 && (
          <p className="text-gray-600">No current exhibitions at this time.</p>
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
          <div className="mt-25 flex justify-center">
            <Link to="/calendar" className="px-6 py-3 bg-brand text-white hover:bg-brand-dark rounded-lg">
              Explore More
            </Link>
          </div>
        )}
      </section>

      {/* Featured Artworks Section */}
      <section className="mx-auto px-16 py-10">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-4xl font-bold text-left">Featured Artworks</h2>
          </div>
        </div>

        {artworksLoading && (
          <p className="text-gray-500">Loading artworks…</p>
        )}
        {artworksError && (
          <p className="text-red-600">Failed to load artworks.</p>
        )}

        {!artworksLoading && !artworksError && featuredArtworks.length === 0 && (
          <p className="text-gray-600">No featured artworks available right now.</p>
        )}

        {!artworksLoading && !artworksError && featuredArtworks.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {featuredArtworks.map((art) => (
                <ArtworkCard
                  key={art.artwork_id}
                  artwork={art}
                  artistName={getArtistName(art.artist_id, artists)}
                  className="h-full"
                  imageClassName="h-48 md:h-56 lg:h-60 object-cover"
                  onClick={() => navigate(`/artworks/${art.artwork_id}`)}
                />
              ))}
            </div>
            <div className="mt-10 flex justify-center">
              <Link to="/artworks" className="px-6 py-3 bg-brand text-white hover:bg-brand-dark rounded-lg">
                Explore More
              </Link>
            </div>
          </>
        )}
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
                  to="/membership"
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
          style={{ backgroundImage: "url('https://acmeticketing.com/wp-content/uploads/2024/04/museum-exhibit-design.jpg')" }}
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