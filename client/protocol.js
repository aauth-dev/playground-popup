// ── Protocol flow and log display ──
// Depends on app.js exposures via window: aauthEphemeral,
// aauthApplyBootstrapResult, getCurrentPS.
// Built into public/protocol.js by esbuild; loaded as a classic script.

import { fetch as sigFetch } from '@hellocoop/httpsig'
import qrcode from 'qrcode-generator'
import LOG_TEXT from '../public/log-text.json'

const POLL_WAIT_SECONDS = 45

// ── Log text lookup ──
//
// All user-facing labels + descriptions live in public/log-text.json
// (committed alongside this file, bundled in by esbuild). Call sites
// reference entries via copy('section.key') and fmt() for templates
// with {path} / {status} placeholders. Changing text means editing the
// JSON, not searching this file.

function copy(path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), LOG_TEXT)
}

function fmt(template, vars = {}) {
  if (!template) return ''
  let out = template
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v))
  }
  return out
}

// Wrap a description string in a <p> (or return empty if no description).
function desc(key) {
  const d = copy(`${key}.description`)
  return d ? `<p>${d}</p>` : ''
}

// ── Diagnostics ──
//
// Surface silent errors so we don't stare at a blank form wondering why
// bootstrap didn't complete. The global unhandledrejection handler
// catches any async error the ceremony code didn't explicitly catch and
// writes it to the protocol log (and console).

window.addEventListener('unhandledrejection', (ev) => {
  try {
    const msg = ev?.reason?.stack || ev?.reason?.message || String(ev?.reason)
    console.error('[aauth] unhandled rejection:', msg)
    showLog()
    addLogStep(copy('errors.unhandled.label'), 'error',
      `<p style="color: var(--error); white-space: pre-wrap;">${escapeHtml(msg)}</p>`)
  } catch { /* last-ditch, don't throw from the error handler */ }
})

function trace(label, extra) {
  try { console.log(`[aauth] ${label}`, extra ?? '') } catch {}
}

// Signed fetch helpers exposed for app.js (which can't import sigFetch
// directly since it isn't bundled).
//   aauthSigFetch    — sig=jwt (agent_token or auth_token)
//   aauthSigFetchHwk — sig=hwk (bootstrap, refresh, agent/forget)
window.aauthSigFetch = async function aauthSigFetch(url, { method = 'GET', headers = {}, body, jwt } = {}) {
  const keyPair = window.aauthEphemeral.get()
  if (!keyPair) throw new Error('no signing key available')
  if (!jwt) throw new Error('jwt required for sig=jwt scheme')
  const signingKey = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
  const hasBody = body !== undefined && body !== null
  const components = hasBody
    ? ['@method', '@authority', '@path', 'content-type', 'signature-key']
    : ['@method', '@authority', '@path', 'signature-key']
  const mergedHeaders = hasBody
    ? { 'Content-Type': 'application/json', ...headers }
    : { ...headers }
  return sigFetch(url, {
    method,
    headers: mergedHeaders,
    body: hasBody ? body : undefined,
    signingKey,
    signingCryptoKey: keyPair.privateKey,
    signatureKey: { type: 'jwt', jwt },
    components,
  })
}

window.aauthSigFetchHwk = async function aauthSigFetchHwk(url, { method = 'POST', headers = {}, body } = {}) {
  const keyPair = window.aauthEphemeral.get()
  if (!keyPair) throw new Error('no signing key available')
  const signingKey = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
  const hasBody = body !== undefined && body !== null
  const components = hasBody
    ? ['@method', '@authority', '@path', 'content-type', 'signature-key']
    : ['@method', '@authority', '@path', 'signature-key']
  const mergedHeaders = hasBody
    ? { 'Content-Type': 'application/json', ...headers }
    : { ...headers }
  return sigFetch(url, {
    method,
    headers: mergedHeaders,
    body: hasBody ? body : undefined,
    signingKey,
    signingCryptoKey: keyPair.privateKey,
    signatureKey: { type: 'hwk' },
    components,
  })
}

// ── Log rendering ──
//
// Each fieldset (Bootstrap Agent, Authorization Request) renders its
// own inline protocol log so the request/response trail stays next to
// the button that produced it. Each flow calls `setActiveLog('<id>')`
// at entry; subsequent addLogSection/addLogStep/resolveStep/clearLog
// calls target that container. The legacy '#protocol-log' id is still
// honored as a fallback for any unmigrated call site.

let __activeLogContainer = null

function setActiveLog(id) {
  const el = document.getElementById(id)
  if (el) __activeLogContainer = el
}

function currentLog() {
  // Prefer the explicitly-set container. Fall back to the legacy
  // shared log if nothing's been set (shouldn't happen post-refactor,
  // but keeps us safe against any call site we missed).
  return __activeLogContainer || document.getElementById('protocol-log')
}

function clearLog() {
  const log = currentLog()
  if (!log) return
  // Preserve the Agent Token + Decoded Payload details: they're pinned
  // to the bootstrap ceremony's log section on fresh flows for joint
  // collapse/expand, but must survive a re-bootstrap's clearLog so
  // their populated content isn't destroyed. Reparent them to
  // #bootstrap-artifacts (the green-line wrapper) as siblings of the
  // log; applyBootstrapResult moves them back into the new log
  // section on completion.
  if (log.id === 'bootstrap-log') {
    const artifacts = document.getElementById('bootstrap-artifacts')
    const tokenDetails = log.querySelector('#agent-token-details')
    const decodedDetails = log.querySelector('#decoded-payload-details')
    if (artifacts && tokenDetails) artifacts.appendChild(tokenDetails)
    if (artifacts && decodedDetails) artifacts.appendChild(decodedDetails)
  }
  log.innerHTML = ''
  log.classList.add('hidden')
  // Any persisted snapshot is now stale — the in-memory log is empty.
  if (PERSIST_LOG_IDS.includes(log.id)) clearPersistedLog(log.id)
}

// ── Log persistence (survives same-tab PS redirect) ──
//
// Save bootstrap-log / whoami-log / notes-log HTML to localStorage after every
// log mutation. On page load (app.js init), restore into the
// containers BEFORE resumePendingAuthorize
// fire — so the resumed flow appends into the same <details
// class="log-section"> it was writing before the redirect, no new
// "(resumed)" section break.
//
// Clear at terminals (success / failure / reset) so a later page
// reload shows the default Agent Identity-only state rather than a
// stale "last ceremony was X" snapshot.

const PERSIST_LOG_IDS = ['bootstrap-log', 'whoami-log', 'notes-log', 'notes-api-log']
const persistKey = (id) => `aauth-log-${id}`

function persistActiveLog() {
  const log = currentLog()
  if (!log || !PERSIST_LOG_IDS.includes(log.id)) return
  try { localStorage.setItem(persistKey(log.id), log.innerHTML) } catch {}
}

function clearPersistedLog(id) {
  try { localStorage.removeItem(persistKey(id)) } catch {}
}

function clearAllPersistedLogs() {
  for (const id of PERSIST_LOG_IDS) clearPersistedLog(id)
}

function restorePersistedLogs() {
  for (const id of PERSIST_LOG_IDS) {
    const saved = localStorage.getItem(persistKey(id))
    if (!saved) continue
    const log = document.getElementById(id)
    if (!log) continue
    log.innerHTML = saved
    log.classList.remove('hidden')
    // Drop any stale Continue-button loader state that was sitting on a
    // persisted .hello-btn — once resumePending resolves the parent
    // step to success, CSS (.log-step.success .interaction-box …)
    // overlays the 'approved' check and stops the flare, so the full
    // interaction record stays visible as a log of what happened.
    for (const btn of log.querySelectorAll('.hello-btn-loader')) {
      btn.classList.remove('hello-btn-loader')
    }
    // Collapse each top-level section on reload so the restored trail
    // doesn't flood the viewport. User can expand on demand. Mid-flow
    // resume paths will toggle them back open as they append.
    for (const section of log.querySelectorAll(':scope > details.log-section')) {
      section.removeAttribute('open')
    }
    // Reveal the green-line wrapper that contains bootstrap-log so the
    // restored trace is actually visible; app.js setAuthenticated may
    // not have fired yet on first paint. Resource logs live inside
    // their tab panels — their parent section is revealed once the
    // user bootstraps, independently of this.
    if (id === 'bootstrap-log') {
      document.getElementById('bootstrap-artifacts')?.classList.remove('hidden')
    }
  }
}
window.aauthClearPersistedLog = clearPersistedLog
window.aauthClearAllPersistedLogs = clearAllPersistedLogs
window.aauthRestorePersistedLogs = restorePersistedLogs

// Fire the restore synchronously at module load. app.js loads first,
// so its IIFE would call window.aauthRestorePersistedLogs before
// protocol.js defines it — the call silently no-ops. Running it here
// (during protocol.js's own script task) guarantees the log is
// restored before fireFallbackResume fires resumePendingAuthorize on
// window.load, and before any user interaction is possible.
restorePersistedLogs()

function showLog() {
  const log = currentLog()
  if (log) log.classList.remove('hidden')
}


function statusIndicatorHtml(status) {
  if (status === 'pending') {
    return '<span class="step-status step-status-pending"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>'
  }
  if (status === 'success') return '<span class="step-status step-status-success">\u2713</span>'
  return '<span class="step-status step-status-error">\u2717</span>'
}

const CHEVRON_SVG = `<svg class="section-chevron" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>`

// Wrap party-name occurrences in step labels with colored badges so
// the reader can see at a glance which party issued/received each
// artifact. Order matters: longer/more-specific patterns first so
// "Agent Provider" isn't half-matched by a bare "Agent" rule. The
// agent itself is intentionally never badged — it's on every step,
// so a chip there adds noise without information.
const PARTY_BADGES = [
  ['Agent Provider', 'ap'],
  ['Person Server', 'ps'],
  ['Notes Resource', 'rs'],
  ['Notes API', 'rs'],
  ['Whoami', 'rs'],
]
function applyPartyBadges(text) {
  if (!text) return text
  let out = text
  for (const [name, key] of PARTY_BADGES) {
    out = out.split(name).join(`<span class="party-badge party-${key}">${name}</span>`)
  }
  return out
}
// Pick the party tint for a step. Order:
//   1. counterparty name found in the label (e.g. "Person Server")
//   2. inherit from the immediate predecessor step in the same section
//      — covers labels like "Interaction Completed" or "Auth Token
//      received" that don't name a party but logically belong to the
//      same counterparty as the step that produced them
//   3. section default set by addLogSection (currently unused)
// Returns null when none match — step renders untinted (used for
// agent-local actions like "Agent: generate signing key").
function partyFromClass(el) {
  if (!el?.classList) return null
  for (const cls of el.classList) {
    if (cls.startsWith('party-bg-')) return cls.slice('party-bg-'.length)
  }
  return null
}
function previousStep(section) {
  if (!section?.children) return null
  for (let i = section.children.length - 1; i >= 0; i--) {
    const c = section.children[i]
    if (c.classList?.contains('log-step')) return c
  }
  return null
}
function previousStepBefore(step) {
  let prev = step?.previousElementSibling
  while (prev && !prev.classList?.contains('log-step')) prev = prev.previousElementSibling
  return prev || null
}
function partyForLabel(label, section, prevStep) {
  if (label) {
    for (const [name, key] of PARTY_BADGES) {
      if (label.includes(name)) return key
    }
  }
  const inherited = partyFromClass(prevStep)
  if (inherited) return inherited
  return section?.dataset?.party || null
}

let __copyIdCounter = 0
function nextCopyId() { return `copy-tgt-${++__copyIdCounter}` }

// Heuristic: if the step body already contains <details> panels (e.g. formatToken),
// the outer step is redundant as a toggle — just the heading + inline content.
function isExpandable(content) {
  return !!content && !/<details[\s>]/i.test(content)
}

