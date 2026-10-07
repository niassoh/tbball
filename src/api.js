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
// Every team with its nickname and depth chart (the team switcher). Fetched once per
// page load; the switcher's triggers start it on hover so the grid is ready on click.
let teamsRequest = null
export const loadTeams = () => {
  teamsRequest = teamsRequest || getJson(`${API_BASE}/api/teams`).catch(err => {
    teamsRequest = null
    throw err
  })
  return teamsRequest
}
// source (from the API's `headshot`) is 'portrait' or 'nba' (the styled NBA.com fallback);
// version changes when the image is replaced, so the browser fetches the new one.
export const headshotUrl = (slug, size = 200, version = null, source = 'portrait') => `${API_BASE}/assets/players/${source === 'nba' ? 'nba' : 'webp'}/${slug}-${size}.webp${version ? `?v=${version}` : ''}`
