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

## Fase 3 — SLI/SLO, alerting, Alertmanager

SLO disetujui: **availability 99%** (error budget 1%) dan **latency p99 < 500ms**
(diproksikan lewat bucket histogram `le="0.5"` — target >=99% request harus
masuk bucket itu).

- `04-prometheus-rules.yaml`: recording rules rasio error/latensi-lambat per
  window (5m/30m/1h/2h/6h/1d/3d), plus alerting rules multi-window
  multi-burn-rate (pola Google SRE Workbook) — 4 tingkat per SLO (fast/medium
  = page, slow/very-slow = ticket).
- `05-alertmanager.yaml`: Alertmanager dengan receiver **dummy/placeholder**
  (belum ada integrasi Slack/email/dsb) — alert tetap kelihatan & bisa diuji
  lewat Alertmanager UI. Ganti `receivers:` di ConfigMap kalau mau notifikasi
  asli.

**Bug yang ditemukan & diperbaiki saat verifikasi:** `sum(rate(http_requests_total
{status_code=~"5.."}[5m]))` menghasilkan *empty vector* (bukan `0`) selama belum
pernah ada 5xx sama sekali — pembagian jadi ikut kosong, bukan `0`, sehingga
recording rule availability tidak pernah menghasilkan angka di sistem yang sehat
(kasus paling umum!). Diperbaiki dengan `(... or vector(0))` pada numerator.

### Verifikasi

```bash
# Rule ter-load tanpa error:
kubectl exec -n doko deploy/prometheus -- wget -qO- http://localhost:9090/api/v1/rules

# Prometheus berhasil menemukan Alertmanager:
kubectl exec -n doko deploy/prometheus -- wget -qO- http://localhost:9090/api/v1/alertmanagers

# Lihat alert & kirim manual test lewat UI Alertmanager:
kubectl port-forward -n doko svc/alertmanager 9093:9093
```

### Catatan penting: sumber angka SLO

Prometheus DI DALAM cluster adalah sumber kebenaran untuk angka SLO — bukan k6
di laptop (k6 tetap berguna untuk load test, tapi resource laptop tidak
representatif untuk klaim SLO).
