# Fase 1 — Deploy ke k3s (via k3d untuk latihan lokal)

Manifest di folder ini murni tambahan. `docker-compose.yml`, kedua `Dockerfile`,
`server.js`, dan `frontend/nginx.conf` **tidak diubah** — stack docker-compose
tetap jalan seperti biasa.

## 1. Buat cluster k3d (sekali saja)

```bash
k3d cluster create doko --port "8080:80@loadbalancer"
```

`--port 8080:80@loadbalancer` memetakan port 80 Traefik (di dalam cluster) ke
`localhost:8080` di host kamu, supaya tidak bentrok dengan port 80 milik
docker-compose frontend kalau kebetulan lagi jalan bareng.

## 2. Build image lokal

Image tidak dipublish ke registry mana pun — dibangun lokal lalu di-*import*
langsung ke node k3d.

```bash
docker build -t doko-backend:local ./backend
docker build -t doko-frontend:local ./frontend

k3d image import doko-backend:local doko-frontend:local -c doko
```

Kalau nanti kode backend/frontend berubah, ulangi 3 perintah ini lalu
`kubectl rollout restart deployment/backend -n doko` (atau `frontend`).

**Future improvement (belum dikerjakan):** pendekatan ConfigMap+subPath untuk
nginx.conf ini sudah cukup untuk kebutuhan sekarang, tapi kalau nanti mau satu
sumber config yang lebih idiomatik, image `nginx:stable-alpine` punya dukungan
bawaan untuk template + `envsubst` lewat direktori `/etc/nginx/templates/*.template`
(entrypoint resminya otomatis render `*.template` → `/etc/nginx/conf.d/*.conf`
saat container start, dengan variabel dari environment). Itu bisa menyatukan
"satu template, beda env var per environment" tanpa perlu ConfigMap terpisah
yang isinya duplikat sebagian besar dari nginx.conf asli. Ini catatan untuk
nanti, tidak dikerjakan di Fase 1.

## 3. Apply manifest

```bash
kubectl apply -f k8s/
kubectl get pods -n doko -w
```

Tunggu semua pod `Running` (db biasanya paling lama karena inisialisasi PVC).

## 4. Akses dari browser

Tambahkan baris berikut ke `/etc/hosts`:

```
127.0.0.1 doko.local
```

Lalu buka `http://doko.local:8080` (port 8080 sesuai mapping k3d di langkah 1).

## 5. Verifikasi cepat

```bash
# Pod & service sehat?
kubectl get all -n doko

# Postgres benar-benar tidak bisa diakses dari luar cluster:
kubectl get svc db -n doko   # pastikan TYPE = ClusterIP, tidak ada EXTERNAL-IP

# Cek log backend kalau ada request gagal:
kubectl logs -n doko deploy/backend
```

## Bersih-bersih

```bash
kubectl delete ns doko        # hapus semua resource Fase 1
k3d cluster delete doko       # hapus cluster kalau sudah tidak dipakai
```
