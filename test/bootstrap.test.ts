import { describe, it, expect, beforeAll, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import { fetch as sigFetch } from '@hellocoop/httpsig'
import { computeJwkThumbprint, decodeJWTPayload } from '../src/crypto'

beforeAll(() => {
  if (!(globalThis as any).crypto) {
    ;(globalThis as any).crypto = webcrypto as unknown as Crypto
  }
})

// ── Test fixtures ──

async function makeSigningKeyJson(): Promise<string> {
  const kp = (await webcrypto.subtle.generateKey('Ed25519', true, ['sign', 'verify'])) as CryptoKeyPair
  const jwk = await webcrypto.subtle.exportKey('jwk', kp.privateKey)
  return JSON.stringify(jwk)
}

// In-memory KV that supports the expirationTtl option used by the AP. We
// don't simulate expiry here — every put just stores the value — but we
// do accept the option so the production code can pass it.
class InMemoryKV {
  private store = new Map<string, string>()
  async get(key: string, type?: 'json'): Promise<unknown> {
    const v = this.store.get(key)
    if (!v) return null
    return type === 'json' ? JSON.parse(v) : v
  }
  async put(key: string, value: string, _opts?: { expirationTtl?: number }): Promise<void> {
    this.store.set(key, value)
  }
  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }
}

async function makeEnv(): Promise<{ env: any; kv: InMemoryKV }> {
  const kv = new InMemoryKV()
  const env = {
    ORIGIN: 'https://playground.test',
    AGENT_NAME: 'test-agent',
    SIGNING_KEY: await makeSigningKeyJson(),
    WEBAUTHN_KV: kv,
  }
  return { env, kv }
}

async function loadApp() {
  vi.resetModules()
  const mod = await import('../src/index')
  return mod.default
}

// Generate a fresh ephemeral keypair (the agent's durable signing key).
// httpsig 2.0 requires the signing JWK to carry a fully-specified alg
// (RFC 9864); WebCrypto's exportKey does not set one.
async function makeEphemeralKeyPair(): Promise<{ publicJwk: JsonWebKey; privateJwk: JsonWebKey }> {
  const kp = (await webcrypto.subtle.generateKey('Ed25519', true, ['sign', 'verify'])) as CryptoKeyPair
  const publicJwk = { ...(await webcrypto.subtle.exportKey('jwk', kp.publicKey)), alg: 'Ed25519' }
  const privateJwk = await webcrypto.subtle.exportKey('jwk', kp.privateKey)
  return { publicJwk, privateJwk }
}

// Produce the headers a sig=hwk-signed POST carries — used to drive the
// AP endpoints from inside Hono's app.request() without spinning up a
// real HTTP server. We pass the public JWK as `signingKey` (so the
// embedded Signature-Key advertises the public key the receiver should
// use) and a CryptoKey for the actual signing.
async function signedHwkHeaders(
  url: string,
  body: string,
  publicJwk: JsonWebKey,
  privateJwk: JsonWebKey,
): Promise<Record<string, string>> {
  const components = body
    ? ['@method', '@authority', '@path', 'content-type', 'signature-key']
    : ['@method', '@authority', '@path', 'signature-key']
  const privKey = await webcrypto.subtle.importKey('jwk', privateJwk, { name: 'Ed25519' }, false, ['sign'])
  const dry = (await sigFetch(url, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body || undefined,
    signingKey: publicJwk,
    signingCryptoKey: privKey,
    signatureKey: { type: 'hwk' },
    components,
    dryRun: true,
  } as any)) as { headers: Headers }
  const out: Record<string, string> = {}
  dry.headers.forEach((v, k) => { out[k] = v })
  return out
}

// ── /bootstrap ──

