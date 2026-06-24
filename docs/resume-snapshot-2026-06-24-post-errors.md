# Sandcastle resume snapshot 2026-06-24 post errors

Changed surface summary

- API now converts Zod validation failures into `400 Invalid request` instead of surfacing them as `500 Internal server error`.
- Channel message creation now validates the actual request body shape `{ body }` instead of incorrectly requiring `channelId` in the JSON payload.
- Web event create/edit forms now convert `datetime-local` input values to ISO strings before posting to the API.

Checks run

- `corepack pnpm --filter @sandcastle/api build`
- `corepack pnpm --filter @sandcastle/web build`
- `corepack pnpm --filter @sandcastle/api typecheck`
- `corepack pnpm --filter @sandcastle/web typecheck`

What passed

- API build passed.
- Web build passed.
- API typecheck passed.
- Web typecheck passed.

Known gaps / blockers

- The fix is not live in the cluster until the new image tag is built, published, and deployed.
- I have not yet re-run the browser smoke test after these code changes.

Exact next package

1. Commit and push these API/web fixes on `main`.
2. Deploy the resulting immutable image tag to the cluster.
3. Re-test message posting and event creation through ingress.
