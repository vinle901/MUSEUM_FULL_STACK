import { Link } from 'react-router-dom'

const TypeCard = ({ type }) => {
  return (
    <Link
      to={`/artworks/type/${type.urlSlug}`}
      className="group relative bg-white border-2 border-gray-300 rounded-lg overflow-hidden hover:border-black hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
    >
      {/* Image section */}
      <div className="relative h-48 overflow-hidden bg-gray-100">
        <img
          src={type.imageUrl}
          alt={type.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {/* Dark overlay on hover for better text contrast */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300"></div>

        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] group-hover:transition-transform group-hover:duration-700 group-hover:ease-in-out pointer-events-none"></div>
      </div>

      {/* Text section */}
      <div className="p-4 text-center bg-white">
        <h3 className="text-lg font-bold text-black mb-1 line-clamp-2">
          {type.name}
        </h3>
        <p className="text-sm text-black">
          {type.count} {type.count === 1 ? 'artwork' : 'artworks'}
        </p>
      </div>
    </Link>
  )
}

export default TypeCard
