# playground.aauth.dev

A reference agent server for the AAuth protocol, running on Cloudflare Workers.
Live at [aauth.dev](https://aauth.dev).

## What it does

- Registers and authenticates users via WebAuthn passkeys
- Issues ephemeral `aa-agent+jwt` agent tokens bound to a browser-generated Ed25519 key pair
- Publishes `/.well-known/aauth-agent.json` and `/.well-known/jwks.json`
- Wearing its resource hat, requires an `aa-person+jwt` person token at
  `/authorize` and issues `aa-resource+jwt` resource tokens naming the
  person that token identified

## Getting started

```bash
npm install
npm run generate-key   # generate a signing key for agent tokens
npm run dev            # start wrangler dev
```

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

See the `/setup` skill for a guided Cloudflare deployment walkthrough.

## Project layout

- `src/` — Hono app, WebAuthn routes, agent token issuance
- `public/` — static playground UI
- `scripts/` — key generation helpers
- `wrangler.toml` — Cloudflare Workers config

## Contributing

Please read [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) before participating.

## License

[MIT](./LICENSE)
