import Link from "next/link";
import { notFound } from "next/navigation";
import { ShopClient } from "@/components/ShopClient";
import { buildShopView, groupOf } from "@/lib/shopdata";
import { getRoundBySlug, roundClosedReason } from "@/lib/repo";

export const dynamic = "force-dynamic";

/**
 * ลิงก์สั่งซื้อของรอบ — วันส่งล็อกไว้แล้ว ลูกค้าไม่ต้องเลือก
 * เห็นเฉพาะสินค้าและราคาของกลุ่มที่ผูกกับรอบนี้
 */
export default async function RoundLinkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const round = await getRoundBySlug(slug);
  if (!round) notFound();

  const group = await groupOf(round);
  const view = await buildShopView(group, round);
  const closedReason = !view.shop.isOpen
    ? view.shop.closedMessage || "วันนี้ร้านปิดรับออเดอร์"
    : roundClosedReason(round);

  return (
    <main>
      <ShopClient {...view} closedReason={closedReason} />
      <p className="mx-auto max-w-[460px] px-4 pb-6 pt-2 text-center text-[12.5px] text-ink-3">
        <Link href="/track" className="font-bold text-leaf underline-offset-4 hover:underline">
          ติดตามออเดอร์ที่สั่งไว้
        </Link>
      </p>
    </main>
  );
}
