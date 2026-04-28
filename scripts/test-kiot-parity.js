/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const requiredPages = [
  "src/app/admin/page.tsx",
  "src/app/admin/menu/page.tsx",
  "src/app/admin/customers/page.tsx",
  "src/app/admin/invoices/page.tsx",
  "src/app/admin/purchases/page.tsx",
  "src/app/admin/purchase-returns/page.tsx",
  "src/app/admin/stocktakes/page.tsx",
  "src/app/admin/tables/page.tsx",
  "src/app/admin/staff/page.tsx",
  "src/app/admin/promotions/page.tsx",
  "src/app/admin/cashflow/page.tsx",
  "src/app/admin/reports/page.tsx",
  "src/app/admin/settings/page.tsx",
  "src/app/pos/page.tsx",
  "src/app/kds/page.tsx",
  "src/app/order/[qrToken]/page.tsx",
];

const requiredApis = [
  "src/app/api/auth/me/route.ts",
  "src/app/api/menu/route.ts",
  "src/app/api/orders/route.ts",
  "src/app/api/tables/route.ts",
  "src/app/api/admin/stats/route.ts",
  "src/app/api/admin/products/route.ts",
  "src/app/api/admin/tables/route.ts",
  "src/app/api/admin/staff/route.ts",
  "src/app/api/admin/inventory/route.ts",
  "src/app/api/admin/reports/summary/route.ts",
];

const cashierFeatureTokens = [
  "Phiếu mới",
  "Tách món",
  "Ghép đơn",
  "Báo bếp",
  "Khách hàng",
  "Giảm giá HĐ",
  "Phụ thu",
  "Ghi chú món",
  "Tiền mặt",
  "Chuyển khoản",
  "MoMo",
  "VNPay",
  "Ghi nợ",
  "Mang đi",
  "Giao hàng",
  "Ca đang mở",
  "Offline",
];

const pageFlowTokens = {
  "src/app/admin/page.tsx": ["Auto refresh", "Biểu đồ hoạt động", "Hành động nhanh", "Làm mới", "Doanh thu", "Đơn hàng"],
  "src/app/admin/menu/page.tsx": ["Sao chép", "Mở bán", "Tạm dừng", "Xóa chọn", "Xuất CSV", "Cập nhật hàng hóa"],
  "src/app/admin/tables/page.tsx": ["Tạo bàn", "Phòng/Bàn", "AVAILABLE", "OCCUPIED", "QR token", "Cập nhật bàn"],
  "src/app/admin/invoices/page.tsx": ["Giao dịch", "Thuế", "Kế toán", "Thu tiền", "Hạch toán", "Công nợ phải thu"],
  "src/app/admin/cashflow/page.tsx": ["Ghi nhận phiếu", "Sổ quỹ", "Tổng thu", "Tổng chi", "Số dư", "Xuất sổ quỹ"],
  "src/app/admin/reports/page.tsx": ["Báo cáo", "CSV", "Excel", "Top sản phẩm", "Refresh", "Doanh thu"],
};

const qrOrderTokens = [
  "Order tại bàn",
  "Thực đơn",
  "Gửi order",
  "Thanh toán MoMo",
  "Thanh toán VNPay",
  "Đơn đang xử lý",
];

function assertFile(file) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    throw new Error(`Missing required file: ${file}`);
  }
}

function assertCashierSurface() {
  const posPage = fs.readFileSync(path.join(root, "src/app/pos/page.tsx"), "utf8");
  const missing = cashierFeatureTokens.filter((token) => !posPage.includes(token));
  if (missing.length > 0) {
    throw new Error(`Cashier surface missing tokens: ${missing.join(", ")}`);
  }
  console.log(`ok cashier surface covers ${cashierFeatureTokens.length} POS workflows`);
}

function assertPageFlows() {
  for (const [file, tokens] of Object.entries(pageFlowTokens)) {
    const content = fs.readFileSync(path.join(root, file), "utf8");
    const missing = tokens.filter((token) => !content.includes(token));
    if (missing.length > 0) {
      throw new Error(`Flow surface missing in ${file}: ${missing.join(", ")}`);
    }
  }
  console.log(`ok ${Object.keys(pageFlowTokens).length} admin pages cover required flow controls`);
}

function assertQrOrderingSurface() {
  const qrPage = fs.readFileSync(path.join(root, "src/app/order/[qrToken]/SmartOrderingClient.tsx"), "utf8");
  const missing = qrOrderTokens.filter((token) => !qrPage.includes(token));
  if (missing.length > 0) {
    throw new Error(`QR ordering surface missing tokens: ${missing.join(", ")}`);
  }
  console.log(`ok QR ordering surface covers ${qrOrderTokens.length} customer flows`);
}

async function checkHttp(baseUrl) {
  const routes = [
    "/admin",
    "/admin/menu",
    "/admin/customers",
    "/admin/invoices",
    "/admin/purchases",
    "/admin/purchase-returns",
    "/admin/stocktakes",
    "/admin/tables",
    "/admin/staff",
    "/admin/promotions",
    "/admin/cashflow",
    "/admin/reports",
    "/admin/settings",
    "/pos",
    "/kds",
  ];

  for (const route of routes) {
    const start = Date.now();
    const res = await fetch(`${baseUrl}${route}`);
    const elapsed = Date.now() - start;
    if (!res.ok && ![307, 308].includes(res.status)) {
      throw new Error(`${route} returned ${res.status}`);
    }
    if (elapsed > 2500) {
      throw new Error(`${route} is slow: ${elapsed}ms`);
    }
    console.log(`ok ${route} ${res.status} ${elapsed}ms`);
  }
}

async function main() {
  [...requiredPages, ...requiredApis].forEach(assertFile);
  console.log(`ok ${requiredPages.length} KiotViet-style pages exist`);
  console.log(`ok ${requiredApis.length} core APIs exist`);
  assertCashierSurface();
  assertPageFlows();
  assertQrOrderingSurface();

  const baseUrl = process.env.NEXT_PUBLIC_TEST_BASE_URL;
  if (baseUrl) {
    await checkHttp(baseUrl.replace(/\/$/, ""));
  } else {
    console.log("skip HTTP checks: set NEXT_PUBLIC_TEST_BASE_URL=http://localhost:3000");
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
