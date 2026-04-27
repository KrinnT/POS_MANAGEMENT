import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export async function getSocket() {
  if (socket) return socket;

  // Ensure server initializes IO on first call.
  await fetch("/api/socket");

  socket = io({
    path: "/api/socket",
  });

  return socket;
}

export async function joinBranch(branchId: string) {
  const s = await getSocket();
  s.emit("join:branch", branchId);
  return s;
}

