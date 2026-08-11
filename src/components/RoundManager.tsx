"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  closeRoundAction,
  saveRoundAction,
  setRoundStatusAction,
  type ActionState,
} from "@/app/admin/actions";
import { btnPlain, btnPrimary, Field, inputClass, Pill } from "@/components/ui";
import { num, thaiDate, thaiDateTime } from "@/lib/format";
import type { Group, Round } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  draft: "ร่าง",
  open: "เปิดรับ",
  closed: "ปิดรับแล้ว",
  delivering: "กำลังส่ง",
  done: "จบรอบแล้ว",
};

export function RoundManager({
  rounds,
  groups,
  counts,
}: {
  rounds: Round[];
  groups: Group[];
  counts: { roundId: string; count: number; total: number; pending: number }[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveRoundAction, {});
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Round | null>(null);
  const [copied, setCopied] = useState("");
  const [busy, startBusy] = useTransition();

  const lastMessage = useRef("");
  useEffect(() => {
    if (state.ok && state.message && state.message !== lastMessage.current) {
      lastMessage.current = state.message;
      setShowForm(false);
      setEditing(null);
    }
  }, [state]);

  async function copyLink(slug: string) {
    const url = `${window.location.origin}/r/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(slug);
      setTimeout(() => setCopied(""), 2500);
    } catch {
      window.prompt("คัดลอกลิงก์นี้ไปวางในกลุ่มไลน์ได้เลย", url);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => {
          setEditing(null);
          setShowForm(true);
        }}
        className={`${btnPrimary} w-full`}
      >
        + สร้างรอบส่งใหม่ (ได้ลิงก์ทันที)
      </button>

      {state.message && !showForm && (
        <p role="status" className="rounded-[10px] bg-leaf-soft px-3 py-2.5 text-[14px] font-bold text-leaf-deep">
          {state.message}
        </p>
      )}

      {showForm && (
        <form
          action={formAction}
          key={editing?.id ?? "new"}
          className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface-2 p-3.5"
        >
          <h2 className="text-[17px] font-extrabold">
            {editing ? `แก้ไข ${editing.name}` : "สร้างรอบส่งใหม่"}
          </h2>
          {editing && <input type="hidden" name="id" value={editing.id} />}

          <Field label="ชื่อรอบ" hint="เช่น รอบเย็นหมู่บ้านสุขใจ">
            <input name="name" defaultValue={editing?.name ?? ""} className={inputClass} />
          </Field>

          <Field label="กลุ่มลูกค้า" hint="เลือกกลุ่มแล้วลิงก์นี้จะขายเฉพาะของกลุ่มนั้น">
            <select name="groupId" defaultValue={editing?.groupId ?? ""} className={inputClass}>
              <option value="">ไม่ผูกกลุ่ม (ขายทุกอย่าง ราคากลาง)</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex flex-wrap gap-2.5">
            <div className="min-w-[150px] flex-1">
              <Field label="วันที่ส่ง">
                <input
                  type="date"
                  name="deliveryDate"
                  defaultValue={editing?.deliveryDate ?? ""}
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="min-w-[150px] flex-1">
              <Field label="ช่วงเวลาส่ง">
                <input
                  name="timeWindow"
                  defaultValue={editing?.timeWindow ?? "17:00 – 19:00 น."}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>

          <Field label="ปิดรับออเดอร์เมื่อไหร่">
            <input
              type="datetime-local"
              name="cutoffAt"
              defaultValue={editing ? editing.cutoffAt.slice(0, 16) : ""}
              className={inputClass}
            />
          </Field>

          <Field label="ส่วนท้ายลิงก์" hint="เว้นว่างได้ ระบบตั้งให้เอง">
            <input
              name="slug"
              defaultValue={editing?.slug ?? ""}
              placeholder="เช่น sukjai-1208"
              className={inputClass}
            />
          </Field>

          <label className="flex items-start gap-2.5 rounded-[11px] bg-surface p-3 text-[14px]">
            <input
              type="checkbox"
              name="isPublic"
              defaultChecked={editing?.isPublic ?? false}
              className="mt-1 h-5 w-5 accent-[var(--leaf)]"
            />
            <span>
              ให้รอบนี้โผล่ในหน้าเว็บหลักด้วย
              <span className="block text-[12.5px] text-ink-3">
                ไม่ติ๊ก = เข้าได้เฉพาะคนที่มีลิงก์
              </span>
            </span>
          </label>

          {state.error && (
            <p role="alert" className="text-[14px] font-bold text-danger">
              {state.error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className={btnPrimary}>
              {pending ? "กำลังบันทึก…" : "บันทึกรอบ"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className={btnPlain}>
              ยกเลิก
            </button>
          </div>
        </form>
      )}

      {rounds.map((r) => {
        const stat = counts.find((c) => c.roundId === r.id);
        const group = groups.find((g) => g.id === r.groupId);
        return (
          <section key={r.id} className="rounded-[14px] border border-line bg-surface p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[17px] font-extrabold">{r.name}</h2>
              <Pill tone={r.status === "open" ? "leaf" : "muted"}>
                {STATUS_LABEL[r.status] ?? r.status}
              </Pill>
              {(stat?.pending ?? 0) > 0 && (
                <Pill tone="warn">{stat?.pending} รายการรอยืนยันราคา</Pill>
              )}
            </div>

            <dl className="mt-2 flex flex-col gap-1 text-[13.5px] text-ink-2">
              <Row label="กลุ่ม" value={group?.name ?? "ไม่ผูกกลุ่ม"} />
              <Row label="วันส่ง" value={`${thaiDate(r.deliveryDate)} · ${r.timeWindow}`} />
              <Row label="ปิดรับ" value={thaiDateTime(r.cutoffAt)} />
              <Row
                label="ออเดอร์"
                value={`${stat?.count ?? 0} ราย · รวม ${num(stat?.total ?? 0)} บาท`}
              />
            </dl>

            <div className="mt-3 rounded-[11px] border border-line bg-surface-2 p-3">
              <p className="break-all text-[14px] font-bold text-leaf-deep">/r/{r.slug}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => copyLink(r.slug)} className={btnPrimary}>
                  {copied === r.slug ? "คัดลอกแล้ว ✓" : "คัดลอกลิงก์"}
                </button>
                <Link href={`/r/${r.slug}`} className={btnPlain}>
                  ดูหน้าที่ลูกค้าเห็น
                </Link>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/admin/rounds/${r.id}/print`} className={btnPlain}>
                🖨 ใบพิมพ์ 80 มม.
              </Link>
              <button
                type="button"
                onClick={() => {
                  setEditing(r);
                  setShowForm(true);
                }}
                className={btnPlain}
              >
                แก้ไขรอบ
              </button>
              {r.status === "open" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    startBusy(async () => {
                      await setRoundStatusAction(r.id, "closed");
                      router.refresh();
                    })
                  }
                  className={btnPlain}
                >
                  ปิดรับออเดอร์
                </button>
              )}
              {r.status !== "done" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    startBusy(async () => {
                      await closeRoundAction(r.id);
                      router.refresh();
                    })
                  }
                  className={btnPlain}
                >
                  จบรอบและสรุปยอด
                </button>
              )}
            </div>

            {r.summary && (
              <div className="mt-3 rounded-[11px] bg-leaf-soft p-3 text-[13.5px] text-leaf-deep">
                <b>สรุปปิดรอบ</b>
                <p>
                  ส่งสำเร็จ {r.summary.delivered} ราย · ส่งไม่สำเร็จ {r.summary.failed} ราย
                </p>
                <p>
                  เงินสด {num(r.summary.cashCollected)} · โอน {num(r.summary.transferCollected)} ·
                  ค้าง {num(r.summary.outstanding)} บาท
                </p>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2.5">
      <dt className="w-[58px] flex-none text-ink-3">{label}</dt>
      <dd className="min-w-0 flex-1">{value}</dd>
    </div>
  );
}
