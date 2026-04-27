## Kiến trúc hệ thống — F&B POS (Next.js + Prisma + PostgreSQL + Realtime)

### 1) High-level architecture

- **Client**
  - Customer web (QR): mobile browser
  - Staff Web POS (tablet/desktop)
  - KDS (kitchen screen)
  - Back-office (admin)
- **Server**
  - Next.js server (API Route Handlers + Pages API cho Socket.io bootstrap)
  - Prisma ORM
- **Database**
  - PostgreSQL
- **Realtime**
  - Socket.io server
  - Rooms:
    - `table:<tableId>`: khách tại bàn subscribe
    - `order:<orderId>`: chi tiết 1 order

### 2) Tech stack đề xuất (production-grade)

- **Frontend**
  - Next.js + TypeScript
  - UI: Tailwind + component library (shadcn/ui hoặc tương đương)
  - State: Zustand + React Query (hoặc SWR) cho cache/fetch
- **Backend**
  - Next.js Route Handlers (BFF) hoặc tách service Node.js (NestJS/Fastify) khi scale lớn
  - Auth: session/JWT + RBAC
  - Validation: Zod
- **Data**
  - PostgreSQL + Prisma
  - Redis (queue/offline sync token, rate limit, locks)
- **Realtime**
  - Socket.io + Redis adapter (scale nhiều instance)
- **Payments**
  - Payment orchestrator service + webhook handler + idempotency
- **Infra**
  - Container/K8s, secret manager, WAF/CDN
  - Observability: OpenTelemetry + log aggregation

### 3) Database schema (baseline)

Các bảng lõi (đã có trong `prisma/schema.prisma`):

- **User**: `id`, `phone`, `role`, `passcode`
- **Table**: `id`, `name`, `status`, `qrToken`
- **Product**: `id`, `name`, `price`, `category`, `station`, `isAvailable`
- **Inventory**: `id`, `ingredient`, `stockQuantity`, `unit`, `minThreshold`
- **Recipe** (join): `(productId, inventoryId)`, `amount`
- **Order**: `id`, `tableId`, `userId`, `status`, `totalAmount`, `paymentStatus`, `paymentMethod`, timestamps
- **OrderItem**: `id`, `orderId`, `productId`, `quantity`, `status`, `modifiers`, `note`

Gợi ý mở rộng (phase sau):

- `Customer`, `LoyaltyPointLedger`, `Payment`, `Refund`, `Tip`
- `Shift`, `Timesheet`, `CommissionRule`
- `PurchaseOrder`, `Supplier`, `GoodsReceipt`
- `AuditLog` + `Device`

### 4) Order Flow (end-to-end)

#### 4.1 Luồng khách quét QR → gọi món

1) **Khách quét QR** → mở `/order/<qrToken>`
2) Client gọi `GET /api/tables` để map `qrToken → tableId` (prod: nên dùng endpoint riêng + signature)
3) Client gọi `GET /api/menu` hiển thị sản phẩm
4) Khách bấm “Place order” → `POST /api/orders`
5) Server:
   - tạo `Order` + `OrderItem`
   - trừ `Inventory` theo `Recipe` (MVP: update tuần tự; prod: transaction + lock)
   - phát realtime:
     - `order:created` (global)
     - `order:created` tới room `table:<tableId>`

#### 4.2 Luồng bếp xử lý

1) KDS subscribe realtime
2) Ticket hiện theo `Product.station` (HOT/COLD/BAR)
3) Bếp cập nhật từng item:
   - `PATCH /api/order-items/<itemId>` với status PREPARING/READY/SERVED
4) Server roll-up trạng thái `Order` và phát `order:updated`

#### 4.3 Luồng thanh toán tại bàn

1) Khách bấm pay (MVP mock) → `PATCH /api/orders/<orderId>` set `paymentStatus=PAID`, `paymentMethod=...`
2) Khi `Order` đạt `COMPLETED` + `PAID` → set `Table.status=AVAILABLE` (hiện mới auto-free khi đủ điều kiện)

### 5) Bảo mật dữ liệu & chống gian lận (khuyến nghị)

- **QR token bảo mật**
  - Không dùng qrToken đoán được; dùng short code + **HMAC signature** + expiry
  - Rate-limit theo IP/device; chống brute-force
- **Payment anti-fraud**
  - **Idempotency key** cho tạo payment + webhook
  - Tách `Payment` record: `AUTHORIZED/CAPTURED/FAILED/REFUNDED`
  - Verify webhook signature từ Momo/VNPay; chống replay (nonce/timestamp)
  - Detect bất thường: nhiều refund, split-bill lặp, void item liên tục
- **RBAC + audit**
  - Permission matrix theo role + action (discount, void, refund, edit order)
  - Audit log bất biến cho thay đổi nhạy cảm
- **Data protection**
  - Encrypt secrets (KMS/secret manager)
  - PII minimization; hashing/salt cho identifier nhạy cảm
  - TLS everywhere; CSP/secure headers; CSRF cho session-based
- **Offline-first integrity**
  - Local queue ký bằng device key
  - Sync theo sequence number + conflict resolution
  - Server-side reconciliation (không tin client total/price)

