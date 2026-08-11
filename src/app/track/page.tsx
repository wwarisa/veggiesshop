import Link from "next/link";
import { OrderHeader, OrderLines, OrderStatusBar } from "@/components/OrderStatus";
import { getOrder, getOrders } from "@/lib/orders";
import { normalizePhone } from "@/lib/format";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

/** ติดตามสถานะด้วยเบอร์โทรหรือหมายเลขออเดอร์ ไม่ต้องล็อกอิน */
export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const term = (q ?? "").trim();

  let orders: Order[] = [];
  let searched = false;

  if (term) {
    searched = true;
    const digits = normalizePhone(term);
    // เบอร์โทรมี 9-10 หลัก ส่วนหมายเลขออเดอร์เป็นรูปแบบ ตัวเลข-ตัวเลข
    if (digits.length >= 9 && term.includes("-") === false) {
      orders = await getOrders({ phone: digits });
    } else {
      const one = await getOrder(term);
      orders = one ? [one] : [];
    }
  }

  return (
    <main className="mx-auto max-w-[460px] pb-10">
      <header className="bg-head px-4 py-4 text-[#f2f7ef]">
        <Link href="/" className="text-[14px] font-bold underline-offset-4 hover:underline">
          ← กลับไปหน้าร้าน
        </Link>
        <h1 className="mt-1.5 text-[20px] font-bold">ติดตามออเดอร์</h1>
        <p className="text-[13px] opacity-85">ใส่เบอร์โทรที่สั่ง หรือหมายเลขออเดอร์ก็ได้</p>
      </header>

      <form className="flex gap-2 p-3" action="/track">
        <input
          name="q"
          defaultValue={term}
          placeholder="เบอร์โทร หรือ 260807-001"
          aria-label="เบอร์โทรหรือหมายเลขออเดอร์"
          className="num min-h-[52px] flex-1 rounded-[11px] border-[1.5px] border-line-strong bg-surface px-3 outline-none focus:border-leaf"
        />
        <button
          type="submit"
          className="min-h-[52px] rounded-[11px] bg-leaf px-5 font-bold text-white"
        >
          ค้นหา
        </button>
      </form>

      <div className="flex flex-col gap-4 px-3">
        {searched && orders.length === 0 && (
          <p className="rounded-[12px] bg-surface-2 p-4 text-center text-[14.5px] text-ink-2">
            ไม่เจอออเดอร์ที่ตรงกับที่ค้นหา ลองเช็กเบอร์หรือหมายเลขออเดอร์อีกครั้งนะคะ
          </p>
        )}

        {orders.map((order) => (
          <section key={order.id} className="flex flex-col gap-3">
            <OrderHeader order={order} />
            <OrderStatusBar order={order} />
            <OrderLines order={order} />
          </section>
        ))}
      </div>
    </main>
  );
}
