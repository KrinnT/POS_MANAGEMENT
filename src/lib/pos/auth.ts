import { requirePermission } from "@/lib/auth/guard";
import type { Permission } from "@/lib/auth/rbac";
import type { Role } from "@prisma/client";

export type PosAuthContext = {
  userId: string;
  role: Role;
  branchId: string;
};

export async function requirePosPermission(permission: Permission): Promise<
  | { ok: true; auth: PosAuthContext }
  | { ok: false; response: Response }
> {
  const guard = await requirePermission(permission);
  if (!guard.ok) return guard;
  if (!guard.auth.branchId) {
    return { ok: false, response: Response.json({ error: "Branch not selected" }, { status: 400 }) };
  }

  return {
    ok: true,
    auth: {
      userId: guard.auth.userId,
      role: guard.auth.role,
      branchId: guard.auth.branchId,
    },
  };
}
