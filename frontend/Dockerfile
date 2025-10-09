# STAGE 1: Build
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./

# Di sini kita menggunakan npm karena create-react-app lebih stabil dengan npm
RUN npm install

COPY . .
RUN npm run build

# STAGE 2: Production
FROM nginx:stable-alpine

# Salin hasil build dari stage builder
COPY --from=builder /app/build /usr/share/nginx/html

# Hapus konfigurasi default nginx
RUN rm /etc/nginx/conf.d/default.conf

# Salin konfigurasi nginx kita
COPY nginx.conf /etc/nginx/conf.d

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
