// Team color for the no-portrait disc and the charts' team timeline; each key has a white logo at
// public/logos/<ABBR>.png (ESPN primary_logo_white). Primary colors from ESPN,
// except GSW, whose gold primary turns muddy when darkened, so it uses the blue.
export const TEAM_COLORS = {
  ATL: '#c8102e', BKN: '#000000', BOS: '#008348', CHA: '#008ca8', CHI: '#ce1141',
  CLE: '#860038', DAL: '#0064b1', DEN: '#0e2240', DET: '#1d428a', GSW: '#1d428a',
  HOU: '#ce0e2d', IND: '#0c2340', LAC: '#12173f', LAL: '#552583', MEM: '#5d76a9',
  MIA: '#98002e', MIL: '#00471b', MIN: '#266092', NOP: '#0a2240', NYK: '#1d428a',
  OKC: '#007ac1', ORL: '#0150b5', PHI: '#1d428a', PHX: '#29127a', POR: '#e03a3e',
  SAC: '#5a2d81', SAS: '#000000', TOR: '#d91244', UTA: '#4e008e', WAS: '#e31837'
}

export const initials = name => name.split(' ').map(w => w[0]).slice(0, 2).join('')

// Team stints for the season charts, in season-index units: season i spans
// [i - 0.5, i + 0.5], split evenly between the teams it lists in order, and
// adjoining pieces on the same team merge (LAC, then [LAC, CLE] = one LAC stint
// ending mid-season).
export const teamStints = seasons => {
  const out = []
  seasons.forEach((s, i) => {
    const teams = s.teams && s.teams.length ? s.teams : [s.tm]
    teams.forEach((team, j) => {
      const from = i - 0.5 + j / teams.length
      const to = i - 0.5 + (j + 1) / teams.length
      const last = out[out.length - 1]
      if (last && last.team === team && Math.abs(last.to - from) < 1e-9) Object.assign(last, { to, last: s.label })
      else out.push({ team, from, to, first: s.label, last: s.label })
    })
  })
  return out
}
