"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  adjustQtyAction,
  confirmCustomItemAction,
  recordPaymentAction,
  setStatusAction,
  type ActionState,
} from "@/app/admin/actions";
import { num, thaiDateTime } from "@/lib/format";
import { btnPlain, btnPrimary, inputClass, Pill } from "@/components/ui";
import type { DeliveryStatus, Order, OrderEvent } from "@/lib/types";

const NEXT_STATUS: { value: DeliveryStatus; label: string }[] = [
  { value: "received", label: "รับออเดอร์แล้ว" },
  { value: "packing", label: "กำลังจัดของ" },
  { value: "delivering", label: "กำลังจัดส่ง" },
  { value: "delivered", label: "ส่งสำเร็จ" },
  { value: "failed", label: "ส่งไม่สำเร็จ" },
  { value: "cancelled", label: "ยกเลิกออเดอร์" },
];

export function OrderDetail({
  order,
  events,
  shopPhone,
}: {
  order: Order;
  events: OrderEvent[];
  shopPhone: string;
}) {
  const [adjustState, adjustAction] = useActionState<ActionState, FormData>(adjustQtyAction, {});
  const [customState, customAction] = useActionState<ActionState, FormData>(
    confirmCustomItemAction,
    {},
  );
  const [statusState, statusAction] = useActionState<ActionState, FormData>(setStatusAction, {});
  const [payState, payAction] = useActionState<ActionState, FormData>(recordPaymentAction, {});
  const [status, setStatus] = useState<DeliveryStatus>(order.deliveryStatus);

  const needsReason = status === "failed" || status === "cancelled";
  const pending = order.customItems.filter((c) => c.status === "pending");

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-[14px] border border-line bg-surface p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="num text-[24px] font-extrabold">{order.orderNo}</span>
          {order.deliveryStatus === "pending_price" && <Pill tone="warn">รอยืนยันราคา</Pill>}
          {order.deliveryStatus === "delivered" && order.paymentStatus !== "paid" && (
            <Pill tone="danger">ค้างเงิน</Pill>
          )}
        </div>
        <p className="mt-1 text-[13px] text-ink-3">สั่งเมื่อ {thaiDateTime(order.createdAt)}</p>
        <p className="mt-2 text-[15px] font-bold">{order.customerName}</p>
        <p className="text-[14px]">{order.customerAddress}</p>
        {order.roundLabel && <p className="text-[13px] text-ink-3">{order.roundLabel}</p>}
        {order.note && (
          <p className="mt-1.5 rounded-[9px] bg-surface-2 p-2.5 text-[13.5px]">
            หมายเหตุ: {order.note}
          </p>
        )}
        <a
          href={`tel:${order.customerPhone}`}
          className="mt-2.5 inline-flex min-h-[48px] items-center rounded-[11px] bg-leaf px-4 font-bold text-white"
        >
          📞 โทรหา {order.customerPhone}
        </a>
      </section>

      {pending.length > 0 && (
        <section className="rounded-[14px] border border-warn bg-warn-soft p-3.5">
          <h2 className="text-[16px] font-extrabold text-warn">
            รอใส่ราคา {pending.length} รายการ
          </h2>
          <p className="mt-1 text-[13px] text-warn">
            ลูกค้ายังไม่รู้ยอดจนกว่าจะยืนยัน ใส่ราคาหรือกดว่าไม่มีของก่อนจัดส่ง
          </p>
          {pending.map((c) => (
            <form key={c.id} action={customAction} className="mt-2.5 rounded-[11px] bg-surface p-3">
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="itemId" value={c.id} />
              <p className="text-[14.5px] font-semibold">{c.text}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  name="price"
                  inputMode="decimal"
                  placeholder="ราคา (บาท)"
                  className={`num ${inputClass} w-[120px] flex-none text-center font-bold`}
                  aria-label={`ราคาของ ${c.text}`}
                />
                <button type="submit" className={btnPrimary}>
                  ยืนยันราคา
                </button>
                <button type="submit" name="unavailable" value="1" className={btnPlain}>
                  ไม่มีของ
                </button>
              </div>
            </form>
          ))}
          {customState.error && (
            <p role="alert" className="mt-2 text-[14px] font-bold text-danger">
              {customState.error}
            </p>
          )}
        </section>
      )}

      <section className="rounded-[14px] border border-line bg-surface p-3.5">
        <h2 className="text-[16px] font-extrabold">ปรับยอดตามน้ำหนักจริง</h2>
        <p className="mt-1 text-[13px] text-ink-3">
          ชั่งเสร็จแล้วใส่จำนวนจริงลงไป ระบบคิดยอดใหม่ให้เอง เว้นว่างไว้ถ้ายังไม่ได้ปรับ
        </p>

        <ul className="mt-2.5 flex flex-col gap-2.5">
          {order.items.map((it, i) => (
            <li key={i} className="border-t border-dashed border-line pt-2.5 first:border-t-0 first:pt-0">
              <div className="flex justify-between gap-3">
                <span className="font-semibold">{it.productName}</span>
                <span className="num font-bold">{num(it.realLineTotal ?? it.lineTotal)} ฿</span>
              </div>
              <p className="text-[12.5px] text-ink-3">
                สั่ง {num(it.qty)} {it.unitLabel} × {num(it.unitPrice)} ฿
                {it.realQty !== null && ` · ชั่งจริง ${num(it.realQty)} ${it.unitLabel}`}
              </p>
              <form action={adjustAction} className="mt-1.5 flex flex-wrap gap-2">
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="index" value={i} />
                <input
                  name="realQty"
                  inputMode="decimal"
                  defaultValue={it.realQty ?? ""}
                  placeholder={`จำนวนจริง (${it.unitLabel})`}
                  className={`num ${inputClass} w-[150px] flex-none text-center`}
                  aria-label={`จำนวนจริงของ ${it.productName}`}
                />
                <button type="submit" className={btnPlain}>
                  บันทึกจำนวนจริง
                </button>
              </form>
            </li>
          ))}
        </ul>

        {adjustState.error && (
          <p role="alert" className="mt-2 text-[14px] font-bold text-danger">
            {adjustState.error}
          </p>
        )}

        <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
          <span className="text-[15px] font-bold">ยอดที่ต้องเก็บ</span>
          <span className="num text-[26px] font-extrabold text-price">
            {num(order.adjustedTotal)} บาท
          </span>
        </div>
        {order.adjustedTotal !== order.total && (
          <p className="text-[12.5px] text-ink-3">ยอดตอนสั่ง {num(order.total)} บาท</p>
        )}
      </section>

      <section className="rounded-[14px] border border-line bg-surface p-3.5">
        <h2 className="text-[16px] font-extrabold">สถานะการจัดส่ง</h2>
        <form action={statusAction} className="mt-2 flex flex-col gap-2.5">
          <input type="hidden" name="orderId" value={order.id} />
          <select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as DeliveryStatus)}
            className={inputClass}
            aria-label="เลือกสถานะใหม่"
          >
            {NEXT_STATUS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {needsReason && (
            <input
              name="reason"
              placeholder={status === "failed" ? "เหตุผลที่ส่งไม่สำเร็จ" : "เหตุผลที่ยกเลิก"}
              className={inputClass}
              aria-label="เหตุผล"
            />
          )}
          <button type="submit" className={btnPrimary}>
            บันทึกสถานะ
          </button>
        </form>
        {statusState.error && (
          <p role="alert" className="mt-2 text-[14px] font-bold text-danger">
            {statusState.error}
          </p>
        )}
      </section>

      <section className="rounded-[14px] border border-line bg-surface p-3.5">
        <h2 className="text-[16px] font-extrabold">การเก็บเงิน</h2>
        <p className="mt-1 text-[13.5px]">
          สถานะตอนนี้:{" "}
          <b>
            {order.paymentStatus === "paid"
              ? `เก็บแล้ว ${num(order.paidAmount)} บาท`
              : order.paymentStatus === "owed"
                ? `ค้างอยู่ ${num(order.adjustedTotal - order.paidAmount)} บาท`
                : "ยังไม่เก็บ"}
          </b>
        </p>
        <form action={payAction} className="mt-2 flex flex-col gap-2.5">
          <input type="hidden" name="orderId" value={order.id} />
          <div className="flex flex-wrap gap-2">
            <input
              name="amount"
              inputMode="decimal"
              defaultValue={num(order.adjustedTotal)}
              className={`num ${inputClass} w-[130px] flex-none text-center font-bold`}
              aria-label="ยอดที่เก็บได้จริง"
            />
            <select name="method" defaultValue="cash" className={`${inputClass} flex-1`} aria-label="วิธีชำระ">
              <option value="cash">เงินสด</option>
              <option value="transfer">โอน</option>
            </select>
          </div>
          <button type="submit" className={btnPrimary}>
            บันทึกการเก็บเงิน
          </button>
        </form>
        {payState.error && (
          <p role="alert" className="mt-2 text-[14px] font-bold text-danger">
            {payState.error}
          </p>
        )}
        <p className="mt-2 text-[12.5px] text-ink-3">
          ใส่ยอดน้อยกว่ายอดเต็มได้ ระบบจะบันทึกเป็นค้างชำระให้อัตโนมัติ
        </p>
      </section>

      <section className="rounded-[14px] border border-line bg-surface p-3.5">
        <h2 className="text-[16px] font-extrabold">ประวัติการแก้ไข</h2>
        <ul className="mt-2 flex flex-col gap-1.5 text-[13px]">
          {events.map((e) => (
            <li key={e.id} className="flex flex-wrap gap-2 text-ink-2">
              <span className="text-ink-3">{thaiDateTime(e.at)}</span>
              <span>{e.message}</span>
              <span className="text-ink-3">({e.by})</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-center text-[12.5px] text-ink-3">
        <Link href={`/order/${order.orderNo}`} className="font-bold text-leaf underline-offset-4 hover:underline">
          ดูหน้าที่ลูกค้าเห็น
        </Link>
        {shopPhone && ` · เบอร์ร้าน ${shopPhone}`}
      </p>
    </div>
  );
}
