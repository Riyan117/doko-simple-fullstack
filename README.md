# Proyek Aplikasi Full-Stack "Doko"

Selamat datang di proyek Doko! Ini adalah contoh aplikasi web full-stack yang lengkap dengan lingkungan pengembangan, testing, dan monitoring, yang seluruhnya berjalan di dalam kontainer menggunakan Docker.

## Teknologi yang Digunakan

<p align="left">
  <a href="https://www.docker.com/" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white&style=for-the-badge" alt="Docker"></a>
  <a href="https://react.dev/" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black&style=for-the-badge" alt="React"></a>
  <a href="https://bun.sh/" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/Bun-000000?logo=bun&logoColor=white&style=for-the-badge" alt="Bun"></a>
  <a href="https://expressjs.com/" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/Express-000000?logo=express&logoColor=white&style=for-the-badge" alt="Express"></a>
  <a href="https://www.postgresql.org/" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white&style=for-the-badge" alt="PostgreSQL"></a>
  <a href="https://www.nginx.com/" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/Nginx-009639?logo=nginx&logoColor=white&style=for-the-badge" alt="Nginx"></a>
  <a href="https://playwright.dev/" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/Playwright-2EAD33?logo=playwright&logoColor=white&style=for-the-badge" alt="Playwright"></a>
  <a href="https://k6.io/" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/k6-8A43FF?logo=k6&logoColor=white&style=for-the-badge" alt="k6"></a>
  <a href="https://grafana.com/" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/Grafana-F46800?logo=grafana&logoColor=white&style=for-the-badge" alt="Grafana"></a>
  <a href="https://www.influxdata.com/" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/InfluxDB-22ADF6?logo=influxdb&logoColor=white&style=for-the-badge" alt="InfluxDB"></a>
</p>

---

## Prasyarat

Sebelum memulai, pastikan Anda telah menginstal perangkat lunak berikut di komputer Anda:

- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/products/docker-desktop/) & Docker Compose
- [Node.js](https://nodejs.org/) (v18 atau lebih baru) & npm
- [Bun](https://bun.sh/)

---

## Instalasi dan Cara Menjalankan

Berikut adalah langkah-langkah untuk menginstal dan menjalankan proyek ini dari awal.

### 1. Clone Repositori

```bash
git clone https://github.com/Riyan117/doko-simple-fullstack.git
cd doko-simple-fullstack
```

### 2. Install Dependensi Proyek

Langkah ini penting agar IDE Anda bisa mengenali semua library dan untuk menjalankan skrip lokal.

**A. Dependensi Frontend (React & Playwright)**
```bash
cd frontend
npm install
cd ..
```

**B. Dependensi Backend (Bun & Express)**
```bash
cd backend
bun install
cd ..
```

### 3. Menjalankan Aplikasi Utama dengan Docker

Perintah ini akan membangun semua image Docker dan menjalankan semua service (database, backend, frontend, monitoring) di latar belakang.

```bash
docker-compose up -d --build
```

Setelah berjalan, Anda bisa mengakses:
- **Aplikasi Frontend**: [http://localhost](http://localhost)
- **Dashboard Monitoring**: [http://localhost:3000](http://localhost:3000) (login: `admin`/`admin`)
- **API Backend (opsional)**: [http://localhost:8080/api/hello](http://localhost:8080/api/hello)
- **Database (via klien)**: Host: `localhost`, Port: `5432`, DB: `app_db`, User: `user`, Pass: `password`

### 4. Menjalankan Sesi Testing

Testing dijalankan secara terpisah. Pastikan aplikasi utama sedang berjalan (langkah 3).

**A. End-to-End Testing (Playwright)**
```bash
docker-compose run --rm playwright
```

**B. Load Testing (k6)**
```bash
docker-compose run --rm k6
```
*(Lihat hasilnya secara real-time di dashboard Grafana)*

### 5. Mematikan Semua Service

Untuk menghentikan semua kontainer yang berjalan, gunakan perintah:

```bash
docker-compose down
```

---

## Struktur Proyek

Berikut adalah penjelasan mengenai struktur folder dan file utama dalam proyek ini:

```
doko-simple-fullstack/
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
├── .gitignore       # Daftar file/folder yang diabaikan oleh Git.
├── docker-compose.yml # File pusat yang mendefinisikan dan menghubungkan SEMUA service.
└── README.md        # File yang sedang Anda baca ini.
```