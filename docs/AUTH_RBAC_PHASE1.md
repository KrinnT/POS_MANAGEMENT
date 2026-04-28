# Authentication & Authorization - Phase 1 (Architecture + Big O)

## Scope
- Module: `Authentication & Authorization`
- Roles: `ADMIN`, `MANAGER`, `CASHIER`, `WAITER`, `CHEF`
- Channels:
  - Admin login: email/password
  - POS login: phone/pin
  - Session cookie + JWT + DB session revocation
  - Permission-based API guard

## Core Flow
1. Login request (`/api/auth/admin/login` or `/api/auth/pos/login`)
2. Validate input schema (`zod`)
3. Fetch user by unique key:
   - email (admin)
   - phone (pos)
4. Verify secret:
   - bcrypt password (admin)
   - pin match (pos)
5. Authorize role by channel (allow-list)
6. Resolve branch scope:
   - explicit `branchId` must belong to user (or user has no branch binding)
7. Create DB session (`jti`, `expiresAt`)
8. Sign JWT (`sub`, `jti`, `branchId`, `role`)
9. Set httpOnly cookie

## Authorization Strategy
- Source of truth for active session: `Session` table (unique index `jti`)
- Source of truth for role: DB relation `user.role.name` (not trusting JWT role alone)
- Permission check:
  - `role -> Set<Permission>` in memory
  - `hasPermission(role, permission)` in O(1)
- Route guard:
  - Reads cookie
  - Verifies token signature/expiry
  - Validates session row
  - Validates role + permission
  - Returns typed auth context for route handlers

## Time/Space Complexity (Target)
- User lookup by unique key (indexed): `O(log n)` DB
- Session lookup by `jti` unique index: `O(log n)` DB
- Permission check with hash/set: `O(1)` time, `O(1)` extra memory per request
- JWT verify: `O(k)` where `k` is token length
- Session create/delete by indexed key: `O(log n)` DB

## Rejected Patterns
- Nested loops on large datasets (`O(n^2)`/`O(n^3)`) in auth path
- Linear permission scans per request when permission count grows
- Trusting role claim in JWT without server-side reconciliation

## Security & Edge Cases
- Invalid/expired/revoked token => `401`
- Token/session user mismatch => `401`
- Missing permission => `403`
- Invalid branch scope => `403`
- Bad payload => `400`
- Invalid credentials => `401` (generic message, no account enumeration)

## Data Contract Notes
- `/api/auth/me` returns:
  - identity (`id`, `phone`, `email`, `branchId`, `role`)
  - permission list (for UI gating and shortcut rendering)
- No role/permission decision from client input.

## Phase 2 Test Plan (TDD)
1. Unit tests for RBAC set membership and unknown roles
2. Unit tests for auth guard mapping:
   - missing cookie
   - invalid token
   - revoked session
   - permission denied
   - success context
3. Integration-like tests for login service:
   - valid admin login
   - role not allowed in channel
   - branch mismatch
   - invalid credential
4. Route behavior tests:
   - unauthorized => 401
   - forbidden => 403
   - successful request => 200
