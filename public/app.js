// ── State ──

let agentToken = null
let ephemeralKeyPair = null // CryptoKeyPair — private key never exported

// ── IndexedDB helpers for CryptoKey persistence ──

const DB_NAME = 'aauth-playground'
const DB_VERSION = 1
const STORE_NAME = 'keys'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function saveKeyPair(keyPair) {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).put(keyPair, 'durable')
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
}

async function loadKeyPair() {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const req = tx.objectStore(STORE_NAME).get('durable')
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
}

async function clearKeyPair() {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).delete('durable')
}

// Generate a fresh durable Ed25519 key pair and persist it. Per the new
// bootstrap protocol the agent's signing key is durable (not rotated on
// refresh) — the same key sits in cnf.jwk across the agent's lifetime
// at the AP, with refresh just minting fresh `exp` values.
async function rotateKeyPair() {
  const keyPair = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify'])
  ephemeralKeyPair = keyPair
  await saveKeyPair(keyPair)
  return keyPair
}

// ── JWT helpers ──

function decodeJWTPayload(jwt) {
  const parts = jwt.split('.')
  return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
}

// ── jwt.io-style syntax highlighting ──

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderEncodedJWT(jwt) {
  const parts = String(jwt).split('.')
  if (parts.length < 2) return escapeHtml(jwt)
  const [h, p, s = ''] = parts
  return (
    `<span class="jwt-header">${escapeHtml(h)}</span>` +
    `<span class="jwt-dot">.</span>` +
    `<span class="jwt-payload">${escapeHtml(p)}</span>` +
    `<span class="jwt-dot">.</span>` +
    `<span class="jwt-signature">${escapeHtml(s)}</span>`
  )
}

function renderJSON(obj) {
  const json = JSON.stringify(obj, null, 2)
  if (json === undefined) return ''
  const safe = escapeHtml(json)
  return safe.replace(
    /(&quot;(?:\\.|(?!&quot;).)*&quot;)(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match, str, colon, bool, num) => {
      if (str) {
        const cls = colon ? 'json-key' : 'json-string'
        return `<span class="${cls}">${str}</span>${colon || ''}`
      }
      if (bool) return `<span class="json-bool">${bool}</span>`
      if (num) return `<span class="json-num">${num}</span>`
      return match
    }
  )
}

// ── UI updates ──
//
// Post-bootstrap state: hide the pre-bootstrap controls (PS picker,
// Bootstrap CTA) so a reloaded page doesn't show the user an option
// they're already past. The Bootstrap fieldset itself stays visible
// because it now hosts the inline Agent Identity block + protocol log
// from the completed ceremony.
function setAuthenticated(_label) {
  document.getElementById('bootstrap-controls')?.classList.add('hidden')
  document.getElementById('bootstrap-artifacts')?.classList.remove('hidden')
  document.getElementById('auth-section')?.classList.remove('hidden')
  document.getElementById('resource-section')?.classList.remove('hidden')
}

function setUnauthenticated() {
  document.getElementById('bootstrap-section')?.classList.remove('hidden')
  document.getElementById('bootstrap-artifacts')?.classList.add('hidden')
  document.getElementById('auth-section')?.classList.add('hidden')
  document.getElementById('resource-section')?.classList.add('hidden')
}

function displayAgentToken(data) {
  document.getElementById('agent-id').textContent = data.agent_id
  const raw = document.getElementById('agent-token-raw')
  if (raw) {
    raw.classList.add('encoded')
    raw.innerHTML = renderEncodedJWT(data.agent_token)
  }
  const payload = decodeJWTPayload(data.agent_token)
  const payloadEl = document.getElementById('token-payload')
  if (payloadEl) payloadEl.innerHTML = renderJSON(payload)
}

// Exposed so startBootstrap (in the bundled protocol.js) can reset the
// Agent Identity + Authorization Request UI when a user clicks
// "Bootstrap agent" again after already having bootstrapped — otherwise
// the old "Bound as …" line stays on screen while the new ceremony runs.
window.aauthUI = { setAuthenticated, setUnauthenticated }

