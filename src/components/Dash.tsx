import Link from "next/link";
import { num } from "@/lib/format";

/**
 * ชิ้นส่วนของแดชบอร์ด
 *
 * กราฟทุกอันใช้สีเขียวสีเดียว เพราะเป็นการเทียบ "ปริมาณ" ไม่ใช่แยกประเภทด้วยสี
 * ชื่อกับตัวเลขเขียนกำกับไว้ทุกแท่ง อ่านได้โดยไม่ต้องแยกสี คนตาบอดสีก็อ่านได้
 * สีส้มเหลืองสงวนไว้ให้ป้ายเตือนเท่านั้น และมีไอคอนกับข้อความกำกับเสมอ
 */

export function StatTile({
  label,
  value,
  sub,
  alert = false,
}: {
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-0.5 rounded-[13px] border p-3 ${
        alert ? "border-warn bg-warn-soft" : "border-line bg-surface"
      }`}
    >
      <span className={`text-[12.5px] font-semibold ${alert ? "text-warn" : "text-ink-3"}`}>
        {label}
      </span>
      <span
        className={`num text-[26px] font-extrabold leading-tight tracking-tight ${
          alert ? "text-warn" : ""
        }`}
      >
        {value}
      </span>
      {sub && (
        <span className={`text-[12.5px] ${alert ? "text-warn" : "text-ink-3"}`}>{sub}</span>
      )}
    </div>
  );
}

export function TodoItem({
  icon,
  main,
  sub,
  href,
  warn = false,
}: {
  icon: string;
  main: string;
  sub: string;
  href: string;
  warn?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-[11px] border p-3 ${
        warn ? "border-warn bg-warn-soft" : "border-line bg-surface"
      }`}
    >
      <span aria-hidden>{icon}</span>
      <span className="flex-1 text-[14.5px]">
        {main}
        <span className={`block text-[12.5px] font-semibold ${warn ? "text-warn" : "text-ink-3"}`}>
          {sub}
        </span>
      </span>
      <span aria-hidden className="text-ink-3">
        ›
      </span>
    </Link>
  );
}

/** กราฟแท่งแนวนอน — ยาวเท่าไหร่ = ขายได้เท่าไหร่ ตัวเลขติดไว้ข้างทุกแท่ง */
export function BarList({
  rows,
  emptyText,
}: {
  rows: { name: string; value: number; note?: string }[];
  emptyText: string;
}) {
  if (rows.length === 0) {
    return <p className="mt-3 rounded-[12px] bg-surface-2 p-6 text-center text-ink-3">{emptyText}</p>;
  }
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ol className="mt-3 flex flex-col gap-2.5">
      {rows.map((r) => (
        <li key={r.name} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2.5">
            <span className="text-[14.5px] font-semibold">
              {r.name}
              {r.note && <span className="block text-[12px] font-semibold text-ink-3">{r.note}</span>}
            </span>
            <span className="num text-[14.5px] font-extrabold">{num(r.value)} ฿</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-leaf"
              style={{ width: `${Math.max(2, Math.round((r.value / max) * 100))}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

/** กราฟแท่งแนวตั้ง 7 วัน แตะค้างเพื่อดูตัวเลขของวันนั้น */
export function DayBars({
  days,
}: {
  days: { key: string; label: string; value: number; today: boolean }[];
}) {
  const max = Math.max(...days.map((d) => d.value), 1);
  return (
    <div className="mt-3 flex h-[140px] items-end gap-1.5">
      {days.map((d) => (
        <div
          key={d.key}
          tabIndex={0}
          role="img"
          aria-label={`${d.label} ขายได้ ${num(d.value)} บาท`}
          className="group relative flex h-full flex-1 flex-col items-center justify-end gap-1.5"
        >
          <span className="pointer-events-none absolute bottom-full mb-1.5 rounded-md bg-ink px-2 py-0.5 text-[12px] font-bold text-surface opacity-0 group-hover:opacity-100 group-focus:opacity-100">
            {num(d.value)} ฿
          </span>
          <div
            className={`w-full rounded-t-md ${d.today ? "bg-leaf-deep" : "bg-leaf"}`}
            style={{ height: `${Math.max(3, Math.round((d.value / max) * 100))}%` }}
          />
          <span className="text-[11.5px] font-semibold text-ink-3">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
