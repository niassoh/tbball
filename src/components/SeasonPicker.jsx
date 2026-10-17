import { useEffect, useRef, useState } from 'react'
import { MONO } from '../lib/format.js'
import { agesText } from '../lib/age.js'
import { teamColor } from '../lib/teams.js'
import { asset } from '../lib/static.js'
import { seasonsBetween, shortSeason, spanText } from '../lib/seasons.js'
import Popover from './Popover.jsx'

// The season picker shared by the Footprint and Lonestar tabs and the Leaderboard: one
// season or a span of them, from the seasons there are; `extra` adds a control to its
// panel (the Leaderboard's runs).
const INK = '#ece8e3'
const MID = '#b8b2ab'
const DIM = '#a09a93'
const FAINT = '#7a746e'
// The panel's own text, a step brighter than the page's labels so it reads on the panel.
const SOFT = '#d9d3cc'
const EDGE = '#544f4b'
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', color: DIM, textTransform: 'uppercase' }

// The year strip: every season from his first to his last ('97 … '26), cells joined like
// RAW | PCTL, CELL wide: on one line where the screen holds it (a desktop: all 30 of the
// leaderboard's), else in even rows (8 a row on a phone) so every year shows; those he has no
// stretch in are dim and can't be picked. Click one for that season; drag across, or
// shift-click, for a span (arrow keys move, shift + arrows stretch). The span's cells are
// lit like the season rail's pick, the accent under them. Over it, small quick spans: his
// last 2, 3 or 5 seasons, or all. Pointer events on the strip, not its cells, so a drag
// works by touch too (and across its rows).
// By age it's the same strip of other values: his seasons labelled with his age in each,
// or the Leaderboard's ages themselves. `values`: what can be picked, in order; `all`: every
// cell, the gaps between them too; `labelOf`: a cell's text; `noun`: what a cell is.
// `tabs`: YEAR | AGE, sitting on the strip as its tabs, the quick spans beside them;
// `quickOff`: by age they stay in place but can't be pressed.
// `teamsOf` (a player's strip): under the seasons a quiet band of his stints, as the stat
// tabs' team timeline draws them but muted: each stint one block in its team's colour under
// its seasons, its white logo and code where it has room; a season he was traded in split in
// halves between the first team and the last; a season with no team, a gap. A click on a
// stint picks its seasons (those of them with something to pick); the stint on show is lit.
// With a pointer the band sits hidden: a year under the pointer brings in its stint (and
// keeps it while the pointer moves down onto it), so the band only speaks when asked; on
// hover a block's code gives way to its years, in the block's own space (index.css).
// `dimTitle`: a dim season's hover, why it can't be picked (null for none).
const HALF = 2
const QUICK = [[2, 'L2'], [3, 'L3'], [5, 'L5']]
const CELL = 38
const LIT = '#3d3a37'
function YearRange({ values, all, from, to, pick, labelOf, noun, name, tabs = null, quickOff = false, teamsOf = null, dimTitle = null }) {
  // It opens in the picker's panel, ready for the arrow keys.
  const root = useRef(null)
  useEffect(() => { root.current.focus({ preventScroll: true }) }, [])
  const has = new Set(values)
  const rows = Math.ceil(all.length / Math.max(1, Math.floor((window.innerWidth - 58) / CELL)))
  const cols = Math.ceil(all.length / rows)
  const anchor = useRef(from)
  const dragging = useRef(false)
  // The season under the pointer, over the strip or a stint (its first season): its cell
  // lifts a little, and the band shows its stint.
  const [hot, setHot] = useState(null)
  const track = e => {
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const cell = el && el.closest('[data-i]')
    const stint = el && el.closest('[data-a]')
    if (cell) setHot(all[Number(cell.dataset.i)])
    else if (stint) setHot(stint.dataset.a)
  }
  const span = (a, b) => (a <= b ? pick(a, b) : pick(b, a))
  const at = e => {
    const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-i]')
    const v = cell ? all[Number(cell.dataset.i)] : undefined
    return v !== undefined && has.has(v) ? v : null
  }
  const down = e => {
    const v = at(e)
    if (v === null) return
    if (e.shiftKey) return span(anchor.current, v)
    anchor.current = v
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    pick(v, v)
  }
  const move = e => {
    const v = dragging.current ? at(e) : null
    if (v !== null) span(anchor.current, v)
  }
  const key = e => {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key]
    if (!step) return
    e.preventDefault()
    const near = (x, d) => values[Math.min(values.length - 1, Math.max(0, values.indexOf(x) + d))]
    if (e.shiftKey) return step > 0 ? pick(from, near(to, 1)) : pick(near(from, -1), to)
    const next = near(step > 0 ? to : from, step)
    anchor.current = next
    pick(next, next)
  }
  const last = values[values.length - 1]
  const quick = QUICK.filter(([n]) => n < values.length).concat([[values.length, 'All']])
  // Each cell draws its own lines, so a last row short of the rest just ends.
  const lines = i => ({ borderStyle: 'solid', borderColor: EDGE, borderWidth: `${i < cols ? 1 : 0}px 1px 1px ${i % cols ? 0 : 1}px` })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tabs ? 0 : 8, width: `min(${Math.max(cols * CELL, 280)}px, calc(100vw - 58px))` }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, minHeight: tabs ? 30 : 0 }}>
      {tabs}
      {quick.length > 0 && <div role="group" aria-label="Quick spans" style={{ display: 'flex', alignSelf: tabs ? 'center' : 'flex-start', marginBottom: tabs ? 4 : 0, border: `1px solid ${EDGE}` }}>
        {quick.map(([n, qname], i) => {
          const on = !quickOff && from === values[values.length - n] && to === last
          return (
            <button key={qname} type="button" aria-pressed={on} disabled={quickOff} aria-label={qname === 'All' ? `All ${noun}s` : `Last ${n} ${noun}s`} onClick={() => pick(values[values.length - n], last)}
              style={{ height: 22, padding: '0 9px', border: 0, borderLeft: i ? `1px solid ${EDGE}` : 0, background: on ? LIT : 'transparent', boxShadow: on ? 'inset 0 -2px 0 var(--accent)' : 'none', color: on ? INK : SOFT, opacity: quickOff ? 0.35 : 1, fontFamily: MONO, fontSize: 10, fontWeight: on ? 700 : 500, letterSpacing: '.1em', textTransform: 'uppercase', cursor: quickOff ? 'not-allowed' : 'pointer' }}>
              {qname}
            </button>
          )
        })}
      </div>}
      </div>
      <div onPointerMove={track} onPointerLeave={() => setHot(null)}>
      <div ref={root} role="group" aria-label={name} tabIndex={0} className="year-strip" onPointerDown={down} onPointerMove={move}
        onPointerUp={() => { dragging.current = false }} onKeyDown={key}
        style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, touchAction: 'none', userSelect: 'none' }}>
        {all.map((v, i) => {
          const lit = v >= from && v <= to
          const end = v === from || v === to
          const hov = v === hot && has.has(v)
          return (
            <span key={v} data-i={i} data-has={has.has(v) ? 1 : 0} title={!has.has(v) && dimTitle ? dimTitle(v) || undefined : undefined}
              style={{ ...lines(i), boxSizing: 'border-box', height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: lit ? (hov ? '#47433f' : LIT) : hov ? '#34312e' : 'transparent', boxShadow: lit ? 'inset 0 -2px 0 var(--accent)' : 'none', color: lit || hov ? INK : has.has(v) ? SOFT : FAINT, transition: 'background-color .15s, color .15s', fontFamily: MONO, fontSize: 11, fontWeight: end ? 700 : 500, letterSpacing: '.04em', cursor: has.has(v) ? 'pointer' : 'default' }}>
              {labelOf(v)}
            </span>
          )
        })}
      </div>
      {teamsOf && <TeamBand all={all} cols={cols} teamsOf={teamsOf} values={values} from={from} to={to} pick={pick} hot={hot} />}
      </div>
    </div>
  )
}

