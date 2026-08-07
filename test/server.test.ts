import { describe, it, expect, beforeAll, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import { fetch as sigFetch } from '@hellocoop/httpsig'
import { decodeJWTPayload } from '../src/crypto'

beforeAll(() => {
  if (!(globalThis as any).crypto) {
    ;(globalThis as any).crypto = webcrypto
  }
})

// ── Test fixtures ──

async function makeSigningKeyJson(): Promise<string> {
  const kp = await webcrypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']) as CryptoKeyPair
  const jwk = await webcrypto.subtle.exportKey('jwk', kp.privateKey)
  return JSON.stringify(jwk)
}

async function makeEphemeralPublicJwk(): Promise<JsonWebKey> {
  const kp = await webcrypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']) as CryptoKeyPair
  return await webcrypto.subtle.exportKey('jwk', kp.publicKey)
}

class InMemoryKV {
  private store = new Map<string, string>()
  async get(key: string, type?: 'json'): Promise<unknown> {
    const v = this.store.get(key)
    if (!v) return null
    return type === 'json' ? JSON.parse(v) : v
  }
  async put(key: string, value: string): Promise<void> {
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

// Import the app fresh; webauthn routes pull in @simplewebauthn/server which
// is fine in Node.
async function loadApp() {
  const mod = await import('../src/index')
  return mod.default
}

// ── Well-known endpoints ──

describe('GET /.well-known/aauth-agent.json', () => {
  it('returns issuer and endpoints derived from ORIGIN', async () => {
    const app = await loadApp()
    const { env } = await makeEnv()
    const res = await app.request('/.well-known/aauth-agent.json', {}, env)
    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.issuer).toBe('https://playground.test')
    expect(body.jwks_uri).toBe('https://playground.test/.well-known/jwks.json')
    expect(body.callback_endpoint).toBe('https://playground.test/callback')
    expect(body.login_endpoint).toBe('https://playground.test/login')
    expect(body.client_name).toBe('test-agent')
    expect(body.localhost_callback_allowed).toBe(true)
  })
})

describe('GET /.well-known/aauth-resource.json', () => {
  it('returns authorization_endpoint and scope descriptions', async () => {
    const app = await loadApp()
    const { env } = await makeEnv()
    const res = await app.request('/.well-known/aauth-resource.json', {}, env)
    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.issuer).toBe('https://playground.test')
    expect(body.authorization_endpoint).toBe('https://playground.test/authorize')
    // Resource scopes only — identity scopes belong to the PS and flow
    // as claims on the auth_token, not as resource scope strings.
    expect(body.scope_descriptions).toMatchObject({
      'playground.demo': expect.any(String),
    })
    expect(body.scope_descriptions.openid).toBeUndefined()
    expect(body.scope_descriptions.profile).toBeUndefined()
  })
})

describe('GET /.well-known/jwks.json', () => {
  it('returns a JWKS with the signing public key (no private material)', async () => {
    const app = await loadApp()
    const { env } = await makeEnv()
    const res = await app.request('/.well-known/jwks.json', {}, env)
    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.keys).toHaveLength(1)
    const key = body.keys[0]
    expect(key.kty).toBe('OKP')
    expect(key.crv).toBe('Ed25519')
    // Fully-specified alg required by httpsig 2.0 / RFC 9864 ('EdDSA' is
    // polymorphic and rejected).
    expect(key.alg).toBe('Ed25519')
    expect(key.x).toBeDefined()
    expect(key.kid).toBeDefined()
    expect(key.d).toBeUndefined()
    // Must declare verify (not sign) so strict verifiers like jose.importJWK accept it
    expect(key.key_ops).toEqual(['verify'])
    expect(key.ext).toBeUndefined()
  })
})

