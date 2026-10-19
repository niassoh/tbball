import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchLeaderboard, fetchLeaderboardSeasons, headshotUrl } from './api.js'
import { TIME, careersOf, column, peakOf } from './lib/careers.js'
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
// another stat (a career as a path through stat space). Up to six players are channels,
// each in a colour of its own (the first green, the rest quieter); a channel's colour is who he is, never better or worse
// (position says that), so the channels keep clear of the site's blue (better), orange
// (worse) and the playoffs' gold. Beside the chart, for the stat on show: each
// channel's peak and prime, and the stat's
// group as small charts that put any of its stats up the side. All of it lives in the URL
// (?p=slug,slug,,slug&x=age&y=BPM&scale=pctl&smooth=3), so a view is a link.
const INK = '#ece8e3'
const DIM = '#a09a93'
const FAINT = '#7a746e'
const RULE = '#3d3a37'
const EDGE = '#544f4b'
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.12em', color: DIM, textTransform: 'uppercase' }
const PORTRAIT_BG = 'radial-gradient(circle at 50% 38%, #1e1d1e 0%, #18181a 55%, #131314 100%)'
// The first player, the one the page is about, in the site's green at full strength; the
// others he's compared with in quieter tones, so he leads.
const CHANNELS = ['#97c197', '#c9c3bc', '#a898c4', '#b3a888', '#8fb0a6', '#b5939b']
// Six at most: past that the lines tangle and the quiet tones run together.
const MAX = CHANNELS.length
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

