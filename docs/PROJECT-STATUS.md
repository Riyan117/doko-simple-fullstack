# Project Status — doko k3s Reliability Showcase

Update terakhir: 2026-09-15

## Fase selesai

### Fase 1 — Manifest k3s dasar ✅
- `/k8s`: namespace, Postgres (ClusterIP, PVC), backend, frontend (ConfigMap nginx.conf
  versi k8s), Ingress Traefik (`doko.local`).
- Diverifikasi end-to-end di k3d (bukan cuma validasi YAML): frontend kebuka, `/api/hello`
  jalan lewat nginx→backend→Postgres, log masuk Postgres, Postgres tidak reachable dari
  host.
- Known issue: backend sempat `CrashLoopBackOff` beberapa kali tiap cluster BARU dibuat
  (`ECONNREFUSED` ke Service ClusterIP) — kube-proxy/rules jaringan k3d belum settle penuh
  di detik-detik awal. Self-heal dalam <5 menit tanpa intervensi (backoff kubelet), sudah
  terjadi 2x (Fase 1 & Fase 2) dengan pola sama. **Rencana perbaikan tuntas: Fase 4**
  (readiness probe akan menahan traffic sampai app benar-benar siap).

### Fase 2 — Prometheus + instrumentasi app ✅
- `backend/server.js`: instrumentasi `prom-client` — endpoint `GET /metrics`, metrik
  `http_requests_total` (counter) & `http_request_duration_seconds` (histogram, bucket
  eksplisit `[0.01,0.025,0.05,0.1,0.2,0.3,0.5,0.75,1,2.5,5]` mengapit target p99 <500ms
  rencana Fase 3). Label `route` pakai `req.route?.path ?? 'unmatched'` (template path,
  bukan URL mentah — anti cardinality explosion, aman untuk 404/probe masa depan).
  `/metrics` dikecualikan dari pencatatan supaya scrape tidak mengotori data sendiri.
- **Regression gate**: Playwright tetap PASS. k6 checks_failed turun dari 1.90% → 0%
  (membaik). Latency k6 naik (avg 5.56ms→41ms) tapi dinilai **artefak lingkungan laptop**,
  bukan sebab kausal dari instrumentasi — dicatat sebagai data poin, bukan blocker
  (lihat `docs/regression-baseline.md`).
- `/observability`: Prometheus (static scrape config, target `backend:8080/metrics`,
  ClusterIP) + Grafana kedua (terpisah dari Grafana docker-compose) dengan datasource
  `Prometheus_App` + dashboard "App SLO - Backend" (request rate, error rate,
  latency p50/p95/p99) ter-provisioning otomatis. Ingress `grafana.doko.local`.
- Diverifikasi end-to-end di k3d: Prometheus target `backend` health=up, counter
  bertambah sesuai traffic asli (20→30 setelah 10 request), Grafana ingress+datasource
  API terkonfirmasi jalan.
- **Keputusan kunci**: Prometheus/Grafana-baru HANYA di k8s, tidak ditambahkan ke
  docker-compose (baseline docker-compose harus tetap "app apa adanya" sebagai konstanta
  pembanding regresi). Grafana docker-compose (InfluxDB/k6) tetap dipertahankan terpisah,
  tidak diubah.

## Keputusan arsitektur yang berlaku sepanjang proyek
- Sumber angka SLO otoritatif = Prometheus di dalam cluster, BUKAN k6 di laptop (k6 cuma
  data poin, bukan kebenaran, karena resource laptop tidak representatif).
- Semua hal baru di folder terpisah (`/k8s`, `/observability`, nanti `/chaos`,
  `/postmortems`). `docker-compose.yml`, Dockerfile, nginx.conf asli, test Playwright,
  `k6/script.js` tidak pernah diubah. Pengecualian hanya `server.js` bila fase menuntut
  (memicu regression gate).
- Tanpa Prometheus Operator/ServiceMonitor/Chaos Mesh/ArgoCD/Sealed Secrets kecuali
  disetujui eksplisit — prioritas ringan untuk target akhir STB arm64.

## File berubah/dibuat sejauh ini
- Baru: `k8s/*.yaml`, `k8s/README.md`, `observability/*.yaml`, `observability/README.md`,
  `docs/regression-baseline.md`, `docs/PROJECT-STATUS.md` (file ini)
- Diubah: `backend/server.js`, `backend/package.json` (tambah `prom-client`)
- Tidak diubah: `docker-compose.yml`, kedua `Dockerfile`, `frontend/nginx.conf`,
  `frontend/tests/app.spec.js`, `k6/script.js`, `grafana/provisioning/*` (docker-compose)

## Posisi sekarang
- Branch: `feature/k3s-reliability-showcase` (belum di-push, menunggu instruksi)
- Cluster k3d `doko` sedang aktif dengan Fase 1+2 ter-deploy (untuk verifikasi manual
  kalau mau dicek langsung)
- **Fase 3 (SLI/SLO) dimulai, berhenti di GERBANG angka SLO — menunggu persetujuan.**
