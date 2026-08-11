"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  savePricesAction,
  setProductAvailabilityAction,
  type ActionState,
} from "@/app/admin/actions";
import { num, thaiDateTime } from "@/lib/format";
import type { PriceHistory, Product } from "@/lib/types";

/**
 * แก้ราคาทั้งหน้าแล้วกดบันทึกครั้งเดียว
 *
 * โหมดราคากลาง  แก้ที่นี่ที่เดียวมีผลทุกลิงก์
 * โหมดกลุ่ม     ช่องที่ยังใช้ราคากลางจะขยับตามราคากลางเองทุกวัน
 *               กด "ตั้งราคาเฉพาะกลุ่มนี้" เมื่ออยากให้ต่างจริงๆ เท่านั้น
 */
export function PriceEditor({
  scope,
  scopeName,
  products,
  groupPrices,
  history,
}: {
  scope: string;
  scopeName: string;
  products: Product[];
  groupPrices: Record<string, number>;
  history: PriceHistory[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    savePricesAction,
    {},
  );
  const [q, setQ] = useState("");
  const router = useRouter();
  const [switching, startSwitching] = useTransition();
  const [openHistory, setOpenHistory] = useState<string | null>(null);
  /** ช่องไหนในโหมดกลุ่มที่ผู้ใช้เพิ่งกดให้ตั้งราคาเฉพาะ หรือกดกลับไปใช้ราคากลาง */
  const [override, setOverride] = useState<Record<string, boolean>>({});

  const isBase = scope === "base";

  const shown = useMemo(() => {
    const term = q.trim();
    return term ? products.filter((p) => p.name.includes(term)) : products;
  }, [products, q]);

  const historyOf = useMemo(() => {
    const map = new Map<string, PriceHistory[]>();
    for (const h of history) {
      const list = map.get(h.productId) ?? [];
      list.push(h);
      map.set(h.productId, list);
    }
    return map;
  }, [history]);

  function usesOwnPrice(key: string): boolean {
    if (isBase) return true;
    if (key in override) return override[key];
    return groupPrices[key] !== undefined;
  }

  return (
    <form action={formAction} className="pb-2">
      <input type="hidden" name="scope" value={scope} />

      <p className="mb-3 rounded-[11px] bg-surface-2 px-3 py-2.5 text-[13.5px] leading-relaxed text-ink-2">
        {isBase
          ? "กำลังแก้ราคากลาง แก้ที่นี่ที่เดียวมีผลกับทุกลิงก์ ยกเว้นกลุ่มที่ตั้งราคาเฉพาะไว้"
          : `กำลังแก้ราคาเฉพาะกลุ่ม ${scopeName} · ช่องที่ยังใช้ราคากลางจะขยับตามราคากลางเองทุกวัน`}
      </p>

      <label className="mb-3 flex h-[48px] items-center gap-2 rounded-xl border border-line bg-surface-2 px-3">
        <span aria-hidden>🔍</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          placeholder="พิมพ์ชื่อผักเพื่อหาให้ไว"
          aria-label="ค้นหาสินค้าในหน้าแก้ราคา"
          className="h-full w-full bg-transparent outline-none placeholder:text-muted"
        />
      </label>

      <div className="overflow-hidden rounded-[14px] border border-line bg-surface pb-1">
        {shown.length === 0 && (
          <p className="p-10 text-center text-ink-3">ไม่เจอสินค้าชื่อนี้</p>
        )}

        {shown.map((p) => {
          const rows = historyOf.get(p.id) ?? [];
          return (
            <div
              key={p.id}
              className={`border-b border-line p-3 last:border-b-0 ${
                p.isAvailable ? "" : "opacity-70"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`grid h-11 w-11 flex-none place-items-center rounded-[10px] bg-leaf-soft text-[23px] leading-none ${
                    p.isAvailable ? "" : "grayscale"
                  }`}
                  aria-hidden
                >
                  {p.emoji}
                </span>
                <span className="min-w-0 flex-1 text-[17px] font-bold">{p.name}</span>

                {isBase && (
                  <span className="flex flex-none gap-1 rounded-full border border-line bg-surface-2 p-1">
                    <button
                      type="button"
                      disabled={switching}
                      onClick={() =>
                        startSwitching(async () => {
                          await setProductAvailabilityAction(p.id, true);
                          router.refresh();
                        })
                      }
                      aria-pressed={p.isAvailable}
                      className={`min-h-[38px] rounded-full px-3 text-[13.5px] font-bold ${
                        p.isAvailable ? "bg-leaf text-white" : "text-ink-3"
                      }`}
                    >
                      ขายอยู่
                    </button>
                    <button
                      type="button"
                      disabled={switching}
                      onClick={() =>
                        startSwitching(async () => {
                          await setProductAvailabilityAction(p.id, false);
                          router.refresh();
                        })
                      }
                      aria-pressed={!p.isAvailable}
                      className={`min-h-[38px] rounded-full px-3 text-[13.5px] font-bold ${
                        p.isAvailable ? "text-ink-3" : "bg-danger text-white"
                      }`}
                    >
                      ของหมด
                    </button>
                  </span>
                )}
              </div>

              {p.units.map((u) => {
                const key = `${p.id}|${u.id}`;
                const own = usesOwnPrice(key);
                const shownPrice = own ? (groupPrices[key] ?? u.price) : u.price;
                return (
                  <div
                    key={u.id}
                    className="mt-2 flex items-center gap-2.5 border-t border-dashed border-line pt-2.5 first-of-type:border-t-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold">
                        ราคาต่อ{u.label}
                        {!isBase && (
                          <span
                            className={`ml-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
                              own ? "bg-price-soft text-price" : "bg-surface-2 text-ink-3"
                            }`}
                          >
                            {own ? "ราคาเฉพาะกลุ่ม" : "ใช้ราคากลาง"}
                          </span>
                        )}
                      </p>
                      <p className="text-[12.5px] text-ink-3">
                        {isBase
                          ? `ราคาก่อนหน้า ${num(u.prevPrice)} ฿`
                          : own
                            ? `ราคากลางตอนนี้ ${num(u.price)} ฿`
                            : `ตามราคากลาง ${num(u.price)} ฿`}
                      </p>
                      {!isBase && (
                        <button
                          type="button"
                          onClick={() =>
                            setOverride((prev) => ({ ...prev, [key]: !own }))
                          }
                          className="min-h-[36px] text-[12.5px] font-bold text-leaf"
                        >
                          {own ? "กลับไปใช้ราคากลาง" : "ตั้งราคาเฉพาะกลุ่มนี้"}
                        </button>
                      )}
                    </div>

                    {/* ส่งค่านี้ไปบอกเซิร์ฟเวอร์ว่าช่องนี้กลับไปใช้ราคากลาง */}
                    {!isBase && !own && <input type="hidden" name={`base:${key}`} value="1" />}

                    <input
                      name={`price:${key}`}
                      defaultValue={num(shownPrice)}
                      key={`${key}-${own}`}
                      disabled={!own}
                      inputMode="decimal"
                      aria-label={`ราคา ${p.name} ต่อ ${u.label} บาท`}
                      className="num h-[50px] w-[92px] flex-none rounded-[11px] border-[1.5px] border-line-strong bg-surface text-center text-[19px] font-extrabold outline-none focus:border-leaf disabled:opacity-45"
                    />
                  </div>
                );
              })}

              {rows.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setOpenHistory(openHistory === p.id ? null : p.id)}
                    className="mt-1.5 min-h-[38px] text-[13px] font-bold text-leaf"
                  >
                    {openHistory === p.id ? "▾" : "▸"} ราคาย้อนหลัง
                  </button>
                  {openHistory === p.id && (
                    <ul className="mt-1 flex flex-col gap-1.5 rounded-[10px] bg-surface-2 p-3 text-[13px]">
                      {rows.slice(0, 6).map((h) => (
                        <li key={h.id} className="flex justify-between gap-3">
                          <span className="text-ink-2">
                            {thaiDateTime(h.changedAt)} · {h.unitLabel}
                            {h.groupId ? ` · เฉพาะกลุ่ม` : ""}
                          </span>
                          <span className="num font-bold">
                            {h.oldPrice === null ? "ราคากลาง" : num(h.oldPrice)} →{" "}
                            {h.newPrice === null ? "ราคากลาง" : num(h.newPrice)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {state.error && (
        <p role="alert" className="mt-3 text-[14px] font-bold text-danger">
          {state.error}
        </p>
      )}
      {state.message && (
        <p
          role="status"
          className={`mt-3 rounded-[10px] px-3 py-2.5 text-[14px] font-bold ${
            state.message.startsWith("บันทึกแล้ว")
              ? "bg-leaf-soft text-leaf-deep"
              : "bg-surface-2 text-ink-2"
          }`}
        >
          {state.message}
        </p>
      )}

      <div className="sticky bottom-0 z-30 mt-3 flex items-center gap-3 rounded-t-[14px] border-t border-line bg-surface p-3">
        <p className="flex-1 text-[13px] text-ink-3">
          แก้เสร็จแล้วกดบันทึกครั้งเดียว ไม่ต้องกดทีละอัน
        </p>
        <button
          type="submit"
          disabled={pending}
          className="min-h-[54px] rounded-[13px] bg-leaf px-6 text-[17px] font-bold text-white disabled:opacity-60"
        >
          {pending ? "กำลังบันทึก…" : "บันทึกราคา"}
        </button>
      </div>
    </form>
  );
}
