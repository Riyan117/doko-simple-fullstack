const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = 8080;

// Konfigurasi koneksi database dari environment variables yang ada di docker-compose
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432,
});

// Fungsi untuk inisialisasi database (membuat tabel jika belum ada)
const initializeDatabase = async () => {
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
  } catch (err) {
    console.error('Error initializing database', err.stack);
  } finally {
    client.release();
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

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
  // Panggil inisialisasi database saat server mulai
  initializeDatabase();
});
