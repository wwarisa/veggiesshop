"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "ภาพรวม" },
  { href: "/admin/prices", label: "แก้ราคา" },
  { href: "/admin/orders", label: "ออเดอร์" },
  { href: "/admin/products", label: "สินค้า" },
  { href: "/admin/groups", label: "กลุ่ม" },
  { href: "/admin/rounds", label: "รอบส่ง" },
  { href: "/admin/debts", label: "ค้างเงิน" },
  { href: "/admin/customers", label: "ลูกค้า" },
  { href: "/admin/reports", label: "รายงาน" },
  { href: "/admin/settings", label: "ตั้งค่า" },
];

/** เมนูหน้าจัดการ ปุ่มใหญ่ กดง่ายบนมือถือ เห็นครบทุกอันไม่ต้องเลื่อนหา */
export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex flex-wrap gap-1.5" aria-label="เมนูหน้าจัดการ">
      {ITEMS.map((item) => {
        const active = item.href === "/admin" ? path === "/admin" : path.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`min-h-[40px] rounded-full border px-3.5 py-2 text-[13.5px] font-bold ${
              active
                ? "border-leaf bg-leaf text-white"
                : "border-line-strong bg-surface text-ink-2"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
