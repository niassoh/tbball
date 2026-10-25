import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { fetchProfile, peekProfile } from './api.js'
import { MONO } from './lib/format.js'
import BioCard from './components/BioCard.jsx'
import PercentileSnapshot from './components/PercentileSnapshot.jsx'
import RecentShift from './components/RecentShift.jsx'
import SeasonRail from './components/SeasonRail.jsx'
import TabNav from './components/TabNav.jsx'
import StatSection from './components/StatSection.jsx'
import YearToYear from './components/YearToYear.jsx'
import Footprint from './components/Footprint.jsx'
import Lonestar from './components/Lonestar.jsx'
import TopBar from './components/TopBar.jsx'
import ProfileLoading from './components/ProfileLoading.jsx'
import { useSeasonType } from './useSeasonType.js'

// Not keyed by slug: moving to another player (e.g. from the depth chart) keeps the
// current page up while the next profile loads, then swaps the data in, so the cards
// stay put and animate rather than the whole page blanking.
export default function ProfilePageRoute() {
  const { slug } = useParams()
  const { playoffs } = useSeasonType()
  // Coming from another page (All players, the Leaderboard) starts at the top: the
  // browser would otherwise keep that page's scroll. Moving between players doesn't
  // remount this, so it keeps its place.
  useLayoutEffect(() => { window.scrollTo(0, 0) }, [])
  return <ProfilePage slug={slug} playoffs={playoffs} />
}

const MIN_SWAP_MS = 350
// Play steps through the career one season at a time; each step holds well past the
// percentile bars' slide, long enough to read the season's stats before the next.
const STEP_MS = 1440

// The bio and percentile cards follow one season, picked on the rail over them.
// A different player (the page isn't remounted) starts at his latest season with games of
// this type, so the bars slide from the old player's percentiles to the new one's;
// arriving from a teammate link on a season's card, at that season when he played it.
// Switching between the regular season and the playoffs keeps the season (both list the
// same ones, a season without games of the type empty).
function Cards({ profile: p, loading, onPickGroup }) {
  const L = p.seasons.length - 1
  const from = useLocation().state
  const start = () => {
    const i = from && from.season ? p.seasons.findIndex(s => s.season === from.season) : -1
    if (i >= 0) return i
    const played = p.seasons.findLastIndex(s => !s.empty)
    return played >= 0 ? played : L
  }
  const [pick, setPick] = useState(() => ({ who: p.slug, i: start() }))
  const [playing, setPlaying] = useState(false)
  if (pick.who !== p.slug) {
    setPick({ who: p.slug, i: start() })
    setPlaying(false)
  }
  const k = Math.min(pick.i, L)

  useEffect(() => {
    if (!playing) return
    const t = setTimeout(() => {
      setPick(x => ({ ...x, i: x.i + 1 }))
      if (k + 1 >= L) setPlaying(false)
    }, STEP_MS)
    return () => clearTimeout(t)
  }, [playing, k, L])

  const choose = i => {
    setPick(x => ({ ...x, i }))
    setPlaying(false)
  }
  const togglePlay = () => {
    if (playing) return setPlaying(false)
    if (k >= L) setPick(x => ({ ...x, i: 0 }))
    setPlaying(true)
  }

  return (
    <div className="profile-cards-wrap">
      <div className={L > 0 ? 'profile-cards with-rail' : 'profile-cards'}>
        {L > 0 && <div className="season-rail-cell"><SeasonRail seasons={p.seasons} index={k} onPick={choose} playing={playing} onTogglePlay={togglePlay} /></div>}
        <BioCard profile={p} season={k} loading={loading} playing={playing} />
        <PercentileSnapshot profile={p} season={k} onPickGroup={onPickGroup} />
        <RecentShift profile={p} season={k} />
      </div>
    </div>
  )
}