// Mint an agent_token signed by the env's SIGNING_KEY without going
// through any deleted legacy path. Used by /authorize tests to craft a
// valid token whose cnf.jwk matches an ephemeral we control.
async function mintAgentTokenForTest(env: any, opts?: { sub?: string; exp?: number }): Promise<{
  agentToken: string
  publicJwk: JsonWebKey
  privateJwk: JsonWebKey
}> {
  const { computeJwkThumbprint } = await import('../src/crypto')
  const kp = await webcrypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']) as CryptoKeyPair
  // httpsig 2.0 requires signing JWKs to carry a fully-specified alg
  // (RFC 9864); WebCrypto's exportKey does not set one.
  const publicJwk = { ...(await webcrypto.subtle.exportKey('jwk', kp.publicKey)), alg: 'Ed25519' }
  const privateJwk = { ...(await webcrypto.subtle.exportKey('jwk', kp.privateKey)), alg: 'Ed25519' }

  const serverJwk = JSON.parse(env.SIGNING_KEY)
  const serverKey = await webcrypto.subtle.importKey('jwk', serverJwk, { name: 'Ed25519' }, false, ['sign'])
  const { d: _d, key_ops: _ops, ext: _ext, ...serverPub } = serverJwk
  const serverKid = await computeJwkThumbprint(serverPub)

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'EdDSA', typ: 'aa-agent+jwt', kid: serverKid }
  const payload = {
    iss: env.ORIGIN,
    dwk: 'aauth-agent.json',
    sub: opts?.sub ?? 'aauth:test@playground.test',
    jti: `jti-${Math.random().toString(36).slice(2)}`,
    // httpsig 2.0 verifiers require cnf.jwk to carry a fully-specified alg.
    cnf: { jwk: { kty: publicJwk.kty, crv: publicJwk.crv, x: publicJwk.x, alg: 'Ed25519' } },
    iat: now,
    exp: opts?.exp ?? now + 3600,
  }
  const enc = new TextEncoder()
  const b64 = (bytes: Uint8Array) => {
    let s = ''
    for (const b of bytes) s += String.fromCharCode(b)
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }
  const headerB64 = b64(enc.encode(JSON.stringify(header)))
  const payloadB64 = b64(enc.encode(JSON.stringify(payload)))
  const sig = await webcrypto.subtle.sign('Ed25519', serverKey, enc.encode(`${headerB64}.${payloadB64}`))
  const agentToken = `${headerB64}.${payloadB64}.${b64(new Uint8Array(sig))}`

  return { agentToken, publicJwk, privateJwk }
}

// ── Authorize ──

