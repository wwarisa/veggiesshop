import Link from "next/link";
import { getOrders } from "@/lib/orders";
import { num, thaiDateTime } from "@/lib/format";
import { Empty, PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

/** ใครยังค้างเงินบ้าง และค้างรวมเท่าไหร่ */
export default async function DebtsPage() {
  const orders = await getOrders();
  const owing = orders.filter(
    (o) =>
      o.deliveryStatus === "delivered" &&
      o.paymentStatus !== "paid" &&
      o.adjustedTotal > o.paidAmount,
  );

  const byCustomer = new Map<
    string,
    { name: string; phone: string; amount: number; orders: typeof owing }
  >();
  for (const o of owing) {
    const prev = byCustomer.get(o.customerPhone) ?? {
      name: o.customerName,
      phone: o.customerPhone,
      amount: 0,
      orders: [],
    };
    prev.amount += o.adjustedTotal - o.paidAmount;
    prev.orders.push(o);
    byCustomer.set(o.customerPhone, prev);
  }

  const rows = [...byCustomer.values()].sort((a, b) => b.amount - a.amount);
  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <>
      <PageTitle title="ใครค้างเงิน" sub={`ค้างรวมทั้งหมด ${num(total)} บาท จาก ${rows.length} ราย`} />

      {rows.length === 0 && <Empty>ไม่มีใครค้างเงินเลย เก็บครบทุกบ้าน 🎉</Empty>}

      <div className="flex flex-col gap-2.5">
        {rows.map((r) => (
          <section key={r.phone} className="rounded-[13px] border border-line bg-surface p-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[16px] font-bold">{r.name}</span>
              <span className="num text-[20px] font-extrabold text-price">{num(r.amount)} ฿</span>
            </div>
            <a
              href={`tel:${r.phone}`}
              className="mt-2 inline-flex min-h-[44px] items-center rounded-[10px] bg-leaf px-3.5 text-[14px] font-bold text-white"
            >
              📞 โทรหา {r.phone}
            </a>
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {r.orders.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="flex justify-between gap-3 text-[13.5px] underline-offset-4 hover:underline"
                  >
                    <span className="num">
                      {o.orderNo} · {thaiDateTime(o.createdAt)}
                    </span>
                    <span className="num font-bold">{num(o.adjustedTotal - o.paidAmount)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