// The players, as chips sized to their names: the first (the one the page is about) in
// green and washed in it, the rest quieter. A name clicked turns its chip into a search for
// his replacement, right where it is; + ADD at the end does the same for another player,
// up to MAX. A chip's square is hollow when he has no value in the stat up the side.
function Slots({ slots, store, y, x, playoffs, playerPath, remove, editing, setEditing, choose }) {
  const k = store ? store.labels.indexOf(y) : -1
  const search = i => (
    <span key={`edit${i}`} style={{ display: 'flex', flex: '0 1 260px', minWidth: 200 }}>
      <PlayerSearch onChoose={slug => choose(i, slug)} autoFocus onDone={() => setEditing(e => (e === i ? null : e))}
        placeholder={i < slots.length ? `REPLACE ${surname(store && store.bySlug.get(slots[i]) ? store.bySlug.get(slots[i]).name : titled(slots[i])).toUpperCase()}` : 'ADD A PLAYER'} />
    </span>
  )
  return (
    <div role="group" aria-label="Players" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, minWidth: 0 }}>
      {slots.map((slug, i) => {
        if (editing === i) return search(i)
        const color = CHANNELS[i]
        const pl = store ? store.bySlug.get(slug) : null
        const has = pl && k >= 0 && pl.rows.some(r => r.v[k] !== null && r.v[k] !== undefined)
        const note = !store ? null : !pl ? (playoffs ? 'Not on the playoff boards' : 'Not on the boards') : x === 'age' && !pl.born ? 'No birth date' : x === 'career' && pl.censored ? 'Began before ’97' : null
        const name = pl ? pl.name : titled(slug)
        return (
          <span key={slug} style={{ flex: 'none', maxWidth: 260, height: 34, display: 'flex', alignItems: 'center', gap: 8, padding: '0 6px 0 0', boxSizing: 'border-box', border: `1px solid color-mix(in srgb, ${color} ${i ? 35 : 55}%, transparent)`, background: `color-mix(in srgb, ${color} ${i ? 7 : 14}%, transparent)` }}>
            <span style={{ alignSelf: 'stretch', width: 5, flex: 'none', background: color }} />
            {pl && <Face pl={pl} size={24} />}
            <span title={has ? undefined : `No ${y}`} style={{ width: 9, height: 9, flex: 'none', border: `1.5px solid ${color}`, background: has ? color : 'transparent' }} />
            <button type="button" className="cg-name-btn" onClick={() => setEditing(i)} title="Change player"
              style={{ display: 'flex', flexDirection: 'column', minWidth: 0, padding: 0, border: 0, background: 'transparent', textAlign: 'left', cursor: 'text' }}>
              <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{surname(name)}</span>
              {note && <span style={{ ...label, fontSize: 7.5, color: FAINT, whiteSpace: 'nowrap' }}>{note}</span>}
            </button>
            <Link to={playerPath(slug)} aria-label={`${name}'s profile`} title="Profile"
              style={{ flex: 'none', marginLeft: 4, fontFamily: MONO, fontSize: 11, color: DIM, textDecoration: 'none' }}>↗</Link>
            <button type="button" aria-label={`Remove ${name}`} onClick={() => remove(i)}
              style={{ flex: 'none', width: 18, height: 18, padding: 0, border: 0, background: 'transparent', color: DIM, fontFamily: MONO, fontSize: 13, lineHeight: 1, cursor: 'pointer' }}>×</button>
          </span>
        )
      })}
      {editing === slots.length
        ? search(slots.length)
        : slots.length < MAX && (
          <button type="button" onClick={() => setEditing(slots.length)}
            style={{ flex: 'none', height: 34, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 12px', border: `1px dashed ${EDGE}`, background: 'transparent', color: '#b8b2ab', fontFamily: MONO, fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer' }}>
            <span style={{ width: 9, height: 9, border: `1.5px solid ${CHANNELS[slots.length]}` }} />+ Add player
          </button>
        )}
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
  const cols = '30px minmax(0, 1.3fr) repeat(3, minmax(0, 1fr))'
  const big = { fontFamily: MONO, fontSize: 13, fontWeight: 600, color: INK, lineHeight: 1 }
  const small = { ...label, fontSize: 7.5, color: FAINT, marginLeft: 5 }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '0 12px 6px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 10, padding: '0 0 4px' }}>
        <span /><span />
        {['Peak', 'Best 3', '≥90th'].map(h => <span key={h} style={{ ...label, fontSize: 7.5, color: FAINT }}>{h}</span>)}
      </div>
      {channels.map(c => {
        const rows = c.pl.rows
        const { peak, run, elite } = peakOf(store, c.pl, y)
        const n = elite.filter(e => e !== null)
        return (
          <div key={`${c.letter}${y}`} style={{ display: 'grid', gridTemplateColumns: cols, gap: 10, alignItems: 'center', padding: '6px 0', borderTop: `1px solid ${RULE}` }}>
            <Portrait pl={c.pl} color={c.color} size={30} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: c.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{surname(c.pl.name)}</span>
              <span style={{ ...label, fontSize: 7.5 }}>{shortYears(rows[0].season, rows[rows.length - 1].season)}</span>
            </span>
            {peak === null
              ? <span style={{ ...label, fontSize: 8, color: FAINT, gridColumn: 'span 3' }}>No {y}{st.since ? ` · from ${st.since.replace('-', '–')}` : ''}</span>
              : (
                <>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                    <span style={{ whiteSpace: 'nowrap' }}><span style={big}>{fmt(st, rows[peak].v[k])}</span><span style={small}>’{rows[peak].season.slice(5)}</span></span>
                    <Meter pc={rows[peak].p[k]} color={c.color} />
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                    <span style={{ whiteSpace: 'nowrap' }}><span style={big}>{run ? fmt(st, run.v) : '—'}</span>{run && <span style={small}>{shortYears(rows[run.from].season, rows[run.to].season)}</span>}</span>
                    <Meter pc={run ? run.p : null} color={c.color} delay={200} />
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                    <span style={big}>{n.filter(Boolean).length}<span style={{ ...small, marginLeft: 2 }}>/{n.length}</span></span>
                    <span aria-hidden="true" style={{ display: 'flex', gap: 1.5, overflow: 'hidden' }}>
                      {elite.map((e, i) => <span key={i} title={rows[i].season} style={{ flex: '0 1 5px', minWidth: 2, height: 4, boxSizing: 'border-box', border: e === null ? `1px solid ${RULE}` : 0, background: e ? c.color : e === false ? '#34312e' : 'transparent' }} />)}
                    </span>
                  </span>
                </>
              )}
          </div>
        )
      })}
    </div>
  )
}