// ── Agent token persistence ──

function saveAgentToken(token) {
  agentToken = token
  localStorage.setItem('aauth-agent-token', token)
  // Mirror the agent identity into its own key so the reload path can
  // still populate #agent-id after the token itself has expired and
  // been cleared — the durable key survives, so the UI should keep
  // showing the user's agent identity.
  try {
    const payload = decodeJWTPayload(token)
    if (payload.sub) localStorage.setItem('aauth-agent-id', payload.sub)
  } catch { /* malformed token — leave any prior id in place */ }
}

function clearAgentToken() {
  agentToken = null
  localStorage.removeItem('aauth-agent-token')
}

async function restoreAgentTokenAndKey() {
  const savedToken = localStorage.getItem('aauth-agent-token')
  if (!savedToken) return false

  const payload = decodeJWTPayload(savedToken)
  if (payload.sub) localStorage.setItem('aauth-agent-id', payload.sub)

  const keyPair = await loadKeyPair()
  if (!keyPair) {
    clearAgentToken()
    return false
  }

  // Expired token + valid keypair: runRefresh (protocol.js) signs
  // /refresh with the same hwk key the AP recorded by thumbprint, so
  // even an expired token is fine to restore alongside the key — the
  // refresh path doesn't read the token, it just signs the request.
  agentToken = savedToken
  ephemeralKeyPair = keyPair
  displayAgentToken({ agent_token: savedToken, agent_id: payload.sub })
  return true
}

