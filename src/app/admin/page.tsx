import Link from "next/link";
import { readSession } from "@/lib/session";
import { getProducts, getShopSettings } from "@/lib/repo";
import { logoutAction } from "./login/actions";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const [session, shop, products] = await Promise.all([
    readSession(),
    getShopSettings(),
    getProducts(),
  ]);

  return (
    <main className="mx-auto max-w-[760px] px-4 py-6">
      <div
        className="rounded-[14px] border border-line bg-surface p-4"
        style={{ boxShadow: "var(--shadow)" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 text-[15px] font-bold">🧺 {session?.name ?? "เจ้าของร้าน"}</div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="min-h-[44px] rounded-[10px] border border-line-strong bg-surface px-3.5 text-sm font-bold"
            >
              ออกจากระบบ
            </button>
          </form>
        </div>
      </div>

      <h1 className="mt-6 text-2xl font-extrabold">ภาพรวมร้าน</h1>
      <p className="mt-1 text-sm text-ink-3">
        {shop.shopName} · มีสินค้าอยู่ {products.length} รายการ
      </p>

      <p className="mt-6 rounded-[13px] border border-line bg-surface p-4 text-[14.5px]">
        เข้าหน้าจัดการสำเร็จแล้ว หน้าถัดไปที่กำลังทำคือ แดชบอร์ด · สินค้า · แก้ราคา ·
        กลุ่มและลิงก์ · ออเดอร์ · ใบพิมพ์
      </p>

      <p className="mt-5">
        <Link href="/" className="text-[14px] font-bold text-leaf underline-offset-4 hover:underline">
          ← ดูหน้าร้านที่ลูกค้าเห็น
        </Link>
      </p>
    </main>
  );
}
