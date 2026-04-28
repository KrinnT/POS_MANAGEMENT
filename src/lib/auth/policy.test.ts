import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import { canLoginAdminChannel, canLoginPosChannel, isBranchScopeAllowed } from "@/lib/auth/policy";

describe("auth policy", () => {
  it("allows only admin/manager for admin channel", () => {
    expect(canLoginAdminChannel(Role.ADMIN)).toBe(true);
    expect(canLoginAdminChannel(Role.MANAGER)).toBe(true);
    expect(canLoginAdminChannel(Role.CASHIER)).toBe(false);
    expect(canLoginAdminChannel(Role.WAITER)).toBe(false);
    expect(canLoginAdminChannel(Role.CHEF)).toBe(false);
  });

  it("allows operational roles for pos channel", () => {
    expect(canLoginPosChannel(Role.ADMIN)).toBe(true);
    expect(canLoginPosChannel(Role.MANAGER)).toBe(true);
    expect(canLoginPosChannel(Role.CASHIER)).toBe(true);
    expect(canLoginPosChannel(Role.WAITER)).toBe(true);
    expect(canLoginPosChannel(Role.CHEF)).toBe(true);
  });

  it("enforces branch scope by user binding", () => {
    expect(isBranchScopeAllowed({ userBranchId: "b1", requestedBranchId: "b1" })).toBe(true);
    expect(isBranchScopeAllowed({ userBranchId: "b1", requestedBranchId: "b2" })).toBe(false);
    expect(isBranchScopeAllowed({ userBranchId: null, requestedBranchId: "b2" })).toBe(true);
    expect(isBranchScopeAllowed({ userBranchId: "b1", requestedBranchId: null })).toBe(true);
  });
});
