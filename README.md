# Doko — Reliability Engineering Showcase

Aplikasi full-stack sederhana (React + Nginx, Bun/Express, PostgreSQL) yang
dipakai sebagai **medium untuk latihan reliability engineering end-to-end**:
deploy → observe → define SLO → break (chaos) → respond → automate — dijalankan
di atas Kubernetes (k3s/k3d), target akhir arm64 (STB homelab).

Proyek asalnya demo `docker-compose` biasa. Lapisan keandalan di bawah ini
ditambahkan bertahap TANPA mengubah app/test yang sudah ada — semuanya hidup
berdampingan di folder terpisah.

<p align="left">
  <a href="https://www.docker.com/" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white&style=for-the-badge" alt="Docker"></a>
  <a href="https://kubernetes.io/" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/Kubernetes-326CE5?logo=kubernetes&logoColor=white&style=for-the-badge" alt="Kubernetes"></a>
  <a href="https://k3d.io/" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/k3d-FFC61C?logo=k3s&logoColor=black&style=for-the-badge" alt="k3d"></a>
  <a href="https://prometheus.io/" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/Prometheus-E6522C?logo=prometheus&logoColor=white&style=for-the-badge" alt="Prometheus"></a>
  <a href="https://grafana.com/" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/Grafana-F46800?logo=grafana&logoColor=white&style=for-the-badge" alt="Grafana"></a>
  <a href="https://react.dev/" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black&style=for-the-badge" alt="React"></a>
  <a href="https://bun.sh/" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/Bun-000000?logo=bun&logoColor=white&style=for-the-badge" alt="Bun"></a>
  <a href="https://www.postgresql.org/" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white&style=for-the-badge" alt="PostgreSQL"></a>
  <a href="https://playwright.dev/" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/Playwright-2EAD33?logo=playwright&logoColor=white&style=for-the-badge" alt="Playwright"></a>
  <a href="https://k6.io/" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/k6-8A43FF?logo=k6&logoColor=white&style=for-the-badge" alt="k6"></a>
</p>

---

## Cerita singkat: enam fase

| Fase | Apa yang dikerjakan | Bukti/hasil |
|---|---|---|
| 1. Deploy | Manifest k3s dasar (Deployment/Service/Ingress), Postgres ClusterIP-only | End-to-end jalan di k3d nyata — [`/k8s`](k8s/) |
| 2. Observe | Endpoint `/metrics` (prom-client) di backend, Prometheus + Grafana kedua di k8s | Scrape sehat, dashboard SLO otomatis — [`/observability`](observability/) |
| 3. Define SLO | Availability 99% / p99 < 500ms, recording+alerting multi-window multi-burn-rate (pola Google SRE Workbook) | 22 rule aktif, Alertmanager terhubung |
| 4. Harden | Readiness/liveness probe, resource limit, HPA — sekaligus **memperbaiki known issue** crash saat startup | Backend restart count turun dari 5-8x → **0** |
| 5. Break | 3 skenario chaos nyata: pod kill, CPU stress, network latency injection | MTTR 8 detik, 0% dampak availability — [`/postmortems`](postmortems/) |
| 6. Automate | README ini, dokumentasi mengalir | Kamu sedang membacanya |

Detail lengkap tiap fase (keputusan, file yang berubah, angka regression test)
ada di [`docs/PROJECT-STATUS.md`](docs/PROJECT-STATUS.md).

## Highlight — apa yang dibuktikan, bukan diklaim

- **Pod kill (3 replika)**: 150/150 request tetap sukses, pod pengganti siap
  dalam 8 detik, dampak customer-facing nol. ([postmortem](postmortems/2026-09-15-pod-kill.md))

  | Sebelum | Sesudah (~15 detik setelah pod dihapus) |
  |---|---|
  | ![Dashboard sebelum pod-kill](docs/img/grafana-podkill-before.png) | ![Dashboard sesudah pod-kill](docs/img/grafana-podkill-after.png) |

  Error Rate tetap flat 0% di kedua kondisi — bukti visual langsung dari klaim
  "zero customer-facing impact" di atas, bukan cuma angka di postmortem.
- **CPU stress (`stress-ng`, 2 core/60s)**: 400/400 request tetap sukses,
  latency p95 tetap di 135ms. ([postmortem](postmortems/2026-09-15-cpu-stress.md))
- **Network latency injection**: menemukan bahwa load balancing Traefik+kube-proxy
  di setup ini TIDAK round-robin murni per-request — cuma 1% traffic yang kena pod
  bermasalah, bukan ~33% yang diasumsikan naif. Dicatat sebagai temuan, bukan
  disembunyikan. ([postmortem](postmortems/2026-09-15-latency-injection.md))
- **Root cause fix**: known issue "backend crash saat cluster baru dibuat" ternyata
  bukan soal urutan startup, tapi *unhandled promise rejection* di kode — diperbaiki
  dengan retry loop, diverifikasi lewat restart count 0 di percobaan berulang.
