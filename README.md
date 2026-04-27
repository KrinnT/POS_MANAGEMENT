## POS Management (F&B POS MVP)

MVP triển khai theo hướng **Smart Ordering + POS + KDS + Inventory** với **Prisma/PostgreSQL** và **Socket.io realtime**.

### Demo routes

- **Smart ordering (QR)**: ` /order/T01 ` (các token seed: `T01..T04`)
- **POS**: ` /pos `
- **KDS**: ` /kds `
- **Inventory**: ` /inventory `

### Tech stack đề xuất (đang dùng trong repo)

- **Web**: Next.js (App Router) + TypeScript + Tailwind
- **Data**: Prisma ORM + PostgreSQL
- **Realtime**: Socket.io (rooms theo `table:<id>` và `order:<id>`)
- **State (client)**: có sẵn Zustand (MVP hiện dùng local state là chính)

### Setup chạy local

1) Cài dependencies

```bash
npm install
```

2) Cấu hình DB (PostgreSQL) trong `.env` với `DATABASE_URL`

3) Migrate + seed data

```bash
npm run prisma:migrate
npm run prisma:seed
```

4) Chạy dev

```bash
npm run dev
```

### Tài liệu sản phẩm & kiến trúc

- **PRD (Smart Ordering / POS / KDS / Backoffice)**: xem `docs/PRD.md`
- **Kiến trúc hệ thống + luồng order + bảo mật/chống gian lận**: xem `docs/ARCHITECTURE.md`