// Visual divider in the protocol log — used to group steps under
// "Bootstrap", "Refresh", and "Authorize" so the reader can tell which
// ceremony a given step belongs to.
//
// Each section is itself a <details> with its heading as the <summary>,
// so the user can collapse an entire ceremony (e.g. the completed
// bootstrap trail) to reclaim screen space. Subsequent addLogStep
// calls append into whichever section is currently active.
function addLogSection(title, defaultParty) {
  const log = currentLog()
  if (!log) return
  showLog()
  const section = document.createElement('details')
  section.className = 'log-section'
  section.open = true
  // Steps whose label doesn't name a counterparty (e.g. "Agent: generate
  // signing key", "Auth Token received") fall back to this default so a
  // single-party ceremony like Bootstrap reads as one solid color block.
  // Mixed-party sections (Whoami, Notes) leave this unset and let each
  // step pick its own tint from its label.
  if (defaultParty) section.dataset.party = defaultParty
  const summary = document.createElement('summary')
  summary.className = 'log-section-heading'
  summary.textContent = title
  section.appendChild(summary)
  log.appendChild(section)
  persistActiveLog()
}

// Return the most recently added section <details> that steps should
// append into. Falls back to the log root if no section has been opened
// yet (shouldn't happen on the main flows, but keeps us safe against
// any call order edge case).
function currentSection(log) {
  const sections = log.querySelectorAll(':scope > details.log-section')
  return sections[sections.length - 1] || log
}

function addLogStep(label, status, content) {
  const log = currentLog()
  if (!log) return null
  showLog()
  const target = currentSection(log)
  const expandable = isExpandable(content)
  const step = expandable ? document.createElement('details') : document.createElement('div')
  const party = partyForLabel(label, target, previousStep(target))
  step.className = `log-step section-group ${status}${expandable ? '' : ' log-step-static'}${party ? ` party-bg-${party}` : ''}`
  if (expandable) step.open = true

  const heading = document.createElement(expandable ? 'summary' : 'div')
  heading.className = 'section-heading'
  heading.innerHTML = `<span class="step-label">${statusIndicatorHtml(status)}<span class="step-text">${applyPartyBadges(label)}</span></span>${expandable ? CHEVRON_SVG : ''}`
  step.appendChild(heading)

  const body = document.createElement('div')
  body.className = 'log-step-body'
  body.innerHTML = content
  step.appendChild(body)

  target.appendChild(step)
  requestAnimationFrame(() => {
    step.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
  persistActiveLog()
  return step
}

// Update an existing step's status + label in place (instead of removing it).
function resolveStep(step, status, label) {
  if (!step) return
  const isStatic = step.classList.contains('log-step-static')
  // Re-derive party tint from the new label — most resolveStep calls
  // only flip status, but a few rewrite the label too (e.g. consent
  // prompt → "Interaction Completed"), and we want the tint to follow.
  const section = step.closest('details.log-section')
  const party = partyForLabel(label, section, previousStepBefore(step))
  step.className = `log-step section-group ${status}${isStatic ? ' log-step-static' : ''}${party ? ` party-bg-${party}` : ''}`
  const statusEl = step.querySelector('.step-status')
  const textEl = step.querySelector('.step-text')
  if (statusEl) statusEl.outerHTML = statusIndicatorHtml(status)
  if (textEl) textEl.innerHTML = applyPartyBadges(label)
  persistActiveLog()
}

// If a resolved step ended up with an empty body, drop its
// expand/collapse chrome (chevron, clickable summary) — the dropdown
// toggles to nothing, which reads as broken. Rebuilds the <details>
// as a <div class="log-step-static"> preserving its status classes
// and heading text, and returns the new node so callers can update
// their reference.
function demoteIfEmpty(step) {
  if (!step || step.tagName !== 'DETAILS') return step
  const body = step.querySelector('.log-step-body')
  if (body && body.textContent.trim()) return step

  const div = document.createElement('div')
  div.className = step.className.includes('log-step-static')
    ? step.className
    : `${step.className} log-step-static`

  const summary = step.querySelector('summary.section-heading')
  if (summary) {
    const heading = document.createElement('div')
    heading.className = summary.className
    heading.innerHTML = summary.innerHTML
    heading.querySelector('.section-chevron')?.remove()
    div.appendChild(heading)
  }
  // Drop the empty body entirely — keeping it would render a 0.5rem
  // margin-top gap beneath the heading (from .log-step-body), reading
  // as extra vertical space the user notices between this step and
  // the next.

  // Preserve data-* attributes (consent-key, poll-key) used by resume
  // code to find pre-redirect steps on return.
  for (const attr of step.attributes) {
    if (attr.name.startsWith('data-')) div.setAttribute(attr.name, attr.value)
  }

  step.replaceWith(div)
  persistActiveLog()
  return div
}

// Append additional HTML into an existing step's body — used to fold a
// response rendering under the same step as its request, so one step = one
// round-trip instead of a separate request and response row.
function appendStepBody(step, html) {
  if (!step) return
  const body = step.querySelector('.log-step-body')
  if (!body) return
  body.insertAdjacentHTML('beforeend', html)
  persistActiveLog()
}

function anotherRequestButton() {
  // Terminal-state rendering — the flow has completed or failed. Also
  // re-show the resource-section's Call buttons (hidden during the
  // flow) so the user can kick off the same tab again, switch tabs,
  // or click Another Authorization Request. All three are valid next
  // actions and we want them on screen together rather than
  // gatekeeping behind the Another Request click.
  //
  // Persisted-log lifecycle: we deliberately DON'T clear on terminal.
  // The trail stays in localStorage so a later page reload still
  // shows the completed flow (collapsed). Clears happen only on Reset
  // or when a new flow starts (clearLog in startBootstrap /
  // startWhoami / startNotes).
  queueMicrotask(() => {
    document.querySelectorAll('#resource-section .authz-actions')
      .forEach((el) => el.classList.remove('hidden'))
  })
  return `<div class="log-actions"><button type="button" class="btn-outline js-scroll-authz">${escapeHtml(copy('ui.another_request_button'))}</button></div>`
}

function tokenWrap(innerHtml, extraClass = '') {
  const id = nextCopyId()
  return `<div class="token-wrap">
    <button class="copy-btn copy-btn-float" type="button" data-copy-target="#${id}" aria-label="Copy"></button>
    <div class="token-display${extraClass ? ' ' + extraClass : ''}" id="${id}">${innerHtml}</div>
  </div>`
}

function formatRequest(method, url, headers, body) {
  let inner = `${escapeHtml(method)} ${escapeHtml(url)}\n`
  if (headers) {
    for (const [k, v] of Object.entries(headers)) {
      inner += `${escapeHtml(k)}: ${escapeHtml(v)}\n`
    }
  }
  if (body) {
    inner += `\n${renderJSON(body)}`
  }
  return `<div class="token-label">Request</div>${tokenWrap(inner)}`
}

function formatResponse(status, headers, body) {
  let inner = `HTTP ${status}\n`
  if (headers) {
    for (const [k, v] of Object.entries(headers)) {
      inner += `${escapeHtml(k)}: ${escapeHtml(v)}\n`
    }
  }
  if (body) {
    inner += `\n${renderJSON(body)}`
  }
  return `<div class="token-label">Response</div>${tokenWrap(inner)}`
}

function formatToken(label, token, decoded) {
  return `
    <details class="section-group">
      <summary class="section-heading"><span>${escapeHtml(label)}</span>${CHEVRON_SVG}</summary>
      ${tokenWrap(renderEncodedJWT(token), 'encoded')}
    </details>
    ${formatDecoded(decoded)}
  `
}

// Decoded JWT payload as its own open <details>. Used on its own
// (e.g., under a /pending or /verify response block) to surface the
// decoded token alongside the raw response without the extra
// 'encoded token' block formatToken emits.
function formatDecoded(decoded) {
  return `
    <details class="section-group" open>
      <summary class="section-heading"><span>Decoded</span>${CHEVRON_SVG}</summary>
      ${tokenWrap(renderJSON(decoded))}
    </details>
  `
}

// Inline variant of formatToken used by Authorization Granted — no outer
// collapsible, since the surrounding "Authorization Granted" step already
// labels the token.
function formatAuthToken(token) {
  return `
    ${tokenWrap(renderEncodedJWT(token), 'encoded')}
    <details class="section-group" open>
      <summary class="section-heading"><span>Decoded</span>${CHEVRON_SVG}</summary>
      ${tokenWrap(renderJSON(decodeJWTPayloadBrowser(token)))}
    </details>
  `
}

// ── Scope collection ──

function getSelectedIdentityScopes() {
  const checkboxes = document.querySelectorAll('#identity-scope-grid input[type="checkbox"]:checked')
  return Array.from(checkboxes).map((cb) => cb.value).join(' ')
}

function getHints() {
  // Hints UI was removed from the bootstrap section (PS routing hints
  // belonged to the old PS bootstrap call); resource flows still call
  // this and an empty object Just Works at the PS /token endpoint.
  return {}
}

// ── Bootstrap ──
//
// Per draft-hardt-aauth-bootstrap, the agent provider issues an agent
// token directly: the agent generates a signing key, signs the request
// with sig=hwk, and the AP returns a token bound to that key. No PS
// involvement at this stage — the PS binds the agent to a person lazily,
// on the agent's first three-party flow (whoami / notes).
async function runBootstrap(psUrl) {
  addLogSection(copy('sections.bootstrap'))

  // Step 0: rotate the durable signing key. We always start with a
  // fresh key on click — a re-bootstrap signals the user wants a clean
  // slate (different agent identity at the AP). Refresh later reuses
  // the same key without rotating.
  const { keyPair, publicJwk } = await window.aauthEphemeral.rotate()
  addLogStep(copy('bootstrap.generate_ephemeral.label'), 'success',
    desc('bootstrap.generate_ephemeral') +
    tokenWrap(renderJSON({ kty: publicJwk.kty, crv: publicJwk.crv, x: publicJwk.x }))
  )

  // Step 1: POST /bootstrap to the Agent Provider. Signed sig=hwk so
  // the AP can compute the JWK thumbprint and bind it to a local-part
  // in KV. Body carries the user-picked PS URL — the AP includes it
  // as the `ps` claim on the agent_token so resources know where to
  // exchange resource_tokens.
  const endpoint = `${window.location.origin}/bootstrap`
  const body = { ps: psUrl }
  const reqStep = addLogStep(fmt(copy('bootstrap.agent_provider_request.label_template'), { path: '/bootstrap' }), 'pending',
    desc('bootstrap.agent_provider_request') +
    formatRequest('POST', endpoint, {
      'Content-Type': 'application/json',
      'Signature-Input': 'sig=("@method" "@authority" "@path" "content-type" "signature-key");created=...',
      'Signature': 'sig=:...:',
      'Signature-Key': `sig=hwk;kty="${publicJwk.kty}";crv="${publicJwk.crv}";x="${publicJwk.x}"`,
    }, body)
  )

  let result
  try {
    const res = await sigFetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signingKey: publicJwk,
      signingCryptoKey: keyPair.privateKey,
      signatureKey: { type: 'hwk' },
      components: ['@method', '@authority', '@path', 'content-type', 'signature-key'],
    })
    result = await res.json().catch(() => null)
    if (!res.ok || !result?.agent_token) {
      resolveStep(reqStep, 'error', fmt(copy('bootstrap.agent_provider_request.label_resolved_template'), { path: '/bootstrap' }) + ` → ${res.status}`)
      appendStepBody(reqStep, formatResponse(res.status, null, result))
      return false
    }
    resolveStep(reqStep, 'success', fmt(copy('bootstrap.agent_provider_request.label_resolved_template'), { path: '/bootstrap' }) + ` → ${res.status}`)
    appendStepBody(reqStep, formatResponse(res.status, null, result))
    appendStepBody(reqStep, formatDecoded(decodeJWTPayloadBrowser(result.agent_token)))
  } catch (err) {
    resolveStep(reqStep, 'error', fmt(copy('bootstrap.agent_provider_request.label_error_network_template'), { path: '/bootstrap' }))
    appendStepBody(reqStep, `<p style="color: var(--error)">${escapeHtml(err.message)}</p>`)
    return false
  }

  window.aauthApplyBootstrapResult(result)
  return { result }
}

