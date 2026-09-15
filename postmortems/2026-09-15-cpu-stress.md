# Postmortem: Chaos experiment — CPU stress (noisy neighbor)

- **Tanggal**: 2026-09-15
- **Jenis**: chaos experiment terencana
- **Penulis**: agent (Fase 5)
- **Status**: final

> Postmortem ini **blameless**.

## Ringkasan

Job `stress-ng --cpu 2 --timeout 60s` dijalankan di node yang sama dengan
backend untuk simulasi "noisy neighbor" / lonjakan beban CPU node. Traffic
dikirim tiap 300ms sepanjang & setelah eksperimen. **Tidak ada request
gagal**; latency naik tipis tapi tetap jauh di bawah target SLO.

## Timeline (UTC, 2026-09-15)

| Waktu | Kejadian |
|---|---|
| 03:31:48 | Monitoring traffic dimulai (interval 300ms, 400 request) |
| 03:31:51 | Job `chaos-cpu-stress` dibuat |
| ~03:31:52-03:32:05 | Job menarik & install `stress-ng` (apk) sebelum stress dimulai |
| ~03:32:05-03:33:05 | `stress-ng` aktif membakar 2 core CPU (60 detik) |
| 03:33:05 | `stress-ng` selesai (`stress-ng: info: successful run completed`) |
| ~03:34:25 | Monitoring traffic selesai (400/400 request terkirim) |

## Metrik kunci

- **Time to detect**: tidak relevan — tidak ada dampak yang butuh deteksi
  (tidak ada alert menyala, availability tetap 100%).
- **MTTR**: tidak relevan (tidak ada gangguan untuk dipulihkan — job stress
  berhenti sendiri sesuai `--timeout 60s`).
- **Dampak ke error budget availability**: **0%** — `slo:availability_error:
  ratio_rate5m` = 0 tepat setelah eksperimen; 400/400 HTTP request balas
  `200`.
- **Dampak ke error budget latency**: kecil — `slo:latency_bad:ratio_rate5m`
  = **0.66%** (proporsi request >500ms), masih di bawah budget 1%. Dari
  observasi manual: avg 64ms, p95 135ms, 2 dari 400 sampel (0.5%) di atas
  500ms (outlier 826ms & 817ms — kemungkinan bertepatan dgn awal/akhir job
  saat node sedang scheduling/cleanup, bukan selama stress murni).
- **HPA**: sudah di replika maksimum (3/3) dari eksperimen sebelumnya,
  `cpu: 70%/70%` selama stress — tepat di ambang, tidak ada ruang scale-up
  lagi (`maxReplicas: 3`).

## Apa yang terjadi (root cause)

Simulasi murni: `stress-ng` sengaja membebani CPU node.

## Apa yang berjalan baik

- Resource **limit** pada Deployment backend (200m CPU cap, lihat
  `k8s/03-backend.yaml`) mencegah backend sendiri jadi penyebab starvation —
  yang membebani node adalah job stress terpisah, backend tetap dapat
  jatah CPU sesuai request/limit-nya.
- 3 replika (sisa dari HPA scale-up sebelumnya) membantu menyerap variasi
  latency — kalaupun satu request "apes" kena node yang lagi sibuk, replika
  lain kemungkinan tetap responsif.

## Apa yang bisa diperbaiki

- `maxReplicas: 3` di HPA sudah tercapai — kalau stress CPU lebih besar/lama
  dari ini (mis. seluruh node dipakai stressor), scale-up horizontal tidak
  banyak membantu karena node yang sama tetap jadi bottleneck bersama.
  Rekomendasi masa depan: uji ulang dengan node pool >1 (k3d multi-agent) atau
  `PriorityClass`/`ResourceQuota` supaya chaos job tidak bisa merebut resource
  tanpa batas dari workload produksi.
- Belum ada percobaan stress CPU yang cukup besar untuk benar-benar
  memicu alert `LatencyErrorBudgetBurn*` — eksperimen ini baik untuk validasi
  "sistem tahan gangguan kecil", belum menguji jalur alerting itu sendiri.

## Action items

| Item | Status |
|---|---|
| Uji stress CPU lebih agresif (misal 4 core / durasi lebih lama) untuk coba trigger alert Fase 3 | Belum dikerjakan |
| Pertimbangkan `ResourceQuota` per-namespace untuk isolasi chaos job dari workload utama | Belum dikerjakan |
