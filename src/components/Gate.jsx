import { useEffect, useRef, useState } from 'react'
import { DAILY_BOARD, admitAdmin, admitted, isAdminPassword } from '../lib/pass.js'
import BrandMark from './BrandMark.jsx'

// The site behind the patron pass (lib/pass.js): nothing renders, and so nothing fetches,
// until the visit is let in; otherwise a short note sending them to the Daily Board, whose
// Patreon sign-in brings a patron straight back with a pass. Typing the admin word on it
// opens a password field, for Ben and Prottush (index.css .gate).
const WORD = 'tbadmin'

// Checked once a page load: StrictMode's second run would find the pass already taken out
// of the address.
let check = null

function Admin({ onAdmit }) {
  const [value, setValue] = useState('')
  const field = useRef(null)
  useEffect(() => field.current.focus(), [])
  const submit = async e => {
    e.preventDefault()
    if (await isAdminPassword(value.trim())) {
      admitAdmin()
      onAdmit()
    } else setValue('')
  }
  return (
    <form onSubmit={submit} className="gate-admin">
      <input ref={field} type="password" aria-label="Password" autoComplete="current-password" value={value} onChange={e => setValue(e.target.value)} />
    </form>
  )
}

function Screen({ onAdmit }) {
  const [admin, setAdmin] = useState(false)
  useEffect(() => {
    if (admin) return
    let typed = ''
    const key = e => {
      if (e.key.length !== 1) return
      typed = (typed + e.key.toLowerCase()).slice(-WORD.length)
      if (typed !== WORD) return
      // The word's last key would otherwise type itself into the field it opens.
      e.preventDefault()
      setAdmin(true)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [admin])
  return (
    <main className="gate">
      <BrandMark />
      <p>Sign in on Thinking Basketball to get access.</p>
      <a className="gate-go" href={DAILY_BOARD}>Sign in →</a>
      {admin && <Admin onAdmit={onAdmit} />}
    </main>
  )
}

export default function Gate({ children }) {
  const [state, setState] = useState('checking')
  useEffect(() => {
    check ??= admitted()
    check.then(ok => setState(ok ? 'in' : 'out'))
  }, [])
  if (state === 'checking') return null
  return state === 'in' ? children : <Screen onAdmit={() => setState('in')} />
}
