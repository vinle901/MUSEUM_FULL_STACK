import Artwork from './components/Artwork'
import ArtworkDetail from './components/ArtworkDetail'
import { Route, Routes } from 'react-router-dom'
import NavBar from './components/NavBar'
import Home from './components/Home'
import Footer from './components/Footer'

function App() {
  return (
    <div>
      <h1>Museum To Be Continued</h1>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/artworks" element={<Artwork />} />
        <Route path="/artworks/:id" element={<ArtworkDetail />} />
      </Routes>
      <Footer />
    </div>
  )
}

export default App
