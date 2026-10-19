import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchLeaderboard, fetchLeaderboardSeasons, headshotUrl } from './api.js'
import { TIME, arcsOf, careersOf, column, nearestArcs, peakOf } from './lib/careers.js'
import { MONO, fmt } from './lib/format.js'
import { withMode } from './lib/mode.js'
import { initials } from './lib/teams.js'
import { useSeasonType } from './useSeasonType.js'
import CareerChart from './components/CareerChart.jsx'
import { AxisPicker } from './components/LeaderScatter.jsx'
import ModeSwitch from './components/ModeSwitch.jsx'
import PlayerSearch from './components/PlayerSearch.jsx'
import SeasonToggle from './components/SeasonToggle.jsx'

// Career Trajectories: every career on the season boards (1996-97 on; lib/careers.js) at
// once, any stat up the side and time across (a season, his age, his year of career) or
// another stat (a career as a path through stat space). Up to four players are channels,
// each in a colour of its own; a channel's colour is who he is, never better or worse
// (position says that), so the channels keep clear of the site's blue (better), orange
// (worse) and the playoffs' gold. Beside the chart, for the stat on show: each
// channel's peak and prime, the careers nearest the first channel's by age, and the stat's
// group as small charts that put any of its stats up the side. All of it lives in the URL
// (?p=slug,slug,,slug&x=age&y=BPM&scale=pctl&smooth=3), so a view is a link.
const INK = '#ece8e3'
const DIM = '#a09a93'
const FAINT = '#7a746e'
const RULE = '#3d3a37'
const EDGE = '#544f4b'
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', color: DIM, textTransform: 'uppercase' }
const PORTRAIT_BG = 'radial-gradient(circle at 50% 38%, #1e1d1e 0%, #18181a 55%, #131314 100%)'
const CHANNELS = [['A', '#ece8e3'], ['B', '#97c197'], ['C', '#c4a1ec'], ['D', '#e48ab8']]
const TRY = ['lebron-james', 'stephen-curry', 'nikola-jokic', 'tim-duncan']
const X_MODES = [['season', 'Season'], ['age', 'Age'], ['career', 'Career yr']]
const SMOOTH = [['1', '1Y'], ['3', '3Y']]
const DEFAULTS = { x: 'age', y: 'BPM', scale: 'raw', smooth: '1' }
const surname = n => n.split(' ').slice(1).join(' ') || n
const shortYears = (a, b) => `’${a.slice(5)}–’${b.slice(5)}`
const titled = slug => slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')

// The careers, built once a session for each season type: 30 boards, about 2 MB.
const built = {}

// A ten-step meter in a channel's colour, its cells lighting in turn (index.css .pc-step).
function Meter({ pc, color, delay = 0 }) {
  const lit = pc === null ? 0 : Math.max(1, Math.round(pc / 10))
  return (
    <span aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(10, minmax(0, 1fr))', gap: 2 }}>
      {Array.from({ length: 10 }, (_, i) => <span key={i} className={i < lit ? 'pc-step' : undefined} style={{ height: 4, background: i < lit ? color : '#34312e', '--d': `${delay + i * 40}ms` }} />)}
    </span>
  )
}

