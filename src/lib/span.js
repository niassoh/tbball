// Averages over a run of seasons (the stat tables' drag-to-average span, and the
// career row). Each season counts by its minutes; shooting percentages count by
// shots instead (the volume stat's per-75 / per-36 rate times minutes), as the
// API does for league averages, so a 40-attempt season doesn't weigh like a
// 400-attempt one. rTS% has no attempt count, so it uses points (Pts / 75), the
// closest volume; Def FGA Diff% uses the rim shots he defended.
export const SHOT_VOLUME = {
  'Rim FG%': 'Rim FGA',
  'Midrange FG%': 'Midrange FGA',
  'FT%': 'FTA',
  'Drives TS%': 'Drives / 36',
  'Wide Open 3%': 'Wide Open 3s/36',
  'Pullup 3%': 'Pullup 3s/36',
  'C&S 3%': 'C&S 3s/36',
  'rTS%': 'Pts / 75',
  'Def FGA Diff%': 'Def FGA <6ft /36'
}

// Mean of `label` over seasons from..to (inclusive), or null when no season in the
// span has both a value and a weight.
export const spanMean = (profile, label, from, to) => {
  const stat = profile.stats[label]
  const volume = SHOT_VOLUME[label] && profile.stats[SHOT_VOLUME[label]]
  let sum = 0
  let weight = 0
  for (let i = from; i <= to; i++) {
    const v = stat.vals[i]
    const mp = profile.seasons[i].mp
    if (!v || v.n === null || !mp) continue
    // A shooting season with no attempt rate can't be weighted by shots, so it's left out.
    const shots = volume ? volume.vals[i] && volume.vals[i].n : 1
    if (!shots) continue
    sum += v.n * mp * shots
    weight += mp * shots
  }
  return weight ? sum / weight : null
}

// "2016–19" for 2016–17 through 2018–19.
export const spanLabel = (seasons, from, to) => `${seasons[from].label.slice(0, 4)}–${seasons[to].label.slice(-2)}`

// The span's team, or "N TM" when it covers more than one (like the career row).
export const spanTeams = (seasons, from, to) => {
  const teams = new Set(seasons.slice(from, to + 1).flatMap(s => (s.teams && s.teams.length ? s.teams : [s.tm])))
  return teams.size > 1 ? `${teams.size} TM` : [...teams][0]
}