- **Bug SLO ditemukan sebelum jadi masalah nyata**: recording rule availability awalnya
  selalu kosong (bukan 0) di sistem sehat, akibat perilaku PromQL `sum()` atas metrik
  yang belum pernah punya sampel — diperbaiki sebelum alert pernah dipakai untuk
  keputusan nyata.
- **Bug kedua ditemukan saat dogfooding dashboard sendiri**: `Request Rate` sempat
  menunjukkan angka absurd (15 req/s dari traffic ~2 req/s). Penyebabnya: Prometheus
  men-scrape lewat Service ClusterIP, yang di-load-balance kube-proxy ke pod
  BERBEDA-BEDA tiap scrape — tiap pod punya counter independen, jadi data-nya
  loncat-loncat begitu replika backend > 1 (rutin terjadi via HPA). Diperbaiki
  dengan Kubernetes service discovery (scrape per-pod langsung). Detail:
  [docs/PROJECT-STATUS.md](docs/PROJECT-STATUS.md).

---

## Menjalankan lewat Docker Compose (cara lama, tetap dipertahankan)

Cocok untuk pengembangan cepat tanpa Kubernetes.

### Prasyarat
- [Git](https://git-scm.com/), [Docker](https://www.docker.com/products/docker-desktop/) & Docker Compose
- [Node.js](https://nodejs.org/) (v18+) & npm, [Bun](https://bun.sh/) — hanya kalau mau jalankan/edit di luar container

### Jalankan

```bash
git clone https://github.com/Riyan117/doko-simple-fullstack.git
cd doko-simple-fullstack
docker compose up -d --build
```

- **Frontend**: http://localhost
- **API**: http://localhost:8080/api/hello
- **Grafana (k6/InfluxDB)**: http://localhost:3000 (login `admin`/`admin`)

### Testing

```bash
docker compose run --rm playwright   # E2E
docker compose run --rm k6           # Load test
```

### Matikan

```bash
docker compose down
```

---

## Menjalankan lewat k3s/k3d (reliability stack lengkap)

Butuh `k3d`, `kubectl`, dan `kubeconform` (opsional, untuk validasi skema).

```bash
k3d cluster create doko --port "8080:80@loadbalancer"
docker build -t doko-backend:local ./backend
docker build -t doko-frontend:local ./frontend
k3d image import doko-backend:local doko-frontend:local -c doko

kubectl apply -f k8s/
kubectl apply -f observability/
```

Tambahkan ke `/etc/hosts`: `127.0.0.1 doko.local` dan `127.0.0.1 grafana.doko.local`,
lalu buka `http://doko.local:8080` (app) dan `http://grafana.doko.local:8080`
(dashboard SLO — bukan dashboard k6, itu tetap di docker-compose).

Langkah lengkap + penjelasan tiap manifest: [`k8s/README.md`](k8s/README.md) dan
[`observability/README.md`](observability/README.md).

### Coba chaos experiment sendiri

```bash
./chaos/01-pod-kill.sh
./chaos/02-cpu-stress.sh
./chaos/03-latency-injection.sh inject   # lalu: ./chaos/03-latency-injection.sh remove
```

---

## Struktur Proyek

```
doko-simple-fullstack/
├── backend/            # Express/Bun + endpoint /metrics, /healthz/{live,ready}
├── frontend/            # React + Nginx (docker-compose)
├── grafana/              # Provisioning Grafana docker-compose (dashboard k6/InfluxDB)
├── k6/                    # Skenario load test
│
├── k8s/                   # Fase 1+4: Deployment/Service/Ingress/HPA dasar
├── observability/         # Fase 2+3: Prometheus, Grafana (app SLO), Alertmanager, SLO rules
├── chaos/                 # Fase 5: skenario chaos (pod-kill, cpu-stress, latency-injection)
├── postmortems/           # Fase 5: postmortem blameless berisi data nyata
├── docs/                  # PROJECT-STATUS.md (log tiap fase), regression-baseline.md
│
└── docker-compose.yml     # Stack asli, tidak pernah diubah sepanjang proyek ini
```

## Prinsip yang dipegang sepanjang proyek

- **Tidak pernah merusak yang sudah jalan.** `docker-compose.yml`, Dockerfile asli,
  `nginx.conf`, test Playwright, dan skrip k6 tidak pernah diubah — semua penambahan
  hidup di folder terpisah.
- **Regression gate di tiap perubahan kode app.** Playwright + k6 dijalankan ulang
  dan dibandingkan ke baseline setiap `server.js` berubah.
- **Sumber kebenaran SLO = Prometheus di cluster**, bukan k6 di laptop — angka
  latency dari load test lokal cuma data poin, bukan klaim.
- **Ringan dulu, berat belakangan.** Static scrape config alih-alih Prometheus
  Operator, `tc netem` alih-alih Chaos Mesh — semua demi target akhir jalan di
  STB arm64 dengan RAM terbatas.