describe('POST /authorize', () => {
  // The authority that app.request() constructs for the Request URL. Signing
  // must match so the server's httpsig verify sees the same value on the
  // @authority component.
  const TEST_URL = 'http://localhost/authorize'

  // Mint an agent_token + keep the full ephemeral keypair (private + public)
  // so we can sign RFC 9421 requests against /authorize. Bootstrap path is
  // now the only way, but for unit tests we cut out WebAuthn + PS and sign
  // the agent_token directly with the server's own SIGNING_KEY.
  const mintAgentTokenWithKey = async (_app: any, env: any, _kv: InMemoryKV) =>
    mintAgentTokenForTest(env, { sub: 'aauth:playground@playground.test' })

  // Produce the header map a signed POST /authorize request carries.
  async function signedHeaders(bodyJSON: string, agentToken: string, privateJwk: JsonWebKey): Promise<Record<string, string>> {
    const dry = await sigFetch(TEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyJSON,
      signingKey: privateJwk,
      signatureKey: { type: 'jwt', jwt: agentToken },
      components: ['@method', '@authority', '@path', 'content-type', 'signature-key'],
      dryRun: true,
    }) as { headers: Headers }
    const out: Record<string, string> = {}
    dry.headers.forEach((v, k) => { out[k] = v })
    return out
  }

  it('rejects missing required fields', async () => {
    const app = await loadApp()
    const { env, kv } = await makeEnv()
    const { agentToken, privateJwk } = await mintAgentTokenWithKey(app, env, kv)
    const body = JSON.stringify({ ps: 'https://ps.test' })
    const headers = await signedHeaders(body, agentToken, privateJwk)
    const res = await app.request('/authorize', { method: 'POST', headers, body }, env)
    expect(res.status).toBe(400)
  })

  it('rejects when Signature-Key header is missing', async () => {
    const app = await loadApp()
    const { env } = await makeEnv()
    const res = await app.request('/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ps: 'https://ps.test', scope: 'playground.demo' }),
    }, env)
    expect(res.status).toBe(401)
    expect((await res.json() as any).error).toMatch(/signature verification failed/i)
  })

  it('rejects invalid agent_token', async () => {
    const app = await loadApp()
    const { env } = await makeEnv()
    const res = await app.request('/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Signature-Key': 'sig=jwt;jwt="not.a.jwt"' },
      body: JSON.stringify({ ps: 'https://ps.test', scope: 'playground.demo' }),
    }, env)
    expect(res.status).toBe(401)
  })

  it('rejects when the httpsig is signed by a key other than the one in cnf.jwk', async () => {
    const app = await loadApp()
    const { env, kv } = await makeEnv()
    const { agentToken } = await mintAgentTokenWithKey(app, env, kv)
    // Sign with a DIFFERENT private key so the cnf.jwk → public key doesn't
    // verify the signature. This is the key guarantee full httpsig gives us
    // over the old JWT-only check.
    const attackerKp = await webcrypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']) as CryptoKeyPair
    const attackerPriv = { ...(await webcrypto.subtle.exportKey('jwk', attackerKp.privateKey)), alg: 'Ed25519' }
    const body = JSON.stringify({ ps: 'https://ps.test', scope: 'playground.demo' })
    const headers = await signedHeaders(body, agentToken, attackerPriv)
    const res = await app.request('/authorize', { method: 'POST', headers, body }, env)
    expect(res.status).toBe(401)
    expect((await res.json() as any).error).toMatch(/signature verification failed/i)
  })

  it('rejects non-HTTPS PS URL', async () => {
    const app = await loadApp()
    const { env, kv } = await makeEnv()
    const { agentToken, privateJwk } = await mintAgentTokenWithKey(app, env, kv)
    const body = JSON.stringify({ ps: 'http://ps.test', scope: 'playground.demo' })
    const headers = await signedHeaders(body, agentToken, privateJwk)
    const res = await app.request('/authorize', { method: 'POST', headers, body }, env)
    expect(res.status).toBe(400)
    expect((await res.json() as any).error).toMatch(/HTTPS/)
  })

  it('returns 502 when PS metadata fetch fails', async () => {
    const app = await loadApp()
    const { env, kv } = await makeEnv()
    const { agentToken, privateJwk } = await mintAgentTokenWithKey(app, env, kv)
    const body = JSON.stringify({ ps: 'https://ps.test', scope: 'playground.demo' })
    const headers = await signedHeaders(body, agentToken, privateJwk)
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 404 })))
    const res = await app.request('/authorize', { method: 'POST', headers, body }, env)
    expect(res.status).toBe(502)
    vi.unstubAllGlobals()
  })

  it('returns 502 when PS metadata is missing required fields', async () => {
    const app = await loadApp()
    const { env, kv } = await makeEnv()
    const { agentToken, privateJwk } = await mintAgentTokenWithKey(app, env, kv)
    const body = JSON.stringify({ ps: 'https://ps.test', scope: 'playground.demo' })
    const headers = await signedHeaders(body, agentToken, privateJwk)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ issuer: 'https://ps.test' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })))
    const res = await app.request('/authorize', { method: 'POST', headers, body }, env)
    expect(res.status).toBe(502)
    expect((await res.json() as any).error).toMatch(/missing required/)
    vi.unstubAllGlobals()
  })

  it('issues an aa-resource+jwt with correct claims when PS metadata is valid', async () => {
    const app = await loadApp()
    const { env, kv } = await makeEnv()
    const { agentToken, publicJwk, privateJwk } = await mintAgentTokenWithKey(app, env, kv)

    const psMetadata = {
      issuer: 'https://ps.test',
      token_endpoint: 'https://ps.test/token',
      jwks_uri: 'https://ps.test/.well-known/jwks.json',
    }
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      expect(url).toBe('https://ps.test/.well-known/aauth-person.json')
      return new Response(JSON.stringify(psMetadata), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }))

    const body = JSON.stringify({ ps: 'https://ps.test', scope: 'playground.demo' })
    const headers = await signedHeaders(body, agentToken, privateJwk)
    const res = await app.request('/authorize', { method: 'POST', headers, body }, env)

    expect(res.status).toBe(200)
    const resBody = await res.json() as any
    expect(resBody.ps_metadata).toEqual(psMetadata)
    expect(resBody.ps_metadata_url).toBe('https://ps.test/.well-known/aauth-person.json')
    expect(resBody.resource_token).toBeDefined()

    const payload = decodeJWTPayload(resBody.resource_token)
    expect(payload.iss).toBe('https://playground.test')
    expect(payload.dwk).toBe('aauth-resource.json')
    expect(payload.aud).toBe('https://ps.test')
    expect(payload.scope).toBe('playground.demo')
    expect(payload.agent).toBe('aauth:playground@playground.test')
    expect(payload.agent_jkt).toBeDefined()
    expect(payload.exp as number).toBe((payload.iat as number) + 300)

    // agent_jkt must be the RFC 7638 thumbprint of the ephemeral JWK
    const { computeJwkThumbprint } = await import('../src/crypto')
    expect(payload.agent_jkt).toBe(await computeJwkThumbprint(publicJwk))

    vi.unstubAllGlobals()
  })

  it('rejects unknown scopes with 400 invalid_scope', async () => {
    const app = await loadApp()
    const { env, kv } = await makeEnv()
    const { agentToken, privateJwk } = await mintAgentTokenWithKey(app, env, kv)
    // Typo'd resource scope — neither in SCOPE_DESCRIPTIONS nor in
    // PS_IDENTITY_SCOPES — is the only thing that should still 400.
    const body = JSON.stringify({
      ps: 'https://ps.test',
      scope: 'playground.demo playground.typo',
    })
    const headers = await signedHeaders(body, agentToken, privateJwk)
    const res = await app.request('/authorize', { method: 'POST', headers, body }, env)
    expect(res.status).toBe(400)
    const resBody = await res.json() as any
    expect(resBody.error).toBe('invalid_scope')
    expect(resBody.unknown).toEqual(['playground.typo'])
  })

  it('passes PS identity scopes through to resource_token.scope', async () => {
    // Per aauth-claims-plan v3 §4.2 the resource server MUST pass
    // identity scopes through unmodified — the PS classifies them at
    // /aauth/token time.
    const app = await loadApp()
    const { env, kv } = await makeEnv()
    const { agentToken, privateJwk } = await mintAgentTokenWithKey(app, env, kv)

    const psMetadata = {
      issuer: 'https://ps.test',
      token_endpoint: 'https://ps.test/token',
      jwks_uri: 'https://ps.test/.well-known/jwks.json',
    }
    vi.stubGlobal('fetch', vi.fn(async () => {
      return new Response(JSON.stringify(psMetadata), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }))

    const body = JSON.stringify({
      ps: 'https://ps.test',
      scope: 'openid profile playground.demo',
    })
    const headers = await signedHeaders(body, agentToken, privateJwk)
    const res = await app.request('/authorize', { method: 'POST', headers, body }, env)
    expect(res.status).toBe(200)
    const resBody = await res.json() as any
    // scope on the resource_token carries the agent's request verbatim.
    expect(resBody.resource_token_decoded.scope).toBe(
      'openid profile playground.demo',
    )
    vi.unstubAllGlobals()
  })
})
