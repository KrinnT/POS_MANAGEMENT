import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function decodePrismaDevApiKeyToDatabaseUrl(apiKey: string): string | null {
  try {
    // The `api_key` used by Prisma Postgres / prisma dev is base64url JSON that contains `databaseUrl`.
    const json = Buffer.from(apiKey, "base64url").toString("utf8");
    const parsed = JSON.parse(json);
    if (typeof parsed?.databaseUrl === "string") {
      return parsed.databaseUrl.replace("localhost", "127.0.0.1");
    }
    return null;
  } catch {
    return null;
  }
}

function resolvePgConnectionString(): string | null {
  const pgUrl = process.env["PG_DATABASE_URL"];
  if (pgUrl) return pgUrl;

  const dbUrl = process.env["DATABASE_URL"];
  if (!dbUrl) return null;
  if (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://")) return dbUrl;

  if (dbUrl.startsWith("prisma+postgres://") || dbUrl.startsWith("prisma+postgresql://")) {
    try {
      const url = new URL(dbUrl);
      const apiKey = url.searchParams.get("api_key");
      if (!apiKey) return null;
      return decodePrismaDevApiKeyToDatabaseUrl(apiKey);
    } catch {
      return null;
    }
  }

  return null;
}

function getAdapter() {
  const connectionString = resolvePgConnectionString();
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
