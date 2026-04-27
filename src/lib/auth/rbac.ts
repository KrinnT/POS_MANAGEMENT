import type { Role } from "@prisma/client";

export type Permission =
  | "admin.read"
  | "admin.write"
  | "menu.read"
  | "menu.write"
  | "table.read"
  | "table.write"
  | "inventory.read"
  | "inventory.write"
  | "order.read"
  | "order.write"
  | "payment.refund"
  | "staff.read"
  | "staff.write"
  | "report.read";

const rolePermissions: Record<Role, Permission[]> = {
  ADMIN: [
    "admin.read",
    "admin.write",
    "menu.read",
    "menu.write",
    "table.read",
    "table.write",
    "inventory.read",
    "inventory.write",
    "order.read",
    "order.write",
    "payment.refund",
    "staff.read",
    "staff.write",
    "report.read",
  ],
  MANAGER: [
    "admin.read",
    "menu.read",
    "menu.write",
    "table.read",
    "table.write",
    "inventory.read",
    "inventory.write",
    "order.read",
    "order.write",
    "staff.read",
    "staff.write",
    "report.read",
  ],
  CASHIER: ["menu.read", "table.read", "order.read", "order.write", "inventory.read", "report.read"],
  WAITER: ["menu.read", "table.read", "order.read", "order.write"],
  CHEF: ["order.read", "order.write"],
};

export function can(role: Role, permission: Permission) {
  return rolePermissions[role].includes(permission);
}

