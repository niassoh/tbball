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
import PlayerSearch from './components/PlayerSearch.jsx'

// Not keyed by slug: moving to another player (e.g. from the depth chart) keeps the
// current page up while the next profile loads, then swaps the data in, so the cards
// stay put and animate rather than the whole page blanking.
export default function ProfilePageRoute() {
  const { slug } = useParams()
  return <ProfilePage slug={slug} />
}

const MIN_SWAP_MS = 350

function ProfilePage({ slug }) {
  // `slug` here is the one the state was loaded for; it lags the URL while loading.
  const [state, setState] = useState({ status: 'loading', profile: null, slug: null })
  const [tab, setTab] = useState('impact')
  const loading = state.slug !== slug

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
    fetchProfile(slug)
      .then(profile => settle({ status: profile ? 'ready' : 'missing', profile, slug }))
      .catch(err => settle({ status: 'error', error: err.message, slug }))
    return () => { live = false; clearTimeout(timer) }
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps -- state.profile only gates the delay

  // Back to the top for the incoming player (the header is where the change shows).
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [slug])

  if (state.status !== 'ready') {
    const msg = { loading: 'Loading…', missing: 'Player not found.', error: `Couldn't load profile (${state.error}).` }[state.status]
    return (
      <main style={{ maxWidth: 1440, margin: '0 auto', padding: '40px 32px', fontFamily: MONO, color: '#a8a29c' }}>
        {msg} <Link to="/">All players</Link>
      </main>
    )
  }

  const p = state.profile
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
        <div style={{ paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <Link to="/" style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.08em', color: '#a8a29c' }}>← ALL PLAYERS</Link>
          <PlayerSearch />
        </div>
        <section style={{ padding: '10px 0 26px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,270px),1fr))', gap: 12, alignItems: 'stretch' }}>
            <BioCard profile={p} loading={loading} />
            <PercentileSnapshot profile={p} onPickGroup={setTab} />
            <RecentShift profile={p} />
          </div>
        </section>

        <TabNav tabs={tabs} active={activeTab} onPick={setTab} />

        <div className={loading ? 'fold-loading' : 'fold-ready'}>
          {statTab && <StatSection key={`${p.slug}-${activeTab}`} profile={p} tab={statTab} num={tabIndex + 1} />}
          {activeTab === 'yoy' && <YearToYear key={p.slug} profile={p} num={tabIndex + 1} />}
          {activeTab === 'career' && <Career key={p.slug} profile={p} num={tabIndex + 1} />}
        </div>

        <footer style={{ marginTop: 56, paddingTop: 16, borderTop: '1px solid #544f4b', display: 'flex', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', fontFamily: MONO, fontSize: 11, color: '#8a847e' }}>
          <span>Percentiles vs. players with 800+ MP · Career, span and league averages = minutes-weighted (shooting % = attempts-weighted) · Recent shift = games in the last 30 days of the season vs. the rest</span>
          <span>thinkingbasketball.net</span>
        </footer>
      </main>
    </div>
  )
}
