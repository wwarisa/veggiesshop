"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteGroupAction,
  saveGroupAction,
  type ActionState,
} from "@/app/admin/actions";
import { btnPlain, btnPrimary, Field, inputClass, Pill } from "@/components/ui";
import { thaiDate } from "@/lib/format";
import type { Group, Product, Round, Zone } from "@/lib/types";

/** จัดการกลุ่ม — เลือกสินค้าในกลุ่ม โหมดที่อยู่ และช่องอื่นๆ */
export function GroupManager({
  groups,
  products,
  zones,
  rounds,
}: {
  groups: Group[];
  products: Product[];
  zones: Zone[];
  rounds: Round[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveGroupAction,
    {},
  );
  const router = useRouter();
  const [editing, setEditing] = useState<Group | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [addressMode, setAddressMode] = useState<"ask" | "fixed">("ask");
  const [copied, setCopied] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [removing, startRemoving] = useTransition();

  const lastMessage = useRef("");
  useEffect(() => {
    if (state.ok && state.message && state.message !== lastMessage.current) {
      lastMessage.current = state.message;
      setShowForm(false);
      setEditing(null);
    }
  }, [state]);

  function open(group: Group | null) {
    setEditing(group);
    setAddressMode(group?.addressMode ?? "ask");
    setShowForm(true);
  }

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
      <button type="button" onClick={() => open(null)} className={`${btnPrimary} w-full`}>
        + สร้างกลุ่มใหม่
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
            {editing ? `แก้ไขกลุ่ม ${editing.name}` : "สร้างกลุ่มใหม่"}
          </h2>
          {editing && <input type="hidden" name="id" value={editing.id} />}

          <Field label="ชื่อกลุ่ม" hint="เช่น BNI Icon หรือ หมู่บ้านสุขใจ">
            <input name="name" defaultValue={editing?.name ?? ""} className={inputClass} />
          </Field>

          <Field label="โซนจัดส่ง">
            <select name="zoneId" defaultValue={editing?.zoneId ?? ""} className={inputClass}>
              <option value="">ไม่ระบุ</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </Field>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-[13.5px] font-bold">ที่อยู่ของลูกค้า</legend>
            <label className="flex items-start gap-2.5 rounded-[11px] border border-line-strong bg-surface p-3">
              <input
                type="radio"
                name="addressMode"
                value="ask"
                checked={addressMode === "ask"}
                onChange={() => setAddressMode("ask")}
                className="mt-1 h-5 w-5 accent-[var(--leaf)]"
              />
              <span className="text-[14.5px]">
                <b className="block">ให้ลูกค้ากรอกที่อยู่เอง</b>
                <span className="text-[12.5px] text-ink-3">ใช้กับการส่งถึงบ้านแต่ละหลัง</span>
              </span>
            </label>
            <label className="flex items-start gap-2.5 rounded-[11px] border border-line-strong bg-surface p-3">
              <input
                type="radio"
                name="addressMode"
                value="fixed"
                checked={addressMode === "fixed"}
                onChange={() => setAddressMode("fixed")}
                className="mt-1 h-5 w-5 accent-[var(--leaf)]"
              />
              <span className="text-[14.5px]">
                <b className="block">ส่งจุดเดียวกันทั้งกลุ่ม ไม่ต้องกรอกที่อยู่</b>
                <span className="text-[12.5px] text-ink-3">
                  ลูกค้ากรอกแค่ชื่อกับเบอร์ เพื่อให้รู้ว่าถุงไหนของใคร
                </span>
              </span>
            </label>
          </fieldset>

          {addressMode === "fixed" && (
            <Field label="จุดรับของ" hint="เขียนให้ชัดว่าไปรับตรงไหน">
              <input
                name="fixedAddress"
                defaultValue={editing?.fixedAddress ?? ""}
                placeholder="เช่น อาคาร BNI Icon ชั้น 3 หน้าห้องประชุม"
                className={inputClass}
              />
            </Field>
          )}

          <label className="flex items-start gap-2.5 rounded-[11px] bg-surface p-3 text-[14px]">
            <input
              type="checkbox"
              name="allowOther"
              defaultChecked={editing?.allowOther ?? true}
              className="mt-1 h-5 w-5 accent-[var(--leaf)]"
            />
            <span>
              เปิดช่อง “อื่นๆ” ให้ลูกค้าพิมพ์ขอของนอกรายการ
              <span className="block text-[12.5px] text-ink-3">
                ออเดอร์จะอยู่สถานะรอยืนยันราคาจนกว่าจะใส่ราคาให้
              </span>
            </span>
          </label>

          <fieldset>
            <legend className="mb-2 text-[13.5px] font-bold">
              สินค้าที่กลุ่มนี้ขาย (ติ๊กเลือก)
            </legend>
            <div className="flex flex-col gap-1.5 rounded-[11px] border border-line bg-surface p-2.5">
              {products.map((p) => (
                <label key={p.id} className="flex items-center gap-2.5 text-[14.5px]">
                  <input
                    type="checkbox"
                    name="productIds"
                    value={p.id}
                    defaultChecked={editing?.productIds.includes(p.id) ?? false}
                    className="h-5 w-5 accent-[var(--leaf)]"
                  />
                  <span aria-hidden>{p.emoji}</span>
                  <span>{p.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {state.error && (
            <p role="alert" className="text-[14px] font-bold text-danger">
              {state.error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className={btnPrimary}>
              {pending ? "กำลังบันทึก…" : "บันทึกกลุ่ม"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className={btnPlain}>
              ยกเลิก
            </button>
          </div>
        </form>
      )}

      {groups.map((g) => {
        const links = rounds.filter((r) => r.groupId === g.id);
        return (
          <section key={g.id} className="rounded-[14px] border border-line bg-surface p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[17px] font-extrabold">{g.name}</h2>
              <Pill tone="muted">{g.productIds.length} สินค้า</Pill>
              <Pill tone={g.addressMode === "fixed" ? "leaf" : "muted"}>
                {g.addressMode === "fixed" ? "ไม่ต้องกรอกที่อยู่" : "ลูกค้ากรอกที่อยู่เอง"}
              </Pill>
              {g.allowOther && <Pill tone="warn">เปิดช่องอื่นๆ</Pill>}
            </div>

            {g.addressMode === "fixed" && (
              <p className="mt-1.5 text-[13.5px] text-ink-2">จุดรับของ: {g.fixedAddress}</p>
            )}

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {g.productIds.map((id) => {
                const p = products.find((x) => x.id === id);
                if (!p) return null;
                const special = p.units.some(
                  (u) => g.prices[`${p.id}|${u.id}`] !== undefined,
                );
                return (
                  <span
                    key={id}
                    className="rounded-lg border border-line bg-surface-2 px-2 py-1 text-[12.5px]"
                  >
                    {p.emoji} {p.name}
                    {special && <b className="text-price"> · ราคาพิเศษ</b>}
                  </span>
                );
              })}
            </div>

            {links.length > 0 && (
              <div className="mt-3 rounded-[11px] border border-line bg-surface-2 p-3">
                <p className="mb-2 text-[13px] font-bold text-ink-3">ลิงก์สั่งซื้อของกลุ่มนี้</p>
                {links.map((r) => (
                  <div key={r.id} className="mb-2 last:mb-0">
                    <p className="break-all text-[14px] font-bold text-leaf-deep">/r/{r.slug}</p>
                    <p className="text-[12.5px] text-ink-3">
                      {r.name} · ส่ง {thaiDate(r.deliveryDate)} {r.timeWindow}
                    </p>
                    <button
                      type="button"
                      onClick={() => copyLink(r.slug)}
                      className={`${btnPlain} mt-1.5`}
                    >
                      {copied === r.slug ? "คัดลอกแล้ว ✓" : "คัดลอกลิงก์"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => open(g)} className={btnPlain}>
                แก้ไขกลุ่มนี้
              </button>
              <button
                type="button"
                onClick={() => setConfirmId(confirmId === g.id ? null : g.id)}
                className="min-h-[46px] rounded-[11px] border border-danger px-4 text-[14px] font-bold text-danger"
              >
                ลบกลุ่ม
              </button>
            </div>

            {confirmId === g.id && (
              <div className="mt-2.5 rounded-[11px] border border-danger p-3">
                <p className="text-[14px] leading-relaxed">
                  <b>ลบกลุ่ม {g.name}?</b>
                  <br />
                  {links.length > 0
                    ? `ลิงก์ ${links.length} อันของกลุ่มนี้จะเลิกผูกกลุ่ม และกลายเป็นขายทุกอย่างในราคากลางแทน · `
                    : ""}
                  ออเดอร์เก่ายังอยู่ครบ ไม่กระทบยอดย้อนหลัง
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setConfirmId(null)} className={btnPlain}>
                    ไม่ลบ
                  </button>
                  <button
                    type="button"
                    disabled={removing}
                    onClick={() =>
                      startRemoving(async () => {
                        await deleteGroupAction(g.id);
                        setConfirmId(null);
                        router.refresh();
                      })
                    }
                    className="min-h-[46px] rounded-[11px] bg-danger px-4 text-[15px] font-bold text-white disabled:opacity-60"
                  >
                    {removing ? "กำลังลบ…" : "ลบเลย"}
                  </button>
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
