import { Role } from "@prisma/client";

const ADMIN_CHANNEL_ROLES = new Set<Role>([Role.ADMIN, Role.MANAGER]);
const POS_CHANNEL_ROLES = new Set<Role>(Object.values(Role));

export function canLoginAdminChannel(role: Role) {
  return ADMIN_CHANNEL_ROLES.has(role);
}

export function canLoginPosChannel(role: Role) {
  return POS_CHANNEL_ROLES.has(role);
}

export function isBranchScopeAllowed(input: { userBranchId: string | null; requestedBranchId: string | null }) {
  if (!input.requestedBranchId) return true;
  if (!input.userBranchId) return true;
  return input.userBranchId === input.requestedBranchId;
}