function ProfilePage({ slug, playoffs }) {
  const { homePath, setPlayoffs } = useSeasonType()
  // The player and season type the state was loaded for; it lags the URL while loading.
  const key = `${slug}|${playoffs ? 'playoffs' : 'regular'}`
  // A profile already fetched (the index fetches the one being opened) shows on the first
  // frame; one that isn't shows the loader, then eases in (pf-in).
  const [state, setState] = useState(() => {
    const ready = peekProfile(slug, playoffs)
    return ready ? { status: 'ready', profile: ready, key } : { status: 'loading', profile: null, key: null }
  })
  const [loaded] = useState(() => !peekProfile(slug, playoffs))
  // Footprint first, wherever it's there (else the first tab).
  const [tab, setTab] = useState('footprint')
  // Where the tab bar sits before it sticks: a tab picked from further down opens at its
  // top, under the bar. Left to the browser, the old tab's going would clamp the scroll to
  // the new one's length and land partway into it (Footprint runs longer than Lonestar,
  // and Lonestar's loading box shorter still).
  const tabsTop = useRef(null)
  const pickTab = id => {
    const bar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 0
    const top = tabsTop.current ? tabsTop.current.getBoundingClientRect().top + window.scrollY - bar : null
    if (top !== null && window.scrollY > top) window.scrollTo({ top, behavior: 'instant' })
    setTab(id)
  }
  // The stat tables' dragged season span, kept here so it carries across tabs; tagged
  // with the player it was made on, so another player starts without one.
  const [span, setSpan] = useState(null)
  // The stat tables show values or percentiles (a click on a table switches); kept here
  // so the choice carries across tabs and players.
  const [pctView, setPctView] = useState(false)
  const loading = state.key !== key
  const preview = useLocation().state?.preview

  useEffect(() => {
    let live = true
    let timer = null
    // Switching players holds the header's loading state for at least MIN_SWAP_MS, so
    // a fast load reads as a deliberate transition rather than a flicker.
    const started = performance.now()
    const settle = next => {
      if (!live) return
      const wait = state.profile ? Math.max(0, MIN_SWAP_MS - (performance.now() - started)) : 0
      timer = setTimeout(() => live && setState(next), wait)
    }
    fetchProfile(slug, playoffs)
      .then(profile => settle({ status: profile ? 'ready' : 'missing', profile, key }))
      .catch(err => settle({ status: 'error', error: err.message, key }))
    return () => { live = false; clearTimeout(timer) }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps -- state.profile only gates the delay


  // The first load shows the player's page arriving (his portrait and name, if the link
  // that brought us handed them over); a swap between players keeps the page up instead.
  if (state.status === 'loading') return <ProfileLoading slug={slug} preview={preview} />
  if (state.status !== 'ready') {
    const msg = { missing: 'Player not found.', error: `Couldn't load profile (${state.error}).` }[state.status]
    return (
      <main className="page-main" style={{ maxWidth: 1440, margin: '0 auto', padding: '40px var(--page-pad)', fontFamily: MONO, color: '#b3ada6' }}>
        {msg} <Link to={homePath}>All players</Link>
      </main>
    )
  }

  const p = state.profile
  const po = p.seasonType === 'playoffs'
  // Remounts the folds when the player or the season type changes (their season indexes
  // belong to one profile).
  const fold = `${p.slug}-${p.seasonType}`
  const tabs = [
    // The views (a picked season or span on its own module, not a stat table) lead the
    // tab bar, grouped apart. Regular season only (the backend has none in the playoffs).
    ...(p.footprint ? [{ id: 'footprint', name: 'Footprint', kind: 'view' }] : []),
    ...(p.lonestar ? [{ id: 'lonestar', name: 'Lonestar', kind: 'view' }] : []),
    ...p.tabs.filter(t => t.stats.some(l => p.stats[l].available)).map(t => ({ id: t.id, name: t.name })),
    { id: 'yoy', name: 'Year to Year' }
  ]
  // Keep the open tab across players when the new one has it.
  const activeTab = tabs.some(t => t.id === tab) ? tab : tabs[0].id
  const statTab = p.tabs.find(t => t.id === activeTab)

  return (
    <div style={{ minHeight: '100vh', background: '#262422' }}>
      <main className={loaded ? 'page-main pf-in' : 'page-main'} style={{ maxWidth: 1440, margin: '0 auto', padding: '0 var(--page-pad) 64px' }}>
        <TopBar profile={p} />
        <section style={{ padding: '4px 0 26px' }}>
          <Cards profile={p} loading={loading} onPickGroup={setTab} />
        </section>

        {p.seasons.some(s => !s.empty) ? (
          <>
            <div ref={tabsTop} aria-hidden="true" />
            <TabNav tabs={tabs} active={activeTab} onPick={pickTab} />

            <div className={loading ? 'fold-loading' : 'fold-ready'}>
              {statTab && <StatSection key={`${fold}-${activeTab}`} profile={p} tab={statTab} sel={span && span.slug === fold ? span : null} setSel={s => setSpan(s && { ...s, slug: fold })} pctView={pctView} setPctView={setPctView} />}
              {activeTab === 'yoy' && <YearToYear key={fold} profile={p} sel={span && span.slug === fold ? span : null} setSel={s => setSpan(s && { ...s, slug: fold })} />}
              {activeTab === 'footprint' && <Footprint key={fold} profile={p} />}
              {activeTab === 'lonestar' && <Lonestar key={fold} profile={p} />}
            </div>
          </>
        ) : (
          // No playoff runs on file (playoffs mode only: every regular profile has seasons).
          <div className={loading ? 'fold-loading' : 'fold-ready'} style={{ borderTop: '2px solid var(--trim)', padding: '28px 0', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontFamily: MONO, fontSize: 11, letterSpacing: '.08em', color: '#b3ada6' }}>
            <span>NO PLAYOFF GAMES SINCE 2000–01</span>
            <button type="button" onClick={() => setPlayoffs(false)} style={{ background: 'transparent', border: '1px solid #544f4b', color: '#ece8e3', fontFamily: MONO, fontSize: 10, letterSpacing: '.08em', padding: '4px 8px', cursor: 'pointer' }}>REGULAR SEASON →</button>
          </div>
        )}

        <footer style={{ marginTop: 56, paddingTop: 16, borderTop: '1px solid #544f4b', display: 'flex', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', fontFamily: MONO, fontSize: 11, color: '#a09a93' }}>
          {po
            ? <span>Playoff percentiles vs. that postseason's players with 50+ MP · Career, span and league averages = minutes-weighted (shooting % = attempts-weighted) · Tracking shooting and rim defence cover that playoff run · Playoffs vs season = the picked season's playoffs vs. its regular season</span>
            : <span>Percentiles vs. players with 800+ MP (pro-rated to date in the season being played) · Career, span and league averages = minutes-weighted (shooting % = attempts-weighted) · 3YR / 2YR = tracking stats over that season and the ones before it · Recent shift = games in the last 30 days of the season vs. the rest</span>}
          <span>thinkingbasketball.net</span>
        </footer>
      </main>
    </div>
  )
}
