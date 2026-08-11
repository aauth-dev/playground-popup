import { verify as httpSigVerify } from '@hellocoop/httpsig'
import type { Context } from 'hono'
import { computeJwkThumbprint, decodeJWTHeader, decodeJWTPayload, verifyJWT } from './crypto'

// Shared RFC 9421 verification for endpoints that accept sig=jwt. Reads
// the body once, runs httpSigVerify, enforces the jwt scheme, and
// optionally runs a caller-supplied JWT verification on the inner token
// (e.g. against our own JWKS or a PS JWKS).
//
// Returns the parsed body as text (callers parse JSON themselves, since
// c.req.json() would re-consume the stream) and the inner JWT payload.
//
// On failure, returns a Hono Response — callers can return it directly.

export interface SigJwtVerifyOptions {
  // Optional inner-token verifier: takes the raw JWT string and returns
  // { payload } if it's valid. Use this to verify against our own JWKS
  // (agent_token from us) or a PS JWKS (auth_token from the PS).
  verifyInner?: (jwt: string) => Promise<{ payload: Record<string, unknown> }>
  // If true, skip exp check on the inner JWT payload (used for /refresh,
  // where an expired agent_token is precisely what's being renewed).
  allowExpired?: boolean
  // Require payload.iss === expectedIss when set.
  expectedIss?: string
}

export interface SigJwtVerifyResult {
  rawBody: string
  innerJwt: string
  innerPayload: Record<string, unknown> | null
  // RFC 7638 thumbprint of the key that actually signed the HTTP request
  // (httpsig extracts it from the sig=jwt token's cnf.jwk). Callers use it
  // to bind the token they verify to this request.
  callerJkt: string
}

export async function verifySigJwt(
  c: Context,
  options: SigJwtVerifyOptions = {}
): Promise<SigJwtVerifyResult | Response> {
  // Read body as text — httpSigVerify needs it to reconstruct the
  // signature base, and c.req.json() would consume the stream first.
  const rawBody = await c.req.text()

  const url = new URL(c.req.url)
  const sigResult = await httpSigVerify({
    method: c.req.method,
    authority: url.host,
    path: url.pathname,
    query: url.search.replace(/^\?/, ''),
    headers: c.req.raw.headers,
    body: rawBody,
  })
  if (!sigResult.verified) {
    return c.json({ error: `signature verification failed: ${sigResult.error || 'unknown'}` }, 401)
  }
  if (sigResult.keyType !== 'jwt' || !sigResult.jwt) {
    return c.json({ error: 'Signature-Key must use sig=jwt' }, 401)
  }

  const innerJwt = sigResult.jwt.raw
  let innerPayload: Record<string, unknown> | null = null

  if (options.verifyInner) {
    try {
      const { payload } = await options.verifyInner(innerJwt)
      innerPayload = payload
    } catch (err) {
      return c.json({ error: `inner JWT invalid: ${(err as Error).message}` }, 401)
    }
    if (options.expectedIss && innerPayload.iss !== options.expectedIss) {
      return c.json({ error: `inner JWT iss mismatch: expected ${options.expectedIss}` }, 401)
    }
    if (!options.allowExpired) {
      const now = Math.floor(Date.now() / 1000)
      if (!innerPayload.exp || (innerPayload.exp as number) < now) {
        return c.json({ error: 'inner JWT expired' }, 401)
      }
    }
  }

  return { rawBody, innerJwt, innerPayload, callerJkt: sigResult.thumbprint }
}

// Result of verifying a sig=hwk request — the public key that signed it,
// its JWK thumbprint (for KV lookup), and the raw body so the caller can
// JSON.parse without re-consuming the stream.
export interface SigHwkVerifyResult {
  rawBody: string
  publicJwk: JsonWebKey
  jkt: string
}

// Verifies an RFC 9421 signature whose Signature-Key uses sig=hwk — the
// agent presents its public key inline rather than referencing a token.
// Used at /bootstrap and /refresh: the agent has no token yet (bootstrap)
// or the AP looks the agent up by thumbprint instead (refresh).
export async function verifySigHwk(c: Context): Promise<SigHwkVerifyResult | Response> {
  const rawBody = await c.req.text()
  const url = new URL(c.req.url)
  const sigResult = await httpSigVerify({
    method: c.req.method,
    authority: url.host,
    path: url.pathname,
    query: url.search.replace(/^\?/, ''),
    headers: c.req.raw.headers,
    body: rawBody,
  })
  if (!sigResult.verified) {
    return c.json({ error: `signature verification failed: ${sigResult.error || 'unknown'}` }, 401)
  }
  if (sigResult.keyType !== 'hwk') {
    return c.json({ error: 'Signature-Key must use sig=hwk' }, 401)
  }
  return { rawBody, publicJwk: sigResult.publicKey, jkt: sigResult.thumbprint }
}

// ── Issuer key discovery ──
//
// Per draft-hardt-httpbis-signature-key, a token names its own metadata
// document with `dwk`; the issuer's keys are found by fetching
// `{iss}/.well-known/{dwk}` and following `jwks_uri`. Both the person
// token (dwk `aauth-person.json`) and the auth token (also issued by the
// PS, same document) resolve through here.
export interface IssuerKeys {
  metadata: Record<string, unknown>
  metadataUrl: string
  jwks: { keys: JsonWebKey[] }
}

