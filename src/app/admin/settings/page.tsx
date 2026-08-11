import { SettingsForm } from "@/components/SettingsForm";
import { getShopSettings, getZones } from "@/lib/repo";
import { PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [shop, zones] = await Promise.all([getShopSettings(), getZones()]);
  return (
    <>
      <PageTitle title="ตั้งค่าร้าน" sub="ทุกอย่างที่เห็นในหน้าเว็บ แก้ได้จากที่นี่หมด" />
      <SettingsForm shop={shop} zones={zones} />
    </>
  );
}
