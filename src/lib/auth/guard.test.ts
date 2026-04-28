import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";
import { requirePermission } from "@/lib/auth/guard";
import type { AuthContext } from "@/lib/auth/session";

const mocks = vi.hoisted(() => {
  return {
    getSessionCookie: vi.fn<() => Promise<string | null>>(),
    requireAuth: vi.fn<(token: string) => Promise<AuthContext>>(),
    can: vi.fn<(role: Role, permission: string) => boolean>(),
  };
});

vi.mock("@/lib/auth/cookies", () => ({
  getSessionCookie: mocks.getSessionCookie,
}));

vi.mock("@/lib/auth/session", () => ({
  requireAuth: mocks.requireAuth,
}));

vi.mock("@/lib/auth/rbac", () => ({
  can: mocks.can,
}));

describe("auth guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when cookie is missing", async () => {
    mocks.getSessionCookie.mockResolvedValueOnce(null);

    const result = await requirePermission("table.read");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("returns 401 when session is invalid", async () => {
    mocks.getSessionCookie.mockResolvedValueOnce("bad-token");
    mocks.requireAuth.mockRejectedValueOnce(new Error("Session revoked"));

    const result = await requirePermission("table.read");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("returns 403 when permission is denied", async () => {
    mocks.getSessionCookie.mockResolvedValueOnce("token");
    mocks.requireAuth.mockResolvedValueOnce({
      userId: "u1",
      role: Role.CASHIER,
      branchId: "b1",
    });
    mocks.can.mockReturnValueOnce(false);

    const result = await requirePermission("table.write");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it("returns auth context when permission is granted", async () => {
    mocks.getSessionCookie.mockResolvedValueOnce("token");
    mocks.requireAuth.mockResolvedValueOnce({
      userId: "u1",
      role: Role.MANAGER,
      branchId: "b1",
    });
    mocks.can.mockReturnValueOnce(true);

    const result = await requirePermission("table.read");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.auth.userId).toBe("u1");
      expect(result.auth.role).toBe(Role.MANAGER);
      expect(result.auth.branchId).toBe("b1");
    }
  });
});
