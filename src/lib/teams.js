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

// Today's thirty by name, for the index's logo row (its hover label and aria-label).
export const TEAM_NAMES = {
  ATL: 'Atlanta Hawks', BKN: 'Brooklyn Nets', BOS: 'Boston Celtics', CHA: 'Charlotte Hornets', CHI: 'Chicago Bulls',
  CLE: 'Cleveland Cavaliers', DAL: 'Dallas Mavericks', DEN: 'Denver Nuggets', DET: 'Detroit Pistons', GSW: 'Golden State Warriors',
  HOU: 'Houston Rockets', IND: 'Indiana Pacers', LAC: 'LA Clippers', LAL: 'Los Angeles Lakers', MEM: 'Memphis Grizzlies',
  MIA: 'Miami Heat', MIL: 'Milwaukee Bucks', MIN: 'Minnesota Timberwolves', NOP: 'New Orleans Pelicans', NYK: 'New York Knicks',
  OKC: 'Oklahoma City Thunder', ORL: 'Orlando Magic', PHI: 'Philadelphia 76ers', PHX: 'Phoenix Suns', POR: 'Portland Trail Blazers',
  SAC: 'Sacramento Kings', SAS: 'San Antonio Spurs', TOR: 'Toronto Raptors', UTA: 'Utah Jazz', WAS: 'Washington Wizards'
}

// Franchises since moved or renamed, for a past season's card, timeline and disc only (the
// team pickers list today's thirty): the Sonics, the Vancouver Grizzlies, the New Jersey
// Nets, the 1988-2002 Charlotte Hornets (today's Hornets logo, the franchise's history
// being theirs) and the New Orleans (and 2005-07 Oklahoma City) Hornets. Their logos sit
// with the rest (public/logos/, color/).
export const PAST_TEAM_COLORS = { SEA: '#00653a', VAN: '#00b2a9', NJN: '#002a60', CHH: '#00778b', NOH: '#00778b', NOK: '#00778b' }
export const teamColor = team => TEAM_COLORS[team] || PAST_TEAM_COLORS[team]

export const initials = name => name.split(' ').map(w => w[0]).slice(0, 2).join('')

// Team stints for the season charts, in season-index units: season i runs from
// its own point to the next season's, so a team's block starts on the point of
// its first season, and the strip ends on the last point. Only when the latest
// season brings a new team (a move or a trade) does it get half a slot past the
// last point, so that team still shows. A season's span is split evenly between
// the teams it lists in order, and adjoining pieces on the same team merge
// (LAC, then [LAC, CLE] = one LAC stint ending mid-season).
const teamsOf = s => (s.teams && s.teams.length ? s.teams : [s.tm])

export const teamStints = seasons => {
  const out = []
  const last = seasons.length - 1
  const newTeamLast = last > 0 && teamsOf(seasons[last]).at(-1) !== teamsOf(seasons[last - 1]).at(-1)
  seasons.forEach((s, i) => {
    const teams = teamsOf(s)
    const [start, width] = !last ? [-0.5, 1] : i < last ? [i, 1] : [last, newTeamLast ? 0.5 : 0]
    teams.forEach((team, j) => {
      const from = start + (j / teams.length) * width
      const to = start + ((j + 1) / teams.length) * width
      const prev = out[out.length - 1]
      if (prev && prev.team === team && Math.abs(prev.to - from) < 1e-9) Object.assign(prev, { to, last: s.label })
      else out.push({ team, from, to, first: s.label, last: s.label })
    })
  })
  return out
}
