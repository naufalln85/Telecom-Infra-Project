import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

import {
    subClient
} from "./redis.js";

import {
    setupSocket
} from "./socket.js";

console.log("INI INDEX.JS BACKEND");

const app = express();


app.use(cors());


const server = http.createServer(app);


const io = new Server(server,{
    cors:{
        origin:"http://localhost:5173"
    }
});


app.get("/",(req,res)=>{

    res.send(
        "IoT Backend Running"
    );

});



setupSocket(
    io,
    subClient
);



server.listen(4000,()=>{

    console.log(
        "🚀 Server running at http://localhost:4000"
    );

});