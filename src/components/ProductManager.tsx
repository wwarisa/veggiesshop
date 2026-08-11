"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteProductAction,
  saveProductAction,
  type ActionState,
} from "@/app/admin/actions";
import { num } from "@/lib/format";
import { btnDanger, btnPlain, btnPrimary, Field, inputClass } from "@/components/ui";
import type { Category, Group, Product } from "@/lib/types";

const UNIT_TYPES = [
  { value: "weight", label: "ชั่งน้ำหนัก (กก. / ขีด)" },
  { value: "bunch", label: "มัด" },
  { value: "bag", label: "ถุง / แผง" },
  { value: "piece", label: "ชิ้น / ลูก / หัว" },
];

/** เพิ่ม แก้ ลบสินค้า — ลบต้องยืนยันก่อนเสมอ และบอกว่ากระทบกลุ่มไหน */
export function ProductManager({
  products,
  categories,
  groups,
}: {
  products: Product[];
  categories: Category[];
  groups: Group[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveProductAction,
    {},
  );
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [removing, startRemoving] = useTransition();

  const shown = useMemo(() => {
    const term = q.trim();
    return term ? products.filter((p) => p.name.includes(term)) : products;
  }, [products, q]);

  const groupsUsing = (id: string) => groups.filter((g) => g.productIds.includes(id));

  function openNew() {
    setEditing(null);
    setShowForm(true);
    setConfirmId(null);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setShowForm(true);
    setConfirmId(null);
  }

  // ปิดฟอร์มเองเมื่อบันทึกสำเร็จ
  const lastMessage = useRef("");
  useEffect(() => {
    if (state.ok && state.message && state.message !== lastMessage.current) {
      lastMessage.current = state.message;
      setShowForm(false);
      setEditing(null);
    }
  }, [state]);

  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={openNew} className={`${btnPrimary} w-full`}>
        + เพิ่มสินค้าใหม่
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
            {editing ? `แก้ไข ${editing.name}` : "เพิ่มสินค้าใหม่"}
          </h2>
          {editing && <input type="hidden" name="id" value={editing.id} />}

          <Field label="ชื่อสินค้า">
            <input
              name="name"
              defaultValue={editing?.name ?? ""}
              placeholder="เช่น ผักกวางตุ้ง"
              className={inputClass}
            />
          </Field>

          <div className="flex gap-2.5">
            <div className="flex-1">
              <Field label="หมวดหมู่">
                <select
                  name="categoryId"
                  defaultValue={editing?.categoryId ?? categories[0]?.id}
                  className={inputClass}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="w-[110px]">
              <Field label="ไอคอน">
                <input
                  name="emoji"
                  defaultValue={editing?.emoji ?? "🥬"}
                  maxLength={4}
                  className={`${inputClass} text-center text-2xl`}
                />
              </Field>
            </div>
          </div>

          <Field label="คำอธิบายสั้นๆ" hint="ไม่ใส่ก็ได้ เช่น เก็บเช้านี้ ก้านกรอบ">
            <input name="note" defaultValue={editing?.note ?? ""} className={inputClass} />
          </Field>

          <p className="text-[13.5px] font-bold">หน่วยขายและราคา — ใส่ได้ถึง 3 หน่วย</p>
          {[1, 2, 3].map((i) => {
            const u = editing?.units[i - 1];
            return (
              <div key={i} className="flex flex-wrap gap-2">
                <input
                  name={`unitLabel${i}`}
                  defaultValue={u?.label ?? ""}
                  placeholder={i === 1 ? "หน่วยขาย เช่น กิโลกรัม" : `หน่วยที่ ${i} (ถ้ามี)`}
                  className={`${inputClass} min-w-[130px] flex-[2]`}
                  aria-label={`ชื่อหน่วยขายที่ ${i}`}
                />
                <input
                  name={`unitPrice${i}`}
                  defaultValue={u ? num(u.price) : ""}
                  inputMode="decimal"
                  placeholder="ราคา"
                  className={`num ${inputClass} w-[92px] flex-none text-center font-bold`}
                  aria-label={`ราคาของหน่วยที่ ${i}`}
                />
                <select
                  name={`unitType${i}`}
                  defaultValue={u?.unitType ?? "piece"}
                  className={`${inputClass} min-w-[150px] flex-1`}
                  aria-label={`ประเภทของหน่วยที่ ${i}`}
                >
                  {UNIT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
          <p className="text-[12.5px] text-ink-3">
            เลือก “ชั่งน้ำหนัก” ให้หน่วยที่ต้องชั่ง ระบบจะให้ปรับยอดตามน้ำหนักจริงก่อนส่งได้
          </p>

          {state.error && (
            <p role="alert" className="text-[14px] font-bold text-danger">
              {state.error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className={btnPrimary}>
              {pending ? "กำลังบันทึก…" : editing ? "บันทึกการแก้ไข" : "บันทึกสินค้าใหม่"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
              className={btnPlain}
            >
              ยกเลิก
            </button>
          </div>
        </form>
      )}

      <label className="flex h-[48px] items-center gap-2 rounded-xl border border-line bg-surface-2 px-3">
        <span aria-hidden>🔍</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          placeholder="ค้นหาสินค้าที่จะแก้หรือลบ"
          aria-label="ค้นหาสินค้า"
          className="h-full w-full bg-transparent outline-none placeholder:text-muted"
        />
      </label>

      <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
        {shown.length === 0 && <p className="p-10 text-center text-ink-3">ไม่เจอสินค้าชื่อนี้</p>}

        {shown.map((p) => {
          const used = groupsUsing(p.id);
          return (
            <div key={p.id} className="flex gap-3 border-b border-line p-3 last:border-b-0">
              <span
                className="grid h-11 w-11 flex-none place-items-center rounded-[10px] bg-leaf-soft text-[23px] leading-none"
                aria-hidden
              >
                {p.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[16.5px] font-bold">{p.name}</p>
                <p className="text-[12.5px] text-ink-3">
                  {categories.find((c) => c.id === p.categoryId)?.name}
                  {p.isAvailable ? "" : " · ปิดขายอยู่"}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {p.units.map((u) => (
                    <span
                      key={u.id}
                      className="rounded-lg border border-line bg-surface-2 px-2 py-1 text-[12.5px]"
                    >
                      {u.label} {num(u.price)} ฿
                    </span>
                  ))}
                </div>
                {used.length > 0 && (
                  <p className="mt-1 text-[12.5px] text-ink-3">
                    อยู่ในกลุ่ม: {used.map((g) => g.name).join(" · ")}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => openEdit(p)} className={btnPlain}>
                    แก้ไข
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(confirmId === p.id ? null : p.id)}
                    className={btnDanger}
                  >
                    ลบ
                  </button>
                </div>

                {confirmId === p.id && (
                  <div className="mt-2.5 rounded-[11px] border border-danger p-3">
                    <p className="text-[14px] leading-relaxed">
                      <b>ลบ {p.name} ออกจากร้าน?</b>
                      <br />
                      {used.length > 0 &&
                        `จะหายจากลิงก์ของ ${used.map((g) => g.name).join(" และ ")} ด้วย · `}
                      ออเดอร์เก่ายังเก็บชื่อกับราคาไว้ครบ ไม่กระทบยอดย้อนหลัง
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
                            await deleteProductAction(p.id);
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
