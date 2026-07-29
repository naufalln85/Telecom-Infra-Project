/**
 * ============================================================================
 * IoT Gateway — Entry Point Utama
 * ============================================================================
 * Berkas utama untuk mengimpor dan menjalankan seluruh modul protokol
 * ingestion secara paralel dalam satu alur eksekusi Node.js.
 *
 * Service yang dijalankan:
 *   1. HTTP Server  (Express)    → Port 3000
 *   2. MQTT Broker  (Aedes)      → Port 1884
 *   3. CoAP Server  (node-coap)  → Port 5683 (UDP)
 *
 * Semua data yang masuk akan di-forward ke Backend FastAPI (Modul A)
 * melalui HTTP POST ke endpoint /api/v1/save-data.
 * ============================================================================
 */

const { BACKEND_URL, HTTP_PORT, MQTT_PORT, COAP_PORT } = require('./config/constants');

console.log('');
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║       🚀 IoT PROTOCOL GATEWAY — TIP Platform (Modul B)     ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log(`║  HTTP Server  : http://0.0.0.0:${HTTP_PORT}                       ║`);
console.log(`║  MQTT Broker  : mqtt://0.0.0.0:${MQTT_PORT}                       ║`);
console.log(`║  CoAP Server  : coap://0.0.0.0:${COAP_PORT}                       ║`);
console.log(`║  Backend URL  : ${BACKEND_URL.padEnd(42)}║`);
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log('║  Status: Menginisialisasi semua protokol...                 ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');

// Impor dan jalankan semua server protokol
const startHttpServer = require('./protocols/http.server');
const startMqttBroker = require('./protocols/mqtt.broker');
const startCoapServer = require('./protocols/coap.server');

// Memulai seluruh server Ingestion Protocol secara paralel
startHttpServer();
startMqttBroker();
startCoapServer();

console.log('');
console.log('[Gateway] ✅ Semua protokol telah di-start. Menunggu koneksi device...');
console.log('');

// Graceful Shutdown Handler
process.on('SIGTERM', () => {
    console.log('\n[Gateway] 🛑 Menerima SIGTERM. Mematikan gateway...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n[Gateway] 🛑 Menerima SIGINT. Mematikan gateway...');
    process.exit(0);
});
