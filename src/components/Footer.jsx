import { FaFacebookF, FaInstagram } from 'react-icons/fa'
import { SiX, SiThreads } from 'react-icons/si'
import { Link } from 'react-router-dom'

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 py-10 px-6">
      {/* Top Row */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
        {/* Logo */}
        <div className="text-white font-playfair text-3xl font-bold">
          THE MUSEUM
        </div>

        {/* Links */}
        <div className="flex gap-20 text-gray-400 font-semibold">
          <Link to="/visit" className="hover:text-white transition-colors">
            Plan Your Visit
          </Link>
          <Link to="/support" className="hover:text-white transition-colors">
            Support
          </Link>
          <Link to="/membership" className="hover:text-white transition-colors">
            Become a Member
          </Link>
        </div>

        {/* Stay Connected */}
        <div className="text-center">
            <div className="flex justify-center gap-6">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                <FaFacebookF size={24} />
            </a>
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                <SiX size={24} />
            </a>
            <a href="https://threads.net" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                <SiThreads size={24} />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                <FaInstagram size={24} />
            </a>
            </div>
        </div>
      </div>

      {/* Middle Row: Contact Info */}
      <div className="text-center space-y-2 text-sm mb-8">
        <p>1001 Museum District Dr, Houston, TX 77005</p>
        <p>Email: info@themuseum.org</p>
        <p>Phone: (123) 456-7890</p>
      </div>

      {/* Bottom */}
      <div className="text-center text-gray-500 mt-10">
        <p>© {new Date().getFullYear()} THE MUSEUM. All rights reserved.</p>
      </div>
    </footer>
  )
}

export default Footer

