import type { ReactNode } from "react";

/** ชิ้นส่วนหน้าตาที่ใช้ซ้ำทั่วหน้าจัดการ */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[14px] border border-line bg-surface ${className}`}>
      {children}
    </section>
  );
}

export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="mb-4">
      <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      {sub && <p className="mt-1 text-sm text-ink-3">{sub}</p>}
    </header>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="p-10 text-center text-[14.5px] text-ink-3">{children}</p>;
}

export function Pill({
  children,
  tone = "leaf",
}: {
  children: ReactNode;
  tone?: "leaf" | "warn" | "danger" | "muted";
}) {
  const tones = {
    leaf: "bg-leaf text-white",
    warn: "bg-warn text-white",
    danger: "bg-danger text-white",
    muted: "border border-line-strong bg-surface text-ink-2",
  };
  return (
    <span className={`flex-none rounded-full px-2.5 py-0.5 text-[11.5px] font-bold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13.5px] font-bold">{label}</span>
      {children}
      {hint && <span className="text-[12.5px] text-ink-3">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "min-h-[50px] w-full rounded-[11px] border-[1.5px] border-line-strong bg-surface px-3 outline-none focus:border-leaf";

export const btnPrimary =
  "min-h-[52px] rounded-[12px] bg-leaf px-5 text-[16px] font-bold text-white disabled:bg-line-strong disabled:text-ink-3";

export const btnPlain =
  "min-h-[46px] rounded-[11px] border border-line-strong bg-surface px-4 text-[14px] font-bold";

export const btnDanger =
  "min-h-[46px] rounded-[11px] border border-danger bg-transparent px-4 text-[14px] font-bold text-danger";
