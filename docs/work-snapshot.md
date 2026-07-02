# Work Snapshot

## Branch

- `main`

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
- Added local regression coverage for API auth/invite/reset/message/RSVP flows, web API/realtime URL resolution, and realtime fanout subscription behavior

## What Passed

- `corepack pnpm --filter @sandcastle/db generate`
- `corepack pnpm -r typecheck`
- `corepack pnpm -r build`
- `corepack pnpm -r test`
- `corepack pnpm -r lint`
- `env DATABASE_URL=postgresql://sandcastle:sandcastle@localhost:5432/sandcastle corepack pnpm --filter @sandcastle/db exec prisma validate --schema ./prisma/schema.prisma`
- local YAML parse across `deploy/k8s/*.yaml`

## Current State

- Repo validation is green on `main`.
- GitHub Actions `CI` is green for commit `23978af`.
- GitHub Actions `Build and Publish Docker Images` is green for commit `23978af`.
- Live cluster deployment succeeded with immutable tag `v2026.06.24-23978af`.
- Ingress TLS was corrected by switching cert-manager to the live `bolblab-cf-issuer`; `sandcastle.lab.bolblab.org` now serves a valid Let’s Encrypt certificate and HTTPS returns `307 /channels`.
- Confirmed live state:
  - Sandcastle CNPG role/database exist
  - OpenBao contains the Sandcastle app secret
  - ESO syncs `sandcastle-secrets` in the `sandcastle` namespace
  - `sandcastle-api`, `sandcastle-realtime`, and `sandcastle-web` are all `1/1 Running`
  - in-cluster HTTP checks succeeded:
    - `http://sandcastle-api:4000/healthz` -> `200`
    - `http://sandcastle-realtime:4001/healthz` -> `200`
    - `http://sandcastle-web:3000/` -> `307 /channels`
- Remaining risk is no longer deployment-blocking:
  - ESO is currently using a scoped OpenBao token secret as a temporary bridge instead of Kubernetes auth
  - browser-level two-user smoke coverage is still not automated against a live or locally served app

## Exact Resume Steps

1. Manually verify end-user flows in the live app:
   - owner login
   - invite creation and acceptance
   - channel message persistence plus websocket fanout
   - event create/edit/cancel/RSVP
   - availability save/reload
2. Replace the temporary token-based ESO auth with cluster-managed Kubernetes auth when the shared OpenBao wiring is ready.
3. If needed, add browser automation against a served app for the live MVP flows.

## Known Likely Follow-Up Edits

- add served-app two-user browser smoke coverage
- expand API integration tests further if database-backed test infrastructure is added
- replace the temporary OpenBao token auth bridge with namespace-scoped Kubernetes auth via shared infra
- if cluster-level Sandcastle config is kept here temporarily, move the CNPG/OpenBao/ESO bootstrap into `homelab-infra` later
