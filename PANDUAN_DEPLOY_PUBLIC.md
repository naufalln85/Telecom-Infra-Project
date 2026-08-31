# Deploy Publik IoT Platform

Website dan perangkat menggunakan satu domain HTTPS, sehingga pelanggan tidak
perlu mengetahui IP server atau berada pada jaringan lokal yang sama.

1. Buat DNS `A`/`AAAA` untuk `PUBLIC_DOMAIN` ke IP VPS dan buka port TCP 80,
   443, TCP 1884 (MQTT), serta UDP 5683 (CoAP) pada firewall.
2. Salin `.env.example` menjadi `.env`, isi seluruh password/secret baru, lalu
   set `PUBLIC_DOMAIN` dan `CORS_ORIGINS=https://nama-domain-anda`.
3. Jalankan `docker compose up -d --build` dari root proyek. Caddy menerbitkan
   dan memperbarui sertifikat HTTPS otomatis setelah DNS sudah aktif.
4. Buka `https://nama-domain-anda`, daftar/masuk, buat project dan device.
   Setelah device dibuat, halaman **Devices** menampilkan endpoint HTTPS publik
   serta API key satu kali. ESP32 atau perangkat lain mengirim `POST` JSON ke
   endpoint itu dengan header `x-api-key`.

Contoh request perangkat:

```http
POST /gateway/api/v1/telemetry HTTP/1.1
Host: nama-domain-anda
Content-Type: application/json
x-api-key: ygm_live_...

{"temperature":25.4,"humidity":62}
```

Data terbaru dipoll oleh halaman Devices setiap 10 detik dan ditampilkan sebagai
status perangkat. Database dan Redis hanya dibuka pada `127.0.0.1`; jangan
mengeksposnya ke internet.
