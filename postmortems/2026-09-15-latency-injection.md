# Postmortem: Chaos experiment — Latency injection (network delay)

- **Tanggal**: 2026-09-15
- **Jenis**: chaos experiment terencana
- **Penulis**: agent (Fase 5)
- **Status**: final

> Postmortem ini **blameless**.

## Ringkasan

Delay jaringan 300ms (±50ms jitter) diinjeksi ke SATU dari 3 pod backend
(lewat `tc netem` via ephemeral debug container, tanpa Chaos Mesh) untuk
simulasi jaringan lambat. Traffic dikirim tiap 300ms lewat Ingress (load
balanced ke 3 pod) selama delay aktif. **Tidak ada request gagal**, dan
dampak ke latency agregat jauh lebih kecil dari perkiraan — temuan menarik
soal perilaku load balancing.

## Timeline (UTC, 2026-09-15)

| Waktu | Kejadian |
|---|---|
| 03:36:05 | Delay 300ms±50ms diinjeksi ke pod `backend-...-b277q` |
| 03:36:xx | Verifikasi langsung (port-forward ke pod ini): 449ms per request (baseline ~40ms) — delay terkonfirmasi aktif |
| 03:3?:xx–03:38:xx | 200 request dikirim lewat Ingress (round-robin ke 3 pod) |
| 03:38:34, 03:38:35 | Dua-duanya request yang benar-benar kena pod ber-delay (278ms, 338ms) |
| 03:41:12 | Delay dihapus |
| 03:41:2x | Verifikasi langsung ke pod yang sama: kembali ke 73ms — delay hilang total |

## Metrik kunci

- **Time to detect**: tidak relevan — tidak ada alert menyala (dampak
  agregat terlalu kecil untuk melewati threshold burn-rate manapun).
- **MTTR**: N/A — dihapus manual sesuai rencana eksperimen (~5 menit durasi
  delay aktif, bukan insiden yang perlu "dipulihkan").
- **Dampak ke error budget availability**: 0% (semua 200/200 request tetap
  `200`).
- **Dampak ke error budget latency**: sangat kecil — `slo:latency_bad:
  ratio_rate5m` = **0.46%**, di bawah budget 1%. Cuma **2 dari 200 request
  (1%)** yang kena pod ber-delay, jauh di bawah ekspektasi naif ~33%
  (1 dari 3 pod).

## Apa yang terjadi (root cause)

Simulasi murni: `tc qdisc add ... netem delay` di satu pod.

## Temuan tak terduga (paling penting dari eksperimen ini)

Ekspektasi awal: kalau 1 dari 3 pod backend kena delay, ~33% traffic lewat
Ingress seharusnya ikut lambat (asumsi round-robin merata). **Realitanya
cuma 1% (2/200) yang kena.** Kemungkinan penyebab (belum dikonfirmasi lebih
lanjut, perlu investigasi kalau relevan untuk fase depan):
- Traefik (Ingress controller) kemungkinan memakai keep-alive/connection
  reuse per client, bukan round-robin murni per-request, jadi satu
  "sesi" curl cenderung konsisten ke pod yang sama.
- Load balancing di layer Service (kube-proxy) + Ingress bisa dua tingkat
  berbeda algoritmanya, dan kita tidak mengontrol/observasi keduanya secara
  terpisah di eksperimen ini.

**Implikasi reliability**: kalau asumsinya "kegagalan 1 pod = 1/N dampak ke
seluruh traffic", eksperimen ini menunjukkan itu TIDAK SELALU BENAR di
setup Traefik+k3d ini — bisa jadi jauh lebih kecil (untung) atau berpotensi
lebih besar di pola traffic lain (rugi, kalau kebetulan client tertentu
selalu diarahkan ke pod yang bermasalah). Ini bukan kesimpulan
"aman diabaikan", tapi "perlu diukur, jangan diasumsikan".

## Apa yang berjalan baik

- Tidak ada request gagal sama sekali — sistem tetap 100% available selama
  eksperimen, bahkan dengan node yang mengalami network degradation di
  satu pod.
- Skenario ini berhasil dijalankan tanpa Chaos Mesh, cukup `kubectl debug`
  + `tc netem` bawaan Linux — murah dari sisi resource, cocok untuk STB
  arm64 (tidak ada komponen tambahan yang perlu di-deploy permanen).

## Apa yang bisa diperbaiki

- Investigasi lebih lanjut perilaku load balancing Traefik/kube-proxy kalau
  chaos scenario ke depan butuh jaminan distribusi traffic yang lebih bisa
  diprediksi (mis. kalau mau uji dampak proporsional yang presisi).
- Eksperimen ini baru menguji 1 dari 3 pod — belum menguji skenario "semua
  pod lambat sekaligus" yang lebih mendekati kondisi jaringan homelab/ISP
  yang benar-benar bermasalah secara menyeluruh (bukan cuma satu pod).

## Action items

| Item | Status |
|---|---|
| Investigasi algoritma load balancing Traefik (kalau presisi distribusi traffic jadi kebutuhan) | Belum dikerjakan |
| Uji skenario delay di SEMUA pod sekaligus (mendekati kondisi jaringan homelab bermasalah) | Belum dikerjakan |
