/**
 * Tự động chạy một luồng đặt món từ đầu đến cuối để kiểm thử
 * - Tạo đơn hàng (POS / QR)
 * - Cập nhật trạng thái món (KDS)
 * - Thanh toán đơn
 * - Kiểm tra Dashboard Metrics
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function run() {
  console.log("🚀 Bắt đầu test phase: End-to-end Smart Ordering Flow\n");

  try {
    // 1. Lấy thông tin bàn đầu tiên (T01)
    console.log("1️⃣ Lấy thông tin bàn và thực đơn...");
    const tablesRes = await fetch(`${BASE_URL}/api/tables`);
    const { tables } = await tablesRes.json();
    const table = tables[0];
    if (!table) throw new Error("Không có bàn nào trong CSDL");
    console.log(`✅ Chọn bàn: ${table.name} (${table.id})`);

    const menuRes = await fetch(`${BASE_URL}/api/menu?branchId=${table.branchId}`);
    const { products } = await menuRes.json();
    if (products.length === 0) throw new Error("Menu rỗng");
    console.log(`✅ Tải được ${products.length} món từ menu.`);

    // 2. Tạo một Order
    console.log("\n2️⃣ Khách hàng đặt món (Tạo Order)...");
    const selectedProduct = products[0];
    const orderPayload = {
      tableId: table.id,
      items: [
        { productId: selectedProduct.id, quantity: 2, note: "Test auto flow" }
      ]
    };
    
    const createOrderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload)
    });
    if (!createOrderRes.ok) throw new Error(`Tạo đơn thất bại: ${await createOrderRes.text()}`);
    const { order } = await createOrderRes.json();
    console.log(`✅ Đã tạo đơn hàng mới: ${order.id}`);

    // 3. KDS cập nhật trạng thái món thành SERVED
    console.log("\n3️⃣ KDS xác nhận và phục vụ món...");
    for (const item of order.items) {
      const updateItemRes = await fetch(`${BASE_URL}/api/order-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SERVED" })
      });
      if (!updateItemRes.ok) throw new Error("Cập nhật trạng thái món thất bại");
      console.log(`✅ Món ${item.product.name} -> SERVED`);
    }

    // Cập nhật trạng thái đơn thành COMPLETED (khi món đã ra hết)
    const completeOrderRes = await fetch(`${BASE_URL}/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED" })
    });
    if (!completeOrderRes.ok) throw new Error("Đóng order thất bại");
    console.log(`✅ Order ${order.id} -> COMPLETED`);

    // 4. Thanh toán đơn
    console.log("\n4️⃣ Khách hàng thanh toán đơn...");
    const payRes = await fetch(`${BASE_URL}/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentStatus: "PAID", paymentMethod: "MOMO" })
    });
    if (!payRes.ok) throw new Error("Thanh toán thất bại");
    console.log(`✅ Order ${order.id} -> Đã thanh toán (MOMO)`);

    // 5. Kiểm tra Dashboard Metrics
    console.log("\n5️⃣ Kiểm tra Dashboard Metrics...");
    const dashboardRes = await fetch(`${BASE_URL}/api/dashboard`);
    const metrics = await dashboardRes.json();
    console.log("📊 Số liệu Realtime Dashboard:");
    console.table(metrics);

    if (metrics.ordersCount > 0 && metrics.revenueToday > 0) {
      console.log("\n🎉 TEST PASSED: Luồng hoạt động hoàn hảo! Realtime metrics đã được cập nhật.");
    } else {
      console.log("\n⚠️ TEST FAILED: Số liệu Dashboard chưa ghi nhận đúng.");
    }
  } catch (err) {
    console.error("\n❌ LỖI TEST:", err.message);
    process.exit(1);
  }
}

run();
