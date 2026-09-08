# 🌐 Panduan Lengkap Setup Cloudflare Tunnel — IoT Platform

Panduan ini berisi langkah-langkah mudah untuk menghubungkan server Proxmox (`kp-core`) ke jaringan **Cloudflare Tunnel** agar Web Dashboard dan IoT Ingestion Gateway dapat diakses dari internet secara aman via HTTPS tanpa buka port router.

---

## ⚡ 1. Opsi Cepat (Quick Tunnel — Demo & Testing ESP8266/ESP32)

Gunakan opsi ini jika sedang melakukan pengujian/demo cepat dari perangkat IoT dari luar jaringan LAN.

### A. Tunnel untuk Web Dashboard (Akses Frontend UI)
```bash
cloudflared tunnel --url http://localhost:5173
```
*Output akan menampilkan URL HTTPS publik seperti:*
`https://your-random-subdomain.trycloudflare.com`

---

### B. Tunnel untuk IoT Gateway (HTTP Ingestion Telemetri ESP8266/ESP32)
```bash
cloudflared tunnel --url http://localhost:3000
```
*Gunakan URL HTTPS publik yang dihasilkan pada kode ESP8266/ESP32 Anda:*
`https://your-gateway-subdomain.trycloudflare.com/api/v1/telemetry`

---

## 🛡️ 2. Opsi Permanen (Named Tunnel — Domain Sendiri & Production)

Gunakan opsi ini jika ingin menggunakan nama domain sendiri (misal: `iot.domainanda.com`).

### Langkah 1: Login & Buat Tunnel
```bash
# 1. Login ke akun Cloudflare Anda
cloudflared tunnel login

# 2. Buat Tunnel permanen dengan nama 'iot-tunnel'
cloudflared tunnel create iot-tunnel
```
*Catat **UUID Tunnel** yang dihasilkan di layar.*

---

### Langkah 2: Buat File Konfigurasi (`/root/.cloudflared/config.yml`)
```bash
nano ~/.cloudflared/config.yml
```

Isi file konfigurasi:
```yaml
tunnel: <GANTI_DENGAN_UUID_TUNNEL>
credentials-file: /root/.cloudflared/<GANTI_DENGAN_UUID_TUNNEL>.json

ingress:
  # Web Dashboard Frontend
  - hostname: iot.domainanda.com
    service: http://localhost:5173

  # IoT Telemetry Gateway (HTTP Ingestion)
  - hostname: gateway.domainanda.com
    service: http://localhost:3000

  # Catch-all status 404
  - service: http_status:404
```

---

### Langkah 3: Route DNS ke Cloudflare
```bash
cloudflared tunnel route dns iot-tunnel iot.domainanda.com
cloudflared tunnel route dns iot-tunnel gateway.domainanda.com
```

---

### Langkah 4: Install & Jalankan Service Background Permanen
```bash
# Install sebagai system service
cloudflared service install

# Jalankan service otomatis saat boot
systemctl enable --now cloudflared

# Cek status service
systemctl status cloudflared
```

---

## 💻 3. Pengujian Integrasi dari ESP8266 / ESP32

Setelah Cloudflare Tunnel berjalan, tes kirim data dari terminal Proxmox menggunakan `curl`:

```bash
curl -X POST https://gateway.domainanda.com/api/v1/telemetry \
  -H "Content-Type: application/json" \
  -H "x-api-key: PASTE_API_KEY_DEVICE_ANDA" \
  -d '{"ldr_lux": 450, "light": 78.5}'
```

Jika sukses, balasan server berupa:
`{"status":"success","message":"Data ingested and forwarded via HTTP","protocol":"HTTP"}`

---

## 💡 Troubleshooting Cloudflare Tunnel

| Masalah | Penyebab | Solusi |
|---|---|---|
| `API key perangkat tidak valid` | API Key di header `-H "x-api-key: ..."` salah / belum dibuat | Ambil API key valid dari menu **Devices** di web dashboard |
| `502 Bad Gateway` | Container Docker frontend/gateway mati | Jalankan `docker compose up -d` |
| `Connection reset by peer` | Port localhost tidak sesuai | Pastikan port 5173 (frontend) dan 3000 (gateway) aktif (`ss -tulpn`) |
