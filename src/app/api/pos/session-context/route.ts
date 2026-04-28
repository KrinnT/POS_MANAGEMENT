import { prisma } from "@/lib/db";
import { requirePosPermission } from "@/lib/pos/auth";
import { posError, posSuccess } from "@/lib/pos/http";
import { listPermissions } from "@/lib/auth/rbac";

export const runtime = "nodejs";

export async function GET() {
  const authResult = await requirePosPermission("order.read");
  if (!authResult.ok) return authResult.response;
  const auth = authResult.auth;

  const branch = await prisma.branch.findUnique({
    where: { id: auth.branchId },
    select: { id: true, name: true, timezone: true, currency: true },
  });
  if (!branch) return posError("NOT_FOUND", "Branch not found", 404);

  return posSuccess({
    branch,
    user: {
      id: auth.userId,
      role: auth.role,
      permissions: listPermissions(auth.role),
    },
    settings: {
      vatMode: "EXCLUSIVE",
      roundingMode: "HALF_UP",
      roundingUnit: 1,
      allowMixedPayment: true,
      autoCloseOnQrPaid: false,
    },
  });
}
