# V1 Readiness

## Current Release Bar

- invite-only email/password auth
- owner/admin invite and reset-link management
- channels with durable messages and websocket fanout
- events with RSVP
- fixed 7 PM to 11 PM Eastern weekly availability
- homelab Kubernetes deployment with immutable tags

## Validation Commands

```bash
corepack pnpm --filter @sandcastle/db generate
corepack pnpm -r typecheck
corepack pnpm -r build
corepack pnpm -r test
corepack pnpm -r lint
env DATABASE_URL=postgresql://sandcastle:sandcastle@localhost:5432/sandcastle \
  corepack pnpm --filter @sandcastle/db exec prisma validate --schema ./prisma/schema.prisma
ruby -e 'require "yaml"; Dir["deploy/k8s/*.yaml"].sort.each { |f| YAML.load_stream(File.read(f)); puts f }'
```

## Known Gaps

- Local API, web URL-resolution, and realtime fanout regression coverage exists; served-app two-user browser automation still needs to be added
- ESO installation itself is not bundled here; only namespace-scoped Sandcastle integration is included
- full Kubernetes apply or API-backed dry-run still requires live cluster access outside this sandbox
