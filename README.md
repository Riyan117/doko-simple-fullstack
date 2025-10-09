# Proyek Aplikasi Full-Stack "Doko"

Selamat datang di proyek Doko! Ini adalah contoh aplikasi web full-stack yang lengkap dengan lingkungan pengembangan, testing, dan monitoring, yang seluruhnya berjalan di dalam kontainer menggunakan Docker.

## Fitur & Teknologi

Proyek ini mendemonstrasikan integrasi dari berbagai teknologi modern:

- **Containerization**: `Docker` & `Docker Compose` untuk mengelola semua service.
- **Frontend**: `React` yang disajikan oleh web server `Nginx`.
- **Backend**: `Bun` dengan framework `Express` sebagai server API.
- **Database Aplikasi**: `PostgreSQL` untuk menyimpan data persisten (log interaksi).
- **End-to-End Testing**: `Playwright` untuk melakukan tes otomatis pada antarmuka frontend.
- **Load Testing**: `k6` untuk menguji ketahanan dan performa backend.
- **Monitoring**: `InfluxDB` sebagai database time-series dan `Grafana` untuk visualisasi metrik performa secara real-time.

---

## Struktur Proyek

Berikut adalah penjelasan mengenai struktur folder dan file utama dalam proyek ini:

```
doko/
├── backend/         # Direktori untuk service backend
│   ├── Dockerfile   # Instruksi untuk membangun image backend menggunakan Bun.
│   ├── package.json # Dependensi backend (Express, pg).
│   └── server.js    # Logika server, termasuk endpoint /api/hello dan koneksi ke PostgreSQL.
│
├── frontend/        # Direktori untuk service frontend
│   ├── Dockerfile   # Build multi-stage: build aplikasi React, lalu sajikan dengan Nginx.
│   ├── nginx.conf   # Konfigurasi Nginx, termasuk proxy untuk meneruskan request /api ke backend.
│   ├── package.json # Dependensi frontend (React) dan testing (Playwright).
│   ├── public/      # Aset publik dan file index.html utama.
│   ├── src/         # Kode sumber aplikasi React.
│   └── tests/       # Direktori untuk skrip tes E2E Playwright.
│       └── app.spec.js # Skenario tes yang memverifikasi interaksi frontend-backend.
│
├── grafana/         # Direktori untuk konfigurasi monitoring
│   ├── dashboards/  # Berisi template dashboard dalam format JSON.
│   └── provisioning/# Konfigurasi otomatis untuk Grafana (data source & dashboard).
│
├── k6/              # Direktori untuk skrip load testing
│   └── script.js    # Skenario tes k6 untuk mengirim beban ke endpoint backend.
│
├── docker-compose.yml # File pusat yang mendefinisikan dan menghubungkan SEMUA service.
└── README.md        # File yang sedang Anda baca ini.
```

---

## Cara Menjalankan

Pastikan Anda sudah menginstal **Docker** dan **Docker Compose** di komputer Anda.

### 1. Clone Repositori (Untuk Pengguna Baru)

```bash
git clone https://github.com/NAMA_ANDA/NAMA_REPOSitori.git
cd NAMA_REPOSitori
```

### 2. Menjalankan Aplikasi Utama

Perintah ini akan membangun semua image (jika belum ada) dan menjalankan semua service utama (database, backend, frontend, monitoring) di latar belakang.

```bash
docker-compose up -d --build
```

Setelah berjalan, Anda bisa mengakses:
- **Aplikasi Frontend**: [http://localhost](http://localhost)
- **Dashboard Monitoring**: [http://localhost:3000](http://localhost:3000) (login: `admin`/`admin`)
- **API Backend (opsional)**: [http://localhost:8080/api/hello](http://localhost:8080/api/hello)
- **Database (via klien)**: Host: `localhost`, Port: `5432`, DB: `app_db`, User: `user`, Pass: `password`

### 3. Menjalankan Testing

Testing dijalankan secara terpisah dan tidak berjalan otomatis.

**A. End-to-End Testing (Playwright)**

Perintah ini akan menjalankan tes Playwright yang mensimulasikan interaksi pengguna di browser.

```bash
docker-compose run --rm playwright
```

**B. Load Testing (k6)**

Perintah ini akan menjalankan tes beban ke backend. **Pastikan aplikasi utama sedang berjalan**.

```bash
docker-compose run --rm k6
```

Saat tes ini berjalan, buka dashboard Grafana Anda di [http://localhost:3000](http://localhost:3000) untuk melihat grafiknya secara real-time.

### 4. Mematikan Semua Service

Untuk menghentikan semua kontainer yang berjalan, gunakan perintah:

```bash
docker-compose down
```

Perintah ini akan menghentikan dan menghapus kontainer, tetapi data Anda di database akan tetap aman.
