import { Link } from 'react-router-dom'
import { MONO, ord, signed } from '../lib/format.js'

const BLUE = '#8fb0e6'
const ORANGE = '#fa962a'
const BAR_UP = '#597ec1'
const RULE = '1px solid #544f4b'
const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '.08em', color: '#8a847e' }
const lastName = name => name.split(' ').slice(1).join(' ') || name
const tone = v => (v === null || v === undefined ? '#6b655f' : v >= 0 ? BLUE : ORANGE)
const splitGrid = { display: 'grid', gridTemplateColumns: '104px minmax(0,1fr) 40px 40px', columnGap: 8, alignItems: 'center' }

// One figure in the ON / OFF / SWING strip.
function Figure({ title, value, sub, first = false, last = false }) {
  return (
    <div style={{ padding: first ? '0 10px 0 0' : '0 10px', borderRight: last ? 'none' : RULE, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={label}>{title}</span>
        <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, lineHeight: 1, color: tone(value) }}>{value === null || value === undefined ? '—' : signed(value)}</span>
      </span>
      <span style={{ ...label, fontSize: 8.5 }}>{sub}</span>
    </div>
  )
}

// A teammate split: net rating per 100 with him on and that teammate off (or both off),
// as a bar from zero, with a white tick at his overall on-court net for reference.
function Split({ row, scale, on }) {
  const net = row.net
  const at = v => 50 + (Math.max(-scale, Math.min(scale, v)) / scale) * 50
  const mate = row.mate
  const name = mate ? lastName(mate.name) : row.label
  return (
    <div style={{ ...splitGrid, borderBottom: '1px solid #3d3a37', padding: '3px 0' }}>
      <span title={row.label} style={{ display: 'flex', alignItems: 'baseline', gap: 5, minWidth: 0, whiteSpace: 'nowrap' }}>
        <span style={{ ...label, flex: 'none' }}>{row.kind === 'neither' ? 'NEITHER +' : 'W/O'}</span>
        {mate
          ? <Link to={`/player/${mate.slug}`} className="depth-link" style={{ fontSize: 11.5, fontWeight: 600, color: '#ece8e3', overflow: 'hidden', textOverflow: 'ellipsis', borderBottom: '1px solid transparent' }}>{name}</Link>
          : <span style={{ fontSize: 11.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>}
      </span>
      <div style={{ position: 'relative', height: 6, background: '#34312e' }}>
        <div style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 1, background: '#6b655f' }} />
        {net !== null && <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${Math.min(50, at(net))}%`, width: `${Math.abs(at(net) - 50)}%`, background: net >= 0 ? BAR_UP : ORANGE }} />}
        {on !== null && <div title="His on-court net" style={{ position: 'absolute', top: -2, bottom: -2, left: `${at(on)}%`, width: 2, marginLeft: -1, background: '#ece8e3' }} />}
      </div>
      <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 700, textAlign: 'right', color: net === null ? '#6b655f' : net >= 0 ? '#ece8e3' : ORANGE }}>{net === null ? '—' : signed(net)}</span>
      <span style={{ fontFamily: MONO, fontSize: 9.5, textAlign: 'right', color: '#8a847e' }}>{row.minutes.toLocaleString()}</span>
    </div>
  )
}

// The bio card's WOWY: his team's net rating per 100 with him on and off the floor and
// the swing between them, then how the team does with him on but each of his top
// teammates off (and with both off), each teammate linked to his page, then his career
// on/off. Compact, at its natural height; without a season's WOWY the same frame shows
// dashes.
export default function WowyPanel({ profile: p, accent }) {
  const w = p.wowy
  const on = w ? w.rows.find(r => r.kind === 'on') : null
  const off = w ? w.rows.find(r => r.kind === 'off') : null
  const splits = w ? w.rows.filter(r => r.kind === 'without' || r.kind === 'neither') : []
  const onNet = on ? on.net : null
  const swing = on && off && on.net !== null && off.net !== null ? on.net - off.net : null
  const scale = Math.max(15, Math.ceil(Math.max(...[onNet, ...splits.map(r => r.net)].filter(v => v !== null).map(Math.abs), 0) / 5) * 5)
  const placeholders = Array.from({ length: 4 }, (_, i) => i)

  return (
    <div key={`wowy-${p.slug}`} className="swap-in" style={{ padding: '12px 14px 10px', display: 'flex', flexDirection: 'column', gap: 8, '--team': accent || '#ece8e3' }}>
      <span title="With or without you: team net rating per 100 possessions" style={{ ...label, whiteSpace: 'nowrap' }}>{w ? `${w.season.replace('-', '–')} · ${w.team} · ` : ''}NET / 100 ON AND OFF</span>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', padding: '2px 0' }}>
        <Figure title="ON" value={onNet} sub={on ? `${on.minutes.toLocaleString()} MIN` : '—'} first />
        <Figure title="OFF" value={off ? off.net : null} sub={off ? `${off.minutes.toLocaleString()} MIN` : '—'} />
        <Figure title="SWING" value={swing} sub="ON − OFF" last />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ ...splitGrid, ...label, paddingBottom: 3, borderBottom: '1px solid #6b655f' }}>
          <span style={{ gridColumn: '1 / 3', whiteSpace: 'nowrap' }}>HIM ON, TEAMMATE OFF</span><span style={{ textAlign: 'right' }}>NET</span><span style={{ textAlign: 'right' }}>MIN</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {w
            ? splits.map(r => <Split key={r.label} row={r} scale={scale} on={onNet} />)
            : placeholders.map(i => (
              <div key={i} aria-hidden="true" style={{ ...splitGrid, borderBottom: '1px solid #3d3a37', padding: '3px 0', color: '#3d3a37', fontFamily: MONO, fontSize: 11 }}>
                <span>—</span><div style={{ height: 6, background: '#2f2c2a' }} /><span style={{ textAlign: 'right' }}>—</span><span style={{ textAlign: 'right' }}>—</span>
              </div>
            ))}
        </div>
        {!w && (
          <span style={{ position: 'absolute', left: '50%', top: '55%', transform: 'translate(-50%,-50%)', fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', color: '#a8a29c', background: '#2c2a28', border: RULE, padding: '4px 8px', whiteSpace: 'nowrap' }}>NO WOWY THIS SEASON</span>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', ...label }}>
        <span>CAREER ON/OFF</span>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: p.onOff ? tone(p.onOff.value) : '#6b655f' }}>
          {p.onOff ? `${signed(p.onOff.value)} · ${ord(p.onOff.pctl).toUpperCase()} PCT` : '—'}
        </span>
      </div>
    </div>
  )
}
