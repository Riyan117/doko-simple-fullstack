# Postmortem: <judul insiden/eksperimen>

- **Tanggal**: YYYY-MM-DD
- **Jenis**: chaos experiment terencana / insiden nyata
- **Penulis**: <nama>
- **Status**: draft / final

> Postmortem ini **blameless**. Tujuannya memahami sistem, bukan mencari siapa
> yang salah. Chaos experiment di homelab ini dijalankan sengaja untuk
> memvalidasi asumsi keandalan sebelum insiden nyata terjadi.

## Ringkasan

Satu-dua kalimat: apa yang terjadi, dampaknya apa.

## Timeline (UTC)

| Waktu | Kejadian |
|---|---|
| | Chaos dimulai / insiden mulai |
| | Terdeteksi (alert menyala / diamati manual) |
| | Root cause dipahami |
| | Mitigasi mulai |
| | Layanan pulih sepenuhnya |

## Metrik kunci

- **Time to detect (TTD)**: berapa lama dari kejadian sampai terdeteksi
- **Time to mitigate / MTTR**: berapa lama dari kejadian sampai pulih
- **Dampak ke error budget**: berapa % error budget bulanan (availability 99%,
  budget 1%) terpakai akibat insiden ini
- **Availability selama insiden**: dari Prometheus (`slo:availability_error:ratio_rate*`)

## Apa yang terjadi (root cause)

Penjelasan teknis, tanpa menyalahkan individu/keputusan tertentu.

## Apa yang berjalan baik

Hal-hal yang mencegah dampak lebih buruk (probe, alerting, dll).

## Apa yang bisa diperbaiki

Rekomendasi konkret — bisa jadi item di roadmap fase berikutnya.

## Action items

| Item | Status |
|---|---|
| | belum dikerjakan / dikerjakan di Fase X |
