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

// ── Token fixtures ──

const enc = new TextEncoder()
const b64 = (bytes: Uint8Array) => {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function signJwtWith(
  header: Record<string, string>,
  payload: Record<string, unknown>,
  privateKey: CryptoKey,
): Promise<string> {
  const headerB64 = b64(enc.encode(JSON.stringify(header)))
  const payloadB64 = b64(enc.encode(JSON.stringify(payload)))
  const sig = await webcrypto.subtle.sign('Ed25519', privateKey, enc.encode(`${headerB64}.${payloadB64}`))
  return `${headerB64}.${payloadB64}.${b64(new Uint8Array(sig))}`
}

// The agent's own signing key. Its public half goes in the cnf of every
// token issued to this agent; its private half signs the HTTP requests.
async function makeAgentKey(): Promise<{ publicJwk: JsonWebKey; privateJwk: JsonWebKey }> {
  const kp = await webcrypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']) as CryptoKeyPair
  const publicJwk = await webcrypto.subtle.exportKey('jwk', kp.publicKey)
  publicJwk.alg = 'Ed25519'
  const privateJwk = await webcrypto.subtle.exportKey('jwk', kp.privateKey)
  privateJwk.alg = 'Ed25519'
  return { publicJwk, privateJwk }
}

// A stand-in Person Server: its own Ed25519 key, a metadata document at
// /.well-known/aauth-person.json, a JWKS, and the ability to mint person
// tokens. `install()` stubs global fetch so the worker's key discovery
// (iss + dwk → metadata → jwks_uri → JWKS) resolves against it.
const PS_ORIGIN = 'https://ps.test'

async function makePersonServer(overrides?: Record<string, unknown>) {
  const { computeJwkThumbprint } = await import('../src/crypto')
  const kp = await webcrypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']) as CryptoKeyPair
  const publicJwk = await webcrypto.subtle.exportKey('jwk', kp.publicKey)
  const { key_ops: _ops, ext: _ext, ...pub } = publicJwk as any
  const kid = await computeJwkThumbprint(pub)
  const jwksKey = { ...pub, alg: 'Ed25519', key_ops: ['verify'], kid }

  const metadata: Record<string, unknown> = {
    issuer: PS_ORIGIN,
    // -11 renamed `token_endpoint` to `auth_token_endpoint` and added
    // `person_token_endpoint`.
    auth_token_endpoint: `${PS_ORIGIN}/token`,
    person_token_endpoint: `${PS_ORIGIN}/person`,
    jwks_uri: `${PS_ORIGIN}/.well-known/jwks.json`,
    ...overrides,
  }

  return {
    metadata,
    // Mint an aa-person+jwt for `aud`, bound to the agent's key.
    async mintPersonToken(opts: {
      aud: string
      agentPublicJwk: JsonWebKey
      sub?: string
      jti?: string
      missionS256?: string
      tenant?: string
      typ?: string
      dwk?: string
      exp?: number
      // Extra claims, for minting the auth-token shape from the same PS
      // key — an auth token differs from a person token only in `typ`
      // plus what authorization it carries.
      extra?: Record<string, unknown>
    }): Promise<string> {
      const now = Math.floor(Date.now() / 1000)
      const payload: Record<string, unknown> = {
        iss: PS_ORIGIN,
        dwk: opts.dwk ?? 'aauth-person.json',
        aud: opts.aud,
        sub: opts.sub ?? '8f14e45fceea167a5a36dedd4bea2543',
        jti: opts.jti ?? 'pt-3ab910',
        cnf: {
          jwk: {
            kty: opts.agentPublicJwk.kty,
            crv: opts.agentPublicJwk.crv,
            x: opts.agentPublicJwk.x,
            alg: 'Ed25519',
          },
        },
        iat: now,
        exp: opts.exp ?? now + 3600,
      }
      if (opts.missionS256) payload.mission_s256 = opts.missionS256
      if (opts.tenant) payload.tenant = opts.tenant
      Object.assign(payload, opts.extra ?? {})
      return signJwtWith(
        { alg: 'Ed25519', typ: opts.typ ?? 'aa-person+jwt', kid },
        payload,
        kp.privateKey,
      )
    },
    // Serve the PS's metadata + JWKS to the worker's fetch calls.
    install() {
      vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        if (url === `${PS_ORIGIN}/.well-known/aauth-person.json`) {
          return new Response(JSON.stringify(metadata), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        if (url === metadata.jwks_uri) {
          return new Response(JSON.stringify({ keys: [jwksKey] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        return new Response('not found', { status: 404 })
      }))
    },
  }
}

// Mint an agent_token signed by the env's SIGNING_KEY. Under -11 this is
// NOT accepted at /authorize — the test that presents one asserts the
// requirement=person-token challenge.
async function mintAgentTokenForTest(env: any, agentPublicJwk: JsonWebKey): Promise<string> {
  const { computeJwkThumbprint } = await import('../src/crypto')
  const serverJwk = JSON.parse(env.SIGNING_KEY)
  const serverKey = await webcrypto.subtle.importKey('jwk', serverJwk, { name: 'Ed25519' }, false, ['sign'])
  const { d: _d, key_ops: _ops, ext: _ext, ...serverPub } = serverJwk
  const serverKid = await computeJwkThumbprint(serverPub)

  const now = Math.floor(Date.now() / 1000)
  return signJwtWith(
    { alg: 'Ed25519', typ: 'aa-agent+jwt', kid: serverKid },
    {
      iss: env.ORIGIN,
      dwk: 'aauth-agent.json',
      sub: 'aauth:playground@playground.test',
      jti: `jti-${Math.random().toString(36).slice(2)}`,
      // cnf.jwk must carry alg — httpsig 2.0 takes the verification
      // algorithm from the JWK and rejects a key without one.
      cnf: { jwk: { kty: agentPublicJwk.kty, crv: agentPublicJwk.crv, x: agentPublicJwk.x, alg: 'Ed25519' } },
      iat: now,
      exp: now + 3600,
    },
    serverKey,
  )
}

// ── Authorize ──
//
// Under AAuth -11 the agent presents a PERSON token in Signature-Key at
// the authorization endpoint. The request body carries only `scope` — the
// person server is the person token's `iss`, not a body parameter.

describe('POST /authorize', () => {
  // The authority that app.request() constructs for the Request URL. Signing
  // must match so the server's httpsig verify sees the same value on the
  // @authority component.
  const TEST_URL = 'http://localhost/authorize'
  const MISSION = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'

  // Produce the header map a signed POST /authorize request carries.
  async function signedHeaders(bodyJSON: string, jwt: string, privateJwk: JsonWebKey): Promise<Record<string, string>> {
    const dry = await sigFetch(TEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyJSON,
      signingKey: privateJwk,
      signatureKey: { type: 'jwt', jwt },
      components: ['@method', '@authority', '@path', 'content-type', 'signature-key'],
      dryRun: true,
    }) as { headers: Headers }
    const out: Record<string, string> = {}
    dry.headers.forEach((v, k) => { out[k] = v })
    return out
  }

  // The common setup: an agent key, a PS serving its metadata + JWKS, and
  // a person token for this resource bound to the agent's key. The mission
  // rides along on every request so the copy-through is exercised
  // throughout, not in one isolated case.
  async function setup(opts?: {
    aud?: string
    missionS256?: string | null
    tenant?: string
    metadata?: Record<string, unknown>
  }) {
    const app = await loadApp()
    const { env } = await makeEnv()
    const agent = await makeAgentKey()
    const ps = await makePersonServer(opts?.metadata)
    ps.install()
    const personToken = await ps.mintPersonToken({
      aud: opts?.aud ?? env.ORIGIN,
      agentPublicJwk: agent.publicJwk,
      missionS256: opts?.missionS256 === null ? undefined : (opts?.missionS256 ?? MISSION),
      tenant: opts?.tenant,
    })
    return { app, env, agent, ps, personToken }
  }

  async function post(app: any, env: any, bodyObj: unknown, jwt: string, privateJwk: JsonWebKey) {
    const body = JSON.stringify(bodyObj)
    const headers = await signedHeaders(body, jwt, privateJwk)
    return app.request('/authorize', { method: 'POST', headers, body }, env)
  }

  it('rejects a missing scope', async () => {
    const { app, env, agent, personToken } = await setup()
    const res = await post(app, env, {}, personToken, agent.privateJwk)
    expect(res.status).toBe(400)
    vi.unstubAllGlobals()
  })

  it('challenges with requirement=person-token when Signature-Key is missing', async () => {
    const app = await loadApp()
    const { env } = await makeEnv()
    const res = await app.request('/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'playground.demo' }),
    }, env)
    expect(res.status).toBe(401)
    expect(res.headers.get('AAuth-Requirement')).toBe('requirement=person-token')
  })

  it('challenges with requirement=person-token when an agent token is presented', async () => {
    const app = await loadApp()
    const { env } = await makeEnv()
    const agent = await makeAgentKey()
    const agentToken = await mintAgentTokenForTest(env, agent.publicJwk)
    const res = await post(app, env, { scope: 'playground.demo' }, agentToken, agent.privateJwk)
    expect(res.status).toBe(401)
    expect(res.headers.get('AAuth-Requirement')).toBe('requirement=person-token')
  })

  it('rejects a malformed token in Signature-Key', async () => {
    const app = await loadApp()
    const { env } = await makeEnv()
    const res = await app.request('/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Signature-Key': 'sig=jwt;jwt="not.a.jwt"' },
      body: JSON.stringify({ scope: 'playground.demo' }),
    }, env)
    expect(res.status).toBe(401)
  })

  it('rejects when the httpsig is signed by a key other than the one in cnf.jwk', async () => {
    const { app, env, personToken } = await setup()
    // Sign with a DIFFERENT private key so the cnf.jwk → public key doesn't
    // verify the signature. This is the key guarantee full httpsig gives us
    // over the old JWT-only check.
    const attacker = await makeAgentKey()
    const res = await post(app, env, { scope: 'playground.demo' }, personToken, attacker.privateJwk)
    expect(res.status).toBe(401)
    expect((await res.json() as any).error).toMatch(/signature verification failed/i)
    vi.unstubAllGlobals()
  })

  it('rejects a person token whose aud is a different resource', async () => {
    const { app, env, agent, personToken } = await setup({ aud: 'https://other.test' })
    const res = await post(app, env, { scope: 'playground.demo' }, personToken, agent.privateJwk)
    expect(res.status).toBe(400)
    const resBody = await res.json() as any
    expect(resBody.error).toBe('invalid_person_token')
    expect(resBody.detail).toMatch(/aud/)
    vi.unstubAllGlobals()
  })

  it('rejects a person token carrying the wrong dwk', async () => {
    const app = await loadApp()
    const { env } = await makeEnv()
    const agent = await makeAgentKey()
    const ps = await makePersonServer()
    ps.install()
    const token = await ps.mintPersonToken({
      aud: env.ORIGIN,
      agentPublicJwk: agent.publicJwk,
      dwk: 'aauth-agent.json',
    })
    const res = await post(app, env, { scope: 'playground.demo' }, token, agent.privateJwk)
    expect(res.status).toBe(400)
    expect((await res.json() as any).error).toBe('invalid_person_token')
    vi.unstubAllGlobals()
  })

  it('rejects an expired person token', async () => {
    const app = await loadApp()
    const { env } = await makeEnv()
    const agent = await makeAgentKey()
    const ps = await makePersonServer()
    ps.install()
    const token = await ps.mintPersonToken({
      aud: env.ORIGIN,
      agentPublicJwk: agent.publicJwk,
      exp: Math.floor(Date.now() / 1000) - 10,
    })
    const res = await post(app, env, { scope: 'playground.demo' }, token, agent.privateJwk)
    expect(res.status).toBe(400)
    expect((await res.json() as any).detail).toMatch(/expired/)
    vi.unstubAllGlobals()
  })

  it('rejects a person token when the PS metadata is unreachable', async () => {
    const app = await loadApp()
    const { env } = await makeEnv()
    const agent = await makeAgentKey()
    const ps = await makePersonServer()
    const token = await ps.mintPersonToken({ aud: env.ORIGIN, agentPublicJwk: agent.publicJwk })
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 404 })))
    const res = await post(app, env, { scope: 'playground.demo' }, token, agent.privateJwk)
    expect(res.status).toBe(400)
    expect((await res.json() as any).error).toBe('invalid_person_token')
    vi.unstubAllGlobals()
  })

  it('returns 502 when PS metadata lacks auth_token_endpoint', async () => {
    // -10 called this field `token_endpoint`; a PS still publishing the old
    // name cannot tell the agent where to place its token request.
    const { app, env, agent, personToken } = await setup({
      metadata: { auth_token_endpoint: undefined, token_endpoint: `${PS_ORIGIN}/token` },
    })
    const res = await post(app, env, { scope: 'playground.demo' }, personToken, agent.privateJwk)
    expect(res.status).toBe(502)
    expect((await res.json() as any).error).toMatch(/auth_token_endpoint/)
    vi.unstubAllGlobals()
  })

  it('issues an aa-resource+jwt carrying ps, sub, person_token_jti and mission_s256', async () => {
    const { app, env, agent, ps, personToken } = await setup()
    const res = await post(app, env, { scope: 'playground.demo' }, personToken, agent.privateJwk)

    expect(res.status).toBe(200)
    const resBody = await res.json() as any
    expect(resBody.ps_metadata).toEqual(ps.metadata)
    expect(resBody.ps_metadata_url).toBe('https://ps.test/.well-known/aauth-person.json')
    expect(resBody.resource_token).toBeDefined()

    const { decodeJWTHeader, computeJwkThumbprint } = await import('../src/crypto')
    // Fully-specified alg — never the polymorphic EdDSA.
    const header = decodeJWTHeader(resBody.resource_token)
    expect(header.alg).toBe('Ed25519')
    expect(header.typ).toBe('aa-resource+jwt')

    const payload = decodeJWTPayload(resBody.resource_token)
    expect(payload.iss).toBe('https://playground.test')
    expect(payload.dwk).toBe('aauth-resource.json')
    expect(payload.aud).toBe('https://ps.test')
    expect(payload.scope).toBe('playground.demo')
    expect(payload.exp as number).toBe((payload.iat as number) + 300)

    // The -11 claims, copied from the verified person token.
    expect(payload.ps).toBe('https://ps.test')
    expect(payload.sub).toBe('8f14e45fceea167a5a36dedd4bea2543')
    expect(payload.person_token_jti).toBe('pt-3ab910')
    expect(payload.mission_s256).toBe(MISSION)
    // -11 removed the agent identifier from the resource token.
    expect(payload.agent).toBeUndefined()
    // agent_jkt stays: the RFC 7638 thumbprint of the agent's signing key.
    expect(payload.agent_jkt).toBe(await computeJwkThumbprint(agent.publicJwk))

    vi.unstubAllGlobals()
  })

  it('clamps the resource token exp to the person token exp', async () => {
    // The person token is itself clamped to the mission's expires_at, so
    // never outliving it keeps a mission-scoped resource token inside the
    // mission's window without the resource knowing the mission.
    const app = await loadApp()
    const { env } = await makeEnv()
    const agent = await makeAgentKey()
    const ps = await makePersonServer()
    ps.install()
    const shortExp = Math.floor(Date.now() / 1000) + 60
    const token = await ps.mintPersonToken({
      aud: env.ORIGIN,
      agentPublicJwk: agent.publicJwk,
      missionS256: MISSION,
      exp: shortExp,
    })
    const res = await post(app, env, { scope: 'playground.demo' }, token, agent.privateJwk)
    expect(res.status).toBe(200)
    const payload = decodeJWTPayload((await res.json() as any).resource_token)
    expect(payload.exp).toBe(shortExp)
    vi.unstubAllGlobals()
  })

  it('copies tenant from the person token', async () => {
    // §Resource Token Verification step 6: the PS checks ps, sub,
    // mission_s256 AND tenant against the person token it issued,
    // "rejecting the resource token on any mismatch or omission". For a
    // person who has a tenant, omitting it fails the whole exchange.
    const { app, env, agent, personToken } = await setup({ tenant: 'acme.example' })
    const res = await post(app, env, { scope: 'playground.demo' }, personToken, agent.privateJwk)
    expect(res.status).toBe(200)
    const resBody = await res.json() as any
    expect(decodeJWTPayload(resBody.resource_token).tenant).toBe('acme.example')
    vi.unstubAllGlobals()
  })

  it('omits tenant when the person token carried none', async () => {
    const { app, env, agent, personToken } = await setup()
    const res = await post(app, env, { scope: 'playground.demo' }, personToken, agent.privateJwk)
    expect(res.status).toBe(200)
    const resBody = await res.json() as any
    expect(decodeJWTPayload(resBody.resource_token).tenant).toBeUndefined()
    vi.unstubAllGlobals()
  })

  it('omits mission_s256 when the person token carried none', async () => {
    const { app, env, agent, personToken } = await setup({ missionS256: null })
    const res = await post(app, env, { scope: 'playground.demo' }, personToken, agent.privateJwk)
    expect(res.status).toBe(200)
    const resBody = await res.json() as any
    expect(decodeJWTPayload(resBody.resource_token).mission_s256).toBeUndefined()
    vi.unstubAllGlobals()
  })

  it('ignores a ps body parameter — the person token iss is the person server', async () => {
    // -11 dropped `ps` from the request. A stale agent that still sends it
    // must not be able to redirect the resource token's audience.
    const { app, env, agent, personToken } = await setup()
    const res = await post(
      app, env, { ps: 'https://attacker.test', scope: 'playground.demo' }, personToken, agent.privateJwk,
    )
    expect(res.status).toBe(200)
    const resBody = await res.json() as any
    expect(resBody.resource_token_decoded.ps).toBe(PS_ORIGIN)
    expect(resBody.resource_token_decoded.aud).toBe(PS_ORIGIN)
    vi.unstubAllGlobals()
  })

  it('rejects unknown scopes with 400 invalid_scope', async () => {
    const { app, env, agent, personToken } = await setup()
    // Typo'd resource scope — neither in SCOPE_DESCRIPTIONS nor in
    // PS_IDENTITY_SCOPES — is the only thing that should still 400.
    const res = await post(
      app, env, { scope: 'playground.demo playground.typo' }, personToken, agent.privateJwk,
    )
    expect(res.status).toBe(400)
    const resBody = await res.json() as any
    expect(resBody.error).toBe('invalid_scope')
    expect(resBody.unknown).toEqual(['playground.typo'])
    vi.unstubAllGlobals()
  })

  it('passes PS identity scopes through to resource_token.scope', async () => {
    // Per aauth-claims-plan v3 §4.2 the resource server MUST pass
    // identity scopes through unmodified — the PS classifies them at
    // auth-token time.
    const { app, env, agent, personToken } = await setup()
    const res = await post(
      app, env, { scope: 'openid profile playground.demo' }, personToken, agent.privateJwk,
    )
    expect(res.status).toBe(200)
    const resBody = await res.json() as any
    // scope on the resource_token carries the agent's request verbatim.
    expect(resBody.resource_token_decoded.scope).toBe('openid profile playground.demo')
    vi.unstubAllGlobals()
  })
})

