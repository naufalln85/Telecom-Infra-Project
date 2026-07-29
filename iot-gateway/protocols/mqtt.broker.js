/**
 * ============================================================================
 * IoT Gateway — MQTT Broker Ingestion (Aedes)
 * ============================================================================
 * Broker MQTT berbasis Aedes. Autentikasi dilakukan pada event
 * aedes.authenticate dengan memanfaatkan parameter password sebagai
 * API Key perangkat.
 *
 * Topik Target: telemetry/data
 *
 * Koneksi MQTT dari device:
 *   - Host:     gateway_ip:1884
 *   - Username: (opsional)
 *   - Password: <API Key Device>
 *   - Topic:    telemetry/data
 *   - Payload:  JSON { "device_id": "...", "temperature": ..., "humidity": ... }
 * ============================================================================
 */

const net = require('net');
const Aedes = require('aedes');
const { MQTT_PORT, validate } = require('../config/constants');
const { sendToBackend } = require('../services/backend.service');

function startMqttBroker() {
    const aedes = new Aedes();
    const mqttServer = net.createServer(aedes.handle);

    // ── Autentikasi MQTT — Password = API Key ──
    aedes.authenticate = function (client, username, password, callback) {
        const apiKey = password ? password.toString() : null;
        if (apiKey) {
            client.apiKey = apiKey;
            console.log(`\n[MQTT] 🔑 Device terkoneksi. Client ID: ${client.id}, API Key: ${apiKey.substring(0, 8)}...`);
            callback(null, true);
        } else {
            console.log(`\n[MQTT] ❌ Koneksi ditolak dari ${client.id}: API Key kosong`);
            const error = new Error('Auth error: API Key diperlukan sebagai password');
            error.returnCode = 4;  // Connection Refused, bad user name or password
            callback(error, null);
        }
    };

    // ── Event: Client Connected ──
    aedes.on('client', function (client) {
        console.log(`[MQTT] 📡 Client "${client.id}" terhubung ke broker`);
    });

    // ── Event: Client Disconnected ──
    aedes.on('clientDisconnect', function (client) {
        console.log(`[MQTT] 📴 Client "${client.id}" terputus`);
    });

    // ── Event: Publish — Proses data di topic telemetry/data ──
    aedes.on('publish', async function (packet, client) {
        if (client && packet.topic === 'telemetry/data') {
            try {
                const payloadJson = JSON.parse(packet.payload.toString());

                if (!validate(payloadJson)) {
                    console.log(`[MQTT] ❌ Validasi Schema Gagal dari client ${client.id}:`, validate.errors);
                    return;
                }

                console.log(`\n[MQTT] ✅ Data Valid di Topik [${packet.topic}] dari "${client.id}". Meneruskan ke backend...`);
                await sendToBackend('MQTT', payloadJson, client.apiKey);
            } catch (e) {
                if (e instanceof SyntaxError) {
                    console.error(`[MQTT] ❌ Payload bukan format JSON yang valid dari client ${client.id}`);
                } else {
                    console.error(`[MQTT] ❌ Error memproses data:`, e.message);
                }
            }
        }
    });

    // ── Start MQTT Broker ──
    mqttServer.listen(MQTT_PORT, '0.0.0.0', () => {
        console.log(`[MQTT Broker] 📡 Siap di port ${MQTT_PORT}`);
        console.log(`[MQTT Broker]    Topic: telemetry/data`);
        console.log(`[MQTT Broker]    Auth:  Password = API Key`);
    });
}

module.exports = startMqttBroker;
