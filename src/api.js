// Profile data comes from the thinking-bball API (GET /api/profile/:slug).
export const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:8080').replace(/\/$/, '')

const getJson = async url => {
  const res = await fetch(url)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export const fetchProfile = slug => getJson(`${API_BASE}/api/profile/${encodeURIComponent(slug)}`)
export const fetchPlayers = () => getJson(`${API_BASE}/api/profiles`)
// version (from the API) changes when a portrait is replaced, so the browser fetches the new one.
export const headshotUrl = (slug, size = 200, version = null) => `${API_BASE}/assets/players/webp/${slug}-${size}.webp${version ? `?v=${version}` : ''}`
