/**
 * ============================================================================
 * IoT Gateway — HTTP Ingestion Server (Express)
 * ============================================================================
 * Memproses payload telemetri berbasis REST API.
 * Menuntut ketersediaan API Key di header x-api-key.
 *
 * Endpoint: POST /api/v1/telemetry
 * Header:   x-api-key: <API Key Device>
 * Body:     { "device_id": "string", "temperature": number, "humidity": number }
 *
 * Health:   GET /health — untuk Docker healthcheck
 * ============================================================================
 */

const express = require('express');
const { HTTP_PORT, validate } = require('../config/constants');
const { sendToBackend } = require('../services/backend.service');

function startHttpServer() {
    const app = express();
    app.use(express.json());

    // ── Health Check Endpoint (untuk Docker & monitoring) ──
    app.get('/health', (req, res) => {
        res.status(200).json({
            status: 'healthy',
            protocol: 'HTTP',
            port: HTTP_PORT,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
    });

    // ── Telemetry Ingestion Endpoint ──
    app.post('/api/v1/telemetry', async (req, res) => {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) {
            console.log(`[HTTP] ⚠️  Request tanpa API Key dari ${req.ip}`);
            return res.status(401).json({
                error: 'Unauthorized: Missing API Key',
                hint: 'Sertakan header x-api-key dengan API Key perangkat Anda'
            });
        }

        if (!validate(req.body)) {
            console.log(`[HTTP] ❌ Validasi Schema Gagal:`, validate.errors);
            return res.status(400).json({
                error: 'Invalid JSON Schema',
                details: validate.errors,
                expected: {
                    device_id: "string (wajib)",
                    temperature: "number (wajib)",
                    humidity: "number (wajib)"
                }
            });
        }

        console.log(`\n[HTTP] ✅ Data Valid Masuk dari device "${req.body.device_id}"! Meneruskan ke backend...`);
        try {
            const result = await sendToBackend('HTTP', req.body, apiKey);
            res.status(200).json({
                status: 'success',
                message: 'Data ingested and forwarded via HTTP',
                protocol: 'HTTP',
                backend_response: result
            });
        } catch (err) {
            res.status(502).json({
                error: 'Failed to forward data to backend',
                detail: err.response?.data?.detail || err.message
            });
        }
    });

    // ── 404 Catch-all ──
    app.use((req, res) => {
        res.status(404).json({
            error: 'Not Found',
            available_endpoints: [
                'POST /api/v1/telemetry — Kirim data telemetri',
                'GET  /health           — Health check'
            ]
        });
    });

    app.listen(HTTP_PORT, '0.0.0.0', () => {
        console.log(`[HTTP Server] 🌐 Siap di http://0.0.0.0:${HTTP_PORT}`);
        console.log(`[HTTP Server]    Endpoint: POST /api/v1/telemetry`);
        console.log(`[HTTP Server]    Health:   GET  /health`);
    });
}

module.exports = startHttpServer;
