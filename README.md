# The Sandcastle

A self-hosted private coordination app for one permanent friend group. The MVP focuses on scheduling, events, polls, realtime chat, threads, reminders, and gaming profiles.

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
docker compose up -d postgres redis mailpit
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
- Uploads: PVC-backed app storage first, with an S3-compatible abstraction reserved for later
- Auth: app-owned Google/email/invite auth; Authelia can protect ingress later but is not the signup source

## Documentation

- [Architecture](docs/architecture.md)
- [Deployment](docs/deploy.md)
- [V1 readiness checklist](docs/v1-readiness.md)
