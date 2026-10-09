import { statKey } from './lib/static.js'

// Profile data comes from the thinking-bball API (GET /api/profile/:slug) in dev. A
// static build (VITE_STATIC=1) reads the same documents as files exported by
// thinking-bball's `npm run export:static` into public/ (api/profile/<slug>.json, ...),
// served from the site's base path.
const STATIC = import.meta.env.VITE_STATIC === '1'
export const API_BASE = STATIC ? import.meta.env.BASE_URL.replace(/\/$/, '') : (import.meta.env.VITE_API_BASE || 'http://localhost:8080').replace(/\/$/, '')
// Pages lets browsers cache files for 10 minutes, so after a deploy a browser could pair
// the new app with yesterday's data. Each build's data URLs carry its version (the commit,
// VITE_DATA_VERSION) so a new app always fetches matching data.
const VERSION = import.meta.env.VITE_DATA_VERSION ? `?v=${import.meta.env.VITE_DATA_VERSION}` : ''
const api = (route, file) => (STATIC ? `${API_BASE}/api/${file}${VERSION}` : `${API_BASE}/api/${route}`)

const getJson = async url => {
  const res = await fetch(url)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export const fetchProfile = slug => getJson(api(`profile/${encodeURIComponent(slug)}`, `profile/${encodeURIComponent(slug)}.json`))
export const fetchPlayers = () => getJson(api('profiles', 'profiles.json'))
// Every team with its nickname and depth chart (the team switcher). Fetched once per
// page load; the switcher's triggers start it on hover so the grid is ready on click.
let teamsRequest = null
export const loadTeams = () => {
  teamsRequest = teamsRequest || getJson(api('teams', 'teams.json')).catch(err => {
    teamsRequest = null
    throw err
  })
  return teamsRequest
}
// One stat's league values per season (the season charts' hover histogram); each stat
// is fetched once per page load, when it's first charted.
const distributions = new Map()
export const loadDistribution = stat => {
  if (!distributions.has(stat)) {
    distributions.set(stat, getJson(api(`distribution?stat=${encodeURIComponent(stat)}`, `distribution/${statKey(stat)}.json`)).catch(err => {
      distributions.delete(stat)
      throw err
    }))
  }
  return distributions.get(stat)
}
// The league's qualified lineup units' net ratings (the lineup tooltip's swarm),
// fetched once per page load on the first hover.
let lineupLeagueRequest = null
export const loadLineupLeague = () => {
  lineupLeagueRequest = lineupLeagueRequest || getJson(api('lineups/league', 'lineups-league.json')).catch(err => {
    lineupLeagueRequest = null
    throw err
  })
  return lineupLeagueRequest
}
// source (from the API's `headshot`) is 'portrait' or 'nba' (the styled NBA.com fallback);
// version changes when the image is replaced, so the browser fetches the new one.
export const headshotUrl = (slug, size = 200, version = null, source = 'portrait') => `${API_BASE}/assets/players/${source === 'nba' ? 'nba' : 'webp'}/${slug}-${size}.webp${version ? `?v=${version}` : ''}`
