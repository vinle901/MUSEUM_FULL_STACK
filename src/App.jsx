import Artwork from './components/Artwork'
import ArtworkDetail from './components/ArtworkDetail'
import { Route, Routes } from 'react-router-dom'
import NavBar from './components/NavBar'
import Home from './components/Home'
import Footer from './components/Footer'
import Visit from './components/Visit'

function App() {
  return (
    <div className="min-h-screen bg-white">
      <h1 className="text-gray-900">Museum To Be Continued</h1>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/visit" element={<Visit />} />
        <Route path="/artworks" element={<Artwork />} />
        <Route path="/artworks/type/:typeName" element={<Artwork />} />
        <Route path="/artworks/:id" element={<ArtworkDetail />} />
      </Routes>
      <Footer />
    </div>
  )
}

export default App
