#!/usr/bin/env bash
# Chaos: injeksi latency jaringan ke pod backend pakai `tc netem`, lewat
# ephemeral debug container (kubectl debug --target) yang berbagi network
# namespace dengan pod target — TANPA perlu Chaos Mesh atau image khusus
# ter-bake di backend. Butuh capability NET_ADMIN pada debug container; kalau
# cluster menegakkan Restricted Pod Security Standard, ini akan ditolak (k3d
# default permissive, jadi biasanya jalan).
set -euo pipefail
NAMESPACE=doko
ACTION="${1:-inject}"  # inject | remove

POD=$(kubectl get pods -n "$NAMESPACE" -l app=backend -o jsonpath='{.items[0].metadata.name}')
echo "Target: $POD"

if [ "$ACTION" = "inject" ]; then
  echo "Injeksi delay 300ms (+/-50ms jitter) ke eth0 pod... (UTC: $(date -u +%Y-%m-%dT%H:%M:%SZ))"
  kubectl debug -n "$NAMESPACE" "$POD" --image=nicolaka/netshoot --target=backend -- \
    tc qdisc add dev eth0 root netem delay 300ms 50ms
  echo "Delay aktif. Hapus dengan: $0 remove"
elif [ "$ACTION" = "remove" ]; then
  echo "Menghapus delay... (UTC: $(date -u +%Y-%m-%dT%H:%M:%SZ))"
  kubectl debug -n "$NAMESPACE" "$POD" --image=nicolaka/netshoot --target=backend -- \
    tc qdisc del dev eth0 root
  echo "Delay dihapus."
else
  echo "Usage: $0 [inject|remove]" >&2
  exit 1
fi
