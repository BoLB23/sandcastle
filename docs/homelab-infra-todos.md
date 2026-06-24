# Homelab Infra Follow-Ups

These are cluster-level items that should live in `homelab-infra` long term rather than this app repo.

## ESO / OpenBao

- Install or upgrade External Secrets Operator cluster-wide.
- Create the Sandcastle OpenBao policy, role, and Kubernetes auth bootstrap as infra-managed config.
- Replace the temporary `sandcastle-openbao-token` SecretStore bridge with namespace-scoped Kubernetes auth once the cluster-side auth path is fixed.
- Decide whether the OpenBao auth mount should stay at `kubernetes` or be standardized across namespaces.
- Decide whether the Sandcastle secret path should remain `secret/sandcastle/app` or move to a dedicated environment namespace/path convention.
- Mirror the Sandcastle app secret keys into OpenBao at `secret/sandcastle/app` and keep the generated DB password out of the app repo.
- Reconcile the Sandcastle ESO `SecretStore` against cluster-owned conventions once the shared path/policy is finalized.

## Deployment Wiring

- Move the Sandcastle `SecretStore` / `ExternalSecret` namespace wiring to the shared cluster repo if you want all app secrets managed centrally.
- Keep the app repo focused on the namespaced consumer manifests and app-side assumptions.
- Track the immutable GHCR tag promotion flow in the cluster deployment repo if you want GitOps-style promotion later.
- Create the CNPG `sandcastle` managed role/database in the cluster repo rather than hand-patching the live cluster.

## Operational Hardening

- Add TLS hardening for the OpenBao service path if the cluster stops using internal HTTP.
- Add a repeatable OpenBao backup / restore note for the secret path used by Sandcastle.
- Add a small runbook for how to rotate `AUTH_SECRET` and the seed owner credentials through OpenBao.
