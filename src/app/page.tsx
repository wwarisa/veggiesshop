import Link from "next/link";
import { ShopClient } from "@/components/ShopClient";
import { buildShopView } from "@/lib/shopdata";

export const dynamic = "force-dynamic";

/** หน้าร้านหลัก — เห็นสินค้าทุกอย่าง ราคากลาง ลูกค้าเลือกรอบส่งเองตอนสั่ง */
export default async function Home() {
  const view = await buildShopView(null, null);

  const closedReason = !view.shop.isOpen
    ? view.shop.closedMessage || "วันนี้ร้านปิดรับออเดอร์"
    : view.publicRounds.length === 0
      ? "ตอนนี้ยังไม่มีรอบส่งที่เปิดรับ"
      : null;

  return (
    <main>
      <ShopClient {...view} closedReason={closedReason} />
      <p className="mx-auto max-w-[460px] px-4 pb-6 pt-2 text-center text-[12.5px] text-ink-3">
        <Link href="/track" className="font-bold text-leaf underline-offset-4 hover:underline">
          ติดตามออเดอร์ที่สั่งไว้
        </Link>
        {" · "}
        <Link href="/admin" className="font-bold text-leaf underline-offset-4 hover:underline">
          เจ้าของร้านเข้าหน้าจัดการ
        </Link>
      </p>
    </main>
  );
}
