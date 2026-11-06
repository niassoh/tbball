import { signed } from './format.js'

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
// season's (null over many seasons, which have no league of units to rank in). Over many
// seasons the league's minutes floor is the highest season's times √(seasons): their sum
// leaves a long span almost no units (few play together every season), one season's
// floor hundreds; √ keeps a team near the same number of units however long the span.
export const combine = docs => {
  const one = docs.length === 1
  const units = Object.fromEntries(SIZES.map(k => [k, new Map()]))
  const players = new Map()
  let total = null
  let league = null
  const floors = Object.fromEntries(SIZES.map(k => [k, 0]))
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
    for (const k of SIZES) floors[k] = Math.max(floors[k], (d.floors || {})[k] || 0)
  }
  const last = docs[docs.length - 1]
  return {
    team: last.team,
    seasons: docs.map(d => d.season),
    fields: last.fields,
    floors: Object.fromEntries(SIZES.map(k => [k, Math.round(floors[k] * Math.sqrt(docs.length))])),
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

// A team's row on the units board, for units of size k (`view`: combine's, over the
// board's seasons): its most-used unit (with its share of the team's minutes) and that
// unit's ratings; the team's net in every other minute (rest: the team's counts less the
// unit's); its best unit over the league's minutes floor, with its league rank (a single
// season's); how many units clear the floor, and the share of their minutes in units with
// a positive net.
export const teamRow = (view, k) => {
  const all = (view.units[k] || []).map(u => ({ ...u, s: statsOf(u, view.fields) })).filter(u => u.s.net !== null)
  const top = all.reduce((a, u) => (!a || u.s.minutes > a.s.minutes ? u : a), null)
  const team = statsOf(view.total, view.fields)
  if (!top) return { team, top: null, share: null, rest: null, best: null, over: 0, positive: null }
  const qualified = all.filter(u => u.s.minutes >= view.floors[k])
  const best = qualified.reduce((a, u) => (!a || u.s.net > a.s.net ? u : a), null)
  const minutes = qualified.reduce((a, u) => a + u.s.minutes, 0)
  return {
    ...unitRow(view, top, team),
    team,
    best,
    over: qualified.length,
    positive: minutes ? (100 * qualified.filter(u => u.s.net > 0).reduce((a, u) => a + u.s.minutes, 0)) / minutes : null
  }
}

// One unit as a row of the table (the columns read a team's most-used unit as `top`): its
// share of the team's minutes and the team's net in every other minute (rest: the team's
// counts less the unit's), nothing for the team-wide columns.
export const unitRow = (view, u, team = statsOf(view.total, view.fields)) => {
  const t = view.total
  const rest = statsOf({ seconds: t.seconds - u.seconds, offPoss: t.offPoss - u.offPoss, defPoss: t.defPoss - u.defPoss, t: t.t.map((v, i) => v - u.t[i]), o: t.o.map((v, i) => v - u.o[i]), lgOff: t.lgOff - u.lgOff, lgDef: t.lgDef - u.lgDef }, view.fields)
  return { top: u, share: team.minutes ? (100 * u.s.minutes) / team.minutes : null, rest: rest.minutes > 0 ? rest : null, best: null, over: null, positive: null }
}

// A team's units on the board's field and under its row: those with half the league's
// minutes floor (the small ones would drown it), most minutes first.
export const fieldUnits = (view, k) => (view.units[k] || [])
  .map(u => ({ ...u, s: statsOf(u, view.fields) }))
  .filter(u => u.s.net !== null && u.s.minutes >= view.floors[k] / 2)
  .sort((a, b) => b.s.minutes - a.s.minutes)

// The table's columns: a label, the value from a team's row, how it prints, and which way
// is better (1 higher, -1 lower, 0 unshaded: a style, or how much); `team`: a column of
// the team's units together, not of one unit. In groups, as the
// board's stats are: Overview (the most-used unit, the rest of the team's minutes, its
// best unit and how its units do), then the most-used unit's offense and defense.
const pctText = v => `${v.toFixed(1)}`
const ofTop = f => r => (r.top ? f(r.top.s) : null)
const COL_OVERVIEW = [
  { id: 'min', name: 'Min', v: ofTop(s => s.minutes), text: v => Math.round(v).toLocaleString(), better: 0, title: 'The most-used unit’s minutes' },
  { id: 'share', name: 'Share', v: r => r.share, text: v => `${v.toFixed(0)}%`, better: 0, title: 'Its share of the team’s minutes: how settled the rotation is' },
  { id: 'net', name: 'Net', v: ofTop(s => s.net), text: v => signed(v), better: 1, title: 'Its net rating (ORTG − DRTG)' },
  { id: 'ortg', name: 'ORTG', v: ofTop(s => s.ortg), text: v => v.toFixed(1), better: 1 },
  { id: 'drtg', name: 'DRTG', v: ofTop(s => s.drtg), text: v => v.toFixed(1), better: -1 },
  { id: 'rest', name: 'Rest net', v: r => r.rest && r.rest.net, text: v => signed(v), better: 1, title: 'The team’s net in every other minute' },
  { id: 'over', team: true, name: 'Units', v: r => r.over, text: v => String(v), better: 0, title: 'Units over the league’s minutes floor' },
  { id: 'positive', team: true, name: '+Min', v: r => r.positive, text: v => `${v.toFixed(0)}%`, better: 1, title: 'Share of those units’ minutes in units with a positive net' }
]
// The most-used unit's shot mix on one end, as shares of FGA (a style: unshaded).
const mixCols = (end, pre) => [['rim', 'Rim'], ['short', 'Short mid'], ['long', 'Long mid'], ['corner', 'Corner 3'], ['above', 'Above-break 3']]
  .map(([k, name]) => ({ id: `${end}-${k}`, name: `${pre}${name}`, v: ofTop(s => s[end].mix[k]), text: v => `${v.toFixed(0)}%`, better: 0, title: `Share of ${end === 'off' ? 'its' : 'opponents’'} FGA` }))
const COL_OFFENSE = [
  { id: 'o-ortg', name: 'ORTG', v: ofTop(s => s.ortg), text: v => v.toFixed(1), better: 1 },
  { id: 'o-rortg', name: 'rORTG', v: ofTop(s => s.rortg), text: v => signed(v), better: 1, title: 'ORTG against the league’s' },
  { id: 'o-efg', name: 'eFG%', v: ofTop(s => s.off.efg), text: pctText, better: 1 },
  { id: 'o-tov', name: 'TOV%', v: ofTop(s => s.off.tov), text: pctText, better: -1, title: 'Turnovers per 100 possessions' },
  { id: 'o-oreb', name: 'OREB%', v: ofTop(s => s.off.oreb), text: pctText, better: 1, title: 'Share of its misses it got back' },
  { id: 'o-ftr', name: 'FT rate', v: ofTop(s => s.off.ftr), text: pctText, better: 1, title: 'FTA per 100 FGA' },
  ...mixCols('off', ''),
  { id: 'o-pace', name: 'Pace', v: ofTop(s => s.pace), text: v => v.toFixed(1), better: 0, title: 'Possessions per 48 minutes' }
]
const COL_DEFENSE = [
  { id: 'd-drtg', name: 'DRTG', v: ofTop(s => s.drtg), text: v => v.toFixed(1), better: -1 },
  { id: 'd-rdrtg', name: 'rDRTG', v: ofTop(s => s.rdrtg), text: v => signed(v), better: -1, title: 'DRTG against the league’s' },
  { id: 'd-efg', name: 'Opp eFG%', v: ofTop(s => s.def.efg), text: pctText, better: -1 },
  { id: 'd-tov', name: 'Forced TOV%', v: ofTop(s => s.def.tov), text: pctText, better: 1, title: 'Opponents’ turnovers per 100 possessions' },
  { id: 'd-dreb', name: 'DREB%', v: ofTop(s => (s.def.oreb === null ? null : 100 - s.def.oreb)), text: pctText, better: 1, title: 'Share of opponents’ misses it got' },
  { id: 'd-ftr', name: 'Opp FT rate', v: ofTop(s => s.def.ftr), text: pctText, better: -1, title: 'Opponents’ FTA per 100 FGA' },
  ...mixCols('def', 'Opp ')
]
export const UNIT_GROUPS = [
  { id: 'overview', name: 'Overview', cols: COL_OVERVIEW },
  { id: 'offense', name: 'Offense', cols: COL_OFFENSE },
  { id: 'defense', name: 'Defense', cols: COL_DEFENSE }
]
export const ALL_COLS = UNIT_GROUPS.flatMap(g => g.cols)

// A team's best unit by a column, among `cands` ([{ u, row: unitRow }], its units over the
// floor): the highest value, or the lowest where lower is better.
export const bestBy = (cands, col) => {
  let best = null
  let bv = null
  for (const x of cands) {
    const v = col.v(x.row)
    if (v === null || v === undefined) continue
    if (best === null || (v - bv) * (col.better || 1) > 0) {
      best = x
      bv = v
    }
  }
  return best
}
