# Regression Baseline — Sebelum Fase 2

Dicatat: 2026-09-14, sebelum ada perubahan kode app apa pun (baseline murni
docker-compose, dipakai sebagai pembanding setelah Fase 2 menyentuh server.js
untuk endpoint `/metrics`).

Environment: Docker Desktop VM 4 CPU / ~3.8GB RAM (macOS host: 8 CPU / 8GB RAM total).

## Playwright (E2E)

```
Running 1 test using 1 worker
  -> Berhasil membuka halaman.
  -> Teks awal sesuai harapan.
  -> Tombol berhasil diklik.
  -> Pesan dari backend berhasil ditampilkan.
✓ 1 tests/app.spec.js:3:1 › should display message from backend after button click (1.9s)
1 passed (7.1s)
```

**Hasil: PASS (1/1).**

## k6 (Load test — target 1000 req/s, 60s, maxVUs 500)

```
checks_total.......: 29147  478.516157/s
checks_succeeded...: 98.09% 28592 out of 29147
checks_failed......: 1.90%  555 out of 29147

http_req_duration..............: avg=5.56ms  p(90)=9.78ms  p(95)=26.52ms  max=212.14ms
http_req_failed................: 1.90%  (555 out of 29147)
http_reqs......................: 29147  478.516157/s (target 1000/s)

dropped_iterations.............: 30853  506.524136/s
vus_max........................: 500
```

**Catatan penting (bukan regresi — ini kondisi dasar sebelum ada perubahan apa pun):**
- Target k6 adalah 1000 req/s, tapi throughput riil cuma ~478 req/s — backend/Postgres
  single-instance (1 replica, tanpa resource limit eksplisit) tidak sanggup mengejar
  rate setinggi itu di laptop ini. `dropped_iterations` besar (~30.8k) mengonfirmasi
  k6 tidak bisa menjadwalkan iterasi secepat target karena request sebelumnya belum
  selesai.
- 1.90% request gagal (non-200) — kemungkinan koneksi pool Postgres (`pg.Pool` tanpa
  konfigurasi `max` eksplisit di server.js) kehabisan slot saat lonjakan concurrent
  request, atau backend sempat overload.
- Ini DIJADIKAN BASELINE apa adanya, bukan sesuatu yang diperbaiki sekarang. Fase 3
  (SLO/SLI) dan Fase 4 (resource limit, HPA) nanti relevan untuk menjelaskan/memperbaiki
  angka ini — justru jadi bahan cerita "define SLO → observe gap → improve" yang bagus
  untuk portofolio.

## Cara reproduksi

```bash
docker compose up -d --build
docker logs doko_playwright     # setelah container Exited (0)
docker logs doko_k6             # setelah container tidak lagi "running"
docker compose down
```
