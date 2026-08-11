import Link from "next/link";
import { PinPad } from "@/components/PinPad";
import { needsSetup } from "@/lib/setup";
import { getShopSettings } from "@/lib/repo";
import { db } from "@/lib/db";
import { hasSessionSecret } from "@/lib/session-token";
import { loginAction } from "./actions";
import { SetupForm } from "./SetupForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // ขึ้นออนไลน์จริงแล้วแต่ยังไม่ได้ตั้งกุญแจ — บอกวิธีแก้ให้ชัด ดีกว่าปล่อยให้เจอหน้าขาว
  if (process.env.NODE_ENV === "production" && !hasSessionSecret()) {
    return <MissingSecret />;
  }

  const [firstTime, shop] = await Promise.all([needsSetup(), getShopSettings()]);
  const storingAt = db().driver;

  return (
    <main className="min-h-dvh px-4 py-8">
      <p className="mx-auto mb-4 max-w-[420px] text-center text-[13px] text-ink-3">
        หน้าจัดการของ {shop.shopName} · ลูกค้าไม่ต้องเข้าหน้านี้
      </p>

      {firstTime ? (
        <SetupForm />
      ) : (
        <PinPad
          action={loginAction}
          next={next ?? "/admin"}
          hint="รหัส 6 หลัก · เปลี่ยนได้ในหน้าตั้งค่า"
        />
      )}

      <p className="mx-auto mt-6 max-w-[420px] text-center text-[12.5px] text-ink-3">
        {storingAt === "local"
          ? "ตอนนี้เก็บข้อมูลเป็นไฟล์ในเครื่อง (โหมดลองใช้) — ใส่ค่า Firestore ใน .env.local เมื่อพร้อมเปิดจริง"
          : "เก็บข้อมูลบน Firestore เรียบร้อย"}
      </p>

      <p className="mt-4 text-center">
        <Link href="/" className="text-[14px] font-bold text-leaf underline-offset-4 hover:underline">
          ← กลับไปหน้าร้าน
        </Link>
      </p>
    </main>
  );
}

/** ยังไม่ได้ตั้งกุญแจสำหรับล็อกอิน */
function MissingSecret() {
  return (
    <main className="mx-auto max-w-[460px] px-4 py-10">
      <div
        className="rounded-[16px] border border-line bg-surface p-5"
        style={{ boxShadow: "var(--shadow)" }}
      >
        <div className="text-center text-[32px] leading-none" aria-hidden>
          🔧
        </div>
        <h1 className="mt-2 text-center text-xl font-extrabold">ยังตั้งค่าไม่ครบ 1 อย่าง</h1>
        <p className="mt-2 text-[14.5px] leading-relaxed">
          ระบบต้องมีกุญแจลับสำหรับล็อกอินก่อนถึงจะเปิดหน้าจัดการได้
          ทำครั้งเดียวจบ ไม่ต้องแก้โค้ด
        </p>
        <ol className="mt-4 flex list-decimal flex-col gap-2 pl-5 text-[14.5px] leading-relaxed">
          <li>เปิดหน้าตั้งค่าของเว็บโฮสต์ที่ใช้อยู่ แล้วหาหัวข้อ Environment variables</li>
          <li>
            เพิ่มตัวแปรชื่อ <code className="rounded bg-surface-2 px-1.5 py-0.5">SESSION_SECRET</code>
          </li>
          <li>ใส่ค่าเป็นตัวอักษรสุ่มยาวอย่างน้อย 32 ตัว ห้ามบอกใคร</li>
          <li>กดบันทึก แล้วสั่งให้เว็บ deploy ใหม่อีกครั้ง</li>
        </ol>
        <p className="mt-4 text-[13px] text-ink-3">
          ขั้นตอนแบบมีภาพประกอบอยู่ในคู่มือนำเว็บขึ้นออนไลน์ หัวข้อ “ตั้งค่าความปลอดภัย”
        </p>
      </div>
    </main>
  );
}
