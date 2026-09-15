#!/usr/bin/env bash
# Chaos: hapus paksa satu pod backend, amati recovery.
# Simulasi node/pod crash mendadak (OOM, node reboot, dll).
set -euo pipefail
NAMESPACE=doko

POD=$(kubectl get pods -n "$NAMESPACE" -l app=backend -o jsonpath='{.items[0].metadata.name}')
echo "Target: $POD"
echo "Waktu delete (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ)"
kubectl delete pod -n "$NAMESPACE" "$POD"

echo ""
echo "Pantau recovery:"
echo "  kubectl get pods -n $NAMESPACE -l app=backend -w"
