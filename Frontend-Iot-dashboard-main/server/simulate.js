import { createClient } from "redis";


const redis = createClient({
    url:"redis://localhost:6379"
});


redis.on(
    "error",
    (err)=>{
        console.error(
            "Redis error:",
            err
        );
    }
);


await redis.connect();


console.log(
    "Simulator connected to Redis"
);



setInterval(
async()=>{


    const data = {


        deviceId:"esp32-01",


        temperature:
            Number(
                (20 + Math.random()*10)
                .toFixed(2)
            ),


        humidity:
            Number(
                (50 + Math.random()*20)
                .toFixed(2)
            ),


        pump:
            Math.random()>0.5,


        latitude:
            -6.9175 +
            Math.random()*0.001,


        longitude:
            107.6191 +
            Math.random()*0.001,


        image:
            "https://picsum.photos/500/300",


        ai_image:
            "https://picsum.photos/500/300?random=2",


        ai_label:
            "Healthy Leaf",


        ai_confidence:
            98,


        timestamp:
            Date.now()

    };



    await redis.publish(

        `device:${data.deviceId}`,

        JSON.stringify(data)

    );



    console.log(
        "Publish:",
        data
    );


},2000);