// The stints under the strip, on its grid in half-seasons, so a block starts and ends with
// its seasons and a traded season splits; a block breaks where the strip wraps to a new row.
function TeamBand({ all, cols, teamsOf, values, from, to, pick, hot }) {
  const per = cols * HALF
  const halves = all.flatMap(v => { const ts = teamsOf(v) || []; return [ts[0] || null, ts[ts.length - 1] || null] })
  const blocks = []
  for (let h = 0; h < halves.length;) {
    if (!halves[h]) { h++; continue }
    let e = h
    while (e + 1 < halves.length && halves[e + 1] === halves[h] && Math.floor((e + 1) / per) === Math.floor(h / per)) e++
    // The seasons it covers that can be picked.
    const a = all[Math.floor(h / HALF)]
    const z = all[Math.floor(e / HALF)]
    const inside = values.filter(v => v >= a && v <= z)
    blocks.push({ team: halves[h], from: h, span: e - h + 1, a, z, first: inside[0], last: inside[inside.length - 1], years: a === z ? shortSeason(a) : `${shortSeason(a)}–${shortSeason(z)}` })
    h = e + 1
  }
  return (
    <div role="group" aria-label="His teams" style={{ display: 'grid', gridTemplateColumns: `repeat(${per}, minmax(0, 1fr))`, gridAutoRows: 12, rowGap: 3, marginTop: 3 }}>
      {blocks.map(b => {
        const color = teamColor(b.team)
        const on = b.first && b.first === from && b.last === to
        return (
          <button key={b.from} type="button" className={hot && hot >= b.a && hot <= b.z ? 'team-stint shown' : 'team-stint'} data-a={b.a} disabled={!b.first} onClick={() => pick(b.first, b.last)}
            aria-label={b.first ? `${b.team} ${b.years}: pick ${b.first === b.last ? b.first : `${b.first} to ${b.last}`}` : `${b.team} ${b.years}`}
            style={{ position: 'relative', gridRow: Math.floor(b.from / per) + 1, gridColumn: `${(b.from % per) + 1} / span ${b.span}`, marginRight: 1, display: 'flex', alignItems: 'center', padding: '0 4px', border: 0, overflow: 'hidden', cursor: b.first ? 'pointer' : 'default', background: `color-mix(in srgb, ${color || '#837d76'} ${on ? 70 : 42}%, #2c2a28)` }}>
            {b.span >= HALF && (
              <>
                <span className="stint-code" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  {color && <img src={asset(`logos/${b.team}.png`)} alt="" style={{ width: 8, height: 8, objectFit: 'contain', opacity: 0.75, flex: 'none' }} />}
                  <span style={{ fontFamily: MONO, fontSize: 7.5, fontWeight: 600, letterSpacing: '.08em', color: on ? INK : MID, whiteSpace: 'nowrap' }}>{b.team}</span>
                </span>
                <span className="stint-years" aria-hidden="true" style={{ fontFamily: MONO, fontSize: 7.5, fontWeight: 600, letterSpacing: '.08em', color: INK, whiteSpace: 'nowrap' }}>{b.years}</span>
              </>
            )}
          </button>
        )
      })}
    </div>
  )
}

