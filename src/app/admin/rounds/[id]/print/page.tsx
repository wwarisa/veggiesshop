import Link from "next/link";
import { notFound } from "next/navigation";
import { COL, db } from "@/lib/db";
import { getOrders } from "@/lib/orders";
import { getGroup, getPrintSettings, getShopSettings } from "@/lib/repo";
import { num, thaiDate, thaiDateTime } from "@/lib/format";
import { PrintButton } from "@/components/PrintButton";
import type { Round } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * ใบพิมพ์กระดาษคาร์บอน 80 มม.
 *
 * เลือกแบบฟอร์มได้ 3 แบบ
 *   order = ใบส่งของรายบ้าน (พิมพ์ 2 ชุด ต้นฉบับ + สำเนา)
 *   pick  = ใบจัดของทั้งรอบ
 *   close = ใบสรุปปิดรอบ
 */
export default async function RoundPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ form?: string }>;
}) {
  const { id } = await params;
  const { form } = await searchParams;
  const kind = form === "pick" || form === "close" ? form : "order";

  const [round, shop, print] = await Promise.all([
    db().get<Round>(COL.rounds, id),
    getShopSettings(),
    getPrintSettings(),
  ]);
  if (!round) notFound();

  const [orders, group] = await Promise.all([
    getOrders({ roundId: id }),
    getGroup(round.groupId),
  ]);
  const live = orders.filter((o) => o.deliveryStatus !== "cancelled");
  const roundTotal = live.reduce((sum, o) => sum + o.adjustedTotal, 0);

  // รวมผักทุกบ้านในรอบ เอาไว้ชั่งของก่อนออกรอบ
  const pick = new Map<string, { name: string; unit: string; qty: number }>();
  for (const o of live) {
    for (const it of o.items) {
      const key = `${it.productName}|${it.unitLabel}`;
      const prev = pick.get(key) ?? { name: it.productName, unit: it.unitLabel, qty: 0 };
      prev.qty += it.realQty ?? it.qty;
      pick.set(key, prev);
    }
  }

  const cash = live
    .filter((o) => o.paymentMethod === "cash")
    .reduce((s, o) => s + o.paidAmount, 0);
  const transfer = live
    .filter((o) => o.paymentMethod === "transfer")
    .reduce((s, o) => s + o.paidAmount, 0);
  const delivered = live.filter((o) => o.deliveryStatus === "delivered").length;
  const failed = live.filter((o) => o.deliveryStatus === "failed").length;
  const unpaid = live
    .filter((o) => o.paymentStatus !== "paid")
    .reduce((s, o) => s + Math.max(0, o.adjustedTotal - o.paidAmount), 0);

  const paper = { width: `${print.paperWidthMm}mm` };

  return (
    <>
      <div className="no-print mb-4 flex flex-col gap-3">
        <Link
          href="/admin/rounds"
          className="text-[14px] font-bold text-leaf underline-offset-4 hover:underline"
        >
          ← กลับไปรอบจัดส่ง
        </Link>
        <h1 className="text-2xl font-extrabold">ใบพิมพ์ {print.paperWidthMm} มม.</h1>
        <p className="text-sm text-ink-3">
          {round.name} · {thaiDate(round.deliveryDate)} · {live.length} บ้าน
        </p>
        <nav className="flex flex-wrap gap-1.5">
          {[
            { k: "order", label: "ใบส่งของรายบ้าน" },
            { k: "pick", label: "ใบจัดของทั้งรอบ" },
            { k: "close", label: "ใบสรุปปิดรอบ" },
          ].map((x) => (
            <Link
              key={x.k}
              href={`/admin/rounds/${id}/print?form=${x.k}`}
              className={`min-h-[42px] rounded-full border px-4 py-2 text-[14px] font-bold ${
                kind === x.k
                  ? "border-leaf bg-leaf text-white"
                  : "border-line-strong bg-surface text-ink-2"
              }`}
            >
              {x.label}
            </Link>
          ))}
        </nav>
        <PrintButton />
        <p className="text-[13px] text-ink-3">
          ตอนกดพิมพ์ ให้ตั้งขนาดกระดาษเป็น {print.paperWidthMm} มม. และปิดหัว-ท้ายกระดาษ
        </p>
      </div>

      <div className="flex flex-col items-center gap-6 print:gap-0">
        {kind === "order" &&
          live.flatMap((o) =>
            Array.from({ length: Math.max(1, print.copies) }, (_, copyIndex) => (
              <div
                key={`${o.id}-${copyIndex}`}
                style={paper}
                className="slip break-after-page bg-white p-[4mm] text-[11.5px] leading-[1.45] text-black"
              >
                <Head shop={shop.shopName} phone={shop.phone} title="ใบส่งของ / ใบเก็บเงิน" />
                <p className="my-0.5 text-center text-[20px] font-extrabold">{o.orderNo}</p>
                <p className="text-center text-[10.5px]">สั่งเมื่อ {thaiDateTime(o.createdAt)}</p>
                <Rule />
                <KV k="รอบส่ง" v={`${thaiDate(round.deliveryDate)} ${round.timeWindow}`} />
                {group && <KV k="กลุ่ม" v={group.name} />}
                <Rule />
                <KV k="ลูกค้า" v={o.customerName} />
                <KV k="โทร" v={o.customerPhone} />
                <KV k="ที่อยู่" v={o.customerAddress} />
                {o.note && <KV k="หมายเหตุ" v={o.note} />}
                <Rule solid />

                {o.items.map((it, i) => {
                  const qty = it.realQty ?? it.qty;
                  const line = it.realLineTotal ?? it.lineTotal;
                  const changed = it.realQty !== null && it.realQty !== it.qty;
                  return (
                    <div key={i} className="my-[5px]">
                      <p className="font-bold">{it.productName}</p>
                      <p className="flex justify-between">
                        <span>
                          {num(qty)} {it.unitLabel} × {num(it.unitPrice)}
                        </span>
                        <span>{num(line)}</span>
                      </p>
                      {changed && (
                        <p className="flex justify-between text-[10.5px] font-bold">
                          <span>
                            สั่งไว้{" "}
                            <span className="line-through">
                              {num(it.qty)} {it.unitLabel} = {num(it.lineTotal)}
                            </span>
                          </span>
                          <span>ชั่งจริง</span>
                        </p>
                      )}
                    </div>
                  );
                })}

                {o.customItems.map((c) => (
                  <div key={c.id} className="my-[5px]">
                    <p className="font-bold">{c.text}</p>
                    <p className="flex justify-between">
                      <span>
                        {c.status === "confirmed"
                          ? "ยืนยันราคาแล้ว"
                          : c.status === "unavailable"
                            ? "ไม่มีของ"
                            : "รอยืนยันราคา"}
                      </span>
                      <span>{c.status === "confirmed" ? num(c.price ?? 0) : "—"}</span>
                    </p>
                  </div>
                ))}

                <Rule solid />
                {o.adjustedTotal !== o.total && (
                  <p className="flex justify-between text-[10.5px] font-bold">
                    <span>ยอดตอนสั่ง</span>
                    <span className="line-through">{num(o.total)}</span>
                  </p>
                )}
                <p className="my-1 flex items-baseline justify-between text-[16px] font-extrabold">
                  <span>ยอดที่ต้องเก็บ</span>
                  <span>{num(o.adjustedTotal)} บาท</span>
                </p>

                <div className="my-1 border border-black px-[5px] py-[3px]">
                  <Check label="รับเงินสด" />
                  <Check label="โอนแล้ว (แนบสลิปให้ร้าน)" />
                  <Check label="ค้างไว้ก่อน เก็บรอบหน้า" />
                </div>

                <p className="text-[10px] leading-[1.4]">
                  ชำระเงินปลายทาง · ยอดอาจต่างจากตอนสั่งเล็กน้อยตามน้ำหนักที่ชั่งได้จริง
                  {print.footerNote && ` · ${print.footerNote}`}
                </p>

                <div className="mt-[9mm] flex gap-[4mm]">
                  <p className="flex-1 border-t border-dotted border-black pt-[3px] text-center text-[9.5px]">
                    ผู้ส่งของ
                  </p>
                  <p className="flex-1 border-t border-dotted border-black pt-[3px] text-center text-[9.5px]">
                    ผู้รับของ
                  </p>
                </div>
                <Rule />
                <p className="text-center text-[10px] font-bold tracking-[.1em]">
                  {copyIndex === 0 ? "ต้นฉบับ — ให้ลูกค้า" : "สำเนา — เก็บที่ร้าน"}
                </p>
              </div>
            )),
          )}

        {kind === "pick" && (
          <div
            style={paper}
            className="slip bg-white p-[4mm] text-[11.5px] leading-[1.45] text-black"
          >
            <Head shop={shop.shopName} phone={shop.phone} title="ใบจัดของทั้งรอบ" />
            <p className="text-center text-[10.5px]">
              {round.name} · {thaiDate(round.deliveryDate)} {round.timeWindow}
            </p>
            <p className="text-center text-[10.5px]">
              {group ? `กลุ่ม ${group.name} · ` : ""}
              {live.length} บ้าน
            </p>
            <Rule solid />
            <p className="text-center text-[13px] font-extrabold tracking-[.05em]">
              ผักที่ต้องเตรียม
            </p>
            <p className="text-[10px]">ชั่งแล้วติ๊กทีละอย่าง ยอดนี้รวมทุกบ้านในรอบแล้ว</p>
            <Rule />
            {[...pick.values()].map((row, i) => (
              <p key={i} className="my-[3px] flex items-start gap-1.5 text-[11px]">
                <span className="mt-[1px] block h-[4.5mm] w-[4.5mm] flex-none border-[1.2px] border-black" />
                <span className="flex flex-1 justify-between">
                  <span>{row.name}</span>
                  <span className="font-bold">
                    {num(row.qty)} {row.unit}
                  </span>
                </span>
              </p>
            ))}
            {pick.size === 0 && <p className="py-2 text-center">ยังไม่มีออเดอร์ในรอบนี้</p>}

            <Rule solid />
            <p className="text-center text-[13px] font-extrabold tracking-[.05em]">
              บ้านที่ต้องส่ง
            </p>
            <Rule />
            {live.map((o, i) => (
              <div key={o.id} className="my-[5px]">
                <p className="flex justify-between">
                  <span className="font-bold">
                    {i + 1}. {o.customerName}
                  </span>
                  <span className="font-bold">{num(o.adjustedTotal)}</span>
                </p>
                <p className="flex justify-between text-[10.5px]">
                  <span>{o.customerAddress}</span>
                  <span>{o.orderNo}</span>
                </p>
                <p className="text-[10.5px]">โทร {o.customerPhone}</p>
              </div>
            ))}
            <Rule solid />
            <p className="my-1 flex items-baseline justify-between text-[16px] font-extrabold">
              <span>ยอดต้องเก็บทั้งรอบ</span>
              <span>{num(roundTotal)} บาท</span>
            </p>
          </div>
        )}

        {kind === "close" && (
          <div
            style={paper}
            className="slip bg-white p-[4mm] text-[11.5px] leading-[1.45] text-black"
          >
            <Head shop={shop.shopName} phone={shop.phone} title="ใบสรุปปิดรอบ" />
            <p className="text-center text-[10.5px]">
              {round.name} · {thaiDate(round.deliveryDate)}
            </p>
            <Rule solid />
            <p className="flex justify-between">
              <span>ส่งสำเร็จ</span>
              <span className="font-bold">{delivered} ราย</span>
            </p>
            <p className="flex justify-between">
              <span>ส่งไม่สำเร็จ</span>
              <span className="font-bold">{failed} ราย</span>
            </p>
            {live
              .filter((o) => o.deliveryStatus === "failed")
              .map((o) => (
                <p key={o.id} className="text-[10px]">
                  {o.orderNo} {o.customerName} — {o.failReason || "ไม่ระบุเหตุผล"}
                </p>
              ))}
            <Rule />
            <p className="flex justify-between">
              <span>เงินสด</span>
              <span>{num(cash)}</span>
            </p>
            <p className="flex justify-between">
              <span>เงินโอน</span>
              <span>{num(transfer)}</span>
            </p>
            <p className="my-1 flex items-baseline justify-between text-[16px] font-extrabold">
              <span>เก็บเงินได้</span>
              <span>{num(cash + transfer)} บาท</span>
            </p>
            <Rule />
            <p className="flex justify-between">
              <span>ยอดที่ต้องเก็บทั้งรอบ</span>
              <span>{num(roundTotal)}</span>
            </p>
            <p className="my-1 flex items-baseline justify-between text-[16px] font-extrabold">
              <span>ยังค้างเก็บ</span>
              <span>{num(unpaid)} บาท</span>
            </p>
            <p className="text-[10px]">
              ยอดค้างจะไปโผล่ในหน้า “ค้างเงิน” ให้เก็บรอบหน้าอัตโนมัติ
            </p>
            <div className="mt-[9mm] flex gap-[4mm]">
              <p className="flex-1 border-t border-dotted border-black pt-[3px] text-center text-[9.5px]">
                ผู้สรุปรอบ
              </p>
              <p className="flex-1 border-t border-dotted border-black pt-[3px] text-center text-[9.5px]">
                วันที่
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Head({ shop, phone, title }: { shop: string; phone: string; title: string }) {
  return (
    <>
      <p className="text-center text-[15px] font-extrabold">{shop}</p>
      {phone && <p className="text-center text-[10.5px]">โทร {phone}</p>}
      <div className="my-[5px] border-t-[1.5px] border-solid border-black" />
      <p className="text-center text-[13px] font-extrabold tracking-[.05em]">{title}</p>
    </>
  );
}

function Rule({ solid = false }: { solid?: boolean }) {
  return (
    <div
      className={`my-[5px] border-t border-black ${solid ? "border-[1.5px] border-solid" : "border-dashed"}`}
    />
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <p className="flex gap-[5px]">
      <span className="w-[15mm] flex-none font-semibold">{k}</span>
      <span className="min-w-0 flex-1 break-words">{v}</span>
    </p>
  );
}

function Check({ label }: { label: string }) {
  return (
    <p className="my-[3px] flex items-start gap-1.5 text-[11px]">
      <span className="mt-[1px] block h-[4.5mm] w-[4.5mm] flex-none border-[1.2px] border-black" />
      <span>{label}</span>
    </p>
  );
}
