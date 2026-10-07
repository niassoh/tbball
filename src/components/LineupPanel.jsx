import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { MONO, ord, signed } from '../lib/format.js'

const INK = '#ece8e3'
const DIM = '#8a847e'
const FAINT = '#6b655f'
const RULE = '1px solid #3d3a37'
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.08em', color: DIM }
const lastName = name => name.split(' ').slice(1).join(' ') || name
// Monochrome: a negative margin reads dimmer, not in a second colour.
const netColor = v => (v === null || v === undefined ? FAINT : v >= 0 ? INK : '#a8a29c')
const net = v => (v === null || v === undefined ? '—' : signed(v))
const mins = m => m.toLocaleString()

function Mate({ mate }) {
  const name = mate.name ? lastName(mate.name) : '?'
  return mate.slug
    ? <Link to={`/player/${mate.slug}`} className="depth-link" style={{ color: INK }}>{name}</Link>
    : <span style={{ color: DIM }}>{name}</span>
}

function Names({ mates }) {
  return (
    <span style={{ fontSize: 11.5, fontWeight: 600, lineHeight: 1.35 }}>
      {mates.map((m, i) => <Fragment key={i}>{i > 0 && <span style={{ color: DIM, fontWeight: 400 }}> · </span>}<Mate mate={m} /></Fragment>)}
    </span>
  )
}

// One unit (a five or a trio he's in): what it is, its minutes and net, and the
// teammates in it with him.
function Unit({ title, unit, empty }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto 46px', columnGap: 10, rowGap: 2, alignItems: 'baseline', padding: '6px 0', borderBottom: RULE }}>
      <span style={label}>{title}</span>
      <span style={{ ...label, textAlign: 'right' }}>{unit ? `${mins(unit.minutes)} MIN` : ''}</span>
      <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, textAlign: 'right', color: unit ? netColor(unit.net) : FAINT }}>{unit ? net(unit.net) : '—'}</span>
      <span style={{ gridColumn: '1 / -1' }}>
        {unit ? <Names mates={unit.mates} /> : <span style={{ ...label, color: FAINT }}>{empty}</span>}
      </span>
    </div>
  )
}

const mateGrid = { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 44px 44px 44px 40px', columnGap: 6, alignItems: 'baseline' }

// The bio card's lineup module: how his team does with him on and off the floor,
// the units he plays in (his most-used five, his best five and best trio over a
// minutes floor), and his most-shared teammates with the team's net with both on
// (WITH) and with him on and the teammate off (APART); Δ = WITH − APART, so the
// teammates he wins with read positive. Then his career on/off. All net rating per
// 100 possessions, from the season's five-man lineups.
export default function LineupPanel({ profile: p }) {
  const L = p.lineups
  const swing = L && L.on.net !== null && L.off.net !== null ? L.on.net - L.off.net : null

  return (
    <div key={`lineups-${p.slug}`} className="swap-in" style={{ padding: '12px 14px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', ...label }}>
        <span>{L ? `${L.season.replace('-', '–')} · ${L.team} · LINEUPS` : 'LINEUPS'}</span>
        <span>NET / 100</span>
      </div>

      {!L ? (
        <span style={{ ...label, color: FAINT, padding: '6px 0', borderTop: RULE, borderBottom: RULE }}>NO LINEUP DATA THIS SEASON</span>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', paddingBottom: 8, borderBottom: '1px solid #544f4b' }}>
            {[['ON', L.on.net, `${mins(L.on.minutes)} MIN`], ['OFF', L.off.net, `${mins(L.off.minutes)} MIN`], ['SWING', swing, 'ON − OFF']].map(([t, v, sub], i) => (
              <div key={t} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: i ? '0 10px' : '0 10px 0 0', borderLeft: i ? RULE : 'none' }}>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={label}>{t}</span>
                  <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, lineHeight: 1, color: netColor(v) }}>{net(v)}</span>
                </span>
                <span style={{ ...label, fontSize: 8.5 }}>{sub}</span>
              </div>
            ))}
          </div>

          <div>
            <Unit title={`MOST USED FIVE · ${L.mostUsed.share}% OF HIS MIN`} unit={L.mostUsed} />
            <Unit title={`BEST FIVE · ${L.floors.five}+ MIN`} unit={L.bestFive} empty={`NO FIVE WITH ${L.floors.five}+ MIN`} />
            <Unit title={`BEST TRIO · ${L.floors.trio}+ MIN`} unit={L.bestTrio} empty={`NO TRIO WITH ${L.floors.trio}+ MIN`} />
          </div>

          <div>
            <div style={{ ...mateGrid, ...label, paddingBottom: 3, borderBottom: '1px solid #544f4b' }}>
              <span>TEAMMATES</span>
              <span style={{ textAlign: 'right' }}>SHARED</span>
              <span style={{ textAlign: 'right' }}>WITH</span>
              <span style={{ textAlign: 'right' }}>APART</span>
              <span style={{ textAlign: 'right' }}>Δ</span>
            </div>
            {L.mates.map((m, i) => {
              const d = m.together.net !== null && m.apart.net !== null ? m.together.net - m.apart.net : null
              return (
                <div key={i} style={{ ...mateGrid, fontFamily: MONO, fontSize: 11, padding: '4px 0', borderBottom: RULE }}>
                  <span style={{ fontFamily: 'Montserrat,sans-serif', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><Mate mate={m} /></span>
                  <span style={{ textAlign: 'right', color: DIM, fontSize: 9.5 }}>{mins(m.together.minutes)}</span>
                  <span style={{ textAlign: 'right', color: netColor(m.together.net) }}>{net(m.together.net)}</span>
                  <span style={{ textAlign: 'right', color: netColor(m.apart.net) }}>{net(m.apart.net)}</span>
                  <span style={{ textAlign: 'right', fontWeight: 700, color: netColor(d) }}>{net(d)}</span>
                </div>
              )
            })}
          </div>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', ...label }}>
        <span>CAREER ON/OFF</span>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: p.onOff ? netColor(p.onOff.value) : FAINT }}>
          {p.onOff ? `${signed(p.onOff.value)} · ${ord(p.onOff.pctl).toUpperCase()} PCT` : '—'}
        </span>
      </div>
    </div>
  )
}
