import type { NextApiRequest } from "next";
import type { NextApiResponseServerIO } from "@/types/next";
import { initIO } from "@/lib/realtime";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(_req: NextApiRequest, res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const httpServer = res.socket.server as any;
    res.socket.server.io = initIO(httpServer);
  }
  res.end();
}

