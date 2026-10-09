import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchProfile } from './api.js'
import { MONO } from './lib/format.js'
import BioCard from './components/BioCard.jsx'
import PercentileSnapshot from './components/PercentileSnapshot.jsx'
import RecentShift from './components/RecentShift.jsx'
import TabNav from './components/TabNav.jsx'
import StatSection from './components/StatSection.jsx'
import YearToYear from './components/YearToYear.jsx'
import Career from './components/Career.jsx'
import TopBar from './components/TopBar.jsx'
import { useSeasonType } from './useSeasonType.js'

// Not keyed by slug: moving to another player (e.g. from the depth chart) keeps the
// current page up while the next profile loads, then swaps the data in, so the cards
// stay put and animate rather than the whole page blanking.
export default function ProfilePageRoute() {
  const { slug } = useParams()
  const { playoffs } = useSeasonType()
  return <ProfilePage slug={slug} playoffs={playoffs} />
}

const MIN_SWAP_MS = 350

function ProfilePage({ slug, playoffs }) {
  const { homePath, setPlayoffs } = useSeasonType()
  // The player and season type the state was loaded for; it lags the URL while loading.
  const key = `${slug}|${playoffs ? 'playoffs' : 'regular'}`
  const [state, setState] = useState({ status: 'loading', profile: null, key: null })
  const [tab, setTab] = useState('impact')
  // The stat tables' dragged season span, kept here so it carries across tabs; tagged
  // with the player it was made on, so another player starts without one.
  const [span, setSpan] = useState(null)
  // The stat tables show values or percentiles (a click on a table switches); kept here
  // so the choice carries across tabs and players.
  const [pctView, setPctView] = useState(false)
  const loading = state.key !== key

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

  // Back to the top for the incoming player (the header is where the change shows).
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [slug])

  if (state.status !== 'ready') {
    const msg = { loading: 'Loading…', missing: 'Player not found.', error: `Couldn't load profile (${state.error}).` }[state.status]
    return (
      <main style={{ maxWidth: 1440, margin: '0 auto', padding: '40px 32px', fontFamily: MONO, color: '#a8a29c' }}>
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
    ...p.tabs.filter(t => t.stats.some(l => p.stats[l].available)).map(t => ({ id: t.id, name: t.name })),
    { id: 'yoy', name: 'Year to Year' },
    { id: 'career', name: 'Career' }
  ]
  // Keep the open tab across players when the new one has it.
  const activeTab = tabs.some(t => t.id === tab) ? tab : tabs[0].id
  const tabIndex = tabs.findIndex(t => t.id === activeTab)
  const statTab = p.tabs.find(t => t.id === activeTab)

  return (
    <div style={{ minHeight: '100vh', background: '#262422' }}>
      <main style={{ maxWidth: 1440, margin: '0 auto', padding: '0 32px 64px' }}>
        <TopBar profile={p} homePath={homePath} />
        <section style={{ padding: '4px 0 26px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,270px),1fr))', gap: 12, alignItems: 'stretch' }}>
            <BioCard profile={p} loading={loading} />
            <PercentileSnapshot profile={p} onPickGroup={setTab} />
            <RecentShift profile={p} />
          </div>
        </section>

        {p.seasons.length ? (
          <>
            <TabNav tabs={tabs} active={activeTab} onPick={setTab} />

            <div className={loading ? 'fold-loading' : 'fold-ready'}>
              {statTab && <StatSection key={`${fold}-${activeTab}`} profile={p} tab={statTab} num={tabIndex + 1} sel={span && span.slug === fold ? span : null} setSel={s => setSpan(s && { ...s, slug: fold })} pctView={pctView} setPctView={setPctView} />}
              {activeTab === 'yoy' && <YearToYear key={fold} profile={p} num={tabIndex + 1} sel={span && span.slug === fold ? span : null} setSel={s => setSpan(s && { ...s, slug: fold })} />}
              {activeTab === 'career' && <Career key={fold} profile={p} num={tabIndex + 1} />}
            </div>
          </>
        ) : (
          // No playoff runs on file (playoffs mode only: every regular profile has seasons).
          <div className={loading ? 'fold-loading' : 'fold-ready'} style={{ borderTop: '2px solid var(--trim)', padding: '28px 0', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontFamily: MONO, fontSize: 11, letterSpacing: '.08em', color: '#a8a29c' }}>
            <span>NO PLAYOFF GAMES SINCE 2013–14</span>
            <button type="button" onClick={() => setPlayoffs(false)} style={{ background: 'transparent', border: '1px solid #544f4b', color: '#ece8e3', fontFamily: MONO, fontSize: 10, letterSpacing: '.08em', padding: '4px 8px', cursor: 'pointer' }}>REGULAR SEASON →</button>
          </div>
        )}

        <footer style={{ marginTop: 56, paddingTop: 16, borderTop: '1px solid #544f4b', display: 'flex', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', fontFamily: MONO, fontSize: 11, color: '#8a847e' }}>
          {po
            ? <span>Playoff percentiles vs. that postseason's players with 50+ MP · Career, span and league averages = minutes-weighted (shooting % = attempts-weighted) · Tracking shooting and rim defence cover that playoff run · Playoffs vs season = the latest playoffs vs. that regular season</span>
            : <span>Percentiles vs. players with 800+ MP · Career, span and league averages = minutes-weighted (shooting % = attempts-weighted) · 3YR / 2YR = tracking stats over that season and the ones before it · Recent shift = games in the last 30 days of the season vs. the rest</span>}
          <span>thinkingbasketball.net</span>
        </footer>
      </main>
    </div>
  )
}
