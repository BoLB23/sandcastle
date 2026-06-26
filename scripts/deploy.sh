#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/deploy.sh <image-tag>

Examples:
  scripts/deploy.sh latest
  scripts/deploy.sh sha-abc1234
  scripts/deploy.sh v2026.06.20-abc1234

The script renders the Kubernetes manifests with the requested image tag,
applies the base infrastructure, reruns the migration and seed jobs, and then
rolls out the services.
EOF
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

image_tag="$1"
if [[ "$image_tag" == "latest" ]]; then
  echo "Refusing mutable image tag 'latest'. Use an immutable tag."
  exit 1
fi
namespace="sandcastle"
repo_prefix="${IMAGE_PREFIX:-ghcr.io/bolb23/the-sandcastle}"
tmpdir="$(mktemp -d)"

cleanup() {
  rm -rf "$tmpdir"
}
trap cleanup EXIT

render_manifest() {
  local src="$1"
  local dst="$2"
  sed \
    -e "s#ghcr.io/bolb23/the-sandcastle-web:latest#${repo_prefix}-web:${image_tag}#g" \
    -e "s#ghcr.io/bolb23/the-sandcastle-api:latest#${repo_prefix}-api:${image_tag}#g" \
    -e "s#ghcr.io/bolb23/the-sandcastle-realtime:latest#${repo_prefix}-realtime:${image_tag}#g" \
    -e "s#__SANDCASTLE_IMAGE_TAG__#${image_tag}#g" \
    "$src" > "$dst"
}

echo "Applying base infrastructure to namespace ${namespace}"
kubectl apply -f deploy/k8s/namespace.yaml
render_manifest deploy/k8s/configmap.yaml "${tmpdir}/configmap.yaml"
kubectl apply -f "${tmpdir}/configmap.yaml"

if [[ -f deploy/k8s/secret.yaml ]]; then
  kubectl apply -f deploy/k8s/secret.yaml
else
  echo "deploy/k8s/secret.yaml not found; apply your cluster secret separately before proceeding."
fi

kubectl apply -f deploy/k8s/redis-service.yaml
kubectl apply -f deploy/k8s/redis-deployment.yaml

for manifest in migration-job seed-job api-service realtime-service web-service api-deployment realtime-deployment web-deployment api-ingress realtime-ingress ingress; do
  render_manifest "deploy/k8s/${manifest}.yaml" "${tmpdir}/${manifest}.yaml"
done

echo "Running migrations with tag ${image_tag}"
kubectl delete job -n "${namespace}" sandcastle-migrate --ignore-not-found
kubectl apply -f "${tmpdir}/migration-job.yaml"
kubectl wait --for=condition=complete job/sandcastle-migrate -n "${namespace}" --timeout=120s

echo "Seeding defaults with tag ${image_tag}"
kubectl delete job -n "${namespace}" sandcastle-seed --ignore-not-found
kubectl apply -f "${tmpdir}/seed-job.yaml"
kubectl wait --for=condition=complete job/sandcastle-seed -n "${namespace}" --timeout=120s

echo "Applying services, deployments, and ingresses"
kubectl apply -f "${tmpdir}/api-service.yaml"
kubectl apply -f "${tmpdir}/realtime-service.yaml"
kubectl apply -f "${tmpdir}/web-service.yaml"
kubectl apply -f "${tmpdir}/api-deployment.yaml"
kubectl apply -f "${tmpdir}/realtime-deployment.yaml"
kubectl apply -f "${tmpdir}/web-deployment.yaml"
kubectl apply -f "${tmpdir}/api-ingress.yaml"
kubectl apply -f "${tmpdir}/realtime-ingress.yaml"
kubectl apply -f "${tmpdir}/ingress.yaml"

kubectl rollout status deployment/sandcastle-api -n "${namespace}" --timeout=120s
kubectl rollout status deployment/sandcastle-realtime -n "${namespace}" --timeout=120s
kubectl rollout status deployment/sandcastle-web -n "${namespace}" --timeout=120s

echo "Deployment complete"