// ── Refresh ──
//
// Mint a fresh agent_token under the same durable key. The AP looks
// the agent up by JWK thumbprint, so all we send is a sig=hwk request
// with the same key the AP recorded at bootstrap.
async function runRefresh() {
  const keyPair = window.aauthEphemeral.get()
  if (!keyPair) {
    addLogStep(copy('refresh.cannot_refresh.label'), 'error',
      desc('refresh.cannot_refresh'))
    return null
  }

  addLogSection(copy('sections.refresh'))

  const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
  // Carry the same PS URL the agent_token currently names so the
  // refreshed token preserves it. If there's no current token (rare —
  // restoreAgentTokenAndKey already returned false in that case), fall
  // back to the user's selected PS.
  let psUrl
  const savedToken = localStorage.getItem('aauth-agent-token')
  if (savedToken) {
    try { psUrl = decodeJWTPayloadBrowser(savedToken)?.ps } catch { /* ignore */ }
  }
  if (!psUrl) psUrl = window.getCurrentPS?.() || undefined
  const body = psUrl ? { ps: psUrl } : {}

  const endpoint = `${window.location.origin}/refresh`
  const reqStep = addLogStep(fmt(copy('refresh.agent_provider_request.label_template'), { path: '/refresh' }), 'pending',
    desc('refresh.agent_provider_request') +
    formatRequest('POST', endpoint, {
      'Content-Type': 'application/json',
      'Signature-Input': 'sig=("@method" "@authority" "@path" "content-type" "signature-key");created=...',
      'Signature': 'sig=:...:',
      'Signature-Key': `sig=hwk;kty="${publicJwk.kty}";crv="${publicJwk.crv}";x="${publicJwk.x}"`,
    }, body)
  )

  let result
  try {
    const res = await sigFetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signingKey: publicJwk,
      signingCryptoKey: keyPair.privateKey,
      signatureKey: { type: 'hwk' },
      components: ['@method', '@authority', '@path', 'content-type', 'signature-key'],
    })
    result = await res.json().catch(() => null)
    if (!res.ok || !result?.agent_token) {
      resolveStep(reqStep, 'error', fmt(copy('refresh.agent_provider_request.label_resolved_template'), { path: '/refresh' }) + ` → ${res.status}`)
      appendStepBody(reqStep, formatResponse(res.status, null, result))
      return null
    }
    resolveStep(reqStep, 'success', fmt(copy('refresh.agent_provider_request.label_resolved_template'), { path: '/refresh' }) + ` → ${res.status}`)
    appendStepBody(reqStep, formatResponse(res.status, null, result))
    appendStepBody(reqStep, formatDecoded(decodeJWTPayloadBrowser(result.agent_token)))
  } catch (err) {
    resolveStep(reqStep, 'error', fmt(copy('refresh.agent_provider_request.label_error_network_template'), { path: '/refresh' }))
    appendStepBody(reqStep, `<p style="color: var(--error)">${escapeHtml(err.message)}</p>`)
    return null
  }

  window.aauthApplyBootstrapResult(result)
  return result
}

// ── Main flows: Bootstrap button + Resource Request button ──
//
// Two independent entry points, mutually exclusive in the UI:
//
//   startBootstrap — calls the AP's /bootstrap endpoint and mints an
//                    agent_token. No PS interaction; the agent_token's
//                    `ps` claim is the PS that will see the agent on
//                    the first three-party flow.
//
//   startWhoami    — post-bootstrap. Reads the bound PS off the saved
//                    agent_token, refreshes the token if expired, and
//                    GETs whoami (401 → PS /token → 200 + claims).

async function startBootstrap() {
  const psUrl = (window.getCurrentPS?.() || '').trim()
  if (!psUrl) {
    alert('Please choose or enter a Person Server URL')
    return
  }

  // Hide the pre-bootstrap controls so the button vanishes the instant
  // the user clicks it — any async work that follows never leaves the
  // CTA on screen. Re-shown only if runBootstrap errors out.
  const controls = document.getElementById('bootstrap-controls')
  controls?.classList.add('hidden')

  // Fresh bootstrap — drop any stale token before starting. The old
  // signing key in IndexedDB stays put: rotateKeyPair (called by
  // runBootstrap → window.aauthEphemeral.rotate) overwrites it.
  localStorage.removeItem('aauth-agent-token')

  // Reset the inline Agent Identity + Resource Request UI back to its
  // pre-bootstrap state.
  window.aauthUI?.setUnauthenticated?.()

  // Show the green-line artifacts wrapper so the bootstrap-log
  // renders. setUnauthenticated hid it as part of the reset; we want
  // it visible for the flow that's about to start.
  document.getElementById('bootstrap-artifacts')?.classList.remove('hidden')

  setActiveLog('bootstrap-log')
  clearLog()
  showLog()

  const result = await runBootstrap(psUrl)
  if (!result) {
    controls?.classList.remove('hidden')
  }
}

// Read the PS the agent_token currently names. Returns null if there's
// no saved token or the token doesn't carry a `ps` claim.
function getBoundPs() {
  const token = localStorage.getItem('aauth-agent-token')
  if (!token) return null
  try { return decodeJWTPayloadBrowser(token)?.ps || null } catch { return null }
}


// ── Whoami resource call ──
//
// Three-step ceremony that demonstrates the full resource-call flow:
//
//   1. Agent GETs whoami with its agent_token. Whoami responds 401 with
//      a minted resource_token in AAuth-Requirement — it knows who the
//      agent is, but the agent hasn't presented a user-released token yet.
//   2. Agent exchanges the resource_token at the PS's /token endpoint.
//      Returns auth_token on 200 (user already consented to this scope
//      pair) or 202 + interaction on first-time consent.
//   3. Agent retries the GET with auth_token. Whoami verifies the token
//      against the PS's JWKS, checks 'whoami' scope, and returns the
//      identity claims encoded in the payload.
//
// getHints() pulls from the bootstrap section; getSelectedIdentityScopes()
// drives both the ?scope= query and what the PS releases into the token.

async function startWhoami() {
  const bindingPs = getBoundPs() || window.getCurrentPS?.()
  if (!bindingPs) {
    alert('No agent token found. Bootstrap first.')
    return
  }

  setActiveLog('whoami-log')
  clearLog()
  showLog()

  document.querySelector('#resource-section .authz-actions')?.classList.add('hidden')

  // Refresh agent_token if expired — whoami needs a live one to sign the
  // initial GET. Refresh steps render in this same whoami-log so the
  // user sees the full trail in one place.
  let agentTokenValid = false
  const savedAgentToken = localStorage.getItem('aauth-agent-token')
  if (savedAgentToken) {
    try {
      const p = decodeJWTPayloadBrowser(savedAgentToken)
      agentTokenValid = p && p.exp > Math.floor(Date.now() / 1000)
    } catch { /* invalid token */ }
  }
  if (!agentTokenValid) {
    const refreshed = await runRefresh()
    if (!refreshed) return
  }

  const hints = getHints()
  const identityScopes = getSelectedIdentityScopes()
  const whoamiOrigin = window.WHOAMI_ORIGIN || 'https://whoami.aauth.dev'
  const whoamiUrl = identityScopes
    ? `${whoamiOrigin}/?scope=${encodeURIComponent(identityScopes)}`
    : `${whoamiOrigin}/`

  await runWhoamiCall(whoamiUrl, bindingPs, hints)
}

async function runWhoamiCall(whoamiUrl, bindingPs, hints) {
  const keyPair = window.aauthEphemeral.get()
  const agentToken = localStorage.getItem('aauth-agent-token')
  if (!keyPair || !agentToken) {
    addLogStep('Missing agent_token or ephemeral key', 'error',
      '<p>The agent doesn\'t have an agent token or key yet — bootstrap has to finish first.</p>')
    return
  }
  const signingJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)

  addLogSection(copy('sections.whoami'))

  const urlObj = new URL(whoamiUrl)
  const whoamiPathDisplay = urlObj.pathname + urlObj.search

  // Step 1: unauthenticated-for-user GET. Agent token proves the agent's
  // identity but carries no user claims, so whoami bounces with a
  // resource_token the agent can trade at the PS.
  const step1 = addLogStep(`Agent → Whoami: GET ${whoamiPathDisplay}`, 'pending',
    `<p>Agent calls whoami with its agent_token. The resource knows the agent but has no user claims yet, so it returns 401 with a resource_token the agent can exchange at the Person Server.</p>` +
    formatRequest('GET', whoamiUrl, {
      'Signature-Input': 'sig=("@method" "@authority" "@path" "signature-key");created=...',
      'Signature': 'sig=:...:',
      'Signature-Key': `sig=jwt;jwt="${agentToken?.substring(0, 20)}..."`,
    }, null)
  )

  let resourceToken
  try {
    const res = await sigFetch(whoamiUrl, {
      method: 'GET',
      signingKey: signingJwk,
      signingCryptoKey: keyPair.privateKey,
      signatureKey: { type: 'jwt', jwt: agentToken },
      components: ['@method', '@authority', '@path', 'signature-key'],
    })
    const body = await res.json().catch(() => null)
    const requirement = res.headers.get('aauth-requirement') || ''
    const respHeaders = {}
    if (requirement) respHeaders['aauth-requirement'] = requirement
    if (res.status === 401) {
      resourceToken = parseInteractionHeader(requirement)['resource-token']
    }

    // 200 with no scope requested: whoami returns the agent identity
    // (sub + ps) directly off the agent_token without needing user
    // claims. No PS exchange step — render the body as the final
    // response and end the flow.
    if (res.status === 200) {
      resolveStep(step1, 'success', `Agent → Whoami: GET ${whoamiPathDisplay}`)
      appendStepBody(step1, formatResponse(200, respHeaders, body))
      addLogStep('Agent identity received', 'success',
        `<p>No scopes were requested, so whoami returned the agent's own identity straight from the agent_token — no Person Server exchange needed.</p>` +
        tokenWrap(renderJSON(body)) +
        anotherRequestButton()
      )
      return
    }
    if (res.status === 401 && resourceToken) {
      resolveStep(step1, 'success', `Agent → Whoami: GET ${whoamiPathDisplay}`)
      appendStepBody(step1, formatResponse(401, respHeaders, body))
      appendStepBody(step1, formatDecoded(decodeJWTPayloadBrowser(resourceToken)))
    } else {
      resolveStep(step1, 'error', `Agent → Whoami: GET ${whoamiPathDisplay}`)
      appendStepBody(step1, formatResponse(res.status, respHeaders, body) + anotherRequestButton())
      return
    }
  } catch (err) {
    resolveStep(step1, 'error', `Agent → Whoami: GET ${whoamiPathDisplay} (network error)`)
    appendStepBody(step1, `<p style="color: var(--error)">${escapeHtml(err.message)}</p>` + anotherRequestButton())
    return
  }

  // Step 2: hand off to the shared resource flow for the PS token
  // exchange + 202/long-poll/consent. The labels below preserve the
  // exact strings whoami used pre-refactor (whoami's POST step, unlike
  // notes', appends ` → ${status}` on error).
  await runPSTokenExchange({
    resourceToken,
    bindingPs,
    hints,
    keyPair,
    agentToken,
    signingJwk,
    labels: {
      postLabel: (path) => `Agent → Person Server: POST ${path}`,
      postLabelResolved: (path, status) =>
        status === 200 || status === 202
          ? `Agent → Person Server: POST ${path}`
          : `Agent → Person Server: POST ${path} → ${status}`,
      postLabelNetworkError: (path) => `Agent → Person Server: POST ${path} (network error)`,
      postDescription: `<p>Agent presents the resource_token and its agent_token to the Person Server's token endpoint. The PS either releases an auth_token immediately (cached consent) or returns a 202 with a consent prompt.</p>`,
      pollLabel: (path) => `Agent → Person Server: GET ${path} (long-poll)`,
      pollDescription: `<p>Agent keeps a request open while you decide, instead of polling. The Person Server answers the moment you approve or deny.</p>`,
      consentLabel: copy('authorize.ps_consent_prompt.label'),
      consentDescription: desc('authorize.ps_consent_prompt'),
    },
    consentKey: 'whoami',
    pendingExtra: { whoamiUrl },
    onAuthToken: async (token, { viaPolling }) => {
      // 200 path renders decoded inline on the POST step; only the
      // 202/poll path needs a separate "Auth Token received" step
      // (otherwise retryWhoami's "compare against the decoded payload
      // above" copy points at nothing).
      if (viaPolling) showWhoamiAuthTokenReceived(token)
      await retryWhoami(whoamiUrl, whoamiPathDisplay, token, keyPair, signingJwk)
    },
  })
}

