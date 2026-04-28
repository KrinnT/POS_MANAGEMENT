import { getSessionCookie } from "@/lib/auth/cookies";
import { can, type Permission } from "@/lib/auth/rbac";
import { requireAuth, type AuthContext } from "@/lib/auth/session";

export type PermissionGuardResult =
  | { ok: true; auth: AuthContext }
  | { ok: false; response: Response };

export async function requirePermission(permission: Permission): Promise<PermissionGuardResult> {
  const token = await getSessionCookie();
  if (!token) {
    return { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  try {
    const auth = await requireAuth(token);
    if (!can(auth.role, permission)) {
      return { ok: false, response: Response.json({ error: "Forbidden" }, { status: 403 }) };
    }
    return { ok: true, auth };
  } catch {
    return { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
}
