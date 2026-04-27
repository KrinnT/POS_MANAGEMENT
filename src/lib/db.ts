import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getAdapter() {
  const connectionString = process.env["PG_DATABASE_URL"] ?? process.env["DATABASE_URL"];
  if (!connectionString) {
    // Allow build/typegen without DB connectivity; route handlers will fail at runtime if invoked.
    const dummy = "postgresql://user:pass@localhost:5432/db?schema=public";
    const pool = new Pool({ connectionString: dummy });
    return new PrismaPg(pool);
  }
  const pool = new Pool({ connectionString });
  return new PrismaPg(pool);
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: getAdapter(),
    log: process.env["NODE_ENV"] === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env["NODE_ENV"] !== "production") globalForPrisma.prisma = prisma;

