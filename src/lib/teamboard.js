import { percentileOf } from './board.js'
import { shortSeason, spanYears } from './seasons.js'

// The Team board's chart (thinking-bball lib/teamboard.js documents): ORTG across and DRTG
// up, a lower DRTG higher (better up and right), both on one scale, so a point of rating is
// the same length either way and a net rating's line (ORTG − DRTG constant) runs at 45°.

// The ratings' frame: every team inside with `pad` points to spare, centred on the league's
// average, both axes as long as the longer one needs. [lo, hi] each, in rating points.
export const frameOf = (xs, ys, league, pad = 1.5) => {
  const reach = vals => Math.max(...vals.map(v => Math.abs(v - league)))
  const half = Math.max(reach(xs), reach(ys)) + pad
  return { x: [league - half, league + half], y: [league - half, league + half] }
}

// The net-rating lines crossing the frame, every `step` points: each [k, [o0, d0], [o1, d1]],
// the ends where ORTG − DRTG = k meets the frame's edges.
export const netLines = (frame, step = 5) => {
  const [x0, x1] = frame.x
  const [y0, y1] = frame.y
  const out = []
  for (let k = Math.ceil((x0 - y1) / step) * step; k <= Math.floor((x1 - y0) / step) * step; k += step) {
    const a = Math.max(x0, y0 + k)
    const b = Math.min(x1, y1 + k)
    if (b > a) out.push([k, [a, a - k], [b, b - k]])
  }
  return out
}

// A team's place in a stat among the 30, best first (1), a lower-is-better stat by its
// lowest; null without a value.
export const placeOf = (doc, team, label) => {
  const k = doc.labels.indexOf(label)
  const v = team.v[k]
  if (v === null || v === undefined) return null
  const low = doc.stats[label].lowerBetter
  return 1 + doc.teams.filter(t => t.v[k] !== null && (low ? t.v[k] < v : t.v[k] > v)).length
}

// Whether another team has the same value: a shared place reads "T-4th".
export const tiedOf = (doc, team, label) => {
  const k = doc.labels.indexOf(label)
  const v = team.v[k]
  return v !== null && v !== undefined && doc.teams.some(t => t !== team && t.v[k] === v)
}

// The board over several seasons' documents (in order, consecutive), in one document's
// shape, each row with an `id`: a row per team-season, ranked as its season ranked it
// (`each`); one row per team over them all; or (`run`, 3, 5 or 7) every team's runs of that
// many seasons in a row. A team over seasons: wins and losses summed, every other stat its
// seasons' mean weighted by games (a season begun barely counts), a season without the
// stat left out; its percentiles taken again among the rows. The "last month" stats are
// the latest season's alone and drop. A row over seasons has `season` (its last, for its
// card's units) and `span` (its years, "2014–16"; a team-season's "’16"); `dated`: the
// rows differ in their seasons (a row each, or runs), so the table writes each one's.
const SUMMED = new Set(['Wins', 'Losses'])
const valueIn = (doc, t, l) => {
  const k = doc.labels.indexOf(l)
  return k < 0 || t.v[k] === undefined ? null : t.v[k]
}
const gamesOf = (doc, t) => (valueIn(doc, t, 'Wins') ?? 0) + (valueIn(doc, t, 'Losses') ?? 0)
export const boardOver = (docs, { each = false, run = null } = {}) => {
  if (docs.length === 1 && !run) return { ...docs[0], teams: docs[0].teams.map(t => ({ ...t, id: t.team })) }
  const labels = [...new Set(docs.flatMap(d => d.labels))].filter(l => !/ last month$/.test(l))
  const stats = Object.assign({}, ...docs.map(d => d.stats))
  const groups = []
  for (const d of docs) {
    for (const g of d.groups) {
      const into = groups.find(x => x.id === g.id)
      if (into) into.stats = [...new Set([...into.stats, ...g.stats])]
      else groups.push({ ...g, stats: g.stats })
    }
  }
  const leagueWeight = d => d.teams.reduce((n, t) => n + gamesOf(d, t), 0) || 1
  const league = Object.fromEntries(labels.map(l => {
    const pairs = docs.filter(d => d.league[l] !== null && d.league[l] !== undefined)
    const w = pairs.reduce((n, d) => n + leagueWeight(d), 0)
    return [l, w ? pairs.reduce((n, d) => n + d.league[l] * leagueWeight(d), 0) / w : null]
  }))
  const over = (team, span) => {
    const pairs = span.map(d => [d, d.teams.find(t => t.team === team)]).filter(([, t]) => t)
    const v = labels.map(l => {
      let sum = 0
      let weight = 0
      for (const [d, t] of pairs) {
        const x = valueIn(d, t, l)
        if (x === null) continue
        const w = SUMMED.has(l) ? 1 : gamesOf(d, t)
        sum += x * w
        weight += w
      }
      return !weight ? null : SUMMED.has(l) ? sum : sum / weight
    })
    const first = span[0].season
    const last = span[span.length - 1].season
    return { team, name: pairs[pairs.length - 1][1].name, id: run ? `${team}|${first}..${last}` : team, season: last, span: spanYears(first, last), v }
  }
  const teams = [...new Set(docs.flatMap(d => d.teams.map(t => t.team)))]
  let rows
  if (each && !run) {
    rows = docs.flatMap(d => d.teams.map(t => ({ team: t.team, name: t.name, id: `${t.team}|${d.season}`, season: d.season, span: shortSeason(d.season), v: labels.map(l => valueIn(d, t, l)), p: labels.map(l => { const k = d.labels.indexOf(l); return k < 0 ? null : t.p[k] ?? null }) })))
  } else {
    const spans = run ? docs.slice(0, Math.max(0, docs.length - run + 1)).map((_, i) => docs.slice(i, i + run)) : [docs]
    rows = spans.flatMap(span => teams.map(team => over(team, span)))
    const pools = labels.map((_, k) => rows.map(r => r.v[k]))
    rows = rows.map(r => ({ ...r, p: r.v.map((x, k) => percentileOf(x, pools[k], !!stats[labels[k]].lowerBetter)) }))
  }
  return {
    season: docs[docs.length - 1].season,
    many: true,
    dated: !!(each || run),
    groups: groups.map(g => ({ ...g, stats: g.stats.filter(l => labels.includes(l)) })).filter(g => g.stats.length),
    labels,
    stats,
    league,
    teams: rows
  }
}
