import { pubClient } from "./redis.js";


const data = {

    deviceId:"esp32-01",

    temperature:26.5,

    humidity:60,

    timestamp:new Date()

};


await pubClient.publish(
    "sensor-update",
    JSON.stringify(data)
);


console.log("Data published:", data);


process.exit();