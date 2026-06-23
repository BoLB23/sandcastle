# The Sandcastle

A self-hosted private coordination app for one permanent friend group. The current MVP scope is invite-based auth, owner/admin management, realtime channels, events with RSVP, and fixed evening availability in Eastern Time.

## Stack

- `apps/web`: Next.js, React, TypeScript, Tailwind CSS.
- `apps/api`: Fastify API service.
- `apps/realtime`: WebSocket service with Redis pub/sub.
- `packages/db`: Prisma and PostgreSQL schema.
- `packages/shared`: shared Zod schemas, realtime envelopes, and scheduling logic.
- `deploy/k8s`: Kubernetes manifests for the homelab deployment.

## Local Development

```bash
corepack enable
pnpm install
docker compose up -d postgres redis
cp .env.example .env
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

The web app listens on `http://localhost:3000`, API on `http://localhost:4000`, and realtime service on `ws://localhost:4001/ws`.

## Cluster Defaults

The production manifests assume:

- Namespace: `sandcastle`
- Host: `sandcastle.lab.bolblab.org`
- Postgres: existing CNPG service `postgres-rw.postgres.svc.cluster.local:5432`
- Redis: dedicated in-namespace Redis deployment
- Auth: invite-based email/password auth with admin-generated reset links
- Secrets: app secret sync should come from cluster-managed secrets or External Secrets / OpenBao

## Documentation

- [Architecture](docs/architecture.md)
- [Deployment](docs/deploy.md)
- [V1 readiness checklist](docs/v1-readiness.md)
