import { Role } from "@prisma/client";

const ROLE_VALUES = new Set<string>(Object.values(Role));

export function parseRole(input: unknown): Role | null {
  if (typeof input !== "string") return null;
  if (!ROLE_VALUES.has(input)) return null;
  return input as Role;
}
