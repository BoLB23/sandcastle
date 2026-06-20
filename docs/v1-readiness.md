# V1 Readiness

## Ready For Repo Setup

- Workspace packages typecheck, test, and build locally.
- Docker image workflow exists for web, API, and realtime images.
- Kubernetes manifests dry-run successfully.
- Prisma schema validates and includes an initial committed migration.
- First-run bootstrap is covered by `sandcastle-seed`.
- Architecture and deployment docs are present.

## Validation Commands

```bash
corepack pnpm --filter @sandcastle/db generate
corepack pnpm -r typecheck
corepack pnpm -r test
corepack pnpm -r build
env DATABASE_URL=postgresql://sandcastle:sandcastle@localhost:5432/sandcastle \
  corepack pnpm --filter @sandcastle/db exec prisma validate --schema ./prisma/schema.prisma
kubectl apply --dry-run=client --validate=false -f deploy/k8s
ruby -e 'require "yaml"; YAML.load_file(".github/workflows/docker-images.yml")'
```

## Local Limitation

Docker daemon access is required to run `docker build` locally. If Docker is not running, use the GitHub Actions pull request build as the image-build validation path.

## Known V1 Follow-Ups

- Add API integration tests around invite acceptance, message ownership, and WebSocket session-cookie auth.
- Replace `latest` image references with immutable tags in the deployment branch or GitOps layer.
- Decide whether upload storage should stay PVC-backed or move to S3-compatible object storage.
- Add email or push delivery behind the existing notification preferences.
- Add Xbox OAuth as a modular optional integration after Kubernetes deployment is stable.
