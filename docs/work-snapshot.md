# Work Snapshot

## Branch

- `codex/mvp-wave1-foundation`

## What Changed

- Replaced the broad shared contract surface with MVP-oriented auth, channel, event, and availability contracts in `packages/shared/src/contracts.ts`
- Kept role-based permission helpers in `packages/shared/src/permissions.ts` and narrowed realtime topics away from removed poll/thread/notification scope
- Rewrote the Prisma schema and initial migration down to MVP entities only:
  - users, sessions, invites, password reset tokens
  - profiles
  - channels and messages
  - events and RSVPs
  - fixed-slot availability settings
- Replaced the monolithic API runtime with `apps/api/src/app.ts` plus updated auth/session helpers
- Removed Google OAuth, upload handling, poll routes, generic availability schedule routes, and notification routes from the active API surface
- Added admin-generated reset-link flow and hashed token handling for sessions, invites, and reset tokens
- Replaced the prototype web shell with real login, invite, reset, channels, events, and availability routes
- Updated deploy docs/manifests toward lowercase GHCR refs, immutable tags, and namespace-scoped ESO/OpenBao integration

## What Passed

- `corepack pnpm --filter @sandcastle/db generate`
- `corepack pnpm -r typecheck`
- `corepack pnpm -r build`
- `corepack pnpm -r test`
- `corepack pnpm -r lint`
- `env DATABASE_URL=postgresql://sandcastle:sandcastle@localhost:5432/sandcastle corepack pnpm --filter @sandcastle/db exec prisma validate --schema ./prisma/schema.prisma`
- local YAML parse across `deploy/k8s/*.yaml`

## Current Blocker

- No repo-blocking local validation failure remains.
- Live cluster work reached the app-secret stage and then hit an image/runtime issue during migrations.
- Confirmed live state:
  - ESO is installed cluster-wide and running
  - OpenBao is unsealed and Kubernetes auth is already configured
  - OpenBao currently has a working `paperless` auth role/policy template
  - CNPG `postgres` cluster is healthy and already manages `paperless`, `authelia`, and `irene_hub`
  - Sandcastle CNPG role/database exist and the app secret is synced through ESO
- Remaining unreconciled risk is live integration:
  - the migration/seed images need a runtime fix for Prisma on Alpine (OpenSSL package missing)
  - the current deploy tag needs to be rebuilt/published after the Dockerfile fix
  - two-user browser smoke coverage is not yet automated

## Exact Resume Steps

1. Rebuild/publish the API and realtime images with the OpenSSL runtime fix.
2. Redeploy the current immutable tag once the new images are available.
3. Validate:
   - owner login
   - invite creation and acceptance
   - channel message persistence plus websocket fanout
   - event create/edit/cancel/RSVP
   - availability save/reload
4. If promoting this branch, decide whether to keep the current minimal ESLint setup or add full TypeScript ESLint packages in a follow-up.

## Known Likely Follow-Up Edits

- add API integration tests around auth, reset links, messaging, and RSVP flows
- add two-user browser smoke coverage
- perform live cluster validation for ESO/OpenBao wiring and immutable-tag deployment
- if cluster-level Sandcastle config is kept here temporarily, move the CNPG/OpenBao/ESO bootstrap into `homelab-infra` later
