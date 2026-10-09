import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import PlayerIndex from './PlayerIndex.jsx'
import ProfilePage from './ProfilePage.jsx'
import { ModeSync } from './useSeasonType.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ModeSync />
      <Routes>
        <Route path="/" element={<PlayerIndex />} />
        <Route path="/player/:slug" element={<ProfilePage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)
