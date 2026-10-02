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

// Keyed by slug so navigating to another player starts from fresh state.
export default function ProfilePageRoute() {
  const { slug } = useParams()
  return <ProfilePage key={slug} slug={slug} />
}

function ProfilePage({ slug }) {
  const [state, setState] = useState({ status: 'loading', profile: null })
  const [tab, setTab] = useState('impact')

  useEffect(() => {
    let live = true
    fetchProfile(slug)
      .then(profile => live && setState({ status: profile ? 'ready' : 'missing', profile }))
      .catch(err => live && setState({ status: 'error', error: err.message }))
    return () => { live = false }
  }, [slug])

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
  const tabIndex = tabs.findIndex(t => t.id === tab)
  const statTab = p.tabs.find(t => t.id === tab)

  return (
    <div style={{ minHeight: '100vh', background: '#262422' }}>
      <main style={{ maxWidth: 1440, margin: '0 auto', padding: '0 32px 64px' }}>
        <section style={{ padding: '22px 0 26px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,270px),1fr))', gap: 12, alignItems: 'stretch' }}>
            <BioCard profile={p} />
            <PercentileSnapshot profile={p} onPickGroup={setTab} />
            <RecentShift profile={p} />
          </div>
        </section>

        <TabNav tabs={tabs} active={tab} onPick={setTab} />

        {statTab && <StatSection key={`${p.slug}-${tab}`} profile={p} tab={statTab} num={tabIndex + 1} />}
        {tab === 'yoy' && <YearToYear key={p.slug} profile={p} num={tabIndex + 1} />}
        {tab === 'career' && <Career profile={p} num={tabIndex + 1} />}

        <footer style={{ marginTop: 56, paddingTop: 16, borderTop: '1px solid #544f4b', display: 'flex', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', fontFamily: MONO, fontSize: 11, color: '#8a847e' }}>
          <span>Percentiles vs. players with 800+ MP · Career and league average = minutes-weighted · Shifts = last 30 days of the season vs. the rest</span>
          <span>thinkingbasketball.net</span>
        </footer>
      </main>
    </div>
  )
}