// The stat's group, a chart of percentiles over time for each of its stats (the 50th
// dashed), the cells sharing whatever height the panel has left so the whole group shows
// at once; one clicked puts its stat up the side, the one up now lit.
function StatGrid({ store, group, y, setY, channels, mode, dim }) {
  const at = TIME[mode]
  const cols = useMemo(() => Object.fromEntries(group.stats.map(l => [l, column(store, l, 1, channels.map(c => c.pl))])), [store, group, channels])
  const xs = channels.flatMap(c => c.pl.rows.map(at)).filter(v => v !== null)
  const d0 = xs.length ? Math.min(...xs) : 0
  const d1 = xs.length ? Math.max(...xs) : 1
  const px = v => 4 + ((v - d0) / ((d1 - d0) || 1)) * 92
  const stats = group.stats.filter(l => store.stats[l] && store.stats[l].since)
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: `repeat(${stats.length > 9 ? 4 : 3}, minmax(0, 1fr))`, gridAutoRows: 'minmax(84px, 1fr)', borderTop: `1px solid ${RULE}` }}>
      {stats.map(l => {
        const on = l === y
        const why = dim(l)
        return (
          <button key={l} type="button" className="cg-cell" onClick={() => setY(l)} aria-pressed={on} title={why || `Chart ${l}`}
            style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0, padding: '8px 9px 7px', border: 0, background: on ? '#3a3734' : 'transparent', boxShadow: `inset -1px -1px 0 ${RULE}${on ? `, inset 0 0 0 1px ${INK}, inset 0 -3px 0 var(--accent)` : ''}`, cursor: 'pointer', textAlign: 'left', opacity: why ? 0.45 : 1 }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', gap: 6, width: '100%' }}>
              <span className="cg-name" style={{ ...label, fontSize: 8.5, color: on ? INK : '#b8b2ab', fontWeight: on ? 700 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l}</span>
              {on && <span aria-hidden="true" style={{ width: 6, height: 6, flex: 'none', marginTop: 2, background: 'var(--accent)' }} />}
            </span>
            <svg viewBox="0 0 100 80" preserveAspectRatio="none" aria-hidden="true" style={{ width: '100%', flex: 1, minHeight: 0, display: 'block' }}>
              <rect x={0} y={0} width={100} height={80} fill="none" stroke={RULE} vectorEffect="non-scaling-stroke" />
              <line x1={0} x2={100} y1={40} y2={40} stroke={EDGE} strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
              {channels.map((c, j) => {
                const pts = c.pl.rows.map((r, k) => [at(r), cols[l][j].p[k]]).filter(([a, b]) => a !== null && b !== null)
                return <polyline key={c.letter} points={pts.map(([a, b]) => `${px(a)},${76 - b * 0.72}`).join(' ')} fill="none" stroke={c.color} strokeWidth={1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
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
  const slots = useMemo(() => (params.get('p') || '').split(',').filter(Boolean).slice(0, MAX), [params])
  const setSlots = next => set({ p: next.join(',') || null })
  // The chip being searched from (a player's index, or slots.length for a new one), or null.
  const [editing, setEditing] = useState(null)
  // He goes in at `i` (a new player at the end); already elsewhere, he moves there.
  const choose = (i, slug) => {
    const next = [...slots]
    next[i] = slug
    setSlots(next.filter((s, j) => s !== slug || j === i))
    setEditing(null)
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
    return pl ? { letter: slug, color: CHANNELS[i], pl } : null
  }).filter(Boolean)), [store, slots])
  const ys = useMemo(() => store && column(store, y, smooth), [store, y, smooth])
  const xs = useMemo(() => store && path ? column(store, x, smooth) : null, [store, x, path, smooth])
  const pickDoc = useMemo(() => store && { ...store, players: store.rows }, [store])
  const dim = l => {
    if (!channels.length || !store) return null
    const k = store.labels.indexOf(l)
    if (channels.some(c => c.pl.rows.some(r => r.v[k] !== null && r.v[k] !== undefined))) return null
    const since = store.stats[l] && store.stats[l].since
    return `No data for ${channels.map(c => surname(c.pl.name).toUpperCase()).join(', ')}${since ? ` · from ${since.replace('-', '–')}` : ''}`
  }
  const group = store && (store.groups.find(g => g.stats.includes(y)) || store.groups[0])
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
        <Slots slots={slots} store={store} y={y} x={x} playoffs={playoffs} playerPath={playerPath} remove={i => { setEditing(null); setSlots(slots.filter((_, j) => j !== i)) }} editing={editing} setEditing={setEditing} choose={choose} />
      </div>
      {!slots.length && (
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
        <div className="lb-body" style={{ gridTemplateRows: 'minmax(0, 1fr)' }}>
          <div className="lb-side">
            {store
              ? <CareerChart store={store} x={x} y={y} scale={scale} ys={ys} xs={xs} channels={channels} />
              : <Loader list={prog ? prog.list : []} done={prog ? prog.done : []} />}
          </div>
          <div className="lb-side cg-scroll" style={{ overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            {store && (
              <>
                <div style={{ ...label, fontSize: 8.5, color: INK, fontWeight: 700, padding: '10px 12px 8px' }}>Peak & prime · {y}</div>
                {channels.length ? <Prime store={store} channels={channels} y={y} /> : <div style={{ ...label, fontSize: 8, color: FAINT, padding: '0 12px 10px' }}>Add a player to read his peak</div>}
                <Head>{group.name} · pctl by {path ? 'age' : x === 'career' ? 'career yr' : x}</Head>
                {channels.length
                  ? <StatGrid store={store} group={group} y={y} setY={v => set({ y: v })} channels={channels} mode={path ? 'age' : x} dim={dim} />
                  : <div style={{ ...label, fontSize: 8, color: FAINT, padding: '0 12px 10px' }}>Add a player to see his {group.name.toLowerCase()} stats</div>}
              </>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
