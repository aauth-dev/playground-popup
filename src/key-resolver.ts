import {
  createKeyResolver,
  BoundedTtlCache,
  type KeyFetchEvent,
  type KeyResolver,
  type KeyStoreEntry,
} from '@hellocoop/httpsig'

// ── Key discovery ──
//
// Every key this worker discovers goes through one @hellocoop/httpsig key
// resolver on one store: a person token's and an auth token's issuer keys
// (iss + dwk → metadata → jwks_uri → JWKS), and any jwks_uri-scheme
// Signature-Key that httpsig verify() is handed. The resolver holds the
// policy of draft-hardt-httpbis-signature-key §Caching and Performance: a
// fetch timeout, a one-minute refetch floor that also holds after a failed
// fetch, one refresh on an unknown kid, max-age honored down to the floor.
//
// The store is per isolate and bounded: its keys are URLs taken from
// requests that have not been verified yet.
const SERVICE = 'playground-popup'
const keyStore = new BoundedTtlCache<KeyStoreEntry>(500)

// This worker has no event pipeline; a structured console line is what
// reaches Workers Logs and the Logpush trace events (wrangler.toml
// `logpush = true`).
function logKeyFetch(event: KeyFetchEvent): void {
  const line = {
    service: SERVICE,
    event: `aauth.${SERVICE}.key_fetch`,
    level: event.ok ? 30 : 40,
    msg: `${event.doc} fetch ${event.ok ? 'ok' : 'failed'} (${event.reason}): ${event.url}`,
    ...event,
  }
  if (event.ok) console.log(line)
  else console.warn(line)
}

export const keyResolver: KeyResolver = createKeyResolver({
  store: keyStore,
  onFetch: logKeyFetch,
})

// Test seam: drop every cached document and failure, so a test's stand-in
// issuer is fetched fresh rather than read from an earlier test's entry.
export function clearKeyCache(): void {
  keyStore.clear()
}
