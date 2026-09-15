#!/usr/bin/env bash
# Chaos: jalankan Job stress-ng (60s, 2 core) sebagai "noisy neighbor" di
# node yang sama dengan backend. Amati HPA & latency selama & setelahnya.
set -euo pipefail
NAMESPACE=doko
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

kubectl delete job chaos-cpu-stress -n "$NAMESPACE" --ignore-not-found
echo "Mulai (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ)"
kubectl apply -f "$DIR/02-cpu-stress-job.yaml"

echo ""
echo "Pantau HPA & pod selama stress (~60 detik):"
echo "  kubectl get hpa -n $NAMESPACE -w"
echo "  kubectl top pod -n $NAMESPACE -l app=backend"
echo ""
echo "Bersihkan job setelah selesai:"
echo "  kubectl delete job chaos-cpu-stress -n $NAMESPACE"
