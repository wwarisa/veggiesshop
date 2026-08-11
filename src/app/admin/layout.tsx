import Link from "next/link";
import { readSession } from "@/lib/session";
import { AdminNav } from "@/components/AdminNav";
import { logoutAction } from "./login/actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();

  // หน้าใส่รหัสไม่ต้องมีเมนู
  if (!session) return <>{children}</>;

  return (
    <div className="mx-auto max-w-[760px] px-3 py-4">
      <div
        className="no-print sticky top-2 z-40 rounded-[14px] border border-line bg-surface p-2.5"
        style={{ boxShadow: "var(--shadow)" }}
      >
        <div className="mb-2 flex items-center gap-3">
          <Link href="/admin" className="flex-1 text-[15px] font-bold">
            🧺 {session.name}
          </Link>
          <Link
            href="/"
            className="grid min-h-[40px] place-items-center rounded-[10px] border border-line-strong px-3 text-[13px] font-bold"
          >
            ดูหน้าร้าน
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="min-h-[40px] rounded-[10px] border border-line-strong px-3 text-[13px] font-bold"
            >
              ออกจากระบบ
            </button>
          </form>
        </div>
        <AdminNav />
      </div>
      <main className="pt-4">{children}</main>
    </div>
  );
}
