// Year to Year: the profile's stats turned into season-over-season percentile change,
// so the same table and chart as the other tabs show how each season moved him
// against the league. Percentiles are already flipped for lower-is-better stats, so a
// positive change is always an improvement.

// Colours for the table and chart: a change of 25 points or more is the deepest shade.
const SHADE = 2

const changeStat = (st, seasons) => ({
  ...st,
  relative: true,
  dec: 0,
  lowerBetter: false,
  // Span and career averages of a change weight by minutes only, never by attempts.
  minutesOnly: true,
  // No league distribution of changes, so the chart's hover card skips its histogram.
  derived: true,
  legend: 'NO CHANGE = 0',
  lg: seasons.map((_, i) => (i === 0 ? null : 0)),
  vals: st.vals.map((v, i) => {
    const prev = i > 0 ? st.vals[i - 1] : null
    if (!v || !prev || v.p === null || prev.p === null) return null
    const d = v.p - prev.p
    return { n: d, p: Math.max(0, Math.min(100, 50 + SHADE * d)), detail: `${prev.p} → ${v.p} PCTL` }
  })
})

// The profile with each listed stat replaced by its change version.
export const changeProfile = (profile, labels) => ({
  ...profile,
  stats: Object.fromEntries(labels.map(l => [l, changeStat(profile.stats[l], profile.seasons)]))
})
