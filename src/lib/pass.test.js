import { describe, expect, it } from 'vitest'
import { isAdminPassword, verifyPass } from './pass.js'

// A pass as WordPress signs one (ES256: the signature raw r‖s, as WebCrypto gives it).
const b64url = buf => Buffer.from(buf).toString('base64url')
const keys = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
const pub = Buffer.from(await crypto.subtle.exportKey('spki', keys.publicKey)).toString('base64')
const sign = async (payload, alg = 'ES256') => {
  const head = b64url(JSON.stringify({ alg, typ: 'JWT' }))
  const body = b64url(JSON.stringify(payload))
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keys.privateKey, new TextEncoder().encode(`${head}.${body}`))
  return `${head}.${body}.${b64url(sig)}`
}
const NOW = 1_800_000_000_000
const exp = NOW / 1000 + 7 * 86400

describe('patron pass', () => {
  it('takes a pass signed with the key and not yet expired', async () => {
    expect(await verifyPass(await sign({ sub: 'abc', tier: 'patron', exp }), NOW, pub)).toMatchObject({ sub: 'abc', tier: 'patron' })
  })

  it('refuses an expired pass', async () => {
    expect(await verifyPass(await sign({ sub: 'abc', exp: NOW / 1000 - 1 }), NOW, pub)).toBe(null)
  })

  it('refuses a pass whose payload was changed', async () => {
    const [head, , sig] = (await sign({ sub: 'abc', exp })).split('.')
    expect(await verifyPass(`${head}.${b64url(JSON.stringify({ sub: 'abc', exp: exp + 86400 * 365 }))}.${sig}`, NOW, pub)).toBe(null)
  })

  it('refuses another key\'s pass, another algorithm and plain junk', async () => {
    expect(await verifyPass(await sign({ sub: 'abc', exp }), NOW)).toBe(null)
    expect(await verifyPass(await sign({ sub: 'abc', exp }, 'none'), NOW, pub)).toBe(null)
    expect(await verifyPass('not-a-token', NOW, pub)).toBe(null)
  })
})

describe('admin password', () => {
  // SHA-256 of "open sesame".
  const hash = '41ef4bb0b23661e66301aac36066912dac037827b4ae63a7b1165a5aa93ed4eb'

  it('takes the password whose hash it holds, nothing else', async () => {
    expect(await isAdminPassword('open sesame', hash)).toBe(true)
    expect(await isAdminPassword('open sesame ', hash)).toBe(false)
    expect(await isAdminPassword('open sesame')).toBe(false)
  })
})
