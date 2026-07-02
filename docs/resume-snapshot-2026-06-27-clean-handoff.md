# Sandcastle resume snapshot 2026-06-27 clean handoff

Changed surface summary

- Corrected the web ingress cert-manager issuer from the missing `letsencrypt-production` reference to the live `bolblab-cf-issuer`.
- Updated deployment docs so the cluster prereq matches the issuer that actually exists.
- Verified the public endpoint now presents a valid Let’s Encrypt certificate for `sandcastle.lab.bolblab.org`.
- Confirmed HTTPS on the public host returns `307 /channels` and includes HSTS.

Checks run

- `kubectl get certificate,order,challenge -n sandcastle -o wide`
- `openssl s_client -connect sandcastle.lab.bolblab.org:443 -servername sandcastle.lab.bolblab.org`
- `curl -skI https://sandcastle.lab.bolblab.org`

What passed

- cert-manager successfully issued `sandcastle-tls`.
- The live ingress is serving the expected certificate chain.
- The browser-facing host is reachable over HTTPS without the prior HSTS cert error.

Current state

- The repo work for the ingress/TLS issue is documented and ready to keep closed.
- No other unfinished Sandcastle code changes were left in the workspace after this cleanup.

Exact next package

1. Start the next session from `main` and choose new work.
2. If you need a quick smoke check, open `https://sandcastle.lab.bolblab.org` and confirm login still works.
