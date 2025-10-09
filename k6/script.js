import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    load_test: {
      executor: 'constant-arrival-rate',
      rate: 1000, // Target: 1000 permintaan per detik
      timeUnit: '1s',
      duration: '60s', // Durasi tes
      preAllocatedVUs: 250, // Jumlah awal Virtual Users
      maxVUs: 500,      // Jumlah maksimal Virtual Users jika diperlukan
    },
  },
};

export default function () {
  // Target endpoint di backend service
  const res = http.get('http://doko_backend:8080/api/hello');
  
  // Verifikasi bahwa respon statusnya adalah 200 (OK)
  check(res, { 'status was 200': (r) => r.status == 200 });
  
  // Menunggu 1 detik sebelum iterasi berikutnya (opsional, tapi praktik yang baik)
  sleep(1);
}
