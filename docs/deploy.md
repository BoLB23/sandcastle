# Deployment

The Kubernetes manifests are intentionally single-group and homelab-oriented. They assume an existing PostgreSQL service, nginx ingress, and cert-manager.

## Prerequisites

- PostgreSQL database and user created in the existing CNPG cluster.
- DNS for `sandcastle.lab.bolblab.org` pointing at the ingress controller.
- nginx ingress class named `nginx`.
- cert-manager `ClusterIssuer` named `letsencrypt-production`.
- GHCR images published by `.github/workflows/docker-images.yml`.

## Images

The GitHub Actions workflow builds all three images on pull requests without pushing. On `main`, it pushes:

- `ghcr.io/BoLB23/the-sandcastle-web:latest`
- `ghcr.io/BoLB23/the-sandcastle-api:latest`
- `ghcr.io/BoLB23/the-sandcastle-realtime:latest`
- `sha-<shortsha>` tags for each image
- `vYYYY.MM.DD-<shortsha>` tags for each image and a matching source tag

The manifests default to `latest` for first bring-up. For a durable deployment, replace `latest` with the matching `sha-<shortsha>` or dated version tag before applying. Rollbacks should use the previous immutable image tag.

Use `scripts/deploy.sh <image-tag>` to render the manifests with a specific tag and apply them in one shot. For example, pass the `sha-<shortsha>` or `vYYYY.MM.DD-<shortsha>` tag emitted by GitHub Actions.

## Secrets

Copy `deploy/k8s/secret.example.yaml` to a private secret manifest, such as `deploy/k8s/secret.yaml`, or manage equivalent values through OpenBao or External Secrets.

Required:

- `DATABASE_URL`
- `AUTH_SECRET`, at least 32 random characters
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`, at least 12 characters
- `SEED_ADMIN_NAME`

Optional:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

If Google OAuth is not configured, email/password invite onboarding still works.

## First Deploy

Apply infrastructure objects first:

```bash
kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -f deploy/k8s/configmap.yaml
kubectl apply -f deploy/k8s/secret.yaml
kubectl apply -f deploy/k8s/upload-pvc.yaml
kubectl apply -f deploy/k8s/redis-service.yaml
kubectl apply -f deploy/k8s/redis-deployment.yaml
```

Run migrations, then seed default channels and the first owner account:

```bash
kubectl apply -f deploy/k8s/migration-job.yaml
kubectl wait --for=condition=complete job/sandcastle-migrate -n sandcastle --timeout=120s

kubectl apply -f deploy/k8s/seed-job.yaml
kubectl wait --for=condition=complete job/sandcastle-seed -n sandcastle --timeout=120s
```

Then roll the services and ingress:

```bash
kubectl apply -f deploy/k8s/api-service.yaml
kubectl apply -f deploy/k8s/realtime-service.yaml
kubectl apply -f deploy/k8s/web-service.yaml
kubectl apply -f deploy/k8s/api-deployment.yaml
kubectl apply -f deploy/k8s/realtime-deployment.yaml
kubectl apply -f deploy/k8s/web-deployment.yaml
kubectl apply -f deploy/k8s/api-ingress.yaml
kubectl apply -f deploy/k8s/realtime-ingress.yaml
kubectl apply -f deploy/k8s/ingress.yaml
```

Validate:

```bash
kubectl get pods,svc,ingress,pvc -n sandcastle
kubectl logs -n sandcastle job/sandcastle-migrate
kubectl logs -n sandcastle job/sandcastle-seed
```

## Rerunning Jobs

Kubernetes Jobs are immutable once created. To rerun migrations or seed after changing images or env values:

```bash
kubectl delete job -n sandcastle sandcastle-migrate --ignore-not-found
kubectl apply -f deploy/k8s/migration-job.yaml

kubectl delete job -n sandcastle sandcastle-seed --ignore-not-found
kubectl apply -f deploy/k8s/seed-job.yaml
```

The seed job is idempotent: it upserts default channels and the configured owner account.

## Storage

Uploads use `UPLOAD_ROOT=/data/uploads` and the API deployment mounts `sandcastle-uploads` there. The current claim requests `5Gi` with the cluster default storage class. Replace `deploy/k8s/upload-pvc.yaml` if the cluster needs a specific storage class, backup policy, or capacity.

## Notes

The manifests intentionally keep Postgres outside the namespace because the cluster already runs CNPG in `postgres`.
