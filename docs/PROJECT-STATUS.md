# Project Status — doko k3s Reliability Showcase

Update terakhir: 2026-09-15

## Fase selesai

### Fase 1 — Manifest k3s dasar ✅
- `/k8s`: namespace, Postgres (ClusterIP, PVC), backend, frontend (ConfigMap nginx.conf
  versi k8s), Ingress Traefik (`doko.local`).
- Diverifikasi end-to-end di k3d (bukan cuma validasi YAML): frontend kebuka, `/api/hello`
  jalan lewat nginx→backend→Postgres, log masuk Postgres, Postgres tidak reachable dari
  host.
- Known issue (RESOLVED di Fase 4): backend sempat `CrashLoopBackOff` beberapa kali tiap
  cluster BARU dibuat (`ECONNREFUSED` ke Service ClusterIP saat jaringan k3d belum settle
  penuh) — root cause: unhandled rejection di `initializeDatabase()`. Lihat detail fix di
  bagian Fase 4.

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

### Fase 3 — SLI/SLO, alerting, Alertmanager ✅
- **SLO disetujui (2026-09-15): availability 99%, latency p99 < 500ms.**
- `observability/04-prometheus-rules.yaml`: recording rules rasio error &
  "lambat" per window (5m→3d), alerting multi-window multi-burn-rate (pola
  Google SRE Workbook): fast(5m/1h,14.4x)/medium(30m/6h,6x)=page,
  slow(2h/1d,3x)/very-slow(6h/3d,1x)=ticket. 8 alert total (availability+latency).
- `observability/05-alertmanager.yaml`: route dengan receiver dummy/placeholder
  (belum ada integrasi Slack/email — sengaja, sesuai default proyek).
- **Bug ditemukan & diperbaiki saat verifikasi**: recording rule availability
  awalnya selalu kosong (bukan 0) di sistem sehat karena PromQL
  `sum(rate(...{status_code=~"5.."}))` menghasilkan empty vector kalau belum
  pernah ada 5xx — diperbaiki dengan `or vector(0)`. Tanpa fix ini, alert TIDAK
  AKAN PERNAH bisa dievaluasi dengan benar di kondisi normal.
- Diverifikasi end-to-end: 22 rule ter-load tanpa error, Prometheus↔Alertmanager
  connected, recording rule menghasilkan angka valid (0, bukan NaN/kosong)
  setelah traffic nyata.

### Fase 4 — Probe, resource limit, HPA ✅
- `backend/server.js`: **root cause fix known issue Fase 1-3** (backend
  CrashLoopBackOff di k3d) — `initializeDatabase()` dulu melempar *unhandled
  rejection* kalau `pool.connect()` gagal (ECONNREFUSED saat jaringan cluster
  belum settle), Bun mematikan proses akibatnya. Diperbaiki jadi retry loop
  tak terbatas (2s delay), tidak pernah throw. Tambah `GET /healthz/live`
  (selalu 200, tidak cek DB) dan `GET /healthz/ready` (503 sampai `dbReady`).
  Keduanya dikecualikan dari middleware metrik (sama seperti `/metrics`) biar
  trafik probe kubelet tidak mengotori error budget.
- `k8s/03-backend.yaml`: `resources.requests` (50m CPU/64Mi) & `limits` (200m
  CPU/128Mi), `livenessProbe` (`/healthz/live`, tidak cek DB — restart hanya
  kalau proses benar mati), `readinessProbe` (`/healthz/ready` — pod ditahan
  dari Service endpoints saat DB belum siap, TANPA direstart).
- `k8s/06-backend-hpa.yaml`: HPA CPU-based, min 1/max 3, target 70%.
- **Regression gate**: Playwright PASS. k6 error rate 1.51% (di bawah baseline
  1.90%, bukan kenaikan). Latency naik lagi (pola sama seperti Fase 2/3,
  dicatat sebagai data poin lingkungan, bukan sebab kausal dari kode).
- **Diverifikasi end-to-end di k3d — bukti fix known issue**: backend restart
  count = **0** (dulu selalu 5-8x tiap cluster baru dibuat). Log menunjukkan
  14x retry ECONNREFUSED lalu berhasil connect, proses tidak pernah mati.
  HPA diuji nyata: burst request → CPU 76%/70% → scale-up ke 3 replika →
  CPU turun ke 40% rata-rata → semua replika baru RESTARTS=0.
- **Catatan (di luar scope Fase 4, belum diperbaiki)**: pod `frontend` masih
  sesekali restart 1x di awal cluster baru (kemungkinan race jaringan serupa,
  tapi nginx statis tidak sensitif seperti backend). Tidak mengganggu
  fungsionalitas (pod tetap Running & sehat setelahnya). Dicatat untuk
  ditinjau kalau relevan di fase berikutnya, tidak diburu sekarang karena di
  luar scope eksplisit Fase 4.

