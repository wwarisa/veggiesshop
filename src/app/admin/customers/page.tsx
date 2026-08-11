import Link from "next/link";
import { COL, db } from "@/lib/db";
import { getOrders } from "@/lib/orders";
import { num, thaiDateTime } from "@/lib/format";
import { Empty, PageTitle } from "@/components/ui";
import type { Customer } from "@/lib/types";

export const dynamic = "force-dynamic";

/** ทะเบียนลูกค้า พร้อมประวัติการสั่งและยอดค้าง */
export default async function CustomersPage() {
  const [customers, orders] = await Promise.all([
    db().list<Customer>(COL.customers),
    getOrders(),
  ]);

  const rows = customers.sort((a, b) => (b.lastOrderAt ?? "").localeCompare(a.lastOrderAt ?? ""));

  return (
    <>
      <PageTitle title="ทะเบียนลูกค้า" sub={`มีลูกค้าทั้งหมด ${rows.length} ราย`} />

      {rows.length === 0 && <Empty>ยังไม่มีลูกค้าในระบบ จะเพิ่มเองอัตโนมัติเมื่อมีคนสั่งของ</Empty>}

      <div className="flex flex-col gap-2.5">
        {rows.map((c) => {
          const history = orders.filter((o) => o.customerPhone === c.phone).slice(0, 5);
          return (
            <section key={c.id} className="rounded-[13px] border border-line bg-surface p-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[16px] font-bold">{c.name}</span>
                {c.outstanding > 0 && (
                  <span className="num text-[15px] font-extrabold text-price">
                    ค้าง {num(c.outstanding)} ฿
                  </span>
                )}
              </div>
              <p className="text-[13.5px] text-ink-2">{c.phone}</p>
              {c.address && <p className="text-[13px] text-ink-3">{c.address}</p>}
              <p className="mt-1 text-[12.5px] text-ink-3">
                สั่งมาแล้ว {c.orderCount} ครั้ง · ยอดสะสม {num(c.totalSpent)} บาท
                {c.lastOrderAt && ` · ล่าสุด ${thaiDateTime(c.lastOrderAt)}`}
              </p>
              {history.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {history.map((o) => (
                    <li key={o.id}>
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="num rounded-lg border border-line bg-surface-2 px-2 py-1 text-[12.5px]"
                      >
                        {o.orderNo}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
