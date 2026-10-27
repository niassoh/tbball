import { fmt } from './format.js'

// Year to Year: the profile's stats turned into season-over-season change, so the same
// table and chart as the other tabs show how each season moved from his last one with
// games of the type (an empty season between is passed over): `raw` in the stat's own
// terms, else in percentile points. Either way the colour is the percentile change, and
// percentiles are already flipped for lower-is-better stats, so blue is always better.

// Colours for the table and chart: a change of 25 points or more is the deepest shade.
const SHADE = 2

const changeStat = (st, seasons, raw) => ({
  ...st,
  relative: true,
  dec: raw ? st.dec : 0,
  pct: raw && st.pct,
  lowerBetter: raw ? st.lowerBetter : false,
  // Span and career averages of a change weight by minutes only, never by attempts.
  minutesOnly: true,
  // No league distribution of changes, so the chart's hover card skips its histogram.
  derived: true,
  legend: 'NO CHANGE = 0',
  lg: seasons.map((s, i) => (i === 0 || s.empty ? null : 0)),
  vals: st.vals.map((v, i) => {
    const j = seasons.slice(0, i).findLastIndex(s => !s.empty)
    const prev = j >= 0 ? st.vals[j] : null
    if (!v || !prev || v.p === null || prev.p === null) return null
    const d = v.p - prev.p
    const p = Math.max(0, Math.min(100, 50 + SHADE * d))
    return raw
      ? { n: v.n - prev.n, p, detail: `${fmt(st, prev.n)} → ${fmt(st, v.n)}` }
      : { n: d, p, detail: `${prev.p} → ${v.p} PCTL` }
  })
})

// The profile with each listed stat replaced by its change version.
export const changeProfile = (profile, labels, { raw = false } = {}) => ({
  ...profile,
  stats: Object.fromEntries(labels.map(l => [l, changeStat(profile.stats[l], profile.seasons, raw)]))
})
