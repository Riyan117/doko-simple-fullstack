const express = require('express');
const { Pool } = require('pg');
const promClient = require('prom-client');

const app = express();
const PORT = 8080;

// --- Metrik Prometheus ---
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register }); // CPU/memory proses bawaan

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total request HTTP yang diterima',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Bucket disetel eksplisit mengapit target SLO latency (rencana p99 < ~300-500ms
// di Fase 3). Bucket dikunci saat definisi metrik, jadi diset dari awal supaya
// Fase 3 tidak perlu ubah instrumentasi.
const httpRequestDurationSeconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Durasi request HTTP dalam detik',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.2, 0.3, 0.5, 0.75, 1, 2.5, 5],
  registers: [register],
});

// Middleware pencatat metrik. /metrics sendiri dikecualikan supaya scrape
// Prometheus tidak ikut mengotori data trafik aplikasi.
// Label "route" pakai req.route.path (template path, mis. "/api/users/:id"),
// BUKAN req.path/req.originalUrl mentah — mencegah cardinality explosion
// kalau nanti ada endpoint berparameter.
app.use((req, res, next) => {
  // /healthz/* dikecualikan juga (sama seperti /metrics) — trafik probe
  // kubelet tiap beberapa detik jangan ikut mengotori metrik/error budget.
  // Ini penting terutama untuk /healthz/ready yang bisa balas 503 (5xx) saat
  // startup, yang kalau ikut kehitung akan salah dibaca sebagai error budget
  // burn oleh alerting Fase 3.
  if (req.path === '/metrics' || req.path.startsWith('/healthz')) return next();

  const endTimer = httpRequestDurationSeconds.startTimer();
  // req.route hanya terisi SETELAH Express selesai routing, jadi dibaca di
  // res.on('finish') (bukan di entry middleware). Untuk request yang tidak
  // cocok route mana pun (404 — mis. probe /healthz sebelum jadi route di
  // Fase 4), req.route tetap undefined, makanya pakai fallback 'unmatched'
  // supaya middleware tidak throw dan label tidak meledak per-URL.
  res.on('finish', () => {
    const route = req.route?.path ?? 'unmatched';
    const labels = { method: req.method, route, status_code: res.statusCode };
    httpRequestsTotal.inc(labels);
    endTimer({ method: req.method, route });
  });

  next();
});

// Konfigurasi koneksi database dari environment variables yang ada di docker-compose
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432,
});

// Known issue (Fase 1-3): backend sempat CrashLoopBackOff di k3d karena
// pool.connect() di bawah bisa reject (ECONNREFUSED) kalau Postgres/jaringan
// cluster belum siap saat container baru start — sebelumnya itu jadi
// unhandled rejection yang mematikan proses. Diperbaiki dengan retry loop:
// tidak pernah throw, cuma tunggu & coba lagi, sampai berhasil.
let dbReady = false;
const DB_RETRY_DELAY_MS = 2000;

const initializeDatabase = async () => {
  for (;;) {
    try {
      const client = await pool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS interaction_logs (
            id SERIAL PRIMARY KEY,
            log_message VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);
        console.log('Database initialized, table "interaction_logs" is ready.');
        dbReady = true;
        return;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error(`Belum bisa konek ke database (${err.message}), retry dalam ${DB_RETRY_DELAY_MS}ms...`);
      await new Promise((resolve) => setTimeout(resolve, DB_RETRY_DELAY_MS));
    }
  }
};

app.get('/api/hello', async (req, res) => {
  const client = await pool.connect();
  try {
    // 1. Simpan log ke database
    const logMessage = 'Frontend requested Hello World';
    await client.query('INSERT INTO interaction_logs (log_message) VALUES ($1)', [logMessage]);
    console.log('Log saved to database.');

    // 2. Kirim respon ke frontend
    res.json({ message: 'Hello World from Backend! (and a log was saved)' });

  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.release();
  }
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Liveness: proses hidup & bisa balas HTTP. TIDAK cek DB — DB down seharusnya
// bikin pod "not ready" (lihat /healthz/ready), bukan direstart terus-menerus
// (restart tidak menyelesaikan masalah DB down, cuma bikin CrashLoop baru).
app.get('/healthz/live', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Readiness: siap terima trafik hanya kalau koneksi DB awal sudah berhasil.
app.get('/healthz/ready', (_req, res) => {
  if (dbReady) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not-ready' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
  // Panggil inisialisasi database saat server mulai
  initializeDatabase();
});