// ── Resource API: /api/demo ──
//
// The endpoint gated by `playground.demo`, reached with an auth token.
// A person token and a PS-issued auth token are near-identical — same
// iss, dwk, aud, sub, cnf — so `typ` is the whole of what separates a
// credential that carries authorization from one that carries none.

describe('GET /api/demo', () => {
  const TEST_URL = 'http://localhost/api/demo'

  async function signedGet(app: any, env: any, jwt: string, privateJwk: JsonWebKey) {
    const dry = await sigFetch(TEST_URL, {
      method: 'GET',
      signingKey: privateJwk,
      signatureKey: { type: 'jwt', jwt },
      components: ['@method', '@authority', '@path', 'signature-key'],
      dryRun: true,
    }) as { headers: Headers }
    const headers: Record<string, string> = {}
    dry.headers.forEach((v, k) => { headers[k] = v })
    return app.request('/api/demo', { method: 'GET', headers }, env)
  }

  it('serves an aa-auth+jwt carrying playground.demo', async () => {
    const app = await loadApp()
    const { env } = await makeEnv()
    const agent = await makeAgentKey()
    const ps = await makePersonServer()
    ps.install()
    const authToken = await ps.mintPersonToken({
      aud: env.ORIGIN,
      agentPublicJwk: agent.publicJwk,
      typ: 'aa-auth+jwt',
      extra: { scope: 'openid playground.demo', name: 'Ada' },
    })
    const res = await signedGet(app, env, authToken, agent.privateJwk)
    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.hello).toBe('Ada')
    expect(body.granted_scopes).toContain('playground.demo')
    vi.unstubAllGlobals()
  })

  it('rejects an aa-person+jwt where an auth token is required', async () => {
    // "A recipient MUST reject an aa-person+jwt wherever an auth token is
    // required" (§Person Token Verification). Everything else about this
    // token checks out — signature, issuer, aud, cnf — so without the typ
    // check the request would reach the scope gate and read as a mere
    // insufficient_scope 403 rather than the wrong kind of credential.
    const app = await loadApp()
    const { env } = await makeEnv()
    const agent = await makeAgentKey()
    const ps = await makePersonServer()
    ps.install()
    const personToken = await ps.mintPersonToken({
      aud: env.ORIGIN,
      agentPublicJwk: agent.publicJwk,
    })
    const res = await signedGet(app, env, personToken, agent.privateJwk)
    expect(res.status).toBe(401)
    expect((await res.json() as any).error).toMatch(/aa-person\+jwt/)
    vi.unstubAllGlobals()
  })

  it('rejects an aa-agent+jwt where an auth token is required', async () => {
    const app = await loadApp()
    const { env } = await makeEnv()
    const agent = await makeAgentKey()
    const ps = await makePersonServer()
    ps.install()
    const agentShaped = await ps.mintPersonToken({
      aud: env.ORIGIN,
      agentPublicJwk: agent.publicJwk,
      typ: 'aa-agent+jwt',
      extra: { scope: 'playground.demo' },
    })
    const res = await signedGet(app, env, agentShaped, agent.privateJwk)
    expect(res.status).toBe(401)
    vi.unstubAllGlobals()
  })
})
