// Disc tint per team for the no-portrait fallback; each key has a white logo at
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
