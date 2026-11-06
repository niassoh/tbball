// The patron pass: thinkingbasketball.net's Daily Board (WordPress, behind its Patreon lock)
// sends a patron here as /#pass=<token>, a JWT signed ES256 with a key only WordPress holds
// ({ sub, tier, exp }, 7 days). The site checks it with the public key below and keeps it
// on the device; without a good one the gate (components/Gate.jsx) sends them back. A soft
// gate by choice: the data files stay public. Ben and Prottush get in by a password
// instead (only its SHA-256 is here), kept a year.
export const DAILY_BOARD = 'https://thinkingbasketball.net/daily-board/'
const PUBKEY = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEM9KAcJVu1UUI7efzbBjOmIB4UYmsqHfk2FBbhdMBuqIAr3JjGHak9jl9MPF2yeDQ5LYtAjOvJMX23fItszOk/Q=='
const ADMIN_HASH = '07f83f00ffa536ff73f920bacf3e57a3aff223d5bf25c208e0c10488e1ec68a9'
const ADMIN_DAYS = 365
const PASS_KEY = 'tb-pass'
const ADMIN_KEY = 'tb-admin'

const bytes = b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0))
const unurl = s => bytes(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '='))
const text = s => new TextDecoder().decode(unurl(s))

// The token's payload if its signature is WordPress's and it hasn't expired; else null.
// `key`: the public key as base64 SPKI (the tests pass their own).
export const verifyPass = async (token, now = Date.now(), key = PUBKEY) => {
  try {
    const [head, body, sig] = token.split('.')
    if (JSON.parse(text(head)).alg !== 'ES256') return null
    const spki = await crypto.subtle.importKey('spki', bytes(key), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, spki, unurl(sig), new TextEncoder().encode(`${head}.${body}`))
    const payload = JSON.parse(text(body))
    return ok && payload.exp * 1000 > now ? payload : null
  } catch {
    return null
  }
}

// `hash`: the password's SHA-256 in hex (the tests pass their own).
export const isAdminPassword = async (password, hash = ADMIN_HASH) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('') === hash
}

// Storage throws in some private windows and with site data blocked: the visitor is then
// asked again next time, nothing worse.
const load = k => {
  try { return localStorage.getItem(k) } catch { return null }
}
const save = (k, v) => {
  try { localStorage.setItem(k, v) } catch { /* not kept */ }
}

// Whether this visit may in: a pass just arrived in the address (kept, and taken out of
// the address), one kept from before, or the admin password within its year.
// Always on this machine (the dev server, a local preview): the gate is for visitors.
export const admitted = async (now = Date.now()) => {
  if (['localhost', '127.0.0.1'].includes(location.hostname)) return true
  const fresh = location.hash.match(/^#pass=([\w.-]+)/)
  if (fresh) {
    history.replaceState(null, '', location.pathname + location.search)
    if (await verifyPass(fresh[1], now)) {
      save(PASS_KEY, fresh[1])
      return true
    }
  }
  if (Number(load(ADMIN_KEY)) > now) return true
  const kept = load(PASS_KEY)
  return !!kept && !!(await verifyPass(kept, now))
}

export const admitAdmin = (now = Date.now()) => save(ADMIN_KEY, String(now + ADMIN_DAYS * 86400000))
