import { num, thaiDate, thaiDateTime } from "@/lib/format";
import { statusLabel } from "@/lib/orders";
import type { Order } from "@/lib/types";

const STEPS = [
  { key: "received", label: "รับออเดอร์แล้ว", icon: "📋" },
  { key: "packing", label: "กำลังจัดของ", icon: "🧺" },
  { key: "delivering", label: "กำลังจัดส่ง", icon: "🛵" },
  { key: "delivered", label: "ส่งสำเร็จ", icon: "✅" },
] as const;

/** แถบสถานะแบบไอคอน ให้ลูกค้าดูรู้เรื่องทันทีว่าถึงขั้นไหนแล้ว */
export function OrderStatusBar({ order }: { order: Order }) {
  if (order.deliveryStatus === "cancelled") {
    return (
      <p className="rounded-[12px] bg-price-soft p-3.5 text-[15px] font-bold text-price">
        ออเดอร์นี้ถูกยกเลิกแล้ว{order.cancelReason && ` · ${order.cancelReason}`}
      </p>
    );
  }
  if (order.deliveryStatus === "pending_price") {
    return (
      <p className="rounded-[12px] bg-warn-soft p-3.5 text-[15px] font-bold text-warn">
        ⏳ รอทางร้านยืนยันราคาของที่พิมพ์ขอเพิ่ม แล้วจะแจ้งยอดสุทธิให้ทราบอีกครั้ง
      </p>
    );
  }
  if (order.deliveryStatus === "failed") {
    return (
      <p className="rounded-[12px] bg-warn-soft p-3.5 text-[15px] font-bold text-warn">
        ส่งไม่สำเร็จ{order.failReason && ` · ${order.failReason}`} — ทางร้านจะติดต่อกลับนะคะ
      </p>
    );
  }

  const at = STEPS.findIndex((s) => s.key === order.deliveryStatus);
  return (
    <ol className="flex gap-1.5">
      {STEPS.map((s, i) => {
        const done = i <= at;
        return (
          <li key={s.key} className="flex flex-1 flex-col items-center gap-1 text-center">
            <span
              className={`grid h-11 w-11 place-items-center rounded-full text-xl ${
                done ? "bg-leaf text-white" : "bg-surface-2 text-ink-3 grayscale"
              }`}
              aria-hidden
            >
              {s.icon}
            </span>
            <span className={`text-[11.5px] font-semibold ${done ? "text-leaf-deep" : "text-ink-3"}`}>
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** รายการสินค้าพร้อมยอด แสดงรายการที่ถูกปรับตามน้ำหนักจริงให้เห็นชัด */
export function OrderLines({ order }: { order: Order }) {
  const adjusted = order.items.some((i) => i.realQty !== null);
  return (
    <div className="rounded-[13px] border border-line bg-surface p-3.5">
      <h2 className="text-[15px] font-bold">รายการสินค้า</h2>
      <ul className="mt-2 flex flex-col gap-2">
        {order.items.map((it, i) => {
          const changed = it.realQty !== null && it.realQty !== it.qty;
          return (
            <li key={i} className="text-[14px]">
              <div className="flex justify-between gap-3">
                <span className="font-semibold">{it.productName}</span>
                <span className="num font-bold">{num(it.realLineTotal ?? it.lineTotal)}</span>
              </div>
              <div className="flex justify-between gap-3 text-[12.5px] text-ink-3">
                <span>
                  {num(it.realQty ?? it.qty)} {it.unitLabel} × {num(it.unitPrice)} ฿
                </span>
                {changed && (
                  <span className="font-bold text-price">
                    เดิม{" "}
                    <span className="line-through">
                      {num(it.qty)} {it.unitLabel} = {num(it.lineTotal)}
                    </span>
                  </span>
                )}
              </div>
            </li>
          );
        })}

        {order.customItems.map((c) => (
          <li key={c.id} className="rounded-[10px] bg-warn-soft px-2.5 py-2 text-[14px]">
            <div className="flex justify-between gap-3">
              <span>{c.text}</span>
              <span className="num font-bold">
                {c.status === "confirmed" ? num(c.price ?? 0) : "—"}
              </span>
            </div>
            <span className="text-[12px] font-bold text-warn">
              {c.status === "pending"
                ? "⏳ รอร้านยืนยันราคา"
                : c.status === "unavailable"
                  ? "ไม่มีของ ทางร้านตัดออกให้แล้ว"
                  : "ยืนยันราคาแล้ว"}
            </span>
          </li>
        ))}
      </ul>

      {adjusted && (
        <p className="mt-2.5 text-[12.5px] text-ink-3">
          ยอดเดิมตอนสั่ง <span className="line-through">{num(order.total)} บาท</span>{" "}
          ปรับตามน้ำหนักที่ชั่งได้จริง
        </p>
      )}

      <div className="mt-3 flex items-baseline justify-between border-t border-line pt-2.5">
        <span className="text-[15px] font-bold">ยอดที่ต้องชำระ</span>
        <span className="num text-[24px] font-extrabold text-price">
          {num(order.adjustedTotal)} บาท
        </span>
      </div>
      <p className="mt-1 text-[12.5px] text-ink-3">
        {order.paymentStatus === "paid"
          ? `ชำระแล้ว ${num(order.paidAmount)} บาท`
          : "ชำระเงินปลายทางกับคนส่งของ"}
      </p>
    </div>
  );
}

export function OrderHeader({ order }: { order: Order }) {
  return (
    <div className="rounded-[13px] border border-line bg-surface p-3.5">
      <p className="text-[12.5px] text-ink-3">หมายเลขออเดอร์</p>
      <p className="num text-[26px] font-extrabold tracking-tight">{order.orderNo}</p>
      <p className="mt-1 text-[13px] text-ink-3">สั่งเมื่อ {thaiDateTime(order.createdAt)}</p>
      <dl className="mt-2.5 flex flex-col gap-1 text-[14px]">
        <Row label="สถานะ" value={statusLabel(order.deliveryStatus)} />
        {order.roundLabel && <Row label="รอบส่ง" value={order.roundLabel} />}
        <Row label="ผู้สั่ง" value={`${order.customerName} · ${order.customerPhone}`} />
        <Row label="ที่อยู่" value={order.customerAddress} />
        {order.note && <Row label="หมายเหตุ" value={order.note} />}
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2.5">
      <dt className="w-[68px] flex-none text-ink-3">{label}</dt>
      <dd className="min-w-0 flex-1">{value}</dd>
    </div>
  );
}

export function roundDateLabel(date: string) {
  return thaiDate(date);
}
