import { pubClient } from "./redis.js";

export async function setupSocket(io, subClient) {

    // Socket.IO
    io.on("connection", (socket) => {

        console.log("Client connected:", socket.id);

        // Join room berdasarkan deviceId
        socket.on("subscribe", ({ deviceId }) => {

            socket.join(deviceId);

            console.log(
                `${socket.id} subscribed to ${deviceId}`
            );

        });

        // Keluar dari room
        socket.on("unsubscribe", ({ deviceId }) => {

            socket.leave(deviceId);

            console.log(
                `${socket.id} unsubscribed from ${deviceId}`
            );

        });

        // Data dari simulator / ESP32
        socket.on("sensor-update", async (data) => {

            console.log("Simulator data:", data);

            try {

                await pubClient.publish(
                    `device:${data.deviceId}`,
                    JSON.stringify(data)
                );

            } catch (err) {

                console.error(
                    "Redis publish error:",
                    err
                );

            }

        });

        socket.on("disconnect", () => {

            console.log(
                "Client disconnected:",
                socket.id
            );

        });

    });

    // Redis Subscriber
    await subClient.pSubscribe(
        "device:*",
        (message, channel) => {

            try {

                const deviceId = channel.split(":")[1];

                const data = JSON.parse(message);

                console.log(
                    "Redis message:",
                    data
                );

                io.to(deviceId).emit(
                    "device-data",
                    data
                );

            } catch (err) {

                console.error(
                    "Redis subscribe error:",
                    err
                );

            }

        }
    );

}