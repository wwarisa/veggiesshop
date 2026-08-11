import Link from "next/link";
import { getOrders, statusLabel } from "@/lib/orders";
import { num, thaiDateTime } from "@/lib/format";
import { Empty, PageTitle, Pill } from "@/components/ui";
import type { DeliveryStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const FILTERS: { key: string; label: string; status?: DeliveryStatus }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "pending_price", label: "รอยืนยันราคา", status: "pending_price" },
  { key: "received", label: "รับออเดอร์แล้ว", status: "received" },
  { key: "packing", label: "กำลังจัดของ", status: "packing" },
  { key: "delivering", label: "กำลังจัดส่ง", status: "delivering" },
  { key: "delivered", label: "ส่งสำเร็จ", status: "delivered" },
];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const { f } = await searchParams;
  const active = FILTERS.find((x) => x.key === f) ?? FILTERS[0];
  const orders = await getOrders(active.status ? { status: active.status } : {});

  const groupedByDay = orders.reduce<Record<string, typeof orders>>((acc, o) => {
    const day = o.createdAt.slice(0, 10);
    (acc[day] ??= []).push(o);
    return acc;
  }, {});

  const newCount = orders.filter(
    (o) => o.deliveryStatus === "received" || o.deliveryStatus === "pending_price",
  ).length;

  return (
    <>
      <PageTitle
        title="ออเดอร์"
        sub={newCount > 0 ? `มี ${newCount} ออเดอร์ที่ยังไม่ได้จัดของ` : "จัดครบหมดแล้ว"}
      />

      <nav className="mb-3 flex flex-wrap gap-1.5">
        {FILTERS.map((x) => (
          <Link
            key={x.key}
            href={x.key === "all" ? "/admin/orders" : `/admin/orders?f=${x.key}`}
            className={`min-h-[40px] rounded-full border px-3.5 py-2 text-[13.5px] font-bold ${
              active.key === x.key
                ? "border-leaf bg-leaf text-white"
                : "border-line-strong bg-surface text-ink-2"
            }`}
          >
            {x.label}
          </Link>
        ))}
      </nav>

      {orders.length === 0 && <Empty>ยังไม่มีออเดอร์ในหมวดนี้</Empty>}

      {Object.entries(groupedByDay).map(([day, list]) => (
        <section key={day} className="mb-5">
          <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wider text-ink-3">
            {day}
          </h2>
          <div className="flex flex-col gap-2">
            {list.map((o) => (
              <Link
                key={o.id}
                href={`/admin/orders/${o.id}`}
                className="flex items-center gap-3 rounded-[13px] border border-line bg-surface p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="num text-[16px] font-extrabold">{o.orderNo}</span>
                    {o.deliveryStatus === "pending_price" && <Pill tone="warn">รอยืนยันราคา</Pill>}
                    {o.deliveryStatus !== "pending_price" && (
                      <Pill tone={o.deliveryStatus === "delivered" ? "leaf" : "muted"}>
                        {statusLabel(o.deliveryStatus)}
                      </Pill>
                    )}
                    {o.deliveryStatus === "delivered" && o.paymentStatus !== "paid" && (
                      <Pill tone="danger">ค้างเงิน</Pill>
                    )}
                  </div>
                  <p className="mt-0.5 text-[14px]">
                    {o.customerName} · {o.customerPhone}
                  </p>
                  <p className="text-[12.5px] text-ink-3">
                    {thaiDateTime(o.createdAt)}
                    {o.roundLabel && ` · ${o.roundLabel}`}
                  </p>
                </div>
                <span className="num flex-none text-[18px] font-extrabold text-price">
                  {num(o.adjustedTotal)} ฿
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