function showWhoamiAuthTokenReceived(authToken) {
  // The cached-consent (200) path renders the decoded payload inline on
  // the token-exchange step; the consent (202) path arrives here via
  // long-poll, so without this step the decoded auth_token would never
  // surface — and retryWhoami's "compare against the decoded payload
  // above" copy would have nothing to point at.
  addLogStep('Auth Token received', 'success',
    `<p>The Person Server released an auth_token for the requested whoami scopes. The agent will use this to sign the next call to Whoami.</p>` +
    formatDecoded(decodeJWTPayloadBrowser(authToken))
  )
}

async function retryWhoami(whoamiUrl, whoamiPathDisplay, authToken, keyPair, signingJwk) {
  const step = addLogStep(`Agent → Whoami: GET ${whoamiPathDisplay}`, 'pending',
    `<p>Same GET as before, now signed with the auth_token. Whoami verifies the token against the Person Server's JWKS, checks that 'whoami' is in scope, and returns the identity claims carried in the payload.</p>` +
    formatRequest('GET', whoamiUrl, {
      'Signature-Input': 'sig=("@method" "@authority" "@path" "signature-key");created=...',
      'Signature': 'sig=:...:',
      'Signature-Key': `sig=jwt;jwt="${authToken?.substring(0, 20)}..."`,
    }, null)
  )
  try {
    const res = await sigFetch(whoamiUrl, {
      method: 'GET',
      signingKey: signingJwk,
      signingCryptoKey: keyPair.privateKey,
      signatureKey: { type: 'jwt', jwt: authToken },
      components: ['@method', '@authority', '@path', 'signature-key'],
    })
    const body = await res.json().catch(() => null)
    resolveStep(step, res.ok ? 'success' : 'error', `Agent → Whoami: GET ${whoamiPathDisplay}`)
    if (res.ok) {
      // Skip the generic Response block — the "Identity claims received"
      // step below renders the same JSON as the protocol-level response,
      // so surfacing both just duplicates the payload.
      addLogStep('Identity claims received', 'success',
        `<p>These are the claims the Person Server released for the scopes you granted. Compare them against the decoded auth_token payload above — whoami returns them verbatim from the token.</p>` +
        tokenWrap(renderJSON(body)) +
        anotherRequestButton()
      )
    } else {
      appendStepBody(step, formatResponse(res.status, null, body))
      appendStepBody(step, anotherRequestButton())
    }
  } catch (err) {
    resolveStep(step, 'error', `Agent → Whoami: GET ${whoamiPathDisplay} (network error)`)
    appendStepBody(step, `<p style="color: var(--error)">${escapeHtml(err.message)}</p>` + anotherRequestButton())
  }
}

// ── Interaction handling (unchanged) ──

function parseInteractionHeader(header) {
  const result = {}
  const parts = header.split(';').map(s => s.trim())
  for (const part of parts) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const key = part.substring(0, eq).trim()
    let val = part.substring(eq + 1).trim()
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
    result[key] = val
  }
  return result
}

// kind distinguishes the two call sites so the heading names what the
// user is actually approving:
//   'bootstrap' — agent↔user binding
//   'authorize' — scope release for a specific agent + resource
// Defaults to 'bootstrap' since that was the original / only use.
function renderInteraction(interaction, pollUrl, kind = 'bootstrap') {
  if (!interaction.url || !interaction.code) {
    const missing = []
    if (!interaction.url) missing.push('interaction_endpoint (PS metadata) or url (header)')
    if (!interaction.code) missing.push('code')
    return `<p style="color: var(--muted);">Interaction required but missing: ${escapeHtml(missing.join(', '))}.</p>`
  }

  const heading = kind === 'authorize'
    ? copy('ui.approve_at_ps.authorize_heading')
    : copy('ui.approve_at_ps.bootstrap_heading')

  // Popup callback target — a tiny static page that calls window.close().
  // Parent never navigates in popup mode; PS still long-polls in parallel
  // and surfaces the auth_token to the parent independently of any popup
  // ↔ parent communication. QR-code URL still omits ?callback= for
  // compactness — scanning to a phone has its own self-close UX in PS.
  const callbackUrl = `${window.location.origin}/popup-callback`
  const sameDeviceUrl = `${interaction.url}?code=${encodeURIComponent(interaction.code)}&callback=${encodeURIComponent(callbackUrl)}`
  const qrUrl = `${interaction.url}?code=${encodeURIComponent(interaction.code)}`
  const qrId = `qr-${Math.random().toString(36).slice(2, 9)}`

  // Bootstrap is a one-click ceremony — just Continue with Hellō, no QR.
  // QR-scan belongs on resource-token flows (where a different user might
  // want to pick up the auth on their phone), not on the initial
  // agent↔user binding.
  const showQr = kind !== 'bootstrap'

  const html = `
    <div class="interaction-box">
      <p class="interaction-heading">${escapeHtml(heading)}</p>
      <div class="interaction-actions">
        <a class="hello-btn hello-btn-black-on-dark" href="${escapeHtml(sameDeviceUrl)}">ō&nbsp;&nbsp;&nbsp;Continue with Hellō</a>
      </div>
      ${showQr ? `
        <div class="interaction-or"><span>${escapeHtml(copy('ui.approve_at_ps.or_another_device'))}</span></div>
        <div class="qr-code" id="${qrId}"></div>
        <div class="interaction-url-row">
          <button class="copy-btn copy-link-text" type="button" data-copy="${escapeHtml(qrUrl)}">
            <span class="copy-link-text__default">Copy link</span>
            <span class="copy-link-text__copied">Copied!</span>
          </button>
        </div>
      ` : ''}
    </div>
  `

  if (showQr) {
    setTimeout(() => {
      const qrContainer = document.getElementById(qrId)
      if (!qrContainer) return
      try {
        const qr = qrcode(0, 'M')
        qr.addData(qrUrl)
        qr.make()
        qrContainer.innerHTML = qr.createSvgTag({ scalable: true, margin: 0 })
      } catch (err) {
        qrContainer.textContent = `(QR generation failed: ${err.message})`
      }
    }, 0)
  }

  return html
}


// ── Pending-authorize state (survives same-tab redirect to wallet) ──

const PENDING_AUTHZ_KEY = 'aauth-pending-authorize'

function savePendingAuthorize(state) {
  try { localStorage.setItem(PENDING_AUTHZ_KEY, JSON.stringify({ ...state, startedAt: Date.now() })) } catch {}
}

function clearPendingAuthorize() {
  try { localStorage.removeItem(PENDING_AUTHZ_KEY) } catch {}
}

// Idempotency guard — app.js's init IIFE AND the window-load fallback
// both call resumePendingAuthorize. Without this guard the second call
// spawns a parallel polling loop whose signatures interleave with the
// first loop's; the server sees requests whose `created` timestamp is
// ~60s stale relative to "now", yielding 401 invalid_signature with
// skew at the 60s tolerance boundary.
let _resumeAuthorizePolling = false

// Called on page load: if we have a persisted pending-authorize, resume
// polling the PS for auth_token. Mounted after app.js init so the
// signing key + agent_token are already restored.
async function resumePendingAuthorize() {
  let saved
  try { saved = JSON.parse(localStorage.getItem(PENDING_AUTHZ_KEY) || 'null') } catch { saved = null }
  if (!saved?.pollUrl) return false

  // 10-min freshness window — same rationale as pending-bootstrap.
  if (Date.now() - (saved.startedAt || 0) > 10 * 60 * 1000) {
    clearPendingAuthorize()
    return false
  }

  const keyPair = window.aauthEphemeral.get()
  const agentToken = localStorage.getItem('aauth-agent-token')
  if (!keyPair || !agentToken) {
    clearPendingAuthorize()
    return false
  }

  if (_resumeAuthorizePolling) return false
  _resumeAuthorizePolling = true

  // Resumed authorize — pick up the log inside the Resource Request
  // fieldset where the original Call click logged. Hide every Call
  // button across panels: the flow is in progress (same as directly
  // after the click), and we don't want any of them competing with the
  // Another Request button that renders when the poll terminates.
  document.querySelectorAll('#resource-section .authz-actions')
    .forEach((el) => el.classList.add('hidden'))
  // The flow-specific markers on the saved record (whoamiUrl vs.
  // notesAuthorize) also drive which log container the resume steps
  // append into, since whoami and notes have separate logs now.
  setActiveLog(saved.notesAuthorize ? 'notes-log' : 'whoami-log')
  // Make sure the tab matching the flow is active — default HTML has
  // whoami selected, so a notes resume would otherwise land the user
  // on the wrong tab while the Notes box reveals below (user-visible
  // bug: approve notes at PS, come back, Notes app shows but whoami
  // tab is still active).
  window.aauthActivateTab?.(saved.notesAuthorize ? 'notes' : 'whoami')
  showLog()
  // Restore collapses every log-section on reload. Since a resume is
  // actively progressing the ceremony, pop them back open.
  currentLog()?.querySelectorAll(':scope > details.log-section')
    .forEach((s) => s.setAttribute('open', ''))

  // The flow-specific markers on the saved record (whoamiUrl vs.
  // notesAuthorize) tell us which branch to rehydrate. Default to
  // whoami for records saved before the notes flow existed.
  const isNotes = !!saved.notesAuthorize
  const promptKey = isNotes ? 'notes_resumed.ps_consent_prompt' : 'whoami_resumed.ps_consent_prompt'
  // Persisted log (restored at init) should already carry the in-progress
  // Notes/Whoami section; append into it rather than branching a new
  // "(resumed)" section. Fallback opens a fresh section if nothing's
  // been restored (persisted log was cleared mid-flow).
  const log = currentLog()
  if (!log.querySelector(':scope > details.log-section')) {
    addLogSection(copy(isNotes ? 'sections.notes' : 'sections.whoami'))
  }
  // Reuse the pre-redirect "Continue with Hellō / QR" step. Leave its
  // interaction-box body intact so the reader can still see the
  // interface they were handed; on poll 200 the CSS
  // .log-step.success .interaction-box overlays a check mark and
  // stops the flare, turning it into a completed record without
  // blowing out the section. Fallback creates a fresh step if the
  // persisted log was cleared mid-flow.
  const consentKey = isNotes ? 'notes' : 'whoami'
  let interactionStep = log.querySelector(`[data-consent-key="${consentKey}"]`)
  if (!interactionStep) {
    interactionStep = addLogStep(copy(`${promptKey}.label`), 'pending', desc(promptKey))
  }

  // On auth_token arrival, route to the flow-specific handler:
  //   notes  → finalizeNotesAuthToken persists the token and mounts the
  //            Notes app.
  //   whoami → retryWhoami replays the GET whoami/?scope=… signed with
  //            the fresh auth_token and renders identity claims.
  //   (neither marker) → startAuthTokenPolling falls through to the
  //            generic "Authorization Granted" step.
  let options = {}
  if (isNotes) {
    options = {
      onAuthToken: async (tokenFromPoll) => {
        await finalizeNotesAuthToken(tokenFromPoll)
      },
    }
  } else if (saved.whoamiUrl) {
    const urlObj = new URL(saved.whoamiUrl)
    const whoamiPathDisplay = urlObj.pathname + urlObj.search
    const signingJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
    options = {
      onAuthToken: async (tokenFromPoll) => {
        showWhoamiAuthTokenReceived(tokenFromPoll)
        await retryWhoami(saved.whoamiUrl, whoamiPathDisplay, tokenFromPoll, keyPair, signingJwk)
      },
    }
  }

  // Reuse pre-redirect pollStep if persisted log carries it — otherwise
  // startAuthTokenPolling would create a fresh one, leaving the
  // original stuck pending.
  const existingPollStep = log.querySelector(`[data-poll-key="${consentKey}"]`)
  startAuthTokenPolling(saved.pollUrl, saved.tokenEndpoint, interactionStep, existingPollStep || null, options)
  return true
}
window.resumePendingAuthorize = resumePendingAuthorize

