import { useState } from 'react'
import { headshotUrl } from '../api.js'
import { MONO } from '../lib/format.js'
import BrandMark from './BrandMark.jsx'
import SiteNav from './SiteNav.jsx'

const INK = '#ece8e3'
const DIM = '#a09a93'
const PORTRAIT_BG = 'radial-gradient(circle at 50% 38%, #1e1d1e 0%, #18181a 55%, #131314 100%)'
const CELLS = 12

// A player's page while it loads, laid where the page will be: the top bar's pages,
// then his card's place with his portrait and name (as the index handed them over, else
// his name from the address) over a row of cells lighting in turn (index.css .ld-cells),
// so the page arrives in place.
export default function ProfileLoading({ slug, preview }) {
  const [failed, setFailed] = useState(false)
  const name = (preview && preview.name) || slug.split('-').join(' ')
  const [first, ...rest] = name.split(' ')
  const portrait = preview && preview.headshot && !failed
  return (
    <main className="page-main" aria-busy="true" style={{ maxWidth: 1440, margin: '0 auto', padding: '0 var(--page-pad) 64px', fontFamily: MONO }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minHeight: 'var(--head-h)' }}>
        <BrandMark />
        <SiteNav at="players" />
      </div>
      <div style={{ marginTop: 4, display: 'flex', alignItems: 'flex-end', gap: 22, padding: 20, border: '1px solid #3d3a37', background: '#2a2826' }}>
        <span className="ld-face" style={{ width: 150, height: 150, flex: 'none', overflow: 'hidden', background: PORTRAIT_BG }}>
          {portrait && <img src={headshotUrl(slug, 400, preview.headshotVersion, preview.headshot)} alt="" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 22%', display: 'block' }} />}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 11, letterSpacing: '.14em', color: DIM, textTransform: 'uppercase' }}>{first}</span>
          <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'clamp(24px, 5vw, 38px)', fontWeight: 800, lineHeight: 1, textTransform: 'uppercase', color: INK, overflowWrap: 'anywhere' }}>{rest.join(' ') || first}</span>
          <span className="ld-cells" role="progressbar" aria-label="Loading" style={{ display: 'flex', gap: 4, marginTop: 14 }}>
            {Array.from({ length: CELLS }, (_, i) => <span key={i} style={{ '--i': i, width: 9, height: 9 }} />)}
          </span>
        </div>
      </div>
    </main>
  )
}
