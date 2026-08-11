import { GroupManager } from "@/components/GroupManager";
import { getGroups, getProducts, getRounds, getZones } from "@/lib/repo";
import { PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const [groups, products, zones, rounds] = await Promise.all([
    getGroups(),
    getProducts(),
    getZones(),
    getRounds(),
  ]);

  return (
    <>
      <PageTitle
        title="กลุ่มลูกค้า"
        sub="กำหนดว่าลิงก์ของกลุ่มนี้ขายอะไร ต้องกรอกที่อยู่ไหม และเปิดช่องอื่นๆ หรือเปล่า"
      />
      <GroupManager groups={groups} products={products} zones={zones} rounds={rounds} />
    </>
  );
}
