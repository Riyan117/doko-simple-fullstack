# Gunakan base image resmi dari Bun
FROM oven/bun:1-alpine

# Tentukan direktori kerja di dalam kontainer
WORKDIR /usr/src/app

# Salin package.json dan bun.lockb (jika ada)
COPY package*.json bun.lockb* ./

# Install dependensi dengan efisiensi tinggi
RUN bun install --frozen-lockfile

# Salin sisa kode aplikasi
COPY . .

# Expose port yang digunakan oleh aplikasi
EXPOSE 8080

# Perintah untuk menjalankan aplikasi
CMD [ "bun", "start" ]
