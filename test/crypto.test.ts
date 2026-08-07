import { describe, it, expect, beforeAll } from 'vitest'
import { webcrypto } from 'node:crypto'
import {
  base64urlEncode,
  base64urlDecode,
  importSigningKey,
  getPublicJWK,
  computeJwkThumbprint,
  signJWT,
  generateJTI,
  decodeJWTPayload,
} from '../src/crypto'

// Make Web Crypto available as a global for the module under test.
beforeAll(() => {
  if (!(globalThis as any).crypto) {
    ;(globalThis as any).crypto = webcrypto
  }
})

// Generate a stable Ed25519 key once for the suite.
let signingKeyJson: string

beforeAll(async () => {
  const kp = await webcrypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']) as CryptoKeyPair
  const jwk = await webcrypto.subtle.exportKey('jwk', kp.privateKey)
  signingKeyJson = JSON.stringify(jwk)
})

describe('base64url', () => {
  it('round-trips arbitrary bytes', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255])
    const encoded = base64urlEncode(bytes)
    expect(encoded).not.toContain('+')
    expect(encoded).not.toContain('/')
    expect(encoded).not.toContain('=')
    const decoded = base64urlDecode(encoded)
    expect(Array.from(decoded)).toEqual(Array.from(bytes))
  })

  it('handles empty input', () => {
    expect(base64urlEncode(new Uint8Array())).toBe('')
    expect(base64urlDecode('')).toEqual(new Uint8Array())
  })

  it('decodes input without padding', () => {
    // "hello" -> aGVsbG8 (no padding)
    const decoded = base64urlDecode('aGVsbG8')
    expect(new TextDecoder().decode(decoded)).toBe('hello')
  })
})

