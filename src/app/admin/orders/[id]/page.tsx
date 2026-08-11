import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderDetail } from "@/components/OrderDetail";
import { getOrder, getOrderEvents } from "@/lib/orders";
import { getShopSettings } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [order, events, shop] = await Promise.all([
    getOrder(id),
    getOrderEvents(id),
    getShopSettings(),
  ]);
  if (!order) notFound();

  return (
    <>
      <Link
        href="/admin/orders"
        className="mb-3 inline-block text-[14px] font-bold text-leaf underline-offset-4 hover:underline"
      >
        ← กลับไปรายการออเดอร์
      </Link>
      <OrderDetail order={order} events={events} shopPhone={shop.phone} />
    </>
  );
}