// Applied by protocol.js after a successful bootstrap or refresh call.
function applyBootstrapResult(result) {
  saveAgentToken(result.agent_token)
  displayAgentToken({ agent_token: result.agent_token, agent_id: result.agent_id })
  setAuthenticated(result.agent_id)
  requestAnimationFrame(() => {
    document.getElementById('resource-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}
window.aauthApplyBootstrapResult = applyBootstrapResult

// Exposed for protocol.js to manage the durable signing key. Refresh
// reuses the same key (no rotation), so a single rotate/get/getPublicJwk
// trio is all the surface area we need.
// httpsig 2.0 (signature-key -08 / RFC 9864) requires every signing JWK to
// carry a fully-specified alg; WebCrypto's exportKey does not set one.
async function exportPublicJwk(publicKey) {
  const jwk = await crypto.subtle.exportKey('jwk', publicKey)
  jwk.alg = 'Ed25519'
  return jwk
}

window.aauthEphemeral = {
  rotate: async () => {
    const kp = await rotateKeyPair()
    return {
      keyPair: kp,
      publicJwk: await exportPublicJwk(kp.publicKey),
    }
  },
  get: () => ephemeralKeyPair,
  getPublicJwk: async () => ephemeralKeyPair ? exportPublicJwk(ephemeralKeyPair.publicKey) : null,
}

// Signed fetch helper exposed for app.js (which can't import sigFetch
// directly since it isn't bundled). Two modes:
//   { jwt }  → sig=jwt;jwt=<jwt>, used with agent_token / auth_token
//   { hwk: true } → sig=hwk, used with /bootstrap, /refresh, /agent/forget
window.aauthSigFetch = null // populated by protocol.js after import

// ── Scope picker hydration ──

const IDENTITY_SCOPES = [
  { name: 'openid',      description: 'Verify your identity',            checked: true },
  { name: 'profile',     description: 'Access your profile information', checked: true },
  { name: 'name',        description: 'Access your full name' },
  { name: 'email',       description: 'Access your email address' },
  { name: 'picture',     description: 'Access your profile picture' },
  { name: 'nickname',    description: 'Access your nickname' },
  { name: 'given_name',  description: 'Access your given name' },
  { name: 'family_name', description: 'Access your family name' },
  { name: 'phone',       description: 'Access your phone number' },
  { name: 'ethereum',    description: 'Access your linked Ethereum account' },
  { name: 'discord',     description: 'Access your linked Discord account' },
  { name: 'twitter',     description: 'Access your linked Twitter account' },
  { name: 'github',      description: 'Access your linked GitHub account' },
  { name: 'gitlab',      description: 'Access your linked GitLab account' },
]

function renderScopeRow(scope, description, opts = {}) {
  const attrs = [`value="${scope}"`]
  if (opts.checked) attrs.push('checked')
  const title = description ? ` title="${description.replace(/"/g, '&quot;')}"` : ''
  return `<label class="checkbox-label" data-scope="${scope}"${title}><input type="checkbox" ${attrs.join(' ')}> <span>${scope}</span></label>`
}

const PROFILE_CLAIMS = ['name', 'email', 'picture']

function updateProfileImpliedOpacity() {
  const grid = document.getElementById('identity-scope-grid')
  if (!grid) return
  const isChecked = (scope) =>
    !!grid.querySelector(`input[type="checkbox"][value="${scope}"]:checked`)
  const profileSelected = isChecked('profile')
  const allProfileClaimsSelected = PROFILE_CLAIMS.every(isChecked)
  const set = (scope, dim) => {
    const label = grid.querySelector(`label[data-scope="${scope}"]`)
    if (label) label.classList.toggle('scope-implied', dim)
  }
  set('profile', allProfileClaimsSelected)
  for (const claim of PROFILE_CLAIMS) set(claim, profileSelected)
}

const EXTENDED_SCOPE_NAMES = new Set(['discord', 'github', 'gitlab', 'twitter', 'ethereum'])

function hydrateIdentityScopes() {
  const grid = document.getElementById('identity-scope-grid')
  if (!grid) return
  const standard = IDENTITY_SCOPES.filter((s) => !EXTENDED_SCOPE_NAMES.has(s.name))
  const extended = IDENTITY_SCOPES.filter((s) => EXTENDED_SCOPE_NAMES.has(s.name))
  const renderCol = (heading, scopes) => `
    <div class="scope-column">
      <div class="scope-column-heading">${heading}</div>
      <div class="scope-column-items">
        ${scopes.map((s) => renderScopeRow(s.name, s.description, {
          checked: !!s.checked,
        })).join('')}
      </div>
    </div>
  `
  grid.innerHTML = renderCol('Standard scopes', standard) + renderCol('Hellō scopes', extended)
}

const WHOAMI_ORIGIN = 'https://whoami.aauth.dev'
window.WHOAMI_ORIGIN = WHOAMI_ORIGIN

function getSelectedIdentityScopeList() {
  return Array.from(document.querySelectorAll('#identity-scope-grid input[type="checkbox"]:checked'))
    .map((cb) => cb.value)
}

function updateWhoamiUrlPreview() {
  const el = document.getElementById('whoami-url-preview')
  if (!el) return
  const scopes = getSelectedIdentityScopeList()
  const scopeParam = scopes.join(' ')
  const url = scopeParam
    ? `${WHOAMI_ORIGIN}/?scope=${encodeURIComponent(scopeParam)}`
    : `${WHOAMI_ORIGIN}/`
  el.textContent = url
  const noScopesCaption = document.getElementById('whoami-no-scopes-caption')
  const noScopes = scopes.length === 0
  noScopesCaption?.classList.toggle('hidden', !noScopes)
  const btn = document.getElementById('whoami-btn')
  if (btn) {
    btn.innerHTML = noScopes
      ? 'Whoami with agent'
      : 'ō&nbsp;&nbsp;&nbsp;Whoami with Hellō'
  }
}
window.updateWhoamiUrlPreview = updateWhoamiUrlPreview

const NOTES_ORIGIN = 'https://notes.aauth.dev'
const NOTES_VOCABULARY = 'urn:aauth:vocabulary:openapi'
window.NOTES_ORIGIN = NOTES_ORIGIN
window.NOTES_VOCABULARY = NOTES_VOCABULARY

function getSelectedNotesOperationList() {
  return Array.from(document.querySelectorAll('#notes-ops-grid input[type="checkbox"]:checked'))
    .map((cb) => cb.value)
}

function updateNotesRequestPreview() {
  const el = document.getElementById('notes-request-preview')
  if (!el) return
  const operations = getSelectedNotesOperationList().map((operationId) => ({ operationId }))
  const body = {
    r3_operations: {
      vocabulary: NOTES_VOCABULARY,
      operations,
    },
  }
  el.textContent = JSON.stringify(body, null, 2)
}
window.updateNotesRequestPreview = updateNotesRequestPreview

// ── Settings persistence ──

const SETTINGS_KEY = 'aauth-playground-settings'
const DEFAULT_PS = 'https://person.hello-beta.net'

function loadSettings() {
  let saved = {}
  try {
    saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {}
  } catch { /* ignore corrupt JSON */ }

  if (Array.isArray(saved.identity_scopes)) {
    const set = new Set(saved.identity_scopes)
    const boxes = document.querySelectorAll('#identity-scope-grid input[type="checkbox"]')
    for (const b of boxes) {
      b.checked = set.has(b.value)
    }
  }
}

function saveSettings() {
  const identity_scopes = Array.from(
    document.querySelectorAll('#identity-scope-grid input[type="checkbox"]:checked')
  ).map(b => b.value)

  let notes_operations
  const notesBoxes = document.querySelectorAll('#notes-ops-grid input[type="checkbox"]')
  if (notesBoxes.length > 0) {
    notes_operations = Array.from(notesBoxes)
      .filter((b) => b.checked)
      .map((b) => b.value)
  } else {
    try {
      const prior = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {}
      if (Array.isArray(prior.notes_operations)) notes_operations = prior.notes_operations
    } catch { /* ignore corrupt JSON */ }
  }

  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    identity_scopes,
    notes_operations,
  }))
}

window.aauthGetSavedNotesOperations = function aauthGetSavedNotesOperations() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {}
    return Array.isArray(saved.notes_operations) ? saved.notes_operations : null
  } catch { return null }
}