// ── Fallback resume trigger ──
//
// app.js's init IIFE calls window.resumePendingAuthorize after restoring
// the agent_token + key. That path has silently no-op'd after some
// page-load timing shifts, leaving the playground blank after a same-tab
// redirect back from the PS. Fire it again on window 'load' so the
// behavior doesn't depend on the IIFE. resumePendingAuthorize guards
// against double-polling (see `_resumeAuthorizePolling`) and staleness,
// so a redundant call here is a safe no-op.
function fireFallbackResume() {
  // Small delay so app.js has had a chance to set ephemeralKeyPair from IDB.
  setTimeout(() => {
    try { window.resumePendingAuthorize?.() } catch (err) { console.error('[aauth] fallback resumePendingAuthorize threw:', err) }
  }, 200)
}
if (document.readyState === 'complete') {
  fireFallbackResume()
} else {
  window.addEventListener('load', fireFallbackResume, { once: true })
}

// ── Shared resource-server flow: PS token exchange + 202 long-poll ──
//
// Both whoami and notes converge here once they have a resource_token.
// The pre-PS phase differs (whoami: 401 bounce on the resource itself;
// notes: discovery + openapi + POST /authorize) and the post-token
// phase differs (whoami: retry the GET, render identity claims; notes:
// mount the Notes app, refresh the list), but PS metadata fetch +
// POST /aauth/token + the 200/202 split + savePendingAuthorize +
// kicking off the long-poll are identical. Per-flow log strings are
// passed in via `labels` so the rendered output stays exactly what
// each flow had before.
async function runPSTokenExchange({
  resourceToken,
  bindingPs,
  hints,
  keyPair,
  agentToken,
  signingJwk,
  // Per-flow labels/descriptions. Functions where the value depends
  // on runtime state (path, status); plain strings/HTML otherwise.
  labels,
  // 'whoami' | 'notes' — written to data-poll-key / data-consent-key
  // so resumePendingAuthorize can re-locate the steps after a same-tab
  // PS redirect.
  consentKey,
  // Merged into the savePendingAuthorize record so the resumed flow
  // can dispatch the correct post-token handler ({whoamiUrl} for
  // whoami, {notesAuthorize: true} for notes, etc.).
  pendingExtra,
  // Called once auth_token is in hand. `viaPolling` is true if the
  // token came from the consent long-poll, false if from the cached
  // 200 path. Whoami uses this to gate showWhoamiAuthTokenReceived
  // (the 200 path already renders decoded inline on the POST step, so
  // a separate "Auth Token received" step would just duplicate). Notes
  // ignores it — its finalizeNotesAuthToken always emits its own step.
  onAuthToken,
}) {
  const psMetadataUrl = `${bindingPs.replace(/\/$/, '')}/.well-known/aauth-person.json`
  let psMetadata
  try {
    const metaRes = await fetch(psMetadataUrl)
    psMetadata = await metaRes.json()
    if (!metaRes.ok || !psMetadata?.token_endpoint) {
      addLogStep('Person Server metadata fetch failed', 'error',
        formatResponse(metaRes.status, null, psMetadata) + anotherRequestButton())
      return
    }
  } catch (err) {
    addLogStep('Person Server metadata fetch failed', 'error',
      `<p style="color: var(--error)">${escapeHtml(err.message)}</p>` + anotherRequestButton())
    return
  }

  const tokenEndpoint = psMetadata.token_endpoint
  const psPath = new URL(tokenEndpoint).pathname
  const psBody = {
    resource_token: resourceToken,
    capabilities: ['interaction'],
    // Force the consent screen every time so the demo always shows the
    // full UX — matches the bootstrap + old authorize flows.
    prompt: 'consent',
    ...hints,
    provider_hint: 'email--',
  }

  const step2 = addLogStep(labels.postLabel(psPath), 'pending',
    labels.postDescription +
    formatRequest('POST', tokenEndpoint, {
      'Content-Type': 'application/json',
      'Signature-Input': 'sig=("@method" "@authority" "@path" "signature-key");created=...',
      'Signature': 'sig=:...:',
      'Signature-Key': `sig=jwt;jwt="${agentToken?.substring(0, 20)}..."`,
    }, psBody),
  )

  let authToken
  try {
    const psRes = await sigFetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(psBody),
      signingKey: signingJwk,
      signingCryptoKey: keyPair.privateKey,
      signatureKey: { type: 'jwt', jwt: agentToken },
      components: ['@method', '@authority', '@path', 'signature-key'],
    })
    const psResBody = await psRes.json().catch(() => null)
    const respHeaders = {}
    for (const key of ['location', 'retry-after', 'aauth-requirement']) {
      const v = psRes.headers.get(key)
      if (v) respHeaders[key] = v
    }

    if (psRes.status === 200 && psResBody?.auth_token) {
      authToken = psResBody.auth_token
      resolveStep(step2, 'success', labels.postLabelResolved(psPath, 200))
      appendStepBody(step2, formatResponse(200, respHeaders, psResBody))
      appendStepBody(step2, formatDecoded(decodeJWTPayloadBrowser(authToken)))
      // Falls through to the post-200 handoff below.
    } else if (psRes.status === 202) {
      resolveStep(step2, 'success', labels.postLabelResolved(psPath, 202))
      appendStepBody(step2, formatResponse(202, respHeaders, psResBody))

      const reqHeader = psRes.headers.get('aauth-requirement') || ''
      const fromHeader = parseInteractionHeader(reqHeader)
      const interaction = {
        requirement: fromHeader.requirement || psResBody?.requirement,
        code: fromHeader.code || psResBody?.code,
        url: fromHeader.url || psMetadata.interaction_endpoint,
      }
      const pollUrl = psRes.headers.get('location') || psResBody?.location

      let pollStep = null
      if (pollUrl) {
        const absolutePollUrl = new URL(pollUrl, tokenEndpoint).href
        pollStep = addLogStep(labels.pollLabel(new URL(absolutePollUrl).pathname), 'pending',
          labels.pollDescription +
          formatRequest('GET', absolutePollUrl, {
            'Prefer': `wait=${POLL_WAIT_SECONDS}`,
            'Signature-Input': 'sig=("@method" "@authority" "@path" "signature-key");created=...',
            'Signature': 'sig=:...:',
            'Signature-Key': `sig=jwt;jwt="${agentToken?.substring(0, 20)}..."`,
          }, null),
        )
        if (pollStep) {
          pollStep.dataset.pollKey = consentKey
          persistActiveLog()
        }
      }
      const interactionStep = addLogStep(labels.consentLabel, 'pending',
        labels.consentDescription + renderInteraction(interaction, pollUrl, 'authorize'))
      // Tag so resumePendingAuthorize can reuse this step on return
      // from the PS instead of leaving the stale "Continue with Hellō /
      // QR" card alongside the fresh poll step.
      if (interactionStep) {
        interactionStep.dataset.consentKey = consentKey
        persistActiveLog()
      }

      if (pollUrl) {
        const absolutePollUrl = new URL(pollUrl, tokenEndpoint).href
        savePendingAuthorize({
          pollUrl: absolutePollUrl,
          tokenEndpoint,
          psUrl: bindingPs,
          ...pendingExtra,
        })
        startAuthTokenPolling(pollUrl, tokenEndpoint, interactionStep, pollStep, {
          onAuthToken: async (tokenFromPoll) => {
            await onAuthToken(tokenFromPoll, { viaPolling: true })
          },
        })
      }
      return // polling handles the rest
    } else {
      resolveStep(step2, 'error', labels.postLabelResolved(psPath, psRes.status))
      appendStepBody(step2, formatResponse(psRes.status, respHeaders, psResBody) + anotherRequestButton())
      return
    }
  } catch (err) {
    resolveStep(step2, 'error', labels.postLabelNetworkError(psPath))
    appendStepBody(step2, `<p style="color: var(--error)">${escapeHtml(err.message)}</p>` + anotherRequestButton())
    return
  }

  // Post-200 (cached consent) handoff. The 202 path returns above and
  // hands off via the polling onAuthToken wrapper.
  await onAuthToken(authToken, { viaPolling: false })
}

// ── Auth-token polling (for PS /token interaction flow) ──
//
// Long-poll pattern: send `Prefer: wait=POLL_WAIT_SECONDS`
// and loop immediately on 202. Agent token + ephemeral key are snapshotted
// once at start; the polling is signed with sig=jwt using them.

// Module-level guard: at most one authz poll loop ever running. Callers
// (runWhoamiCall, resumePendingAuthorize) may each invoke us
// independently; without this flag their loops interleave and one loop's
// signature stamps trail the other's by 30s+, which the PS sees as stale
// signatures and rejects with skew-at-tolerance-boundary 401s. Clear on
// terminal status (200 / 403 / 408) so a follow-up authorization can
// start fresh.
let _authzPollRunning = false

async function startAuthTokenPolling(pollUrl, baseUrl, interactionStep, pollStep, options = {}) {
  if (_authzPollRunning) return
  _authzPollRunning = true
  try {
    await _startAuthTokenPollingImpl(pollUrl, baseUrl, interactionStep, pollStep, options)
  } finally {
    _authzPollRunning = false
  }
}

