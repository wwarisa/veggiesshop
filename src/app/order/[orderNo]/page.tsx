import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderHeader, OrderLines, OrderStatusBar } from "@/components/OrderStatus";
import { getOrder } from "@/lib/orders";
import { getShopSettings } from "@/lib/repo";

export const dynamic = "force-dynamic";

/** หน้ายืนยันหลังสั่งสำเร็จ ลูกค้าบันทึกหน้านี้ไว้ดูสถานะได้เลย */
export default async function OrderPage({
  params,
}: {
  params: Promise<{ orderNo: string }>;
}) {
  const { orderNo } = await params;
  const [order, shop] = await Promise.all([getOrder(orderNo), getShopSettings()]);
  if (!order) notFound();

  return (
    <main className="mx-auto max-w-[460px] pb-10">
      <header className="bg-head px-4 py-4 text-center text-[#f2f7ef]">
        <p className="text-[32px] leading-none" aria-hidden>
          ✅
        </p>
        <h1 className="mt-2 text-[20px] font-bold">รับออเดอร์เรียบร้อยแล้ว</h1>
        <p className="mt-1 text-[13px] opacity-85">
          เก็บหมายเลขนี้ไว้เช็กสถานะได้ตลอด หรือใช้เบอร์โทรค้นก็ได้
        </p>
      </header>

      <div className="flex flex-col gap-3 p-3">
        <OrderHeader order={order} />
        <OrderStatusBar order={order} />
        <OrderLines order={order} />

        <p className="rounded-[12px] bg-surface-2 p-3 text-[13px] leading-relaxed text-ink-2">
          ยอดจริงอาจต่างจากตอนสั่งเล็กน้อยตามน้ำหนักที่ชั่งได้
          ถ้ามีการปรับ ทางร้านจะอัปเดตให้เห็นในหน้านี้
          {shop.phone && ` · โทรหาร้านได้ที่ ${shop.phone}`}
        </p>

        <div className="flex gap-2.5">
          <Link
            href="/track"
            className="grid min-h-[50px] flex-1 place-items-center rounded-[12px] border border-line-strong bg-surface font-bold"
          >
            ติดตามสถานะ
          </Link>
          <Link
            href="/"
            className="grid min-h-[50px] flex-1 place-items-center rounded-[12px] bg-leaf font-bold text-white"
          >
            สั่งเพิ่ม
          </Link>
        </div>
      </div>
    </main>
  );
}