function getCurrentPS() {
  return DEFAULT_PS
}
window.getCurrentPS = getCurrentPS

function wireSettingsAutosave() {
  const roots = ['bootstrap-section', 'resource-section']
    .map((id) => document.getElementById(id))
    .filter(Boolean)
  for (const root of roots) {
    root.addEventListener('change', saveSettings)
    root.addEventListener('input', saveSettings)
  }
  document.getElementById('identity-scope-grid')
    ?.addEventListener('change', () => {
      updateWhoamiUrlPreview()
      updateProfileImpliedOpacity()
    })

  document.getElementById('notes-ops-grid')
    ?.addEventListener('change', updateNotesRequestPreview)
}

// ── Initialization ──

;(async () => {
  hydrateIdentityScopes()
  loadSettings()
  wireSettingsAutosave()
  updateWhoamiUrlPreview()
  updateProfileImpliedOpacity()
  updateNotesRequestPreview()
})()

const COPY_ICON_HTML = `
  <svg class="copy-icon-copy" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
  <svg class="copy-icon-check" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>
`
function renderCopyIcons(root = document) {
  for (const btn of root.querySelectorAll('.copy-btn:empty')) {
    btn.innerHTML = COPY_ICON_HTML
  }
}
renderCopyIcons()
new MutationObserver(() => renderCopyIcons()).observe(document.body, { childList: true, subtree: true })

window.addEventListener('pageshow', (e) => {
  if (!e.persisted) return
  for (const btn of document.querySelectorAll('.hello-btn-loader')) {
    btn.classList.remove('hello-btn-loader')
  }
})

