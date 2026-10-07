// Per-season line chart geometry (player line vs moving league average),
// ported from the design reference. viewBox is 330x150; dots and labels are
// positioned in % so they stay round while the SVG stretches.
import { col, fmt, ord } from './format.js'

const BETTER = 'rgba(89,126,193,.12)'
const WORSE = 'rgba(250,150,42,.12)'

export const seasonTick = (label, count) => (count > 9 ? "'" + label.slice(-2) : label.slice(2, 4) + '–' + label.slice(-2))

export function chartModel(stat, seasons) {
  const L = seasons.length - 1
  const k = L
  const lb = stat.lowerBetter
  const values = [...stat.vals.filter(Boolean).map(v => v.n), ...stat.lg.filter(v => v !== null)]
  let lo = Math.min(...values)
  let hi = Math.max(...values)
  const pad = (hi - lo || 1) * 0.18
  lo -= pad
  hi += pad
  const X = i => (L ? 24 + (i / L) * 282 : 165)
  const Y = v => 124 - ((v - lo) / (hi - lo)) * 100

  const pts = seasons.map((s, i) => {
    const v = stat.vals[i]
    const lg = stat.lg[i]
    const x = X(i)
    const y = v ? Y(v.n) : null
    const ly = lg === null ? null : Y(lg)
    const above = y !== null && ly !== null ? y <= ly : true
    const r = i === k ? 5 : L > 8 ? 2.5 : 3.5
    return {
      i,
      has: !!v,
      x,
      y,
      ly,
      r,
      color: v ? col(v.p) : null,
      pctl: v ? ord(v.p) : null,
      showValue: !!v && (L <= 6 || i === 0 || i === k || i === Math.round(L / 2)),
      value: v ? fmt(stat, v.n) : '',
      valueY: y === null ? null : above ? y - 11 : y + 12,
      showLg: !stat.relative && ly !== null,
      lgValue: lg === null ? '' : fmt(stat, lg),
      lgY: ly === null ? null : above ? ly + 9 : ly - 9,
      season: seasonTick(s.label, L + 1),
      hideSeason: L > 12 && i % 2 === 1 && i !== k,
      current: i === k
    }
  })

  // Seasons without data (e.g. stats that start in 2013-14) break the line.
  const segments = (key, ok) => {
    const out = []
    let cur = []
    for (const p of pts) {
      if (ok(p)) cur.push(`${p.x.toFixed(1)},${p[key].toFixed(1)}`)
      else if (cur.length) { out.push(cur.join(' ')); cur = [] }
    }
    if (cur.length) out.push(cur.join(' '))
    return out
  }
  const playerLines = segments('y', p => p.y !== null)
  const leagueLines = segments('ly', p => p.ly !== null)

  const bands = []
  for (let i = 0; i < L; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    if ([a.y, a.ly, b.y, b.ly].some(v => v === null)) continue
    const playerAbove = (a.y + b.y) / 2 <= (a.ly + b.ly) / 2
    bands.push({
      d: `M${a.x} ${a.y} L${b.x} ${b.y} L${b.x} ${b.ly} L${a.x} ${a.ly} Z`,
      fill: playerAbove !== lb ? BETTER : WORSE
    })
  }
  return { pts, playerLines, leagueLines, bands, Y, legend: stat.relative ? 'LG AVG = 0' : 'LG AVG' }
}
