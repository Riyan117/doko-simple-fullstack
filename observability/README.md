# Fase 2 (bagian k8s) — Prometheus + Grafana untuk metrik SLO app

Folder ini murni tambahan, hidup di cluster k3d yang sama dengan `/k8s`
(namespace `doko`). Tidak menyentuh `docker-compose.yml` atau
`grafana/provisioning` (docker-compose) yang sudah ada — dua stack observability
ini sengaja terpisah:

| | docker-compose (existing) | k8s (`/observability`, baru) |
|---|---|---|
| Sumber data | k6 → InfluxDB | backend `/metrics` → Prometheus |
| Untuk apa | Load test lokal, dashboard k6 | Metrik SLO app yang kontinu |
| Grafana | `grafana/provisioning` (jangan diubah) | ConfigMap di sini |

## Deploy (setelah `k8s/` ter-apply)

```bash
kubectl apply -f observability/
kubectl get pods -n doko -w
```

## Akses Grafana

Tambahkan ke `/etc/hosts` (selain `doko.local` dari Fase 1):

```
127.0.0.1 grafana.doko.local
```

Buka `http://grafana.doko.local:8080` (port 8080 = mapping k3d dari
`k8s/README.md`). Login `admin` / `admin`. Dashboard "App SLO - Backend"
sudah otomatis ter-provisioning (request rate, error rate, latency p50/p95/p99).

## Verifikasi cepat

```bash
# Prometheus benar-benar men-scrape backend:
kubectl port-forward -n doko svc/prometheus 9090:9090
# buka http://localhost:9090/targets — target "backend" harus UP

# Prometheus tidak diekspos keluar cluster (konsisten dengan Postgres):
kubectl get svc prometheus -n doko   # TYPE = ClusterIP, tidak ada Ingress untuknya
```

## Kenapa bukan Prometheus Operator / ServiceMonitor?

Sengaja dihindari (lihat aturan main proyek: hindari tooling berat kecuali
disetujui). Static scrape config di ConfigMap sudah cukup untuk satu target
(`backend:8080/metrics`) dan jauh lebih ringan untuk target akhir STB arm64.
