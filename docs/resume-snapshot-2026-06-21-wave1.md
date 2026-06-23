# Sandcastle resume snapshot 2026-06-21 wave 1

Changed surface summary

- Shared contracts moved from the prototype `schemas.ts` shape to explicit MVP contracts in `packages/shared/src/contracts.ts`.
- Explicit role and permission mapping now lives in `packages/shared/src/permissions.ts`.
- Realtime topics were narrowed to MVP scope.
- API entry moved to `apps/api/src/app.ts` plus a slim `apps/api/src/server.ts`.
- Auth now hashes session tokens before persistence and adds invite lookup, invite acceptance, admin reset links, and reset acceptance flows.
- Prisma schema was pruned to MVP models only and now includes password reset tokens and fixed availability settings.
- The public web root now redirects to `/login` so users are no longer dropped into the fake dashboard. Login/invite copy was narrowed to MVP scope.

Checks run

- `corepack pnpm --filter @sandcastle/db generate`
- `corepack pnpm -r typecheck`
- `corepack pnpm -r build`

What passed

- Workspace typecheck passed.
- Workspace build passed.
- Prisma client generation passed after the schema relation fix.

Known gaps / blockers

- Root scripts originally failed because they called bare `pnpm`; that is now fixed in `package.json`, but `lint` is still not expected to pass because the repo has ESLint 9 without a valid flat config or TypeScript ESLint dependencies.
- The web auth/invite/reset pages are still static forms. The fake `AppShell` component still exists in the repo but is no longer the public entry route.
- Messaging realtime publish from API to the realtime service is not wired yet.
- Events UI, availability UI, deployment manifests, and docs are not updated to the new schema yet.
- Platform package 11 still needs a fresh cluster preflight because ESO may already be installed by another developer.

Exact next package

1. Package 6: wire login, invite accept, reset accept, and session bootstrap in the web app against the new auth endpoints.
2. Package 3: publish typed channel/message events from API and consume them in the realtime service.
3. Package 10: land a real ESLint 9 flat config once TypeScript ESLint tooling is available in the repo.
