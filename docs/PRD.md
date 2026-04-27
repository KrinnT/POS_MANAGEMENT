## PRD — Global F&B POS (Smart • Modern • Scalable)

### 1) Tầm nhìn sản phẩm

Xây dựng hệ thống POS cho nhà hàng/quán cafe theo chuẩn vận hành F&B quy mô chuỗi:

- **Toast POS**: tối ưu flow phục vụ, bếp, bàn, ticket.
- **Square POS**: UI/UX tối giản, thanh toán liền mạch.
- **Lightspeed**: inventory theo định mức (recipe), cảnh báo, PO.

Mục tiêu: **giảm thao tác**, **giảm lỗi vận hành**, **tăng tốc ra món**, **tăng doanh thu nhờ gợi ý thông minh**, **dễ mở rộng đa chi nhánh**.

### 2) Persona & bối cảnh sử dụng

- **Khách tại bàn**: xem menu, gọi món, theo dõi trạng thái, thanh toán tại bàn, tách hóa đơn.
- **Phục vụ/Thu ngân**: tạo order nhanh, chuyển/ghép bàn, chỉnh món, thu tiền, xử lý offline.
- **Bếp/Bar**: nhận ticket theo trạm, SLA cảnh báo trễ, đánh dấu PREPARING/READY/SERVED.
- **Quản lý/Chủ**: cấu hình menu, giá, tồn kho, nhân sự/ca làm, báo cáo realtime.

### 3) Scope module

#### 3.1 Smart Ordering (Customer Experience)

- **QR Code tại bàn**
  - QR định danh **chính xác bàn** (qrToken/short code + signature)
  - Menu số + giỏ hàng + gửi order
  - **Realtime**: trạng thái order & món
- **Thanh toán tại bàn**
  - Ví điện tử / thẻ (Apple Pay / Momo / VNPay / Card)
  - **Split bill**:
    - Theo món (assign items → payer)
    - Theo tỷ lệ (percentage)
  - Biên lai điện tử
- **CRM / Loyalty**
  - Nhận diện khách (phone, wallet token, membership id)
  - Tích điểm theo hóa đơn
  - Gợi ý upsell/cross-sell dựa lịch sử + món đang chọn

#### 3.2 POS & KDS (Staff Operations)

- **POS UI/UX**
  - Tối ưu “few taps”: chọn bàn → chọn món → send
  - Quick search, category, combo/modifier
  - **Offline-first**:
    - Queue order locally khi mất mạng
    - Đồng bộ khi online + conflict policy
- **KDS**
  - Nhận ticket realtime
  - Lọc theo trạm: **Bếp nóng / Bếp lạnh / Pha chế**
  - SLA timer + cảnh báo trễ

#### 3.3 Back-office / Admin

- **Smart Inventory**
  - Trừ kho theo định mức (recipe) theo từng món bán
  - Cảnh báo ngưỡng tối thiểu
  - Dự thảo PO theo nhà cung cấp (phase tiếp theo)
- **HR / RBAC**
  - Role-based permissions chi tiết
  - Chấm công, ca làm, hoa hồng
- **Reporting & Analytics**
  - Dashboard realtime: doanh thu, AOV, món bán chạy
  - Menu Engineering (Star / Plowhorse / Puzzle / Dog)
  - Export báo cáo chuẩn kế toán

### 4) Non-functional requirements

- **Realtime**: update trạng thái order/ticket < 300ms trong LAN
- **Availability**: POS vẫn tạo order khi mất internet (offline-first)
- **Security**: chuẩn hóa payment flow, chống gian lận, audit log
- **Scalability**: multi-tenant/multi-branch, horizontal scaling realtime
- **Observability**: logs, metrics, tracing; alert lỗi thanh toán/đồng bộ

### 5) MVP đã hiện thực trong repo (baseline)

- **QR ordering demo**: `/order/T01`
- **POS demo**: `/pos`
- **KDS demo**: `/kds` (theo station HOT/COLD/BAR)
- **Inventory demo**: `/inventory` (cảnh báo low stock)
- **Realtime events**: `order:created`, `order:updated`, `item:updated`

