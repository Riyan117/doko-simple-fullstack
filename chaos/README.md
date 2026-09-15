# Fase 5 — Chaos Engineering (sederhana)

Tiga skenario chaos, sengaja TANPA Chaos Mesh (RAM STB arm64 terbatas — lihat
aturan main proyek). Semua cukup `kubectl` + image ringan yang sudah ada di
cluster atau ditarik sekali pakai.

| Skenario | Script | Simulasi |
|---|---|---|
| Pod kill | `01-pod-kill.sh` | Node/pod crash mendadak (OOM, reboot) |
| CPU stress | `02-cpu-stress.sh` (+ `02-cpu-stress-job.yaml`) | Noisy neighbor / lonjakan beban |
| Latency injection | `03-latency-injection.sh` | Jaringan lambat (WiFi jelek, congestion) |

Tiap skenario punya postmortem blameless di `/postmortems` (pakai
`TEMPLATE.md`), diisi dengan data nyata dari eksperimen yang benar-benar
dijalankan di cluster k3d — bukan angka rekaan.

## Prasyarat

Cluster k3d dari Fase 1-4 sudah `kubectl apply -f k8s/ -f observability/`.

## Menjalankan

```bash
./chaos/01-pod-kill.sh
./chaos/02-cpu-stress.sh
./chaos/03-latency-injection.sh inject
# ...amati beberapa saat...
./chaos/03-latency-injection.sh remove
```

## Kenapa bukan Chaos Mesh?

Chaos Mesh butuh komponen tambahan (chaos-controller-manager + daemonset
per-node) yang cukup berat untuk STB arm64 RAM terbatas. Tiga skenario di
atas sudah mencakup kelas kegagalan paling umum (crash, resource
contention, network degradation) tanpa overhead itu. Bisa dipertimbangkan
lagi di masa depan kalau kebutuhan skenario lebih kompleks (network
partition, cascading failure multi-service, dll).
