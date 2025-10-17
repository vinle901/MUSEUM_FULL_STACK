import { Link } from 'react-router-dom'

const ArtworkPreview = ({ artwork, onClose }) => {
  if (!artwork) return null

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-[95vw] h-[85vh] shadow-2xl border border-gray-200 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white rounded-full p-2 hover:bg-gray-100 transition-colors shadow-md z-10"
            aria-label="Close preview"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <img
            src={artwork.picture_url}
            alt={artwork.title}
            className="w-full h-[55vh] object-contain rounded-t-lg bg-gray-200"
          />
        </div>

        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">{artwork.title}</h2>

          <div className="space-y-3 mb-6">

            {artwork.artist_name && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-black">Artist:</span>
                <span className="text-black">{artwork.artist_name}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="font-semibold text-black">Type:</span>
              <span className="text-black">{artwork.artwork_type}</span>
            </div>
            


            {artwork.material && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-black">Material:</span>
                <span className="text-black">{artwork.material}</span>
              </div>
            )}

            {artwork.creation_date && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-black">Created:</span>
                <span className="text-black">{artwork.creation_date}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="font-semibold text-black">Status:</span>
              <span
                className={`inline-block px-2 py-1 rounded text-sm ${
                  artwork.is_on_display
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-300 text-black'
                }`}
              >
                {artwork.is_on_display ? 'On Display' : 'Not on Display'}
              </span>
            </div>
          </div>

          {artwork.description && (
            <div className="mb-6">
              <h3 className="font-semibold text-black mb-2">Description:</h3>
              <p className="text-black leading-relaxed line-clamp-3">
                {artwork.description}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Link
              to={`/artworks/${artwork.id}`}
              className="flex-1 bg-brand hover:bg-brand-dark text-white font-semibold py-2 px-4 rounded transition-colors text-center"
            >
              View Full Details
            </Link>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-black font-semibold py-2 px-4 rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ArtworkPreview