function Face({ pl, size = 22 }) {
  return (
    <span style={{ width: size, height: size, flex: 'none', borderRadius: '50%', overflow: 'hidden', background: PORTRAIT_BG, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 8, color: DIM }}>
      {pl.headshot ? <img src={headshotUrl(pl.slug, 100, pl.headshotVersion, pl.headshot)} alt="" width={size} height={size} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 12%' }} /> : initials(pl.name)}
    </span>
  )
}

// A channel's portrait: a square tile on the portraits' charcoal, framed in a hairline and
// standing on a bar of his colour, like a sample pad lit in its track's colour.
function Portrait({ pl, color, size = 56 }) {
  return (
    <span style={{ position: 'relative', width: size, height: size, flex: 'none', boxSizing: 'border-box', overflow: 'hidden', background: PORTRAIT_BG, border: `1px solid ${EDGE}`, boxShadow: `inset 0 -3px 0 ${color}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 11, color: DIM }}>
      {pl.headshot
        ? <img src={headshotUrl(pl.slug, 400, pl.headshotVersion, pl.headshot)} alt="" width={size} height={size} style={{ position: 'absolute', inset: 0, width: '100%', height: 'calc(100% - 3px)', objectFit: 'cover', objectPosition: '50% 14%' }} />
        : initials(pl.name)}
    </span>
  )
}

// The four channels: fixed slots, so a colour never moves to another player; each slot is
// washed in its colour with a solid bar down its left edge. A filled slot's square is
// hollow when he has no value in the stat up the side. A slot clicked (`pick`) is the
// search's `target`: the next player chosen goes there, replacing whoever held it.
function Slots({ slots, store, y, x, playoffs, playerPath, remove, pick, target }) {
  const k = store ? store.labels.indexOf(y) : -1
  return (
    <div role="group" aria-label="Channels" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: '1 1 520px', minWidth: 0 }}>
      {CHANNELS.map(([letter, color], i) => {
        const slug = slots[i]
        const pl = store && slug ? store.bySlug.get(slug) : null
        const has = pl && k >= 0 && pl.rows.some(r => r.v[k] !== null && r.v[k] !== undefined)
        const note = !slug || !store ? null : !pl ? (playoffs ? 'Not on the playoff boards' : 'Not on the boards') : x === 'age' && !pl.born ? 'No birth date' : x === 'career' && pl.censored ? 'Began before ’97' : null
        const box = { flex: '1 1 140px', minWidth: 0, height: 34, display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px 0 0', boxSizing: 'border-box' }
        const bar = <span style={{ alignSelf: 'stretch', width: 5, flex: 'none', background: color, opacity: slug ? 1 : 0.35 }} />
        if (!slug) {
          return (
            <button key={letter} type="button" onClick={() => pick(i)} title="Add a player"
              style={{ ...box, border: `1px dashed ${target === i ? color : EDGE}`, background: 'transparent', color: FAINT, fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
              {bar}+ Add
            </button>
          )
        }
        return (
          <span key={letter} style={{ ...box, border: `1px solid ${target === i ? color : `color-mix(in srgb, ${color} 55%, transparent)`}`, background: `color-mix(in srgb, ${color} ${target === i ? 26 : 14}%, transparent)` }}>
            {bar}
            {pl && <Face pl={pl} size={24} />}
            <span title={has ? undefined : `No ${y}`} style={{ width: 9, height: 9, flex: 'none', border: `1.5px solid ${color}`, background: has ? color : 'transparent' }} />
            <button type="button" onClick={() => pick(i)} title={target === i ? 'Keep him' : 'Change player'} aria-pressed={target === i}
              style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, padding: 0, border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer' }}>
              <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{surname(pl ? pl.name : titled(slug))}</span>
              {(target === i || note) && <span style={{ ...label, fontSize: 7.5, color: target === i ? color : FAINT, whiteSpace: 'nowrap' }}>{target === i ? 'Pick a replacement' : note}</span>}
            </button>
            <Link to={playerPath(slug)} aria-label={`${pl ? pl.name : titled(slug)}'s profile`} title="Profile"
              style={{ flex: 'none', fontFamily: MONO, fontSize: 11, color: DIM, textDecoration: 'none' }}>↗</Link>
            <button type="button" aria-label={`Remove ${pl ? pl.name : titled(slug)}`} onClick={() => remove(i)}
              style={{ flex: 'none', width: 18, height: 18, padding: 0, border: 0, background: 'transparent', color: DIM, fontFamily: MONO, fontSize: 13, lineHeight: 1, cursor: 'pointer' }}>×</button>
          </span>
        )
      })}
    </div>
  )
}