export async function resolveIssuerKeys(iss: string, dwk: string): Promise<IssuerKeys> {
  const metadataUrl = `${iss}/.well-known/${dwk}`
  const metaRes = await fetch(metadataUrl)
  if (!metaRes.ok) throw new Error(`fetch ${dwk} failed: ${metaRes.status}`)
  const metadata = (await metaRes.json()) as Record<string, unknown>
  const jwksUri = metadata.jwks_uri as string | undefined
  if (!jwksUri) throw new Error(`${dwk} missing jwks_uri`)
  const jwksRes = await fetch(jwksUri)
  if (!jwksRes.ok) throw new Error(`fetch JWKS failed: ${jwksRes.status}`)
  const jwks = (await jwksRes.json()) as { keys: JsonWebKey[] }
  return { metadata, metadataUrl, jwks }
}

// ── Person token verification ──
//
// draft-hardt-oauth-aauth-protocol §Person Token Verification. The agent
// presents the person token in place of its agent token via
// `Signature-Key: sig=jwt`, so the HTTP signature has already proven
// possession of `cnf.jwk` — step 6 is the check that the key which signed
// the request is the key the PS bound the token to.
export const PERSON_TYP = 'aa-person+jwt'
export const PERSON_DWK = 'aauth-person.json'

export interface PersonTokenResult {
  payload: Record<string, unknown>
  // The PS metadata document fetched for key discovery — reused by the
  // caller so a resource token's `aud` (the PS `issuer`) costs no second
  // round trip.
  psMetadata: Record<string, unknown>
  psMetadataUrl: string
}

// Throws Error on any verification failure; the message is the reason.
export async function verifyPersonToken(
  jwt: string,
  opts: { aud: string; callerJkt: string }
): Promise<PersonTokenResult> {
  // 1. typ
  const header = decodeJWTHeader(jwt)
  if (header.typ !== PERSON_TYP) throw new Error(`typ must be ${PERSON_TYP}`)

  // 2. dwk + issuer key discovery + signature
  const unverified = decodeJWTPayload(jwt)
  if (unverified.dwk !== PERSON_DWK) throw new Error(`dwk must be ${PERSON_DWK}`)
  const iss = unverified.iss
  if (typeof iss !== 'string') throw new Error('missing iss')
  // 4. iss must be an HTTPS server identifier
  let issUrl: URL
  try {
    issUrl = new URL(iss)
  } catch {
    throw new Error('iss is not a valid URL')
  }
  if (issUrl.protocol !== 'https:') throw new Error('iss must be HTTPS')

  const { metadata, metadataUrl, jwks } = await resolveIssuerKeys(iss, PERSON_DWK)
  const { payload } = await verifyJWT(jwt, jwks)

  // 3. exp / iat
  const now = Math.floor(Date.now() / 1000)
  if (typeof payload.exp !== 'number' || payload.exp < now) throw new Error('expired')
  if (typeof payload.iat === 'number' && payload.iat > now + 60) throw new Error('iat in the future')

  // 5. aud is this resource
  if (payload.aud !== opts.aud) throw new Error(`aud is not ${opts.aud}`)

  if (typeof payload.sub !== 'string' || !payload.sub) throw new Error('missing sub')
  if (typeof payload.jti !== 'string' || !payload.jti) throw new Error('missing jti')

  // 6. cnf.jwk is the key that signed the HTTP request
  const cnfJwk = (payload.cnf as { jwk?: JsonWebKey } | undefined)?.jwk
  if (!cnfJwk) throw new Error('missing cnf.jwk')
  const cnfJkt = await computeJwkThumbprint(cnfJwk)
  if (cnfJkt !== opts.callerJkt) throw new Error('cnf.jwk is not the request signing key')

  return { payload, psMetadata: metadata, psMetadataUrl: metadataUrl }
}

// ── Token kinds ──
//
// A person token and a PS-issued auth token are near-identical: same
// `iss`, same `dwk`, same `aud`, same `sub`, same `cnf`. Only `typ`
// separates them, so a verifier that checks everything else will accept a
// credential carrying no authorization as though it carried some. That is
// what §Person Token Verification means by "A recipient MUST reject an
// aa-person+jwt wherever an auth token is required".
//
// Making the accepted set a required argument is the point: the rejection
// becomes a parameter you have to state rather than one you can forget.
export type TokenKind = 'agent' | 'person' | 'auth'

export const TOKEN_TYP: Record<TokenKind, string> = {
  agent: 'aa-agent+jwt',
  person: PERSON_TYP,
  auth: 'aa-auth+jwt',
}

// Build a verifyInner that fetches the PS JWKS (via the JWT's iss+dwk)
// and verifies against it. `accept` names the token kinds this call site
// will take — it has no default on purpose.
export function psJwksVerifier(accept: TokenKind[]) {
  const acceptedTyps = accept.map((kind) => TOKEN_TYP[kind])
  return async (jwt: string) => {
    const typ = decodeJWTHeader(jwt).typ
    if (typeof typ !== 'string' || !acceptedTyps.includes(typ)) {
      throw new Error(`typ ${JSON.stringify(typ)} is not one of ${acceptedTyps.join(', ')}`)
    }
    const unverified = decodeJWTPayload(jwt)
    const iss = unverified.iss as string | undefined
    const dwk = (unverified.dwk as string | undefined) ?? PERSON_DWK
    if (!iss) throw new Error('token missing iss')
    const { jwks } = await resolveIssuerKeys(iss, dwk)
    return verifyJWT(jwt, jwks)
  }
}