describe('generateJTI', () => {
  it('returns a base64url string of expected length', () => {
    const jti = generateJTI()
    // 16 random bytes → 22 base64url chars (no padding)
    expect(jti).toHaveLength(22)
    expect(jti).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('produces unique values', () => {
    const set = new Set(Array.from({ length: 100 }, () => generateJTI()))
    expect(set.size).toBe(100)
  })
})

describe('computeJwkThumbprint', () => {
  it('produces a 43-char SHA-256 base64url thumbprint', async () => {
    const jwk = {
      kty: 'OKP',
      crv: 'Ed25519',
      x: 'Hf8svifsJ7N3rWuXZF4qFv8aS6JxKtHKQg5cFv7SOZw',
    }
    const thumbprint = await computeJwkThumbprint(jwk as JsonWebKey)
    expect(thumbprint).toHaveLength(43)
    expect(thumbprint).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('is deterministic for the same key', async () => {
    const jwk = {
      kty: 'OKP',
      crv: 'Ed25519',
      x: 'Hf8svifsJ7N3rWuXZF4qFv8aS6JxKtHKQg5cFv7SOZw',
    } as JsonWebKey
    const a = await computeJwkThumbprint(jwk)
    const b = await computeJwkThumbprint(jwk)
    expect(a).toBe(b)
  })

  it('ignores non-required members (RFC 7638)', async () => {
    const base = {
      kty: 'OKP',
      crv: 'Ed25519',
      x: 'Hf8svifsJ7N3rWuXZF4qFv8aS6JxKtHKQg5cFv7SOZw',
    } as JsonWebKey
    const withExtras = { ...base, kid: 'some-kid', use: 'sig', alg: 'EdDSA' } as JsonWebKey
    expect(await computeJwkThumbprint(base)).toBe(await computeJwkThumbprint(withExtras))
  })

  it('differs for different keys', async () => {
    const a = await computeJwkThumbprint({
      kty: 'OKP',
      crv: 'Ed25519',
      x: 'Hf8svifsJ7N3rWuXZF4qFv8aS6JxKtHKQg5cFv7SOZw',
    } as JsonWebKey)
    const b = await computeJwkThumbprint({
      kty: 'OKP',
      crv: 'Ed25519',
      x: '11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo',
    } as JsonWebKey)
    expect(a).not.toBe(b)
  })
})

describe('getPublicJWK', () => {
  it('strips private key material and adds kid', async () => {
    const publicJwk = await getPublicJWK(signingKeyJson)
    expect(publicJwk.kty).toBe('OKP')
    expect(publicJwk.crv).toBe('Ed25519')
    // httpsig 2.0 / RFC 9864: published JWKs carry a fully-specified alg.
    expect(publicJwk.alg).toBe('Ed25519')
    expect(publicJwk.x).toBeDefined()
    expect((publicJwk as any).d).toBeUndefined()
    expect(publicJwk.kid).toBeDefined()
    expect(publicJwk.kid).toHaveLength(43)
  })

  it('kid matches RFC 7638 thumbprint of the public key', async () => {
    const publicJwk = await getPublicJWK(signingKeyJson)
    const expected = await computeJwkThumbprint({
      kty: publicJwk.kty,
      crv: publicJwk.crv,
      x: publicJwk.x,
    } as JsonWebKey)
    expect(publicJwk.kid).toBe(expected)
  })

  it('declares key_ops as ["verify"] (not the private-half "sign")', async () => {
    // Regression test: WebCrypto exports private JWKs with key_ops: ["sign"];
    // when stripped of `d` to make a "public" JWK, that op leaks through and
    // breaks strict verifiers (e.g. jose.importJWK rejects with "Unsupported
    // key usage for an Ed25519 key"). Public JWKS entries must declare verify.
    const publicJwk = await getPublicJWK(signingKeyJson)
    expect(publicJwk.key_ops).toEqual(['verify'])
  })

  it('omits the WebCrypto-internal "ext" flag', async () => {
    const publicJwk = await getPublicJWK(signingKeyJson)
    expect((publicJwk as any).ext).toBeUndefined()
  })

  it('produces a JWK that strict verifiers can import for verification', async () => {
    // Simulate what jose.importJWK does: hand the JWK directly to WebCrypto
    // with usage ['verify']. If key_ops conflicts, this throws.
    const publicJwk = await getPublicJWK(signingKeyJson)
    const { kid: _kid, ...importable } = publicJwk
    await expect(
      webcrypto.subtle.importKey('jwk', importable as JsonWebKey, { name: 'Ed25519' }, false, ['verify'])
    ).resolves.toBeDefined()
  })
})

describe('importSigningKey', () => {
  it('imports a private Ed25519 JWK as a sign-only CryptoKey', async () => {
    const key = await importSigningKey(signingKeyJson)
    expect(key.type).toBe('private')
    expect(key.usages).toContain('sign')
    expect(key.extractable).toBe(false)
  })
})

describe('signJWT + decodeJWTPayload', () => {
  it('produces a verifiable three-part JWT', async () => {
    const privateKey = await importSigningKey(signingKeyJson)
    const publicJwk = await getPublicJWK(signingKeyJson)

    const header = { alg: 'EdDSA', typ: 'aa-agent+jwt', kid: publicJwk.kid }
    const payload = {
      iss: 'https://example.test',
      sub: 'aauth:test@example.test',
      jti: generateJTI(),
      iat: 1700000000,
      exp: 1700003600,
    }

    const jwt = await signJWT(header, payload, privateKey)
    const parts = jwt.split('.')
    expect(parts).toHaveLength(3)

    // Verify with the public key
    const verifyKey = await webcrypto.subtle.importKey(
      'jwk',
      { kty: publicJwk.kty, crv: publicJwk.crv, x: publicJwk.x } as JsonWebKey,
      { name: 'Ed25519' },
      false,
      ['verify']
    )
    const sig = base64urlDecode(parts[2])
    const ok = await webcrypto.subtle.verify(
      'Ed25519',
      verifyKey,
      sig,
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    )
    expect(ok).toBe(true)
  })

  it('decodeJWTPayload round-trips the payload', async () => {
    const privateKey = await importSigningKey(signingKeyJson)
    const payload = {
      iss: 'https://example.test',
      sub: 'aauth:test@example.test',
      cnf: { jwk: { kty: 'OKP', crv: 'Ed25519', x: 'abc' } },
      iat: 1700000000,
      exp: 1700003600,
    }
    const jwt = await signJWT({ alg: 'EdDSA', typ: 'aa-agent+jwt', kid: 'k' }, payload, privateKey)
    const decoded = decodeJWTPayload(jwt)
    expect(decoded).toEqual(payload)
  })

  it('decodeJWTPayload handles base64url without padding', () => {
    // header={"alg":"none"}; payload={"a":1}; sig=""
    const jwt = 'eyJhbGciOiJub25lIn0.eyJhIjoxfQ.'
    expect(decodeJWTPayload(jwt)).toEqual({ a: 1 })
  })
})

describe('agent_jkt computation (resource-token claim)', () => {
  it('thumbprint of cnf.jwk equals agent_jkt expected by the spec', async () => {
    // Simulate: agent token contains cnf.jwk for the ephemeral key.
    // Resource token's agent_jkt MUST equal RFC 7638 thumbprint of that JWK.
    const ephemeral = await webcrypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']) as CryptoKeyPair
    const ephemeralJwk = await webcrypto.subtle.exportKey('jwk', ephemeral.publicKey)
    const expected = await computeJwkThumbprint(ephemeralJwk)

    // Mint an agent token that embeds the ephemeral pubkey in cnf.jwk.
    const privateKey = await importSigningKey(signingKeyJson)
    const agentToken = await signJWT(
      { alg: 'EdDSA', typ: 'aa-agent+jwt', kid: 'k' },
      {
        iss: 'https://example.test',
        sub: 'aauth:test@example.test',
        cnf: { jwk: ephemeralJwk },
        iat: 1, exp: 2,
      },
      privateKey
    )

    const decoded = decodeJWTPayload(agentToken)
    const cnfJwk = (decoded.cnf as { jwk: JsonWebKey }).jwk
    const computed = await computeJwkThumbprint(cnfJwk)
    expect(computed).toBe(expected)
  })
})
