// The Team board's units view (components/UnitsView.jsx): a team's 2- to 5-man units from
// thinking-bball's units files (lib/profile.js unitsDoc), which carry counts, not ratings
// (seconds, possessions, and box-score counts for the unit, t, and its opponents, o, in
// the order of the file's `fields`), so a span of seasons sums its units' counts first and
// every stat is taken once from the sums, the same way the backend takes them
// (lib/footprint.js STATS).

export const SIZES = [2, 3, 4, 5]

const keyOf = ids => [...ids].sort().join('-')
const add = (a, b) => (a ? a.map((v, i) => v + (b[i] || 0)) : [...b])

// One team's season files (`docs`, oldest first) as one: units with the same players
// summed across them; players by their minutes over the span (the newest season's name and
// face); the team's and the league's totals summed. Each unit also sums the league's
// ORTG and DRTG weighted by its own possessions each season (lgOff, lgDef), so its rORTG
// and rDRTG set it against the league of its own seasons. A unit's league rank is its
// season's (null over many seasons, which have no league of units to rank in).
export const combine = docs => {
  const one = docs.length === 1
  const units = Object.fromEntries(SIZES.map(k => [k, new Map()]))
  const players = new Map()
  let total = null
  let league = null
  for (const d of docs) {
    const at = fieldsOf(d.fields)
    const lgO = (100 * d.league.t[at.Points]) / d.league.offPoss
    const lgD = (100 * d.league.o[at.Points]) / d.league.defPoss
    for (const k of SIZES) {
      for (const u of d.units[k] || []) {
        const key = keyOf(u.ids)
        const a = units[k].get(key)
        const lg = { lgOff: lgO * u.offPoss, lgDef: lgD * u.defPoss }
        if (!a) units[k].set(key, { key, ids: u.ids, seconds: u.seconds, offPoss: u.offPoss, defPoss: u.defPoss, t: [...u.t], o: [...u.o], ...lg, rank: one ? u.rank : null, seasons: [d.season] })
        else Object.assign(a, { seconds: a.seconds + u.seconds, offPoss: a.offPoss + u.offPoss, defPoss: a.defPoss + u.defPoss, t: add(a.t, u.t), o: add(a.o, u.o), lgOff: a.lgOff + lg.lgOff, lgDef: a.lgDef + lg.lgDef, seasons: [...a.seasons, d.season] })
      }
    }
    for (const p of d.players) players.set(p.id, { ...p, minutes: ((players.get(p.id) || {}).minutes || 0) + p.minutes })
    const sum = (a, b) => ({ seconds: (a ? a.seconds : 0) + b.seconds, offPoss: (a ? a.offPoss : 0) + b.offPoss, defPoss: (a ? a.defPoss : 0) + b.defPoss, t: add(a && a.t, b.t), o: add(a && a.o, b.o) })
    total = { ...sum(total, d.total), lgOff: ((total || {}).lgOff || 0) + lgO * d.total.offPoss, lgDef: ((total || {}).lgDef || 0) + lgD * d.total.defPoss }
    league = sum(league, d.league)
  }
  const last = docs[docs.length - 1]
  return {
    team: last.team,
    seasons: docs.map(d => d.season),
    fields: last.fields,
    floors: one ? last.floors : null,
    viewFloors: last.viewFloors,
    players: [...players.values()].sort((a, b) => b.minutes - a.minutes),
    units: Object.fromEntries(SIZES.map(k => [k, [...units[k].values()]])),
    total,
    league
  }
}

const FIELD_CACHE = new WeakMap()
const fieldsOf = fields => {
  if (!FIELD_CACHE.has(fields)) FIELD_CACHE.set(fields, Object.fromEntries(fields.map((f, i) => [f, i])))
  return FIELD_CACHE.get(fields)
}
const share = (a, b) => (b ? (100 * a) / b : null)

// A unit's (or the team's) stats from its counts: ORTG, DRTG and net (ORTG − DRTG) per 100
// possessions; rORTG and rDRTG against the league's of its seasons (when it carries them);
// pace (possessions per 48); the four factors on each end (eFG%, TOV% per possession,
// OREB% of chances, FT rate as FTA per FGA), the defence's from the opponents' side; and
// each end's shot mix, as shares of FGA.
export const statsOf = (u, fields) => {
  const at = fieldsOf(fields)
  const side = (us, them, poss) => {
    const fga = us[at.FG2A] + us[at.FG3A]
    return {
      efg: share(us[at.FG2M] + 1.5 * us[at.FG3M], fga),
      tov: share(us[at.Turnovers], poss),
      oreb: share(us[at.OffRebounds], us[at.OffRebounds] + them[at.DefRebounds]),
      ftr: share(us[at.FTA], fga),
      mix: {
        rim: share(us[at.AtRimFGA], fga),
        short: share(us[at.ShortMidRangeFGA], fga),
        long: share(us[at.LongMidRangeFGA], fga),
        corner: share(us[at.Corner3FGA], fga),
        above: share(us[at.FG3A] - us[at.Corner3FGA], fga)
      }
    }
  }
  const ortg = share(u.t[at.Points], u.offPoss)
  const drtg = share(u.o[at.Points], u.defPoss)
  return {
    minutes: u.seconds / 60,
    poss: (u.offPoss + u.defPoss) / 2,
    ortg,
    drtg,
    net: ortg === null || drtg === null ? null : ortg - drtg,
    rortg: ortg === null || u.lgOff === undefined ? null : ortg - u.lgOff / u.offPoss,
    rdrtg: drtg === null || u.lgDef === undefined ? null : drtg - u.lgDef / u.defPoss,
    pace: u.seconds ? (48 * 60 * (u.offPoss + u.defPoss)) / 2 / u.seconds : null,
    off: side(u.t, u.o, u.offPoss),
    def: side(u.o, u.t, u.defPoss)
  }
}

// The sequencer's columns: the units of one size over `floor` minutes with their stats,
// in the picked order (MIN most first, NET and ORTG best first, DRTG lowest first; ties by
// minutes), at most `max`.
const ORDER = {
  min: (a, b) => b.s.minutes - a.s.minutes,
  net: (a, b) => b.s.net - a.s.net || b.s.minutes - a.s.minutes,
  ortg: (a, b) => b.s.ortg - a.s.ortg || b.s.minutes - a.s.minutes,
  drtg: (a, b) => a.s.drtg - b.s.drtg || b.s.minutes - a.s.minutes
}
export const columns = (view, k, { floor = 0, sort = 'min', max = 40 } = {}) =>
  (view.units[k] || [])
    .map(u => ({ ...u, s: statsOf(u, view.fields) }))
    .filter(u => u.s.minutes >= floor && u.s.net !== null)
    .sort(ORDER[sort])
    .slice(0, max)

// The sequencer's tracks: everyone in the shown units, most minutes first.
export const tracks = (view, cols) => {
  const used = new Set(cols.flatMap(c => c.ids))
  return view.players.filter(p => used.has(p.id))
}

// The minutes floors the view offers for a unit size: its files' own, doubling thrice.
export const floorSteps = (view, k) => {
  const base = (view.viewFloors || {})[k] || 0
  return [base, base * 2, base * 4, base * 8]
}
