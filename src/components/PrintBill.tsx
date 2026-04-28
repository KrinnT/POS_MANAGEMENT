"use client";

import { useRef } from "react";

type BillItem = {
  name: string;
  quantity: number;
  price: number;
};

type PrintBillProps = {
  orderId: string;
  tableName: string;
  items: BillItem[];
  totalAmount: number;
  onClose: () => void;
};

function getVietQRUrl(amount: number, orderId: string): string {
  const bankId = process.env.NEXT_PUBLIC_VIETQR_BANK_ID || "MB";
  const accountNo = process.env.NEXT_PUBLIC_VIETQR_ACCOUNT_NO || "0388888888";
  const info = encodeURIComponent(`TT Don ${orderId.slice(0, 8).toUpperCase()}`);
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${Math.round(amount)}&addInfo=${info}&accountName=KRINNT%20POS`;
}

function vnd(n: number) {
  return n.toLocaleString("vi-VN") + " đ";
}

export function PrintBill({ orderId, tableName, items, totalAmount, onClose }: PrintBillProps) {
  const billRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const printContent = billRef.current;
    if (!printContent) return;
    const w = window.open("", "_blank", "width=400,height=700");
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Hóa đơn ${orderId.slice(0, 8).toUpperCase()}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 80mm;
            max-width: 80mm;
            margin: 0 auto;
            padding: 4mm;
            font-size: 12px;
            color: #000;
            background: #fff;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider {
            border-top: 1px dashed #000;
            margin: 6px 0;
          }
          .header { margin-bottom: 8px; }
          .header h1 { font-size: 16px; margin-bottom: 2px; }
          .header p { font-size: 11px; color: #333; }
          .info { font-size: 11px; margin-bottom: 6px; }
          .info-row { display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { text-align: left; padding: 3px 0; border-bottom: 1px solid #000; }
          th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: right; }
          td { padding: 3px 0; vertical-align: top; }
          td:nth-child(2), td:nth-child(3), td:nth-child(4) { text-align: right; }
          .total-section { margin-top: 6px; }
          .total-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 12px; }
          .total-row.big { font-size: 14px; font-weight: bold; margin-top: 2px; }
          .qr-section { margin-top: 10px; text-align: center; }
          .qr-section img { width: 55mm; height: auto; }
          .qr-section p { font-size: 10px; margin-top: 4px; color: #333; }
          .footer { margin-top: 10px; text-align: center; font-size: 10px; color: #555; }
          @media print {
            body { width: 80mm; margin: 0; padding: 2mm; }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    w.document.close();
    w.onload = () => {
      w.print();
      w.onafterprint = () => w.close();
    };
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Preview */}
        <div ref={billRef} className="p-6" style={{ fontFamily: "'Courier New', monospace" }}>
          <div className="center header">
            <h1 className="bold" style={{ fontSize: 18 }}>KRINNT POS</h1>
            <p style={{ fontSize: 12, color: "#333" }}>F&B Operations Suite</p>
            <p style={{ fontSize: 11, color: "#555" }}>ĐT: 0900 000 000</p>
          </div>

          <div className="divider" style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

          <div className="center bold" style={{ fontSize: 14, marginBottom: 6 }}>HÓA ĐƠN BÁN HÀNG</div>

          <div style={{ fontSize: 11, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Số HĐ: {orderId.slice(0, 8).toUpperCase()}</span>
              <span>{timeStr}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Bàn: {tableName}</span>
              <span>Ngày: {dateStr}</span>
            </div>
          </div>

          <div className="divider" style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", paddingBottom: 4 }}>Sản phẩm</th>
                <th style={{ textAlign: "right", paddingBottom: 4 }}>SL</th>
                <th style={{ textAlign: "right", paddingBottom: 4 }}>Đ.Giá</th>
                <th style={{ textAlign: "right", paddingBottom: 4 }}>T.Tiền</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ paddingTop: 3, paddingBottom: 3 }}>{item.name}</td>
                  <td style={{ textAlign: "right", paddingTop: 3 }}>{item.quantity}</td>
                  <td style={{ textAlign: "right", paddingTop: 3 }}>{item.price.toLocaleString("vi-VN")}</td>
                  <td style={{ textAlign: "right", paddingTop: 3 }}>{(item.price * item.quantity).toLocaleString("vi-VN")}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="divider" style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

          <div style={{ fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
              <span>Tổng tiền hàng:</span>
              <span>{vnd(totalAmount)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
              <span>Chiết khấu:</span>
              <span>0</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontWeight: "bold", fontSize: 14 }}>
              <span>TỔNG THANH TOÁN:</span>
              <span>{vnd(totalAmount)}</span>
            </div>
          </div>

          <div className="divider" style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

          {/* VietQR Code */}
          <div style={{ textAlign: "center", marginTop: 10 }}>
            <p style={{ fontSize: 11, marginBottom: 6, fontWeight: "bold" }}>Quét mã để chuyển khoản</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getVietQRUrl(totalAmount, orderId)}
              alt={`QR chuyển khoản ${vnd(totalAmount)}`}
              style={{ width: "100%", maxWidth: 220, height: "auto", margin: "0 auto", display: "block" }}
            />
            <p style={{ fontSize: 10, color: "#555", marginTop: 4 }}>
              Số tiền: {vnd(totalAmount)}
            </p>
          </div>

          <div className="divider" style={{ borderTop: "1px dashed #000", margin: "10px 0" }} />

          <div style={{ textAlign: "center", fontSize: 10, color: "#555" }}>
            <p>Cảm ơn quý khách!</p>
            <p>Hẹn gặp lại 🙏</p>
          </div>
        </div>

        {/* Action buttons (not printed) */}
        <div className="border-t border-slate-200 p-4 flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white text-sm hover:bg-slate-800"
          >
            🖨️ In hóa đơn
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-600 text-sm hover:bg-slate-50"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
