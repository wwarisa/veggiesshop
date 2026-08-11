import { RoundManager } from "@/components/RoundManager";
import { getGroups, getRounds } from "@/lib/repo";
import { getOrders } from "@/lib/orders";
import { PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function RoundsPage() {
  const [rounds, groups, orders] = await Promise.all([getRounds(), getGroups(), getOrders()]);

  const counts = rounds.map((r) => {
    const list = orders.filter((o) => o.roundId === r.id && o.deliveryStatus !== "cancelled");
    return {
      roundId: r.id,
      count: list.length,
      total: list.reduce((sum, o) => sum + o.adjustedTotal, 0),
      pending: list.filter((o) => o.deliveryStatus === "pending_price").length,
    };
  });

  return (
    <>
      <PageTitle
        title="รอบจัดส่ง"
        sub="สร้างรอบ 1 ครั้ง = ได้ลิงก์ 1 อัน เอาไปแปะในกลุ่มไลน์ได้เลย"
      />
      <RoundManager rounds={rounds} groups={groups} counts={counts} />
    </>
  );
}
