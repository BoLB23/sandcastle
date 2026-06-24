# Sandcastle resume snapshot 2026-06-24 ingress API base

Changed surface summary

- Updated `apps/web/lib/api.ts` so browser-side API and realtime URLs resolve at runtime.
- Local development still uses `http://localhost:4000` and `ws://localhost:4001/ws`.
- In ingress/browser contexts, the web app now uses same-origin `/api` and `/ws` instead of baked-in localhost defaults.

Checks run

- `corepack pnpm --filter @sandcastle/web build`
- `corepack pnpm --filter @sandcastle/web typecheck`

What passed

- Web build passed.
- Web typecheck passed.
- No other `apps/web` files reference the old localhost API base or realtime URL defaults.

Known gaps / blockers

- The cluster is still running the previous image tag, so this fix is not live yet.
- I have not rechecked the ingress page after rollout because the new image has not been deployed.
- The repo still has the broader MVP/platform work queued separately; this change only addresses the ingress redirect/runtime API base bug.

Exact next package

1. Commit and push this frontend URL-resolution fix on `main`.
2. Wait for the image build/publish workflow to produce a new immutable tag.
3. Deploy that tag to the cluster and re-test `/channels` through ingress.
