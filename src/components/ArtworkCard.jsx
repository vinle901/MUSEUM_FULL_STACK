const ArtworkCard = ({ artwork, artistName, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="bg-white border-2 border-gray-200 hover:border-brand rounded-xl overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1 cursor-pointer group break-inside-avoid mb-6 relative"
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-brand/0 via-brand/30 to-brand/0 translate-x-[-100%] group-hover:translate-x-[100%] group-hover:transition-transform group-hover:duration-700 group-hover:ease-in-out z-10 pointer-events-none"></div>

      {/* Image section */}
      <div className="relative overflow-hidden bg-gray-100 z-0">
        <img
          src={artwork.picture_url}
          alt={artwork.title}
          className="w-full h-auto transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {artwork.is_on_display && (
          <div className="absolute top-3 right-3">
            <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-xs font-medium shadow-lg">
              On Display
            </span>
          </div>
        )}
      </div>

      {/* Content section */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-black mb-1 line-clamp-1">
          {artwork.title}
        </h3>
        <p className="text-sm font-medium text-black mb-2">
          {artistName}
        </p>
        <p className="text-xs text-black">
          {artwork.artwork_type} • {artwork.creation_date || 'Unknown'}
        </p>
      </div>
    </div>
  )
}

export default ArtworkCard
