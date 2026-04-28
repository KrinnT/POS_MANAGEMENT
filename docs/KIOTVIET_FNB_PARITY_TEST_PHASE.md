# KiotViet F&B Parity Test Phase

Mục tiêu phase này là kiểm tra các chức năng cốt lõi đã được map từ KiotViet F&B Manager vào `pos_management`.

## Nhóm chức năng cần có

- Tổng quan: dashboard doanh thu, đơn hàng, hiệu suất bàn.
- Hàng hóa: danh sách món, nhóm hàng, giá bán.
- Kho: tồn kho, kiểm kho, nhập hàng, trả hàng nhập.
- Bán hàng: chọn bàn, thêm món, gửi bếp, thanh toán, in hóa đơn.
- Cashier POS: nhiều phiếu bán/tab, chọn/chuyển bàn, tách món, ghép đơn, chọn khách hàng, số khách, ghi chú món, topping, giảm giá món, giảm giá hóa đơn, phụ thu, bán tại bàn/mang đi/giao hàng, báo bếp, in tạm tính, nhiều phương thức thanh toán, ghi nợ, trả tiền thừa, trạng thái online/offline và ca bán.
- Hóa đơn: tra cứu, lọc trạng thái, cập nhật dữ liệu.
- Khách hàng: hồ sơ, nhóm khách, điểm, công nợ.
- Phòng/Bàn: quản lý bàn và QR ordering.
- Nhân viên: danh sách, vai trò, trạng thái.
- Khuyến mại: chương trình, phạm vi, trạng thái.
- Sổ quỹ: phiếu thu/chi và đối soát.
- Báo cáo: tổng hợp kinh doanh.
- Thiết lập: bán hàng, thanh toán, bếp, hóa đơn, bảo mật.

## Kiểm tra tự động

Chạy:

```bash
npm run test:kiot-parity
```

Nếu dev server đang chạy, script sẽ kiểm tra thêm HTTP response:

```bash
npm run dev
NEXT_PUBLIC_TEST_BASE_URL=http://localhost:3000 npm run test:kiot-parity
```

## Kiểm tra thủ công sau dev

1. Đăng nhập admin và mở từng mục trên thanh điều hướng.
2. Với mỗi màn danh sách, thử tìm kiếm, lọc trạng thái, thêm mới, sửa, xóa, xuất CSV.
3. Tại `/pos`, chọn bàn, thêm món, gửi bếp, thanh toán và in hóa đơn.
4. Tại `/pos`, tạo nhiều phiếu bán, tách một dòng món sang phiếu mới, ghép lại, đổi bàn, đổi hình thức mang đi/giao hàng.
5. Tại `/pos`, chọn khách hàng, nhập số khách, ghi chú món, chọn topping, giảm giá món, giảm giá hóa đơn, phụ thu.
6. Tại `/pos`, thử thanh toán bằng tiền mặt, thẻ, chuyển khoản, MoMo, VNPay, ghi nợ; kiểm tra tiền thừa và in tạm tính.
7. Tại `/kds`, xác nhận đơn mới xuất hiện và đổi trạng thái bếp.
8. Tại `/order/T01`, đặt món từ QR và kiểm tra POS/KDS nhận realtime.
9. Tại `/admin/reports`, đối chiếu tổng doanh thu/số đơn sau khi thanh toán.
10. Kiểm tra tốc độ tải màn chính dưới 2 giây trên dữ liệu seed.
