import type { Server as HTTPServer } from "http";
import type { Socket } from "socket.io";
import { Server } from "socket.io";

type RealtimeState = {
  io?: Server;
};

const globalForRealtime = globalThis as unknown as RealtimeState;

export function getIO() {
  return globalForRealtime.io;
}

export function initIO(httpServer: HTTPServer) {
  if (globalForRealtime.io) return globalForRealtime.io;

  const io = new Server(httpServer, {
    path: "/api/socket",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket: Socket) => {
    socket.on("join:branch", (branchId: string) => {
      socket.join(`branch:${branchId}`);
    });

    socket.on("join:table", (tableId: string) => {
      socket.join(`table:${tableId}`);
    });

    socket.on("join:order", (orderId: string) => {
      socket.join(`order:${orderId}`);
    });
  });

  globalForRealtime.io = io;
  return io;
}