async function _startAuthTokenPollingImpl(pollUrl, baseUrl, interactionStep, pollStep, options = {}) {
  // Pin the log container this poll loop writes into BEFORE any await.
  // While the long-poll awaits user interaction, other code may run
  // that flips __activeLogContainer (e.g. restoreNotesApp →
  // callNotesAPI on page reload, fired right after this function
  // hits its first await). When the 200 finally arrives, currentLog()
  // may no longer point at the log this flow started in — terminal
  // steps would then land in the wrong tab and read as a "stuck"
  // flow. Capture synchronously here, restore right before every
  // terminal addLogStep / onAuthToken handoff. Capturing after any
  // await is too late: the clobber can have already happened.
  const targetLog = currentLog()
  const pinLog = () => { if (targetLog) __activeLogContainer = targetLog }
  const absolutePollUrl = new URL(pollUrl, baseUrl).href
  const keyPair = window.aauthEphemeral.get()
  const agentToken = localStorage.getItem('aauth-agent-token')
  if (!keyPair || !agentToken) return
  const signingJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)

  const pollPath = new URL(absolutePollUrl).pathname
  // Caller can pre-create the pollStep so the log orders as
  //   POST /aauth/token → 202
  //   GET  /aauth/pending (long-poll)
  //   User at PS: consent prompt
  // When not provided (resume paths), fall back to creating it inline.
  if (!pollStep) {
    pollStep = addLogStep(fmt(copy('authorize.ps_pending_longpoll.label_template'), { path: pollPath }), 'pending',
      desc('authorize.ps_pending_longpoll') +
      formatRequest('GET', absolutePollUrl, {
        'Prefer': `wait=${POLL_WAIT_SECONDS}`,
        'Signature-Input': 'sig=("@method" "@authority" "@path" "signature-key");created=...',
        'Signature': 'sig=:...:',
        'Signature-Key': `sig=jwt;jwt="${agentToken?.substring(0, 20)}..."`,
      }, null)
    )
  }

  let cycle = 0
  while (true) {
    cycle++
    try {
      const res = await sigFetch(absolutePollUrl, {
        method: 'GET',
        headers: { Prefer: `wait=${POLL_WAIT_SECONDS}` },
        signingKey: signingJwk,
        signingCryptoKey: keyPair.privateKey,
        signatureKey: { type: 'jwt', jwt: agentToken },
        components: ['@method', '@authority', '@path', 'signature-key'],
      })
      const respHeaders = {}
      for (const key of ['retry-after', 'aauth-requirement']) {
        const v = res.headers.get(key)
        if (v) respHeaders[key] = v
      }
      const body = await res.json().catch(() => null)
      // Surface every cycle's response so the user sees each 202 retry.
      // On the first cycle, render the response inline — the outer step
      // label already carries the status, so a "Cycle 1 → 200" wrapper
      // is pure redundancy. From cycle 2 onward, wrap each response in a
      // collapsible summary so long-poll loops stay readable.
      if (cycle === 1) {
        appendStepBody(pollStep, formatResponse(res.status, respHeaders, body))
      } else {
        appendStepBody(pollStep,
          `<details class="section-group"><summary class="section-heading"><span>Cycle ${cycle} \u2192 ${res.status}</span>${CHEVRON_SVG}</summary>${formatResponse(res.status, respHeaders, body)}</details>`
        )
      }
      if (res.status === 200) {
        clearPendingAuthorize()
        resolveStep(pollStep, 'success', fmt(copy('authorize.ps_pending_longpoll.label_resolved_template'), { path: pollPath, status: 200 }))
        // Resolve only — the interaction-box body stays in place as
        // a record of the consent interface the user was handed. CSS
        // (.log-step.success .interaction-box) stops the flare and
        // overlays an approved check mark across the box.
        resolveStep(interactionStep, 'success', 'Interaction Completed')
        pinLog()
        // If a caller supplied onAuthToken (e.g. whoami needs to retry the
        // resource call with the freshly-minted token), hand off to them.
        // Otherwise render the generic "Authorization Granted" step.
        if (options.onAuthToken && body?.auth_token) {
          await options.onAuthToken(body.auth_token)
        } else {
          addLogStep(copy('authorize.authorization_granted.label'), 'success',
            (body?.auth_token ? formatAuthToken(body.auth_token) : '') +
            anotherRequestButton())
        }
        return
      }
      if (res.status === 404) {
        clearPendingAuthorize()
        resolveStep(pollStep, 'error', fmt(copy('authorize.ps_pending_longpoll.label_resolved_template'), { path: pollPath, status: 404 }))
        resolveStep(interactionStep, 'error', 'Interaction Expired')
        pinLog()
        addLogStep('Interaction expired', 'error',
          formatResponse(404, null, body) + anotherRequestButton())
        return
      }
      if (res.status === 403 || res.status === 408) {
        clearPendingAuthorize()
        const label = res.status === 403 ? 'Interaction Denied' : 'Interaction Timed Out'
        resolveStep(pollStep, 'error', fmt(copy('authorize.ps_pending_longpoll.label_resolved_template'), { path: pollPath, status: res.status }))
        resolveStep(interactionStep, 'error', label)
        pinLog()
        addLogStep(copy(res.status === 403 ? 'authorize.authorization_denied.label' : 'authorize.authorization_timed_out.label'), 'error',
          formatResponse(res.status, null, body) + anotherRequestButton())
        return
      }
      // 202 → loop immediately (server already held up to 30s)
    } catch (err) {
      console.log('Poll error:', err.message)
      appendStepBody(pollStep,
        `<details class="section-group"><summary class="section-heading"><span>Cycle ${cycle} \u2192 network error</span>${CHEVRON_SVG}</summary><p style="color: var(--error)">${escapeHtml(err.message)}</p></details>`
      )
      await new Promise((r) => setTimeout(r, 5000))
    }
  }
}

function decodeJWTPayloadBrowser(jwt) {
  try {
    const parts = jwt.split('.')
    return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

// ── Notes (R3) demo ──
//
// Multi-step flow against notes.aauth.dev, which exposes:
//   • /.well-known/aauth-resource.json — advertises authorization_endpoint
//     and r3_vocabularies[urn:aauth:vocabulary:openapi] pointing at an
//     OpenAPI spec enumerating the API's operations.
//   • /authorize — POST signed with agent_token + r3_operations body
//     naming the operationIds we want; returns a resource_token.
//   • /notes* — CRUD API gated by auth_token.r3_granted.
//
// Flow: tab activation fetches the metadata + OpenAPI (once per page)
// and renders a checkbox per operationId. "Notes with Hellō" signs the
// /authorize POST, exchanges the resource_token at the user's PS, and
// either gets a 200 auth_token (cached consent) or 202 + interaction
// that drives the existing auth-token polling loop. Once an auth_token
// lands we persist it, reveal the Notes fieldset, and render a
// list/create/view/edit/delete UI gated on r3_granted.operations.

const NOTES_AUTH_TOKEN_KEY = 'aauth-notes-auth-token'
let _notesHydrated = false
let _notesMetadata = null
let _notesOperations = [] // [{ operationId, summary, method, path }]
let _notesCache = []      // last GET /notes response, used for edit/delete renders

// Discover notes resource metadata + OpenAPI. When `logIt` is true the
// fetch sequence renders into the protocol log (used by runNotesAuthorize
// so every Notes-with-Hellō click shows the full trail). When false the
// fetches are silent (used by tab activation — the user hasn't asked to
// run the protocol yet, so the log would be noise that clearLog() will
// just wipe on the first click).
async function performNotesDiscovery(logIt) {
  const notesOrigin = window.NOTES_ORIGIN || 'https://notes.aauth.dev'
  const metadataUrl = `${notesOrigin}/.well-known/aauth-resource.json`
  const metadataPath = '/.well-known/aauth-resource.json'

  const metaStep = logIt
    ? addLogStep(
        fmt(copy('notes.resource_metadata_request.label_template'), { path: metadataPath }),
        'pending',
        desc('notes.resource_metadata_request') + formatRequest('GET', metadataUrl, null, null),
      )
    : null
  let metadata
  try {
    const res = await fetch(metadataUrl)
    metadata = await res.json().catch(() => null)
    if (!res.ok || !metadata) {
      if (metaStep) {
        resolveStep(metaStep, 'error', fmt(copy('notes.resource_metadata_request.label_resolved_template'), { path: metadataPath, status: res.status }))
        appendStepBody(metaStep, formatResponse(res.status, null, metadata))
      }
      return null
    }
    if (metaStep) {
      resolveStep(metaStep, 'success', fmt(copy('notes.resource_metadata_request.label_resolved_template'), { path: metadataPath, status: 200 }))
      appendStepBody(metaStep, formatResponse(200, null, metadata))
    }
  } catch (err) {
    if (metaStep) {
      resolveStep(metaStep, 'error', fmt(copy('notes.resource_metadata_request.label_error_network_template'), { path: metadataPath }))
      appendStepBody(metaStep, `<p style="color: var(--error)">${escapeHtml(err.message)}</p>`)
    }
    return null
  }

  const openapiUrl = metadata.r3_vocabularies?.[window.NOTES_VOCABULARY] || `${notesOrigin}/openapi.json`
  const openapiPath = new URL(openapiUrl).pathname
  const oaStep = logIt
    ? addLogStep(
        fmt(copy('notes.openapi_request.label_template'), { path: openapiPath }),
        'pending',
        desc('notes.openapi_request') + formatRequest('GET', openapiUrl, null, null),
      )
    : null
  let openapi
  try {
    const res = await fetch(openapiUrl)
    openapi = await res.json().catch(() => null)
    if (!res.ok || !openapi) {
      if (oaStep) {
        resolveStep(oaStep, 'error', fmt(copy('notes.openapi_request.label_resolved_template'), { path: openapiPath, status: res.status }))
        appendStepBody(oaStep, formatResponse(res.status, null, openapi))
      }
      return null
    }
    if (oaStep) {
      resolveStep(oaStep, 'success', fmt(copy('notes.openapi_request.label_resolved_template'), { path: openapiPath, status: 200 }))
      // OpenAPI is verbose; collapse the full response behind a details block.
      appendStepBody(oaStep,
        `<details class="section-group"><summary class="section-heading"><span>Response</span>${CHEVRON_SVG}</summary>${formatResponse(200, null, openapi)}</details>`,
      )
    }
  } catch (err) {
    if (oaStep) {
      resolveStep(oaStep, 'error', fmt(copy('notes.openapi_request.label_error_network_template'), { path: openapiPath }))
      appendStepBody(oaStep, `<p style="color: var(--error)">${escapeHtml(err.message)}</p>`)
    }
    return null
  }

  return { metadata, openapi }
}

async function hydrateNotesOperations() {
  if (_notesHydrated) return
  const grid = document.getElementById('notes-ops-grid')
  if (!grid) return

  // Silent fetch — the user hasn't clicked anything yet, so don't
  // pollute the log. The discovery leg is re-run (and logged) from
  // runNotesAuthorize when the button click kicks off the full flow.
  const result = await performNotesDiscovery(false)
  if (!result) {
    grid.innerHTML = `<p class="scope-caption" style="color: var(--error)">Couldn't fetch notes.aauth.dev metadata. Open the tab again to retry.</p>`
    return
  }
  const { metadata, openapi } = result
  _notesMetadata = metadata

  // Extract operationId + summary in mental-model order: read first
  // (list, get), then write (create, update, delete). Unknown ops fall
  // at the end. Dependencies fall earlier so the picker reads like a
  // natural checklist.
  const ops = []
  const paths = openapi.paths || {}
  for (const pKey of Object.keys(paths)) {
    const pObj = paths[pKey]
    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
      const op = pObj[method]
      if (op?.operationId) {
        ops.push({
          operationId: op.operationId,
          summary: op.summary || op.operationId,
          method: method.toUpperCase(),
          path: pKey,
        })
      }
    }
  }
  const order = ['listNotes', 'getNote', 'createNote', 'updateNote', 'deleteNote']
  ops.sort((a, b) => {
    const ia = order.indexOf(a.operationId)
    const ib = order.indexOf(b.operationId)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })
  _notesOperations = ops

  // Default selection: all checked on first activation. On subsequent
  // page loads restore whatever the user last saved. Anything in saved
  // that isn't in the current OpenAPI is silently dropped.
  const saved = window.aauthGetSavedNotesOperations?.()
  const savedSet = saved ? new Set(saved) : null
  grid.innerHTML = ops.map((op) => {
    const checked = savedSet ? savedSet.has(op.operationId) : true
    const title = `${op.method} ${op.path} — ${op.summary}`.replace(/"/g, '&quot;')
    return `<label class="checkbox-label" title="${title}"><input type="checkbox" value="${escapeHtml(op.operationId)}"${checked ? ' checked' : ''}> <span>${escapeHtml(op.operationId)}</span></label>`
  }).join('')

  window.updateNotesRequestPreview?.()
  _notesHydrated = true
}

// Tab-activation hook used by app.js's switcher. Notes is the only tab
// that needs lazy setup today; whoami's scope list is static.
window.aauthOnTabActivated = function aauthOnTabActivated(name) {
  if (name === 'notes') {
    hydrateNotesOperations().catch((err) => console.error('[aauth] notes hydrate:', err))
  }
}

function getSelectedNotesOperations() {
  return Array.from(document.querySelectorAll('#notes-ops-grid input[type="checkbox"]:checked'))
    .map((cb) => ({ operationId: cb.value }))
}

async function startNotes() {
  const bindingPs = getBoundPs() || window.getCurrentPS?.()
  if (!bindingPs) {
    alert('No agent token found. Bootstrap first.')
    return
  }

  setActiveLog('notes-log')
  clearLog()
  showLog()

  // Hide both panels' Call buttons so the flow owns the screen. Either
  // clicking Another Request (.js-scroll-authz) or reloading re-shows
  // them. Scoped to the resource-section so it doesn't hide unrelated
  // buttons elsewhere.
  document.querySelectorAll('#resource-section .authz-actions')
    .forEach((el) => el.classList.add('hidden'))

  let agentTokenValid = false
  const savedAgentToken = localStorage.getItem('aauth-agent-token')
  if (savedAgentToken) {
    try {
      const p = decodeJWTPayloadBrowser(savedAgentToken)
      agentTokenValid = p && p.exp > Math.floor(Date.now() / 1000)
    } catch { /* invalid token */ }
  }
  if (!agentTokenValid) {
    const refreshed = await runRefresh()
    if (!refreshed) return
  }

  // Ensure we have metadata. The user could click Notes with Hellō
  // before the discovery fetch finishes, or after reload if they
  // never opened the tab this session (pointless but possible).
  if (!_notesMetadata) {
    await hydrateNotesOperations()
    if (!_notesMetadata) return // hydrate already logged the error
  }

  const operations = getSelectedNotesOperations()
  if (operations.length === 0) {
    addLogSection(copy('sections.notes'))
    addLogStep('No operations selected', 'error',
      '<p>Check at least one operation before clicking Notes with Hellō.</p>' + anotherRequestButton())
    return
  }

  const hints = getHints()
  await runNotesAuthorize(operations, bindingPs, hints)
}

// Demo-only: GET the resource_token's r3_uri and pretty-print the
// R3 document the Person Server is about to fetch. The notes resource
// leaves /r3/:id publicly fetchable in demo mode (production would
// require a PS HTTP signature), so this is a read-only preview.
async function previewR3Document(rtPayload) {
  const r3Uri = rtPayload?.r3_uri
  if (!r3Uri) return
  let r3Path = r3Uri
  try { r3Path = new URL(r3Uri).pathname } catch {}
  const step = addLogStep(
    fmt(copy('notes.r3_document_request.label_template'), { path: r3Path }),
    'pending',
    desc('notes.r3_document_request') + formatRequest('GET', r3Uri, null, null),
  )
  try {
    const res = await fetch(r3Uri)
    const body = await res.json().catch(() => null)
    resolveStep(step, res.ok ? 'success' : 'error',
      fmt(copy('notes.r3_document_request.label_resolved_template'), { path: r3Path, status: res.status }))
    appendStepBody(step, formatResponse(res.status, null, body))
  } catch (err) {
    resolveStep(step, 'error', fmt(copy('notes.r3_document_request.label_error_network_template'), { path: r3Path }))
    appendStepBody(step, `<p style="color: var(--error)">${escapeHtml(err.message)}</p>`)
  }
}

async function runNotesAuthorize(operations, bindingPs, hints) {
  const keyPair = window.aauthEphemeral.get()
  const agentToken = localStorage.getItem('aauth-agent-token')
  if (!keyPair || !agentToken) {
    addLogStep(copy('authorize.missing_context.label'), 'error', desc('authorize.missing_context'))
    return
  }
  const signingJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)

  addLogSection(copy('sections.notes'))

  // Re-run discovery on each click so the protocol log always shows the
  // full trail, even though the same metadata was silently fetched on
  // tab activation. Cheap (CF edge cached) and the educational value is
  // worth the extra round trip.
  const discovery = await performNotesDiscovery(true)
  if (!discovery) {
    addLogStep('Notes discovery failed', 'error',
      '<p>Couldn\'t fetch metadata or OpenAPI from notes.aauth.dev — see steps above.</p>' + anotherRequestButton())
    return
  }
  _notesMetadata = discovery.metadata
  const authzEndpoint = discovery.metadata.authorization_endpoint || `${window.NOTES_ORIGIN}/authorize`
  const authzPath = new URL(authzEndpoint).pathname
  const requestBody = {
    r3_operations: {
      vocabulary: window.NOTES_VOCABULARY,
      operations,
    },
  }

  // Step 1: POST /authorize to notes.aauth.dev, signed with agent_token.
  const step1 = addLogStep(
    fmt(copy('notes.authorize_request.label_template'), { path: authzPath }),
    'pending',
    desc('notes.authorize_request') +
      formatRequest('POST', authzEndpoint, {
        'Content-Type': 'application/json',
        'Signature-Input': 'sig=("@method" "@authority" "@path" "content-type" "signature-key");created=...',
        'Signature': 'sig=:...:',
        'Signature-Key': `sig=jwt;jwt="${agentToken?.substring(0, 20)}..."`,
      }, requestBody),
  )
  let resourceToken
  try {
    const res = await sigFetch(authzEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signingKey: signingJwk,
      signingCryptoKey: keyPair.privateKey,
      signatureKey: { type: 'jwt', jwt: agentToken },
      components: ['@method', '@authority', '@path', 'content-type', 'signature-key'],
    })
    const body = await res.json().catch(() => null)
    if (res.ok && body?.resource_token) {
      resourceToken = body.resource_token
      resolveStep(step1, 'success', fmt(copy('notes.authorize_request.label_resolved_template'), { path: authzPath, status: res.status }))
      appendStepBody(step1, formatResponse(res.status, null, body))
      appendStepBody(step1, formatDecoded(decodeJWTPayloadBrowser(resourceToken)))
      await previewR3Document(decodeJWTPayloadBrowser(resourceToken))
    } else {
      resolveStep(step1, 'error', fmt(copy('notes.authorize_request.label_resolved_template'), { path: authzPath, status: res.status }))
      appendStepBody(step1, formatResponse(res.status, null, body) + anotherRequestButton())
      return
    }
  } catch (err) {
    resolveStep(step1, 'error', fmt(copy('notes.authorize_request.label_error_network_template'), { path: authzPath }))
    appendStepBody(step1, `<p style="color: var(--error)">${escapeHtml(err.message)}</p>` + anotherRequestButton())
    return
  }

  // Step 2: hand off to the shared resource flow. Notes' R3-specific
  // behavior (the resource_token names an R3 document; the PS fetches
  // it and emits an auth_token with r3_granted) is captured in the
  // copy keys passed below — the protocol shape from POST /aauth/token
  // onward is identical to whoami's.
  await runPSTokenExchange({
    resourceToken,
    bindingPs,
    hints,
    keyPair,
    agentToken,
    signingJwk,
    labels: {
      postLabel: (path) => fmt(copy('notes.ps_token_request.label_template'), { path }),
      postLabelResolved: (path, status) =>
        fmt(copy('notes.ps_token_request.label_resolved_template'), { path, status }),
      postLabelNetworkError: (path) =>
        fmt(copy('notes.ps_token_request.label_error_network_template'), { path }),
      postDescription: desc('notes.ps_token_request'),
      pollLabel: (path) => fmt(copy('notes.ps_pending_longpoll.label_template'), { path }),
      pollDescription: desc('notes.ps_pending_longpoll'),
      consentLabel: copy('notes.ps_consent_prompt.label'),
      consentDescription: desc('notes.ps_consent_prompt'),
    },
    consentKey: 'notes',
    pendingExtra: { notesAuthorize: true },
    onAuthToken: async (token) => {
      // finalizeNotesAuthToken always emits its own "Auth Token
      // received" step (with decoded payload) and mounts the Notes
      // app — same behavior on cached-200 and consent-202 paths.
      await finalizeNotesAuthToken(token)
    },
  })
}

