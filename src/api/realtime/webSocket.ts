import { io, Socket } from "socket.io-client";

export function createMessengerSocket(userId: string): Socket {
  const socket = io("https://vdk53r2pb3.us-east-2.awsapprunner.com/ws", {
    path: "/socket.io",
    transports: ["polling"],
    upgrade: false,
    auth: { userId: 1 },
  });

  socket.on("connect", () => {
    console.log("[ws] CONNECTED via polling. id=", socket.id);
  });

  socket.on("connect_error", (err) => {
    console.error("[ws] connect_error:", err?.message || err);
  });

  socket.on("error", (err) => {
    console.error("[ws] error:", err);
  });

  return socket;
}