// The loader: a cell per season, lit as its board comes in.
function Loader({ list, done }) {
  return (
    <div style={{ flex: 1, minHeight: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <div className="ld-cells" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(list.length, 1)}, 9px)`, gap: 3 }}>
        {list.map((s, i) => <span key={s} style={{ width: 9, height: 9, '--i': i, ...(done.includes(s) ? { background: 'var(--accent)', animation: 'none' } : {}) }} />)}
      </div>
      <span style={{ ...label, fontSize: 8 }}>{list.length ? `${shortYears(list[0], list[list.length - 1])} · Loading seasons ${done.length}/${list.length}` : 'Loading seasons'}</span>
    </div>
  )
}

const Head = ({ children }) => <div style={{ ...label, fontSize: 8.5, color: INK, fontWeight: 700, padding: '10px 12px 8px', borderTop: `1px solid ${RULE}` }}>{children}</div>

// Each channel's peak season, best three in a row and 90th-percentile seasons in the stat.
function Prime({ store, channels, y }) {
  const st = store.stats[y]
  const k = store.labels.indexOf(y)
  return channels.map(c => {
    const rows = c.pl.rows
    const { peak, run, elite } = peakOf(store, c.pl, y)
    const ages = rows.map(r => r.age).filter(a => a !== null)
    const cell = { padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, borderLeft: `1px solid ${RULE}` }
    const big = { fontFamily: MONO, fontSize: 14, fontWeight: 600, color: INK, lineHeight: 1 }
    const n = elite.filter(e => e !== null)
    return (
      <div key={`${c.letter}${y}`} style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', alignItems: 'start', borderBottom: `1px solid ${RULE}`, padding: '8px 0 8px 12px' }}>
        <Portrait pl={c.pl} color={c.color} />
        <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px 6px 10px' }}>
          <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: c.color }}>{surname(c.pl.name)}</span>
          <span style={{ ...label, fontSize: 8, marginLeft: 'auto' }}>{shortYears(rows[0].season, rows[rows.length - 1].season)}{ages.length ? ` · ages ${Math.min(...ages)}–${Math.max(...ages)}` : ''}</span>
        </div>
        {peak === null
          ? <div style={{ ...label, fontSize: 8, color: FAINT, padding: '0 12px 0 10px' }}>No {y}{st.since ? ` · from ${st.since.replace('-', '–')}` : ''}</div>
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
              <div style={{ ...cell, borderLeft: 0 }}>
                <span style={label}>Peak ’{rows[peak].season.slice(5)}</span>
                <span style={big}>{fmt(st, rows[peak].v[k])}</span>
                <Meter pc={rows[peak].p[k]} color={c.color} />
              </div>
              <div style={cell}>
                <span style={label}>Best 3 {run ? shortYears(rows[run.from].season, rows[run.to].season) : ''}</span>
                <span style={big}>{run ? fmt(st, run.v) : '—'}</span>
                <Meter pc={run ? run.p : null} color={c.color} delay={200} />
              </div>
              <div style={cell}>
                <span style={label}>≥90th <span style={{ color: INK }}>{n.filter(Boolean).length}/{n.length}</span></span>
                <span aria-hidden="true" style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: 'auto' }}>
                  {elite.map((e, i) => <span key={i} title={rows[i].season} style={{ width: 5, height: 9, boxSizing: 'border-box', border: e === null ? `1px solid ${RULE}` : 0, background: e ? c.color : e === false ? '#34312e' : 'transparent' }} />)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  })
}

// The careers nearest the anchor's by age in the stat (lib/careers.js nearestArcs).
function Nearest({ store, anchor, arcs, skip, add, full }) {
  if (!anchor) return <div style={{ ...label, fontSize: 8, color: FAINT, padding: '0 12px 10px' }}>Add a player to find the careers nearest his</div>
  if (!anchor.pl.born) return <div style={{ ...label, fontSize: 8, color: FAINT, padding: '0 12px 10px' }}>No birth date on file · nearest arcs need ages</div>
  const mine = arcs.get(anchor.pl.slug)
  if (!mine) return <div style={{ ...label, fontSize: 8, color: FAINT, padding: '0 12px 10px' }}>No values for {surname(anchor.pl.name)} in this stat</div>
  const near = nearestArcs(arcs, anchor.pl.slug, { skip })
  return near.map(n => {
    const pl = store.bySlug.get(n.slug)
    const rows = pl.rows
    return (
      <div key={n.slug} className="idx-row" style={{ display: 'grid', gridTemplateColumns: '22px 22px minmax(0, 1fr) auto auto', gap: 8, alignItems: 'center', padding: '4px 12px' }}>
        <button type="button" disabled={full} onClick={() => add(n.slug)} aria-label={`Add ${pl.name}`} title={full ? 'All four channels are full' : 'Add as a channel'}
          style={{ width: 20, height: 20, padding: 0, border: `1px solid ${EDGE}`, background: 'transparent', color: full ? FAINT : INK, fontFamily: MONO, fontSize: 12, lineHeight: 1, cursor: full ? 'not-allowed' : 'pointer' }}>+</button>
        <Face pl={pl} />
        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pl.name}</span>
          <span style={{ ...label, fontSize: 7.5 }}>{shortYears(rows[0].season, rows[rows.length - 1].season)}</span>
        </span>
        <span style={{ fontFamily: MONO, fontSize: 11, color: INK }} title="Mean percentile gap over his ages">Δ{n.d.toFixed(1)}</span>
        <span style={{ ...label, fontSize: 8 }}>{n.shared}/{mine.size} yrs</span>
      </div>
    )
  })
}

// The stat's group, a small chart of percentiles over time for each of its stats; one puts
// its stat up the side.
function StatGrid({ store, group, y, setY, channels, mode, dim }) {
  const at = TIME[mode]
  const cols = useMemo(() => Object.fromEntries(group.stats.map(l => [l, column(store, l, 1, channels.map(c => c.pl))])), [store, group, channels])
  const xs = channels.flatMap(c => c.pl.rows.map(at)).filter(v => v !== null)
  const d0 = xs.length ? Math.min(...xs) : 0
  const d1 = xs.length ? Math.max(...xs) : 1
  const px = v => 4 + ((v - d0) / ((d1 - d0) || 1)) * 92
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))', borderTop: `1px solid ${RULE}` }}>
      {group.stats.filter(l => store.stats[l] && store.stats[l].since).map(l => {
        const on = l === y
        const why = dim(l)
        return (
          <button key={l} type="button" onClick={() => setY(l)} aria-pressed={on} title={why || `Chart ${l}`}
            style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '6px 8px', border: 0, background: on ? '#3a3734' : 'transparent', boxShadow: `inset -1px -1px 0 ${RULE}${on ? ', inset 0 -2px 0 var(--accent)' : ''}`, cursor: 'pointer', textAlign: 'left', opacity: why ? 0.5 : 1 }}>
            <span style={{ ...label, fontSize: 8, color: on ? INK : DIM, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{l}</span>
            <svg viewBox="0 0 100 40" preserveAspectRatio="none" width="100%" height={34} aria-hidden="true">
              <line x1={0} x2={100} y1={20} y2={20} stroke={EDGE} strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
              {channels.map((c, j) => {
                const pts = c.pl.rows.map((r, k) => [at(r), cols[l][j].p[k]]).filter(([a, b]) => a !== null && b !== null)
                return <polyline key={c.letter} points={pts.map(([a, b]) => `${px(a)},${38 - b * 0.36}`).join(' ')} fill="none" stroke={c.color} strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
              })}
            </svg>
          </button>
        )
      })}
    </div>
  )
}

export default function Careers() {
  const { playoffs, playerPath } = useSeasonType()
  const kind = playoffs ? 'playoffs' : 'regular'
  const [params, setParams] = useSearchParams()
  const [loaded, setLoaded] = useState({})
  const [progress, setProgress] = useState({})
  const search = useRef(null)

  useEffect(() => {
    if (built[kind]) return
    let live = true
    fetchLeaderboardSeasons(playoffs).then(d => {
      if (!live) return
      const list = d ? d.seasons : []
      if (!list.length) return setLoaded(l => ({ ...l, [kind]: false }))
      setProgress(p => ({ ...p, [kind]: { list, done: [] } }))
      Promise.all(list.map(s => fetchLeaderboard(s, playoffs).catch(() => null).then(doc => {
        if (live) setProgress(p => ({ ...p, [kind]: { list, done: [...p[kind].done, s] } }))
        return doc
      }))).then(docs => {
        if (!live) return
        const ok = docs.filter(Boolean)
        if (ok.length) built[kind] = careersOf(ok)
        setLoaded(l => ({ ...l, [kind]: built[kind] || false }))
      })
    })
    return () => { live = false }
  }, [kind, playoffs])
  const store = built[kind] || loaded[kind] || (loaded[kind] === false ? false : null)

  const get = k => params.get(k) || DEFAULTS[k]
  const set = changes => setParams(q => {
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === DEFAULTS[k]) q.delete(k)
      else q.set(k, v)
    }
    return q
  }, { replace: true })
  const slots = useMemo(() => {
    const p = (params.get('p') || '').split(',').slice(0, 4)
    return CHANNELS.map((_, i) => p[i] || null)
  }, [params])
  const setSlots = next => {
    const p = next.map(s => s || '').join(',').replace(/,+$/, '')
    set({ p: p || null })
  }
  // The slot the next pick goes to (one clicked), else the first empty one.
  const [target, setTarget] = useState(null)
  const pick = i => setTarget(t => (t === i ? null : i))
  // Focused once the field is enabled (four full slots leave it off until one is picked).
  useEffect(() => { if (target !== null) search.current?.focus() }, [target])
  const add = slug => {
    const i = target ?? slots.indexOf(null)
    setTarget(null)
    if (i < 0 || slots[i] === slug) return
    // Already in another slot: he moves to this one.
    setSlots(slots.map((s, j) => (j === i ? slug : s === slug ? null : s)))
  }

  // A stat this season type doesn't have (Footprint in the playoffs) shows BPM, or age
  // across, without changing the URL: the regular season gets it back.
  const has = l => store && store.stats[l] && store.stats[l].since
  const y = has(get('y')) ? get('y') : 'BPM'
  const xWanted = get('x')
  const x = xWanted in TIME || has(xWanted) ? xWanted : 'age'
  const path = !(x in TIME)
  const scale = get('scale') === 'pctl' ? 'pctl' : 'raw'
  const smooth = get('smooth') === '3' ? 3 : 1

  const channels = useMemo(() => (!store ? [] : slots.map((slug, i) => {
    const pl = slug && store.bySlug.get(slug)
    return pl ? { letter: CHANNELS[i][0], color: CHANNELS[i][1], pl } : null
  }).filter(Boolean)), [store, slots])
  const ys = useMemo(() => store && column(store, y, smooth), [store, y, smooth])
  const xs = useMemo(() => store && path ? column(store, x, smooth) : null, [store, x, path, smooth])
  const arcs = useMemo(() => store && arcsOf(store, ys), [store, ys])
  const pickDoc = useMemo(() => store && { ...store, players: store.rows }, [store])
  const dim = l => {
    if (!channels.length || !store) return null
    const k = store.labels.indexOf(l)
    if (channels.some(c => c.pl.rows.some(r => r.v[k] !== null && r.v[k] !== undefined))) return null
    const since = store.stats[l] && store.stats[l].since
    return `No data for ${channels.map(c => surname(c.pl.name).toUpperCase()).join(', ')}${since ? ` · from ${since.replace('-', '–')}` : ''}`
  }
  const group = store && (store.groups.find(g => g.stats.includes(y)) || store.groups[0])
  const anchor = channels[0] || null
  const prog = progress[kind]

  return (
    <main className="lb" style={{ maxWidth: 1600, margin: '0 auto', padding: '0 24px' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: `1px solid ${RULE}`, flexWrap: 'wrap' }}>
        <Link to="/" style={{ ...label, fontSize: 10, color: '#b3ada6' }}>← All players</Link>
        <span style={{ ...label, fontSize: 10, color: INK, fontWeight: 700, border: `1px solid ${EDGE}`, padding: '5px 9px' }}>Careers</span>
        <Link to={withMode('/leaderboard', playoffs)} style={{ ...label, fontSize: 10, color: '#b3ada6' }}>Leaderboard →</Link>
        <span style={{ marginLeft: 'auto' }}><SeasonToggle /></span>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0 8px', flexWrap: 'wrap' }}>
        <Slots slots={slots} store={store} y={y} x={x} playoffs={playoffs} playerPath={playerPath} remove={i => { setTarget(null); setSlots(slots.map((s, j) => (j === i ? null : s))) }} pick={pick} target={target} />
        <PlayerSearch onChoose={add} inputRef={search} placeholder={target !== null && slots[target] ? 'REPLACE WITH…' : slots.includes(null) || target !== null ? 'ADD A PLAYER' : 'CLICK A PLAYER TO CHANGE'} disabled={target === null && !slots.includes(null)} />
      </div>
      {!slots.some(Boolean) && (
        <button type="button" onClick={() => setSlots(TRY)} style={{ ...label, alignSelf: 'flex-start', padding: '0 0 8px', border: 0, background: 'transparent', color: '#b8b2ab', cursor: 'pointer' }}>Try: James · Curry · Jokić · Duncan →</button>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px 12px', padding: '4px 0 12px', flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={label}>X</span>
          <ModeSwitch name="Across" options={X_MODES} mode={path ? null : x} setMode={v => set({ x: v })} />
          {pickDoc && <AxisPicker doc={pickDoc} axis="Stat" value={path ? x : '—'} set={v => set({ x: v })} dim={dim} accent={path ? 'var(--accent)' : undefined} />}
        </span>
        {pickDoc ? <AxisPicker doc={pickDoc} axis="Y" value={y} set={v => set({ y: v })} dim={dim} /> : <span className="lb-skel" style={{ width: 120, height: 30 }} />}
        <ModeSwitch mode={scale} setMode={v => set({ scale: v })} />
        <ModeSwitch name="Smoothing" options={SMOOTH} mode={String(smooth)} setMode={v => set({ smooth: v })} />
      </div>

      {store === false && <div style={{ ...label, padding: 40, border: `1px dashed ${EDGE}`, textAlign: 'center' }}>Unavailable</div>}
      {store !== false && (
        <div className="lb-body">
          <div className="lb-side">
            {store
              ? <CareerChart store={store} x={x} y={y} scale={scale} ys={ys} xs={xs} channels={channels} />
              : <Loader list={prog ? prog.list : []} done={prog ? prog.done : []} />}
          </div>
          <div className="lb-side" style={{ overflow: 'auto' }}>
            {store && (
              <>
                <div style={{ ...label, fontSize: 8.5, color: INK, fontWeight: 700, padding: '10px 12px 8px' }}>Peak & prime · {y}</div>
                {channels.length ? <Prime store={store} channels={channels} y={y} /> : <div style={{ ...label, fontSize: 8, color: FAINT, padding: '0 12px 10px' }}>Add a player to read his peak</div>}
                <Head>Nearest to {anchor ? <span style={{ color: anchor.color }}>{surname(anchor.pl.name)}</span> : 'your first player'} · {y} · by age</Head>
                <Nearest store={store} anchor={anchor} arcs={arcs} skip={slots.filter(Boolean)} add={add} full={!slots.includes(null)} />
                <Head>{group.name} · pctl by {path ? 'age' : x === 'career' ? 'career yr' : x}</Head>
                {channels.length
                  ? <StatGrid store={store} group={group} y={y} setY={v => set({ y: v })} channels={channels} mode={path ? 'age' : x} dim={dim} />
                  : <div style={{ ...label, fontSize: 8, color: FAINT, padding: '0 12px 10px' }}>Add a player to see his {group.name.toLowerCase()} stats</div>}
                <div style={{ ...label, fontSize: 7.5, color: FAINT, padding: '10px 12px' }}>{store.rows.length.toLocaleString()} {playoffs ? 'playoff runs' : 'seasons'} · {store.players.length.toLocaleString()} players · {shortYears(store.seasons[0], store.seasons[store.seasons.length - 1])} · {store.groups.flatMap(g => g.stats).filter(has).length} stats</div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
