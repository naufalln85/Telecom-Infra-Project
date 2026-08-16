/**
 * ============================================================================
 * IoT Gateway — Konfigurasi Utama & Schema Validator
 * ============================================================================
 * Mendefinisikan port untuk masing-masing protokol, URL backend utama,
 * dan mengompilasi skema telemetri JSON menggunakan Ajv.
 *
 * BACKEND_URL: Disesuaikan agar di dalam Docker network menggunakan nama
 * service "backend" (bukan localhost), dan port 8000 (FastAPI).
 * Bisa di-override via environment variable BACKEND_URL.
 * ============================================================================
 */

const Ajv = require('ajv');
const ajv = new Ajv();

// Port untuk masing-masing protokol ingestion
const HTTP_PORT = parseInt(process.env.GATEWAY_HTTP_PORT || '3000', 10);
const MQTT_PORT = parseInt(process.env.GATEWAY_MQTT_PORT || '1884', 10);
const COAP_PORT = parseInt(process.env.GATEWAY_COAP_PORT || '5683', 10);

// URL backend tujuan (FastAPI Modul A)
// Di Docker Compose: http://backend:8000/api/v2/telemetry
// Di lokal dev:      http://localhost:8000/api/v2/telemetry
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:8000/api/v2/telemetry';

// JSON Schema telemetri — validasi data masuk dari device IoT
const telemetrySchema = {
    type: "object",
    minProperties: 1,
    additionalProperties: true  // Payload nyata boleh memiliki channel apa pun.
};

const validate = ajv.compile(telemetrySchema);

module.exports = {
    HTTP_PORT,
    MQTT_PORT,
    COAP_PORT,
    BACKEND_URL,
    validate
};