describe('POST /bootstrap', () => {
  const TEST_URL = 'http://localhost/bootstrap'

  it('mints an agent_token bound to the hwk key', async () => {
    const app = await loadApp()
    const { env } = await makeEnv()
    const { publicJwk, privateJwk } = await makeEphemeralKeyPair()
    const body = JSON.stringify({ ps: 'https://ps.test' })
    const headers = await signedHwkHeaders(TEST_URL, body, publicJwk, privateJwk)

    const res = await app.request('/bootstrap', { method: 'POST', headers, body }, env)
    expect(res.status).toBe(200)
    const out = (await res.json()) as any
    expect(out.agent_token).toBeDefined()
    expect(out.agent_id).toMatch(/^aauth:[a-z0-9-]+@playground\.test$/)
    expect(out.expires_in).toBe(3600)
    expect(out.ps).toBe('https://ps.test')

    // Token should be bound to the caller's key (cnf.jwk = publicJwk
    // sans WebCrypto-inserted fields).
    const payload = decodeJWTPayload(out.agent_token)
    expect(payload.iss).toBe('https://playground.test')
    expect(payload.dwk).toBe('aauth-agent.json')
    expect(payload.sub).toBe(out.agent_id)
    expect(payload.ps).toBe('https://ps.test')
    const cnf = payload.cnf as { jwk: JsonWebKey }
    expect(cnf.jwk.kty).toBe(publicJwk.kty)
    expect(cnf.jwk.crv).toBe(publicJwk.crv)
    expect(cnf.jwk.x).toBe(publicJwk.x)
    // httpsig 2.0 verifiers require cnf.jwk to carry a fully-specified alg.
    expect((cnf.jwk as { alg?: string }).alg).toBe('Ed25519')
  })

  it('omits ps when none requested', async () => {
    const app = await loadApp()
    const { env } = await makeEnv()
    const { publicJwk, privateJwk } = await makeEphemeralKeyPair()
    const headers = await signedHwkHeaders(TEST_URL, '', publicJwk, privateJwk)
    const res = await app.request('/bootstrap', { method: 'POST', headers }, env)
    expect(res.status).toBe(200)
    const out = (await res.json()) as any
    expect(out.ps).toBeUndefined()
    const payload = decodeJWTPayload(out.agent_token)
    expect(payload.ps).toBeUndefined()
  })

  it('returns the same agent_id for the same key on repeat calls', async () => {
    const app = await loadApp()
    const { env } = await makeEnv()
    const { publicJwk, privateJwk } = await makeEphemeralKeyPair()
    const body = JSON.stringify({ ps: 'https://ps.test' })
    const h1 = await signedHwkHeaders(TEST_URL, body, publicJwk, privateJwk)
    const r1 = await app.request('/bootstrap', { method: 'POST', headers: h1, body }, env)
    expect(r1.status).toBe(200)
    const o1 = (await r1.json()) as any

    const h2 = await signedHwkHeaders(TEST_URL, body, publicJwk, privateJwk)
    const r2 = await app.request('/bootstrap', { method: 'POST', headers: h2, body }, env)
    expect(r2.status).toBe(200)
    const o2 = (await r2.json()) as any

    expect(o1.agent_id).toBe(o2.agent_id)
  })

  it('returns different agent_ids for different keys', async () => {
    const app = await loadApp()
    const { env } = await makeEnv()
    const a = await makeEphemeralKeyPair()
    const b = await makeEphemeralKeyPair()
    const body = JSON.stringify({})
    const ha = await signedHwkHeaders(TEST_URL, body, a.publicJwk, a.privateJwk)
    const hb = await signedHwkHeaders(TEST_URL, body, b.publicJwk, b.privateJwk)
    const ra = await app.request('/bootstrap', { method: 'POST', headers: ha, body }, env)
    const rb = await app.request('/bootstrap', { method: 'POST', headers: hb, body }, env)
    expect(((await ra.json()) as any).agent_id)
      .not.toBe(((await rb.json()) as any).agent_id)
  })

  it('persists the (jkt, name) mapping in KV', async () => {
    const app = await loadApp()
    const { env, kv } = await makeEnv()
    const { publicJwk, privateJwk } = await makeEphemeralKeyPair()
    const body = JSON.stringify({})
    const headers = await signedHwkHeaders(TEST_URL, body, publicJwk, privateJwk)
    const res = await app.request('/bootstrap', { method: 'POST', headers, body }, env)
    const out = (await res.json()) as any

    const jkt = await computeJwkThumbprint({
      kty: publicJwk.kty, crv: publicJwk.crv, x: publicJwk.x,
    } as JsonWebKey)
    const local = out.agent_id.split(':')[1].split('@')[0]
    expect(await kv.get(`agent:name:${jkt}`)).toBe(local)
    expect(await kv.get(`agent:key:${local}`)).toBe(jkt)
  })

  it('rejects an unsigned request', async () => {
    const app = await loadApp()
    const { env } = await makeEnv()
    const res = await app.request('/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }, env)
    expect(res.status).toBe(401)
  })

  it('rejects a non-HTTPS ps', async () => {
    const app = await loadApp()
    const { env } = await makeEnv()
    const { publicJwk, privateJwk } = await makeEphemeralKeyPair()
    const body = JSON.stringify({ ps: 'http://ps.test' })
    const headers = await signedHwkHeaders(TEST_URL, body, publicJwk, privateJwk)
    const res = await app.request('/bootstrap', { method: 'POST', headers, body }, env)
    expect(res.status).toBe(400)
  })
})

// ── /refresh ──

describe('POST /refresh', () => {
  const BOOTSTRAP_URL = 'http://localhost/bootstrap'
  const REFRESH_URL = 'http://localhost/refresh'

  it('returns a fresh agent_token under the same agent_id', async () => {
    const app = await loadApp()
    const { env } = await makeEnv()
    const { publicJwk, privateJwk } = await makeEphemeralKeyPair()

    // Bootstrap first to register the (jkt → name) mapping.
    const bsBody = JSON.stringify({ ps: 'https://ps.test' })
    const bsHeaders = await signedHwkHeaders(BOOTSTRAP_URL, bsBody, publicJwk, privateJwk)
    const bsRes = await app.request('/bootstrap', { method: 'POST', headers: bsHeaders, body: bsBody }, env)
    const bsOut = (await bsRes.json()) as any

    const rfBody = JSON.stringify({ ps: 'https://ps.test' })
    const rfHeaders = await signedHwkHeaders(REFRESH_URL, rfBody, publicJwk, privateJwk)
    const rfRes = await app.request('/refresh', { method: 'POST', headers: rfHeaders, body: rfBody }, env)
    expect(rfRes.status).toBe(200)
    const rfOut = (await rfRes.json()) as any

    expect(rfOut.agent_id).toBe(bsOut.agent_id)
    expect(rfOut.agent_token).not.toBe(bsOut.agent_token)
  })

  it('404s when the key is not enrolled', async () => {
    const app = await loadApp()
    const { env } = await makeEnv()
    const { publicJwk, privateJwk } = await makeEphemeralKeyPair()
    const headers = await signedHwkHeaders(REFRESH_URL, '', publicJwk, privateJwk)
    const res = await app.request('/refresh', { method: 'POST', headers }, env)
    expect(res.status).toBe(404)
  })
})

// ── /agent/forget ──

describe('POST /agent/forget', () => {
  const BOOTSTRAP_URL = 'http://localhost/bootstrap'
  const FORGET_URL = 'http://localhost/agent/forget'

  it('drops the (jkt, name) mapping so re-bootstrap mints a new name', async () => {
    const app = await loadApp()
    const { env } = await makeEnv()
    const { publicJwk, privateJwk } = await makeEphemeralKeyPair()

    const bsBody = JSON.stringify({})
    const bsHeaders1 = await signedHwkHeaders(BOOTSTRAP_URL, bsBody, publicJwk, privateJwk)
    const bs1 = (await (await app.request('/bootstrap', { method: 'POST', headers: bsHeaders1, body: bsBody }, env)).json()) as any

    const fHeaders = await signedHwkHeaders(FORGET_URL, '', publicJwk, privateJwk)
    const fRes = await app.request('/agent/forget', { method: 'POST', headers: fHeaders }, env)
    expect(fRes.status).toBe(200)

    const bsHeaders2 = await signedHwkHeaders(BOOTSTRAP_URL, bsBody, publicJwk, privateJwk)
    const bs2 = (await (await app.request('/bootstrap', { method: 'POST', headers: bsHeaders2, body: bsBody }, env)).json()) as any

    expect(bs2.agent_id).not.toBe(bs1.agent_id)
  })
})

// ── well-known: bootstrap_endpoint advertised ──

describe('AP metadata', () => {
  it('advertises bootstrap_endpoint at the simplified path', async () => {
    const app = await loadApp()
    const { env } = await makeEnv()
    const res = await app.request('/.well-known/aauth-agent.json', {}, env)
    const body = (await res.json()) as any
    expect(body.bootstrap_endpoint).toBe('https://playground.test/bootstrap')
    expect(body.refresh_endpoint).toBe('https://playground.test/refresh')
    // Removed legacy split endpoints.
    expect(body.bootstrap_verify_endpoint).toBeUndefined()
    expect(body.refresh_verify_endpoint).toBeUndefined()
  })
})
