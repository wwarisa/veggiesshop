import Link from "next/link";
import { COL, db } from "@/lib/db";
import { getOrders } from "@/lib/orders";
import { getGroups, getProducts, getRounds } from "@/lib/repo";
import { num, todayISO } from "@/lib/format";
import { PageTitle } from "@/components/ui";
import { BarList, DayBars, StatTile, TodoItem } from "@/components/Dash";
import type { Customer, DailyStats } from "@/lib/types";

export const dynamic = "force-dynamic";

/** แดชบอร์ด — เปิดมาเห็นทันทีว่าวันนี้ขายได้เท่าไหร่ และต้องตามอะไรบ้าง */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ g?: string }>;
}) {
  const { g } = await searchParams;
  const [orders, products, groups, rounds, stats, customers] = await Promise.all([
    getOrders(),
    getProducts(),
    getGroups(),
    getRounds(),
    db().list<DailyStats>(COL.dailyStats),
    db().list<Customer>(COL.customers),
  ]);

  const today = todayISO();
  const month = today.slice(0, 7);
  const live = orders.filter((o) => o.deliveryStatus !== "cancelled");

  const todayOrders = live.filter((o) => o.createdAt.startsWith(today));
  const monthOrders = live.filter((o) => o.createdAt.startsWith(month));
  const todaySales = todayOrders.reduce((s, o) => s + o.adjustedTotal, 0);
  const monthSales = monthOrders.reduce((s, o) => s + o.adjustedTotal, 0);

  const unpaidOrders = live.filter(
    (o) => o.deliveryStatus === "delivered" && o.paymentStatus !== "paid",
  );
  const unpaidTotal = unpaidOrders.reduce(
    (s, o) => s + Math.max(0, o.adjustedTotal - o.paidAmount),
    0,
  );
  const unpaidPeople = new Set(unpaidOrders.map((o) => o.customerPhone)).size;

  const toPack = live.filter(
    (o) => o.deliveryStatus === "received" || o.deliveryStatus === "packing",
  ).length;
  const pendingPrice = live.filter((o) => o.deliveryStatus === "pending_price").length;
  const soldOut = products.filter((p) => !p.isAvailable);

  // ยอดขาย 7 วันล่าสุด อ่านจากสรุปรายวันที่บันทึกไว้ตอนรับออเดอร์
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = todayISO(d);
    return {
      key,
      label: key === today ? "วันนี้" : String(Number(key.slice(8))),
      value: stats.find((s) => s.id === key)?.totalSales ?? 0,
      today: key === today,
    };
  });

  // สินค้าขายดี กรองดูเฉพาะกลุ่มได้
  const scope = g && groups.some((x) => x.id === g) ? g : "all";
  const productName = new Map(products.map((p) => [p.id, p.name]));
  const best = new Map<string, { amount: number; qty: number; unit: string }>();
  for (const s of stats.filter((x) => x.id.startsWith(month))) {
    if (scope === "all") {
      for (const [pid, v] of Object.entries(s.byProduct)) {
        const prev = best.get(pid) ?? { amount: 0, qty: 0, unit: v.unitLabel };
        best.set(pid, {
          amount: prev.amount + v.amount,
          qty: prev.qty + v.qty,
          unit: v.unitLabel,
        });
      }
    } else {
      for (const [key, v] of Object.entries(s.byGroupProduct)) {
        const [gid, pid] = key.split("|");
        if (gid !== scope) continue;
        const prev = best.get(pid) ?? { amount: 0, qty: 0, unit: "" };
        best.set(pid, { amount: prev.amount + v.amount, qty: prev.qty + v.qty, unit: prev.unit });
      }
    }
  }
  const bestRows = [...best.entries()]
    .map(([pid, v]) => ({
      name: productName.get(pid) ?? pid,
      value: v.amount,
      note: v.qty ? `${num(v.qty)} ${v.unit}` : "",
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // ยอดขายแยกช่องทาง
  const channelTotals = new Map<string, number>();
  for (const s of stats.filter((x) => x.id.startsWith(month))) {
    for (const [key, v] of Object.entries(s.byGroup)) {
      channelTotals.set(key, (channelTotals.get(key) ?? 0) + v);
    }
  }
  const channels = [...channelTotals.entries()]
    .map(([key, value]) => ({
      name: key === "web" ? "หน้าเว็บหลัก" : `ลิงก์ ${groups.find((x) => x.id === key)?.name ?? key}`,
      value,
      note: "",
    }))
    .sort((a, b) => b.value - a.value);

  const openRounds = rounds.filter((r) => r.status === "open").length;

  return (
    <>
      <PageTitle title="ภาพรวมร้าน" sub="เปิดมาเห็นทันทีว่าวันนี้ต้องทำอะไรบ้าง" />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2.5">
        <StatTile
          label="ขายได้วันนี้"
          value={`${num(todaySales)} ฿`}
          sub={`${todayOrders.length} ออเดอร์`}
        />
        <StatTile
          label="ขายได้เดือนนี้"
          value={`${num(monthSales)} ฿`}
          sub={`${monthOrders.length} ออเดอร์`}
        />
        <StatTile
          label="⚠️ ยังเก็บเงินไม่ได้"
          value={`${num(unpaidTotal)} ฿`}
          sub={`${unpaidPeople} ราย`}
          alert
        />
        <StatTile
          label="⚠️ รอจัดการ"
          value={`${toPack} ออเดอร์`}
          sub={`${pendingPrice} รายการรอยืนยันราคา`}
          alert
        />
      </div>

      <section className="mt-5">
        <h2 className="text-[16px] font-extrabold">ต้องทำวันนี้</h2>
        <div className="mt-2.5 flex flex-col gap-2">
          {toPack > 0 && (
            <TodoItem
              icon="📦"
              main={`${toPack} ออเดอร์ยังไม่ได้จัดของ`}
              sub={openRounds > 0 ? `มีรอบเปิดรับอยู่ ${openRounds} รอบ` : "ยังไม่มีรอบที่เปิดรับ"}
              href="/admin/orders?f=received"
              warn
            />
          )}
          {pendingPrice > 0 && (
            <TodoItem
              icon="💬"
              main={`${pendingPrice} ออเดอร์รอใส่ราคาของที่ลูกค้าพิมพ์ขอเอง`}
              sub="ลูกค้ายังไม่รู้ยอดจนกว่าจะยืนยัน"
              href="/admin/orders?f=pending_price"
              warn
            />
          )}
          {unpaidPeople > 0 && (
            <TodoItem
              icon="💰"
              main={`${unpaidPeople} รายค้างเงินรวม ${num(unpaidTotal)} บาท`}
              sub="กดดูว่าใครค้างบ้าง"
              href="/admin/debts"
            />
          )}
          {soldOut.length > 0 && (
            <TodoItem
              icon="🚫"
              main={`${soldOut.length} รายการปิดขายอยู่`}
              sub={soldOut.map((p) => p.name).join(" · ")}
              href="/admin/prices"
            />
          )}
          {toPack === 0 && pendingPrice === 0 && unpaidPeople === 0 && (
            <p className="rounded-[12px] bg-leaf-soft p-4 text-center text-[14.5px] font-bold text-leaf-deep">
              เคลียร์หมดแล้ว ไม่มีอะไรค้าง 🎉
            </p>
          )}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-[16px] font-extrabold">ยอดขาย 7 วันล่าสุด</h2>
        <p className="mt-0.5 text-[12.5px] text-ink-3">แตะที่แท่งเพื่อดูตัวเลข</p>
        <DayBars days={days} />
      </section>

      <section className="mt-6">
        <h2 className="text-[16px] font-extrabold">สินค้าขายดีเดือนนี้</h2>
        <p className="mt-0.5 text-[12.5px] text-ink-3">เรียงตามยอดขาย เลือกดูเฉพาะกลุ่มได้</p>
        <nav className="mt-2.5 flex flex-wrap gap-1.5">
          <Link
            href="/admin"
            className={`min-h-[40px] rounded-full border px-3.5 py-2 text-[13.5px] font-bold ${
              scope === "all" ? "border-leaf bg-leaf text-white" : "border-line-strong bg-surface text-ink-2"
            }`}
          >
            ทั้งร้าน
          </Link>
          {groups.map((x) => (
            <Link
              key={x.id}
              href={`/admin?g=${x.id}`}
              className={`min-h-[40px] rounded-full border px-3.5 py-2 text-[13.5px] font-bold ${
                scope === x.id ? "border-leaf bg-leaf text-white" : "border-line-strong bg-surface text-ink-2"
              }`}
            >
              {x.name}
            </Link>
          ))}
        </nav>
        <BarList rows={bestRows} emptyText="เดือนนี้ยังไม่มียอดขาย" />
      </section>

      <section className="mt-6 mb-4">
        <h2 className="text-[16px] font-extrabold">ยอดขายแยกตามช่องทาง</h2>
        <p className="mt-0.5 text-[12.5px] text-ink-3">เดือนนี้ · ลิงก์ไหนทำเงินได้ดีที่สุด</p>
        <BarList rows={channels} emptyText="เดือนนี้ยังไม่มียอดขาย" />
      </section>

      <p className="pb-4 text-center text-[12.5px] text-ink-3">
        มีลูกค้าในระบบ {customers.length} ราย
      </p>
    </>
  );
}
