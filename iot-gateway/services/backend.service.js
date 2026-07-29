/**
 * ============================================================================
 * IoT Gateway — Backend Forwarder Service
 * ============================================================================
 * Fungsi asinkronus yang digunakan oleh protokol HTTP, MQTT, dan CoAP
 * untuk menyelaraskan format payload dan mengirimkannya ke BACKEND_URL
 * (FastAPI Modul A) menggunakan axios.
 *
 * Payload yang dikirim ke backend:
 * {
 *   "protocol": "HTTP" | "MQTT" | "CoAP",
 *   "api_key": "<plaintext API key dari device>",
 *   "data": { "device_id": "...", "temperature": ..., "humidity": ... }
 * }
 * ============================================================================
 */

const axios = require('axios');
const { BACKEND_URL } = require('../config/constants');

async function sendToBackend(protocol, payload, apiKey) {
    try {
        const response = await axios.post(BACKEND_URL, {
            protocol: protocol,
            api_key: apiKey,
            data: payload
        }, {
            timeout: 10000,  // 10 detik timeout
            headers: {
                'Content-Type': 'application/json',
                'X-Gateway-Source': 'iot-gateway-tip'
            }
        });
        console.log(`[${protocol} → Backend] ✅ Sukses diteruskan! Response: ${JSON.stringify(response.data.status || 'ok')}`);
        return response.data;
    } catch (error) {
        if (error.response) {
            // Backend menolak (4xx/5xx)
            console.error(`[${protocol} → Backend] ❌ Ditolak (${error.response.status}):`, error.response.data?.detail || error.response.statusText);
        } else if (error.code === 'ECONNREFUSED') {
            console.error(`[${protocol} → Backend] ❌ Backend tidak dapat dihubungi di ${BACKEND_URL}`);
        } else {
            console.error(`[${protocol} → Backend] ❌ Gagal mengirim:`, error.message);
        }
        throw error;
    }
}

module.exports = { sendToBackend };
