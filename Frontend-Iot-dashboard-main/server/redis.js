import { createClient } from "redis";

export const pubClient = createClient({
  url: "redis://localhost:6379",
});

export const subClient = pubClient.duplicate();

pubClient.on("error", (err) => {
  console.error("Redis Pub Error:", err);
});

subClient.on("error", (err) => {
  console.error("Redis Sub Error:", err);
});

await pubClient.connect();
await subClient.connect();

console.log("✅ Redis Connected");