### Fase 5 — Chaos engineering + postmortem ✅
- `/chaos`: 3 skenario (`01-pod-kill.sh`, `02-cpu-stress.sh`+Job,
  `03-latency-injection.sh` pakai `tc netem` via ephemeral debug container —
  TANPA Chaos Mesh, sesuai keputusan). Semua benar-benar DIJALANKAN di k3d
  (bukan cuma ditulis), dengan traffic monitoring nyata selama eksperimen.
- `/postmortems`: `TEMPLATE.md` + 3 postmortem terisi data nyata:
  1. **Pod kill** (3 replika saat itu): 150/150 request tetap 200, pod
     pengganti Ready dalam **8 detik**, dampak customer-facing **nol**.
  2. **CPU stress** (`stress-ng`, 2 core, 60s): 400/400 request tetap 200,
     latency naik tipis (p95 135ms), SLI latency 0.66% (di bawah budget 1%).
  3. **Latency injection** (`tc netem` 300ms di 1 dari 3 pod): 200/200 tetap
     200, tapi **temuan tak terduga**: cuma 2/200 (1%) request yang kena
     pod ber-delay, jauh di bawah ekspektasi naif ~33% — mengindikasikan
     load balancing Traefik/kube-proxy tidak round-robin murni per-request.
     Dicatat sebagai temuan untuk investigasi lanjut, bukan diasumsikan aman.
- Semua 3 skenario: **0% dampak ke error budget availability**, konsisten
  divalidasi lewat query Prometheus (`slo:*` recording rules Fase 3) — bukan
  cuma observasi manual.
- Tidak ada perubahan `server.js`/kode app di fase ini → regression gate
  tidak berlaku (tidak ada yang perlu diuji ulang).

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
- **Fase 6 progress**: README naratif ✅, branch di-push ✅, description+topics
  repo GitHub ✅. Screenshot dashboard: dilewati sesuai keputusan user (tidak
  krusial). ArgoCD/Sealed Secrets: ditunda sesuai keputusan user (opsional).

### Bug ditemukan setelah Fase 6 (saat verifikasi manual bareng user) — FIXED
Saat user ambil screenshot dashboard untuk dokumentasi, panel "Request Rate"
menunjukkan angka naik tidak wajar (sampai 15 req/s padahal traffic generator
cuma ~2 req/s). Investigasi: `http_requests_total` loncat naik-turun tidak
monoton (492→90→107→580→124...) — mustahil untuk counter Prometheus yang benar.

**Root cause**: scrape config Prometheus (`observability/00-prometheus-configmap.yaml`)
sebelumnya target `backend:8080` (Service ClusterIP) via `static_configs`. Tiap
scrape (15s) di-load-balance kube-proxy ke SALAH SATU dari N pod backend secara
acak. Tiap pod punya counter proses independen (mulai dari 0 sejak pod start) —
begitu replika backend > 1 (rutin terjadi via HPA sejak Fase 4), Prometheus
melihat "satu metrik" yang sebenarnya data dari sumber berbeda-beda tiap scrape.

**Dampak**: bukan cuma grafik dashboard yang salah — recording rules SLO Fase 3
(`slo:availability_error:*`, `slo:latency_bad:*`) berpotensi ikut tidak akurat
saat replika>1, bertentangan dengan prinsip proyek "Prometheus = sumber
kebenaran SLO". Untungnya SEMUA verifikasi sebelumnya (Fase 2-5) kebetulan
dilakukan saat kondisi cocok (replika=1, atau kebetulan tidak terdeteksi) —
bug ini baru kelihatan sekarang karena user memakai UI Grafana interaktif
dengan mata sendiri, bukan cuma query sesaat.

**Fix**: scrape config diganti ke Kubernetes service discovery (`kubernetes_sd_configs`
role `endpoints`, filter ke Service "backend" + endpoint ready) — Prometheus
sekarang scrape SETIAP pod langsung by IP, masing-masing jadi time series
independen yang konsisten monoton. Ditambah RBAC minimal (`ServiceAccount`+`Role`
scoped namespace `doko`, verbs get/list/watch untuk endpoints/services/pods) —
file baru `observability/06-prometheus-rbac.yaml`.

**Verifikasi**: 3 pod muncul sebagai target terpisah (bukan 1 lewat Service),
semua `health: up`, counter per-pod diamati 4x berturut-turut (interval 15s)
— semua naik monoton tanpa loncatan. `sum(rate(...))` agregat sekarang 0.665
req/s (masuk akal vs traffic generator ~2 req/s), sebelumnya bisa sampai 15+
req/s yang jelas keliru.

File berubah: `observability/00-prometheus-configmap.yaml`,
`observability/01-prometheus.yaml`, `observability/06-prometheus-rbac.yaml` (baru).
