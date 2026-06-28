# Deployment

Sandcastle is deployed as three images in one namespace: `web`, `api`, and `realtime`. Postgres stays in the existing CNPG namespace; Redis runs in `sandcastle`.

## Prerequisites

- DNS for `sandcastle.lab.bolblab.org`
- ingress class `nginx`
- cert-manager `ClusterIssuer` named `bolblab-cf-issuer`
- a Postgres database reachable from `postgres-rw.postgres.svc.cluster.local:5432`
- published immutable GHCR tags for:
  - `ghcr.io/bolb23/the-sandcastle-web:<tag>`
  - `ghcr.io/bolb23/the-sandcastle-api:<tag>`
  - `ghcr.io/bolb23/the-sandcastle-realtime:<tag>`

## Secrets

Prefer External Secrets plus OpenBao when ESO is available. Apply these in namespace order:

```bash
kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -f deploy/k8s/configmap.yaml
kubectl apply -f deploy/k8s/secret-store.yaml
kubectl apply -f deploy/k8s/external-secret.yaml
```

If ESO is not available yet, create `deploy/k8s/secret.yaml` from `deploy/k8s/secret.example.yaml` and apply that instead.

Required keys:

- `DATABASE_URL`
- `AUTH_SECRET`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `SEED_ADMIN_NAME`

## First Deploy

Apply shared infrastructure:

```bash
kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -f deploy/k8s/configmap.yaml
kubectl apply -f deploy/k8s/redis-service.yaml
kubectl apply -f deploy/k8s/redis-deployment.yaml
```

Apply secrets using either ESO or a direct secret manifest, then deploy with an immutable tag:

```bash
scripts/deploy.sh v2026.06.20-e7ce85d
```

The deploy script refuses `latest`, renders the `DEPLOYED_IMAGE_TAG` ConfigMap value from the tag argument, reruns migrations and seed, then rolls the workloads. The app exposes that value in the authenticated workspace header.

## Validation

```bash
kubectl get pods,svc,ingress -n sandcastle
kubectl logs -n sandcastle job/sandcastle-migrate
kubectl logs -n sandcastle job/sandcastle-seed
kubectl get externalsecret,secretstore -n sandcastle
```

Smoke-test these flows after rollout:

- login with the seeded owner
- create an invite and accept it
- post a channel message and confirm websocket fanout
- create an event and RSVP from the invited user
- save weekly availability

## Notes

- If another developer has already installed ESO cluster-wide, do not reinstall it. Apply only the namespace-scoped `SecretStore` and `ExternalSecret`.
- OpenBao is currently referenced over in-cluster HTTP in `deploy/k8s/secret-store.yaml`; tighten TLS and auth policy in the cluster layer when available.