// YEAR | AGE: the strip's tabs, pick by season or by age. The one on is lit like a picked
// cell and opens into the strip (no line under it); the other sits back.
function ByAge({ on, set }) {
  return (
    <div role="tablist" aria-label="Pick by" style={{ display: 'flex', gap: 3, alignSelf: 'flex-end', marginBottom: -1 }}>
      {[[false, 'Year'], [true, 'Age']].map(([v, n]) => {
        const sel = on === v
        return (
          <button key={n} type="button" role="tab" aria-selected={sel} onClick={() => set(v)}
            style={{ height: sel ? 27 : 24, padding: '0 14px', border: `1px solid ${EDGE}`, borderBottom: sel ? `1px solid ${LIT}` : `1px solid ${EDGE}`, background: sel ? LIT : 'transparent', boxShadow: sel ? 'inset 0 2px 0 var(--accent)' : 'none', color: sel ? INK : SOFT, fontFamily: MONO, fontSize: 9.5, fontWeight: sel ? 700 : 500, letterSpacing: '.14em', textTransform: 'uppercase', cursor: 'pointer', position: 'relative', zIndex: sel ? 1 : 0 }}>{n}</button>
        )
      })}
    </div>
  )
}

const SPAN_W = 184

// The span picker: a box giving the span on show ("2025–26", or "’18–’26 · 9" for a span)
// that opens the year strip in a panel under it (Popover), the strip taking the arrow
// keys at once; a pick shows behind it as it's made. The strip sets the panel's width
// (the readout wraps inside it, so a pick never resizes it). With one season there's
// nothing to pick. `aside`: a small control beside the span's readout (the Leaderboard's
// single | combined). `readout`: what the box says in place of the span (the Leaderboard's
// eras). The box keeps one width (`width`; SPAN_W fits "’04–’26 · 23"), so a longer span
// never widens it and moves what sits beside it (Footprint's REMOVE BEST).
// `ages` adds YEAR | AGE to the panel's head, to pick by age instead (`on`, `set`): with
// `of`, a player's seasons labelled with his age in each (the pick still seasons, "Ages
// 25–28 · 4"); else `list`, the ages to pick from (`all` the strip's every age, those not
// in `list` dim), `from`, `to` and `pick` (the Leaderboard's every season at those ages,
// "Ages 25–28"). `teamsOf`: a player's teams in a season, for the band of his stints under the strip.
// `dimTitle`: a season he has nothing in, the hover that says why.
export default function SeasonPicker({ seasons, from, to, n, pick, extra = null, aside = null, readout = null, title = 'Seasons', disabled = false, width = SPAN_W, ages = null, teamsOf = null, dimTitle = null }) {
  const byAge = !!(ages && ages.on)
  const years = seasonsBetween(seasons[0], seasons[seasons.length - 1])
  const strip = !byAge
    ? { values: seasons, all: years, from, to, pick, labelOf: shortSeason, noun: 'season', teamsOf, dimTitle }
    : ages.of
      ? { values: seasons, all: years, from, to, pick, labelOf: ages.of, noun: 'season', teamsOf, dimTitle }
      : { values: ages.list, all: ages.all || ages.list, from: ages.from, to: ages.to, pick: ages.pick, labelOf: String, noun: 'age' }
  const ageSpan = byAge && (ages.of ? agesText(ages.of(from), ages.of(to)) : agesText(ages.from, ages.to))
  // The box: "Ages 25–28 · 4" by age, its word in the label's place, as "Seasons" is.
  const shown = byAge
    ? ageSpan.replace(/^Ages? /, '') + (ages.of && n > 1 ? ` · ${n}` : '')
    : readout || (from === to ? from.replace('-', '–') : `${shortSeason(from)}–${shortSeason(to)} · ${n}`)
  return (
    <Popover name={`${title}: ${byAge ? ageSpan : readout || spanText(from, to)}`} disabled={disabled || seasons.length < 2} width={width}
      trigger={<>
        <span style={{ ...label, fontWeight: 400 }}>{byAge ? ageSpan.split(' ')[0] : title}</span>
        {shown}
      </>}>
      {() => (
        <>
          <YearRange {...strip} name={`${byAge ? 'Ages' : 'Seasons'}: ${byAge ? ageSpan : spanText(from, to)}`} tabs={ages && <ByAge on={byAge} set={ages.set} />} quickOff={byAge} />
          <div style={{ contain: 'inline-size', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
              <span style={{ ...label, fontSize: 10, color: INK }}>
                {byAge
                  ? (ages.of ? `${ageSpan} · ${spanText(from, to)}` : `${ageSpan} · every season`)
                  : `${spanText(from, to)}${n > 1 ? ` · ${n} seasons` : ''}`}
              </span>
              <span style={{ ...label, fontSize: 10, color: MID }}>{byAge ? 'Click an age · drag for a span' : 'Click a season · drag for a span'}</span>
            </div>
            {aside}
          </div>
          {extra}
        </>
      )}
    </Popover>
  )
}