async function finalizeNotesAuthToken(authToken) {
  localStorage.setItem(NOTES_AUTH_TOKEN_KEY, authToken)
  addLogStep(copy('notes.auth_token_received.label'), 'success',
    desc('notes.auth_token_received') +
      formatDecoded(decodeJWTPayloadBrowser(authToken)) +
      anotherRequestButton(),
  )
  revealNotesApp()
  renderNotesApp()
  if (getGrantedOps().has('listNotes')) await refreshNotesList()
}

// ── Notes app UI ──
//
// All notes state lives in the notes auth_token (r3_granted) and the
// in-memory _notesCache (last list response). Every button click
// routes through callNotesAPI so every user action shows in the
// resource-log. Note mutations refetch via refreshNotesList if
// listNotes is granted; otherwise they re-render from the immediate
// response.

function getStoredNotesAuthToken() {
  const t = localStorage.getItem(NOTES_AUTH_TOKEN_KEY)
  if (!t) return null
  try {
    const p = decodeJWTPayloadBrowser(t)
    if (!p || !p.exp || p.exp < Math.floor(Date.now() / 1000)) return null
    return t
  } catch { return null }
}

function getGrantedOps() {
  const token = getStoredNotesAuthToken()
  if (!token) return new Set()
  const payload = decodeJWTPayloadBrowser(token) || {}
  const granted = payload.r3_granted?.operations || []
  return new Set(granted.map((o) => o.operationId))
}