function activateResourceTab(name) {
  const section = document.getElementById('resource-section')
  const row = section?.querySelector('.tab-row')
  if (!section || !row) return
  const target = row.querySelector(`.tab[data-tab="${name}"]`)
  if (!target) return
  for (const t of row.querySelectorAll('.tab')) {
    const active = t === target
    t.classList.toggle('tab-active', active)
    t.setAttribute('aria-selected', active ? 'true' : 'false')
  }
  for (const panel of section.querySelectorAll('.tab-panel')) {
    panel.hidden = panel.dataset.panel !== name
  }
  const notesSection = document.getElementById('notes-section')
  if (notesSection) {
    if (name === 'notes' && localStorage.getItem('aauth-notes-auth-token')) {
      notesSection.classList.remove('hidden')
    } else if (name !== 'notes') {
      notesSection.classList.add('hidden')
    }
  }
  try { window.aauthOnTabActivated?.(name) } catch { /* handler is advisory */ }
}
window.aauthActivateTab = activateResourceTab

document.querySelector('#resource-section .tab-row')?.addEventListener('click', (e) => {
  const tab = e.target.closest('.tab')
  if (!tab) return
  activateResourceTab(tab.dataset.tab)
})

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.copy-btn')
  if (!btn) return
  const literal = btn.dataset.copy
  const target = btn.dataset.copyTarget
  const text = literal != null
    ? literal
    : (target ? (() => {
        const el = document.querySelector(target)
        if (!el) return ''
        return 'value' in el ? el.value : el.textContent
      })() : '')
  if (!text) return
  navigator.clipboard.writeText(text).then(() => {
    btn.classList.add('copied')
    setTimeout(() => btn.classList.remove('copied'), 500)
  })
})

// Reset buttons.
//
// Bootstrap Reset — clears the agent token, the durable signing key,
//   and tells the AP to forget the (jkt, agent name) mapping so the
//   next bootstrap mints a fresh local-part. (Best-effort: if the
//   forget call fails the AP entry just expires on its own TTL.)
//
// Authorization Reset — clears scope selections + cached auth tokens.
document.getElementById('bootstrap-reset-btn')?.addEventListener('click', async () => {
  if (window.aauthSigFetchHwk) {
    try {
      await window.aauthSigFetchHwk('/agent/forget', { method: 'POST' })
    } catch { /* best-effort — still proceed with client reset */ }
  }

  const BOOTSTRAP_KEYS = [
    'aauth-agent-token',
    'aauth-agent-id',
    'aauth-pending-authorize',
    'aauth-notes-auth-token',
  ]
  for (const k of BOOTSTRAP_KEYS) localStorage.removeItem(k)
  window.aauthClearAllPersistedLogs?.()

  try { await clearKeyPair() } catch { /* IndexedDB may be unavailable */ }

  location.reload()
})

document.getElementById('reset-btn')?.addEventListener('click', () => {
  localStorage.removeItem(SETTINGS_KEY)
  localStorage.removeItem('aauth-pending-authorize')
  localStorage.removeItem('aauth-pending-whoami')
  localStorage.removeItem('aauth-notes-auth-token')
  window.aauthClearPersistedLog?.('whoami-log')
  window.aauthClearPersistedLog?.('notes-log')
  window.aauthClearPersistedLog?.('notes-api-log')

  location.reload()
})

;(async () => {
  const restored = await restoreAgentTokenAndKey()
  if (restored) {
    const payload = decodeJWTPayload(agentToken)
    setAuthenticated(payload.sub)
  } else {
    const savedAgentId = localStorage.getItem('aauth-agent-id')
    const kp = await loadKeyPair()
    if (savedAgentId && kp) {
      // Token expired or missing, but durable key + identity survive.
      // Show authenticated state — runRefresh will mint a fresh token
      // on the next resource call.
      ephemeralKeyPair = kp
      setAuthenticated(savedAgentId)
      document.getElementById('agent-id').textContent = savedAgentId
    }
  }
  // Resume whichever pending authorize the user left mid-interaction
  // when they redirected to the PS. No-op if no pending state.
  window.resumePendingAuthorize?.()

  // If a valid notes auth_token is still in localStorage, re-mount the
  // Notes app without replaying the discovery/authorize flow.
  window.aauthRestoreNotesApp?.()
})()
