# playground-popup.aauth.dev — Claude project notes

This is a fork of `playground.aauth.dev` for experimenting with
pop-up modal AAuth flows. The original `playground.aauth.dev` is
the prod Worker and must not be touched — this fork deploys to a
separate Worker on a separate domain.

## Deployment

**Do not run `wrangler deploy` manually.** Cloudflare Workers Builds
is connected to this repo and auto-deploys on every push to `main`.
The build runs `npm run build:client` (bundles `client/protocol.js`
into `public/protocol.js`), then `npx wrangler deploy`.

To ship a change:

1. Commit locally.
2. `git push origin main`.
3. Verify (usually live within a minute):
   ```bash
   curl -s https://playground-popup.aauth.dev/.well-known/aauth-agent.json | jq .
   ```

Check deployment history with `npx wrangler deployments list`. If an
auto-deploy fails, the dashboard (Workers & Pages →
playground-popup-aauth-dev → Deployments) shows build logs.

## Local development

- `npm run dev` — runs esbuild watcher on `client/protocol.js` plus
  `wrangler dev` in parallel.
- `npm run build:client` — one-shot bundle of the client into
  `public/protocol.js` (bundled, committed).
- `npm test` — vitest run.
- `npx tsc --noEmit` — type check.

## Architecture quick ref

- Cloudflare Worker (`src/index.ts`, Hono) serves both static assets
  (from `public/`) and API routes.
- Plays two roles per AAuth: agent provider (mints agent_tokens at
  `/bootstrap`, `/refresh`) and resource (issues resource_tokens at
  `/authorize`, gates `/api/demo`). Wears each hat at its own
  well-known: `aauth-agent.json` and `aauth-resource.json`.
- Client code is split: `public/app.js` (loaded directly, handles
  state/UI) and `client/protocol.js` (bundled by esbuild into
  `public/protocol.js`, handles the protocol flow).
- KV namespace `WEBAUTHN_KV` stores the (jkt → agent local-part)
  mapping the AP uses to assign stable agent identities.
- Signing key is an Ed25519 JWK stored as the `SIGNING_KEY` Worker
  secret (generated via `npm run generate-key`).