function revealNotesApp() {
  const section = document.getElementById('notes-section')
  if (!section) return
  const wasHidden = section.classList.contains('hidden')
  section.classList.remove('hidden')
  if (wasHidden) section.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function hideNotesApp() {
  document.getElementById('notes-section')?.classList.add('hidden')
}

function renderNotesApp() {
  const app = document.getElementById('notes-app')
  if (!app) return
  const granted = getGrantedOps()
  if (granted.size === 0) {
    app.innerHTML = '<p class="scope-caption">No operations granted. Click Notes with Hellō to try again.</p>'
    return
  }

  const parts = []
  parts.push(`<p class="scope-caption">Granted: ${Array.from(granted).sort().map((o) => `<code>${escapeHtml(o)}</code>`).join(', ')}</p>`)

  if (granted.has('createNote')) {
    parts.push(`
      <div class="notes-create">
        <input type="text" class="notes-input" id="notes-new-title" placeholder="Title" maxlength="512">
        <textarea class="notes-input" id="notes-new-content" placeholder="Content" rows="3" maxlength="1024"></textarea>
        <div class="note-actions">
          <button type="button" class="btn-primary" id="notes-create-btn">Create note</button>
        </div>
      </div>
    `)
  }

  if (granted.has('listNotes')) {
    parts.push(`<div id="notes-list"><p class="scope-caption">Loading…</p></div>`)
  } else {
    parts.push(`<p class="scope-caption">Without <code>listNotes</code> granted, you can only create new notes.</p>`)
  }

  app.innerHTML = parts.join('')

  document.getElementById('notes-create-btn')?.addEventListener('click', async () => {
    const titleEl = document.getElementById('notes-new-title')
    const contentEl = document.getElementById('notes-new-content')
    const title = titleEl.value.trim()
    const content = contentEl.value.trim()
    if (!title || !content) { alert('Title and content required.'); return }
    const created = await callNotesAPI('POST', '/notes', { title, content })
    if (!created) return
    titleEl.value = ''
    contentEl.value = ''
    if (getGrantedOps().has('listNotes')) await refreshNotesList()
  })

  // Delegate row-action clicks on the list. Single listener on the
  // stable #notes-list container survives re-renders.
  document.getElementById('notes-list')?.addEventListener('click', notesRowClickHandler)
}

async function refreshNotesList() {
  const granted = getGrantedOps()
  if (!granted.has('listNotes')) return
  const list = await callNotesAPI('GET', '/notes')
  if (!Array.isArray(list)) return
  _notesCache = list
  renderNotesList()
}

function renderNotesList() {
  const container = document.getElementById('notes-list')
  if (!container) return
  const granted = getGrantedOps()
  if (_notesCache.length === 0) {
    container.innerHTML = '<p class="scope-caption">No notes yet.</p>'
    return
  }
  const ctx = { canGet: granted.has('getNote'), canUpdate: granted.has('updateNote'), canDelete: granted.has('deleteNote') }
  container.innerHTML = _notesCache.map((n) => renderNoteRow(n, ctx)).join('')
}

function renderNoteRow(note, { canGet, canUpdate, canDelete }) {
  const expiresIn = formatRelativeExpires(note.expires_at)
  const buttons = []
  if (canGet) buttons.push(`<button type="button" class="btn-outline" data-note-action="view" data-note-id="${escapeHtml(note.id)}">View</button>`)
  if (canUpdate) buttons.push(`<button type="button" class="btn-outline" data-note-action="edit" data-note-id="${escapeHtml(note.id)}">Edit</button>`)
  if (canDelete) buttons.push(`<button type="button" class="btn-outline" data-note-action="delete" data-note-id="${escapeHtml(note.id)}">Delete</button>`)
  return `
    <div class="note-row" data-note-id="${escapeHtml(note.id)}">
      <div class="note-title">${escapeHtml(note.title)}</div>
      <div class="note-content">${escapeHtml(note.content)}</div>
      <div class="note-meta">
        <span>expires ${escapeHtml(expiresIn)}</span>
        <span class="note-actions">${buttons.join('')}</span>
      </div>
    </div>
  `
}

function formatRelativeExpires(expires_at) {
  const secs = expires_at - Math.floor(Date.now() / 1000)
  if (secs <= 0) return 'now'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `in ${h}h ${m}m`
  return `in ${m}m`
}

async function notesRowClickHandler(e) {
  const btn = e.target.closest('button[data-note-action]')
  if (!btn) return
  const action = btn.dataset.noteAction
  const id = btn.dataset.noteId
  const row = btn.closest('.note-row')
  const note = _notesCache.find((n) => n.id === id)
  if (!note) return

  if (action === 'view') {
    const fresh = await callNotesAPI('GET', `/notes/${encodeURIComponent(id)}`)
    if (fresh) {
      const i = _notesCache.findIndex((n) => n.id === id)
      if (i !== -1) _notesCache[i] = fresh
      renderNotesList()
    }
  } else if (action === 'edit') {
    startEditRow(row, note)
  } else if (action === 'delete') {
    if (!confirm(`Delete "${note.title}"?`)) return
    const ok = await callNotesAPI('DELETE', `/notes/${encodeURIComponent(id)}`)
    if (ok !== null) {
      _notesCache = _notesCache.filter((n) => n.id !== id)
      renderNotesList()
    }
  }
}

function startEditRow(row, note) {
  row.innerHTML = `
    <input type="text" class="notes-input" data-edit-title value="${escapeHtml(note.title)}" maxlength="512">
    <textarea class="notes-input" data-edit-content rows="3" maxlength="1024">${escapeHtml(note.content)}</textarea>
    <div class="note-actions">
      <button type="button" class="btn-primary" data-edit-save>Save</button>
      <button type="button" class="btn-outline" data-edit-cancel>Cancel</button>
    </div>
  `
  row.querySelector('[data-edit-save]')?.addEventListener('click', async () => {
    const title = row.querySelector('[data-edit-title]').value.trim()
    const content = row.querySelector('[data-edit-content]').value.trim()
    if (!title || !content) { alert('Title and content required.'); return }
    const updated = await callNotesAPI('PUT', `/notes/${encodeURIComponent(note.id)}`, { title, content })
    if (!updated) return
    const i = _notesCache.findIndex((n) => n.id === note.id)
    if (i !== -1) _notesCache[i] = updated
    renderNotesList()
  })
  row.querySelector('[data-edit-cancel]')?.addEventListener('click', () => renderNotesList())
}

async function callNotesAPI(method, path, body) {
  const authToken = getStoredNotesAuthToken()
  if (!authToken) {
    localStorage.removeItem(NOTES_AUTH_TOKEN_KEY)
    hideNotesApp()
    alert('Notes token expired. Click Notes with Hellō to re-authorize.')
    return null
  }
  const keyPair = window.aauthEphemeral.get()
  if (!keyPair) return null
  const signingJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
  const origin = window.NOTES_ORIGIN || 'https://notes.aauth.dev'
  const url = `${origin}${path}`
  const hasBody = body !== undefined && body !== null
  const components = hasBody
    ? ['@method', '@authority', '@path', 'content-type', 'signature-key']
    : ['@method', '@authority', '@path', 'signature-key']

  const copyKey =
    method === 'GET' && path === '/notes' ? 'notes_app.list_request'
    : method === 'POST' ? 'notes_app.create_request'
    : method === 'PUT' ? 'notes_app.update_request'
    : method === 'DELETE' ? 'notes_app.delete_request'
    : 'notes_app.get_request'

  // Per-operation API calls live in the Notes box's own log container,
  // not the ceremony log (#notes-log). Keeps the authorization trace
  // (which ends with "Another Authorization Request") from growing
  // indefinitely as the user clicks around in the Notes app. On the
  // first call of a session, open a "Notes API" section so subsequent
  // steps group under one collapsible heading.
  setActiveLog('notes-api-log')
  const apiLog = currentLog()
  if (apiLog && !apiLog.querySelector(':scope > details.log-section')) {
    addLogSection(copy('sections.notes_api'))
  }
  showLog()
  const step = addLogStep(
    fmt(copy(`${copyKey}.label_template`), { path }),
    'pending',
    desc(copyKey) +
      formatRequest(method, url, {
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        'Signature-Input': 'sig=(...);created=...',
        'Signature': 'sig=:...:',
        'Signature-Key': `sig=jwt;jwt="${authToken.substring(0, 20)}..."`,
      }, hasBody ? body : null),
  )

  try {
    const res = await sigFetch(url, {
      method,
      headers: hasBody ? { 'Content-Type': 'application/json' } : {},
      body: hasBody ? JSON.stringify(body) : undefined,
      signingKey: signingJwk,
      signingCryptoKey: keyPair.privateKey,
      signatureKey: { type: 'jwt', jwt: authToken },
      components,
    })
    const resBody = res.status === 204 ? null : await res.json().catch(() => null)
    if (res.ok) {
      resolveStep(step, 'success', fmt(copy(`${copyKey}.label_resolved_template`), { path, status: res.status }))
      appendStepBody(step, formatResponse(res.status, null, resBody))
      return res.status === 204 ? true : resBody
    }
    resolveStep(step, 'error', fmt(copy(`${copyKey}.label_resolved_template`), { path, status: res.status }))
    appendStepBody(step, formatResponse(res.status, null, resBody))
    // 401 means the auth_token is no longer honored — stop trying so the
    // user doesn't get a cascade of identical failures from other
    // buttons. They can re-click Notes with Hellō for a fresh token.
    if (res.status === 401) {
      localStorage.removeItem(NOTES_AUTH_TOKEN_KEY)
      hideNotesApp()
    }
    return null
  } catch (err) {
    resolveStep(step, 'error', fmt(copy(`${copyKey}.label_error_network_template`), { path }))
    appendStepBody(step, `<p style="color: var(--error)">${escapeHtml(err.message)}</p>`)
    return null
  }
}

// Called from app.js on page load: if the stored notes auth_token is
// still within its `exp`, re-mount the Notes app from its r3_granted
// without replaying the discovery/authorize flow. Expired or missing
// tokens leave the fieldset hidden.
async function restoreNotesApp() {
  if (!getStoredNotesAuthToken()) return
  // Only unhide the fieldset if the notes tab is currently selected —
  // the default HTML state has whoami active, so unconditionally
  // revealing after a reload would orphan the notes box under the
  // wrong tab. The tab click handler (activateResourceTab in app.js)
  // handles the visibility swap when the user switches to notes.
  const notesTabActive = document.querySelector('#resource-section .tab[data-tab="notes"].tab-active')
  if (notesTabActive) revealNotesApp()
  renderNotesApp()
  if (getGrantedOps().has('listNotes')) await refreshNotesList()
}
window.aauthRestoreNotesApp = restoreNotesApp

// ── Wire up Bootstrap + Resource Request buttons ──

document.getElementById('bootstrap-btn')?.addEventListener('click', startBootstrap)
document.getElementById('whoami-btn')?.addEventListener('click', startWhoami)
document.getElementById('notes-btn')?.addEventListener('click', startNotes)

// Hellō Continue button — open PS in a popup so the parent keeps its
// log, ephemeral key, and long-poll state alive across consent. Source
// of truth is still the parent's existing PS long-poll; the popup just
// closes itself when /popup-callback is reached.
//
// Critical: window.open() must be called synchronously inside the click
// handler — no `await` before it — or iOS Safari silently blocks under
// transient-activation rules.
//
// The features string (width/height/left/top) is what tells the browser
// to render this as a popup window rather than a new tab. Without
// dimensions, Chrome/Firefox/Safari all open a tab. On mobile this still
// becomes a new tab regardless — phones don't have side-by-side windows.
const POPUP_WIDTH = 500
const POPUP_HEIGHT = 700
document.addEventListener('click', (e) => {
  const helloBtn = e.target.closest('.interaction-actions .hello-btn')
  if (!helloBtn) return
  e.preventDefault()
  const url = helloBtn.getAttribute('href')
  const left = Math.max(0, Math.round((screen.width - POPUP_WIDTH) / 2))
  const top = Math.max(0, Math.round((screen.height - POPUP_HEIGHT) / 2))
  const features = `popup=yes,width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top}`
  const popup = window.open(url, 'aauth-consent', features)
  if (popup === null) {
    showPopupBlockedMessage(helloBtn)
    return
  }
  helloBtn.classList.add('hello-btn-loader')
})

function showPopupBlockedMessage(btn) {
  const container = btn.closest('.interaction-actions')
  if (!container) return
  if (container.querySelector('.popup-blocked-msg')) return
  const msg = document.createElement('p')
  msg.className = 'popup-blocked-msg'
  msg.textContent = 'Popup blocked. Allow popups for this site and click Continue again.'
  container.appendChild(msg)
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.js-scroll-authz')
  if (!btn) return
  // Scroll first so the user sees the form before the log disappears —
  // clearing mid-scroll feels jerky. Clear log after scroll settles.
  const section = document.getElementById('resource-section')
  if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' })
  // Find the log container this button is inside (whoami-log or
  // notes-log) and target it for the clear — whichever tab the user
  // just finished in is the one that should reset.
  const enclosingLog = btn.closest('.protocol-log')
  if (enclosingLog?.id) setActiveLog(enclosingLog.id)
  setTimeout(clearLog, 300)
  // Re-show every resource tab's Call button — a tab switch after the
  // flow terminated could leave the other panel's button hidden if we
  // targeted only one.
  document.querySelectorAll('#resource-section .authz-actions')
    .forEach((el) => el.classList.remove('hidden'))
})

// ── Close the loop: call the demo resource API with the minted auth_token ──
//
// Demonstrates that the playground.demo scope actually gates something. We
// present the auth_token as a bearer token to the playground's own
// /api/demo endpoint — the token is verified there against the PS's JWKS
// and must carry `playground.demo` in scope.

async function callDemoResourceApi(authToken) {
  const endpoint = `${window.location.origin}/api/demo`
  const keyPair = window.aauthEphemeral.get()
  if (!keyPair) {
    addLogStep(copy('demo_api.missing_key.label'), 'error',
      desc('demo_api.missing_key'))
    return
  }
  const reqStep = addLogStep(fmt(copy('demo_api.request.label_template'), { path: new URL(endpoint).pathname }), 'pending',
    desc('demo_api.request') +
    formatRequest('GET', endpoint, {
      'Signature-Input': 'sig=("@method" "@authority" "@path" "signature-key");created=...',
      'Signature': 'sig=:...:',
      'Signature-Key': `sig=jwt;jwt="${authToken?.substring(0, 20)}..."`,
    }, null)
  )
  try {
    const signingJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
    const res = await sigFetch(endpoint, {
      method: 'GET',
      signingKey: signingJwk,
      signingCryptoKey: keyPair.privateKey,
      signatureKey: { type: 'jwt', jwt: authToken },
      components: ['@method', '@authority', '@path', 'signature-key'],
    })
    const body = await res.json().catch(() => null)
    resolveStep(reqStep, res.ok ? 'success' : 'error', fmt(copy('demo_api.request.label_resolved_template'), { path: '/api/demo', status: res.status }))
    addLogStep(
      copy(res.ok ? 'demo_api.success.label' : 'demo_api.failure.label'),
      res.ok ? 'success' : 'error',
      formatResponse(res.status, null, body) + anotherRequestButton(),
    )
  } catch (err) {
    resolveStep(reqStep, 'error', fmt(copy('demo_api.request.label_error_network_template'), { path: '/api/demo' }))
    addLogStep(copy('demo_api.failure.label'), 'error',
      `<p style="color: var(--error)">${escapeHtml(err.message)}</p>` + anotherRequestButton())
  }
}
window.aauthCallDemoResourceApi = callDemoResourceApi
