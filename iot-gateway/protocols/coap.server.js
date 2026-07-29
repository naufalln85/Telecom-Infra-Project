/**
 * ============================================================================
 * IoT Gateway — CoAP Server Ingestion
 * ============================================================================
 * Server berbasis CoAP UDP. Membaca header authorization untuk mengambil
 * API Key perangkat.
 *
 * Resource Route: POST /telemetry
 * Header:         authorization: <API Key Device>
 * Payload:        JSON { "device_id": "...", "temperature": ..., "humidity": ... }
 *
 * CoAP Response Codes:
 *   2.04 Changed   — Data berhasil diterima & diteruskan
 *   4.00 Bad Req   — JSON tidak valid / schema gagal
 *   4.01 Unauth    — API Key tidak ditemukan
 *   4.04 Not Found — Resource tidak ditemukan
 * ============================================================================
 */

const coap = require('coap');
const { COAP_PORT, validate } = require('../config/constants');
const { sendToBackend } = require('../services/backend.service');

function startCoapServer() {
    const coapServer = coap.createServer();

    coapServer.on('request', async (req, res) => {
        // ── Hanya proses POST /telemetry ──
        if (req.method === 'POST' && req.url === '/telemetry') {
            // Ambil API Key dari header authorization
            const apiKey = req.headers['authorization'] || null;

            if (!apiKey) {
                console.log(`[CoAP] ⚠️  Request tanpa API Key`);
                res.code = '4.01';  // Unauthorized
                return res.end(JSON.stringify({
                    error: 'Unauthorized: Missing API Key',
                    hint: 'Sertakan header authorization dengan API Key perangkat'
                }));
            }

            try {
                const payloadJson = JSON.parse(req.payload.toString());

                if (!validate(payloadJson)) {
                    console.log(`[CoAP] ❌ Validasi Schema Gagal:`, validate.errors);
                    res.code = '4.00';  // Bad Request
                    return res.end(JSON.stringify({
                        error: 'Invalid JSON Schema',
                        details: validate.errors
                    }));
                }

                console.log(`\n[CoAP] ✅ Data Valid di /telemetry dari device "${payloadJson.device_id}". Meneruskan...`);
                const result = await sendToBackend('CoAP', payloadJson, apiKey);

                res.code = '2.04';  // Changed (success)
                res.end(JSON.stringify({
                    status: 'success',
                    message: 'Data ingested and forwarded via CoAP',
                    protocol: 'CoAP'
                }));
            } catch (e) {
                if (e instanceof SyntaxError) {
                    res.code = '4.00';
                    res.end(JSON.stringify({ error: 'Bad Request: Payload bukan JSON yang valid' }));
                } else {
                    res.code = '5.00';  // Internal Server Error
                    res.end(JSON.stringify({
                        error: 'Failed to forward to backend',
                        detail: e.message
                    }));
                }
            }
        } else if (req.method === 'GET' && req.url === '/health') {
            // ── Health Check untuk CoAP ──
            res.code = '2.05';  // Content
            res.end(JSON.stringify({
                status: 'healthy',
                protocol: 'CoAP',
                port: COAP_PORT,
                timestamp: new Date().toISOString()
            }));
        } else {
            res.code = '4.04';  // Not Found
            res.end(JSON.stringify({ error: 'Resource not found' }));
        }
    });

    coapServer.listen(COAP_PORT, () => {
        console.log(`[CoAP Server] 📡 Siap di port ${COAP_PORT} (UDP)`);
        console.log(`[CoAP Server]    Resource: POST /telemetry`);
        console.log(`[CoAP Server]    Health:   GET  /health`);
    });
}

module.exports = startCoapServer;
