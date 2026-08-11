import { COL, db } from "@/lib/db";
import { getOrders } from "@/lib/orders";
import { getProducts } from "@/lib/repo";
import { num, thaiDate, todayISO } from "@/lib/format";
import { BarList } from "@/components/Dash";
import { PageTitle } from "@/components/ui";
import type { DailyStats } from "@/lib/types";

export const dynamic = "force-dynamic";

/** รายงานยอดขายรายวันและรายเดือน เรียบง่าย อ่านเข้าใจได้ทันที */
export default async function ReportsPage() {
  const [stats, orders, products] = await Promise.all([
    db().list<DailyStats>(COL.dailyStats),
    getOrders(),
    getProducts(),
  ]);

  const month = todayISO().slice(0, 7);
  const monthStats = stats.filter((s) => s.id.startsWith(month));
  const monthSales = monthStats.reduce((s, x) => s + x.totalSales, 0);
  const monthOrders = monthStats.reduce((s, x) => s + x.orderCount, 0);

  const daily = [...stats]
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, 14)
    .map((s) => ({
      name: thaiDate(s.id, false),
      value: s.totalSales,
      note: `${s.orderCount} ออเดอร์`,
    }));

  const productName = new Map(products.map((p) => [p.id, p.name]));
  const totals = new Map<string, { amount: number; qty: number; unit: string }>();
  for (const s of monthStats) {
    for (const [pid, v] of Object.entries(s.byProduct)) {
      const prev = totals.get(pid) ?? { amount: 0, qty: 0, unit: v.unitLabel };
      totals.set(pid, {
        amount: prev.amount + v.amount,
        qty: prev.qty + v.qty,
        unit: v.unitLabel,
      });
    }
  }
  const best = [...totals.entries()]
    .map(([pid, v]) => ({
      name: productName.get(pid) ?? pid,
      value: v.amount,
      note: `${num(v.qty)} ${v.unit}`,
    }))
    .sort((a, b) => b.value - a.value);

  const owed = orders
    .filter((o) => o.deliveryStatus === "delivered" && o.paymentStatus !== "paid")
    .reduce((s, o) => s + Math.max(0, o.adjustedTotal - o.paidAmount), 0);

  return (
    <>
      <PageTitle title="รายงาน" sub={`เดือนนี้ขายได้ ${num(monthSales)} บาท จาก ${monthOrders} ออเดอร์`} />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2.5">
        <Box label="ยอดขายเดือนนี้" value={`${num(monthSales)} ฿`} />
        <Box label="จำนวนออเดอร์" value={`${monthOrders} ออเดอร์`} />
        <Box
          label="เฉลี่ยต่อออเดอร์"
          value={`${num(monthOrders ? monthSales / monthOrders : 0)} ฿`}
        />
        <Box label="ยอดค้างชำระคงค้าง" value={`${num(owed)} ฿`} />
      </div>

      <section className="mt-6">
        <h2 className="text-[16px] font-extrabold">ยอดขายรายวัน (14 วันล่าสุด)</h2>
        <BarList rows={daily} emptyText="ยังไม่มียอดขาย" />
      </section>

      <section className="mt-6 mb-4">
        <h2 className="text-[16px] font-extrabold">สินค้าขายดีเดือนนี้</h2>
        <BarList rows={best} emptyText="เดือนนี้ยังไม่มียอดขาย" />
      </section>
    </>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[13px] border border-line bg-surface p-3">
      <p className="text-[12.5px] font-semibold text-ink-3">{label}</p>
      <p className="num text-[24px] font-extrabold tracking-tight">{value}</p>
    </div>
  );
}
