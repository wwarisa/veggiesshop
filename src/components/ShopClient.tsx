"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { lookupCustomerAction, placeOrderAction } from "@/app/actions";
import { num, thaiDate, thaiDateTime } from "@/lib/format";
import type { Category, Group, Product, Round, ShopSettings } from "@/lib/types";

/**
 * หน้าร้านฝั่งลูกค้า ใช้ทั้งหน้าเว็บหลักและลิงก์ของกลุ่ม
 *
 * ราคาที่แสดงตรงนี้เอาไว้ให้ลูกค้าเห็นเฉยๆ
 * ตอนกดสั่งจริงส่งไปแค่ รหัสสินค้า + รหัสหน่วย + จำนวน
 * เซิร์ฟเวอร์ไปดึงราคาปัจจุบันมาคูณเอง จึงปลอมราคาไม่ได้
 */

interface Props {
  shop: ShopSettings;
  products: Product[];
  categories: Category[];
  group: Group | null;
  round: Round | null;
  publicRounds: Round[];
  /** ราคาที่ใช้จริงในบริบทนี้ คีย์คือ "สินค้า|หน่วย" */
  priceMap: Record<string, number>;
  closedReason: string | null;
}

type Cart = Record<string, number>;

const REMEMBER_KEY = "veggies_customer";

export function ShopClient({
  shop,
  products,
  categories,
  group,
  round,
  publicRounds,
  priceMap,
  closedReason,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"shop" | "checkout">("shop");
  const [cart, setCart] = useState<Cart>({});
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [others, setOthers] = useState<string[]>([]);
  const [otherDraft, setOtherDraft] = useState("");
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [roundId, setRoundId] = useState(round?.id ?? publicRounds[0]?.id ?? "");
  const [foundHint, setFoundHint] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [idemKey] = useState(
    () => `k-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  );

  // จำข้อมูลลูกค้าไว้ในเครื่อง ครั้งหน้าไม่ต้องกรอกใหม่
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (!saved) return;
      const v = JSON.parse(saved) as { name?: string; phone?: string; address?: string };
      if (v.name) setName(v.name);
      if (v.phone) setPhone(v.phone);
      if (v.address) setAddress(v.address);
    } catch {
      /* เปิดจากโหมดส่วนตัวหรือปิดการเก็บข้อมูลไว้ ไม่เป็นไร ให้กรอกเองได้ */
    }
  }, []);

  const priceOf = (productId: string, unitId: string) =>
    priceMap[`${productId}|${unitId}`] ?? 0;

  const unitOf = (p: Product) =>
    p.units.find((u) => u.id === (picked[p.id] ?? p.units[0]?.id)) ?? p.units[0];

  const visible = useMemo(() => {
    const term = q.trim();
    return products.filter((p) => {
      if (shop.soldOutBehavior === "hide" && !p.isAvailable) return false;
      if (cat !== "all" && p.categoryId !== cat) return false;
      if (term && !p.searchTerms.some((s) => s.includes(term)) && !p.name.includes(term))
        return false;
      return true;
    });
  }, [products, cat, q, shop.soldOutBehavior]);

  const shownCats = useMemo(() => {
    const present = new Set(products.map((p) => p.categoryId));
    return categories.filter((c) => present.has(c.id));
  }, [products, categories]);

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([key, qty]) => {
          const [productId, unitId] = key.split("|");
          return { productId, unitId, qty };
        }),
    [cart],
  );

  const total = lines.reduce((sum, l) => sum + priceOf(l.productId, l.unitId) * l.qty, 0);

  function removeLine(productId: string, unitId: string) {
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[`${productId}|${unitId}`];
      return copy;
    });
  }

  function bump(productId: string, unitId: string, delta: number) {
    const key = `${productId}|${unitId}`;
    setCart((prev) => {
      const next = Math.round(((prev[key] ?? 0) + delta) * 100) / 100;
      const copy = { ...prev };
      // กันจำนวนติดลบ
      if (next <= 0) delete copy[key];
      else copy[key] = next;
      return copy;
    });
  }

  async function onPhoneBlur() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9) return;
    const found = await lookupCustomerAction(digits);
    if (!found) return;
    setName((prev) => (prev.trim() ? prev : found.name));
    if (found.address) setAddress((prev) => (prev.trim() ? prev : found.address));
    setFoundHint(`ยินดีต้อนรับกลับค่ะ ${found.name} · เคยสั่งมาแล้ว ${found.orderCount} ครั้ง`);
  }

  async function submit() {
    if (sending) return;
    setError("");
    setSending(true);
    try {
      const result = await placeOrderAction({
        name,
        phone,
        address,
        note,
        roundId: round?.id ?? (roundId || null),
        groupId: group?.id ?? null,
        lines,
        otherTexts: others,
        idempotencyKey: idemKey,
      });
      if (!result.ok) {
        setError(result.error);
        setSending(false);
        // เลื่อนไปให้เห็นข้อความเตือน ไม่งั้นลูกค้ากดแล้วเหมือนไม่มีอะไรเกิดขึ้น
        requestAnimationFrame(() => {
          document.getElementById("checkout-error")?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        });
        return;
      }
      try {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ name, phone, address }));
      } catch {
        /* เก็บไม่ได้ก็ไม่เป็นไร */
      }
      router.push(`/order/${result.orderNo}`);
    } catch {
      setError("ส่งออเดอร์ไม่สำเร็จ เน็ตอาจหลุด ลองกดใหม่อีกครั้งนะคะ");
      setSending(false);
    }
  }

  const needAddress = group?.addressMode !== "fixed";
  const canOrder = lines.length > 0 || others.length > 0;

  /* ── หน้ากรอกข้อมูลผู้สั่ง ─────────────────────────────────────── */
  if (step === "checkout") {
    return (
      <div className="mx-auto max-w-[460px] pb-32">
        <header className="bg-head px-4 py-3.5 text-[#f2f7ef]">
          <button
            type="button"
            onClick={() => setStep("shop")}
            className="text-[14px] font-bold underline-offset-4 hover:underline"
          >
            ← กลับไปเลือกของ
          </button>
          <h1 className="mt-1.5 text-[20px] font-bold">กรอกข้อมูลผู้สั่ง</h1>
        </header>

        <div className="flex flex-col gap-3 p-3">
          <Field label="ชื่อผู้สั่ง" required>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น คุณสมหญิง"
              className="w-full min-h-[52px] rounded-[11px] border-[1.5px] border-line-strong bg-surface px-3 outline-none focus:border-leaf"
            />
          </Field>

          <Field label="เบอร์โทร" required hint="เคยสั่งแล้วระบบจะดึงชื่อและที่อยู่เดิมขึ้นมาให้">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={onPhoneBlur}
              inputMode="tel"
              placeholder="08x-xxx-xxxx"
              className="num w-full min-h-[52px] rounded-[11px] border-[1.5px] border-line-strong bg-surface px-3 outline-none focus:border-leaf"
            />
          </Field>

          {foundHint && (
            <p className="rounded-[10px] bg-leaf-soft px-3 py-2 text-[13.5px] font-bold text-leaf-deep">
              {foundHint}
            </p>
          )}

          {needAddress ? (
            <Field label="ที่อยู่จัดส่ง" required hint="บอกจุดสังเกตด้วยจะดีมาก เช่น บ้านรั้วเขียว">
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                placeholder="บ้านเลขที่ หมู่บ้าน ซอย จุดสังเกต"
                className="w-full rounded-[11px] border-[1.5px] border-line-strong bg-surface p-3 outline-none focus:border-leaf"
              />
            </Field>
          ) : (
            <div className="rounded-[11px] border border-line bg-leaf-soft p-3">
              <p className="text-[13px] font-bold text-leaf-deep">ไม่ต้องกรอกที่อยู่</p>
              <p className="mt-1 text-[14px]">{group?.fixedAddress}</p>
            </div>
          )}

          {!round && publicRounds.length > 0 && (
            <Field label="เลือกรอบส่ง" required>
              <div className="flex flex-col gap-2">
                {publicRounds.map((r) => (
                  <label
                    key={r.id}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-[11px] border p-3 ${
                      roundId === r.id ? "border-leaf bg-leaf-soft" : "border-line-strong"
                    }`}
                  >
                    <input
                      type="radio"
                      name="round"
                      checked={roundId === r.id}
                      onChange={() => setRoundId(r.id)}
                      className="mt-1 h-5 w-5 accent-[var(--leaf)]"
                    />
                    <span className="text-[14.5px]">
                      <b className="block">{r.name}</b>
                      {thaiDate(r.deliveryDate)} · {r.timeWindow}
                      <span className="block text-[12.5px] text-ink-3">
                        ปิดรับ {thaiDateTime(r.cutoffAt)}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </Field>
          )}

          {round && (
            <div className="rounded-[11px] border border-line bg-leaf-soft p-3">
              <p className="text-[13px] font-bold text-leaf-deep">รอบส่งล็อกไว้แล้ว</p>
              <p className="mt-1 text-[14.5px]">
                {thaiDate(round.deliveryDate)} · {round.timeWindow}
              </p>
              <p className="text-[12.5px] text-ink-3">ปิดรับ {thaiDateTime(round.cutoffAt)}</p>
            </div>
          )}

          <Field label="หมายเหตุถึงร้าน">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="เช่น ฝากไว้หน้าบ้านได้ / โทรก่อนถึง"
              className="w-full rounded-[11px] border-[1.5px] border-line-strong bg-surface p-3 outline-none focus:border-leaf"
            />
          </Field>

          <div className="rounded-[13px] border border-line bg-surface p-3.5">
            <h2 className="text-[15px] font-bold">สรุปรายการ</h2>
            <ul className="mt-2 flex flex-col gap-1.5">
              {lines.map((l) => {
                const p = products.find((x) => x.id === l.productId);
                const u = p?.units.find((x) => x.id === l.unitId);
                if (!p || !u) return null;
                return (
                  <li key={`${l.productId}|${l.unitId}`} className="flex justify-between text-[14px]">
                    <span>
                      {p.name} · {num(l.qty)} {u.label}
                    </span>
                    <span className="num font-bold">
                      {num(priceOf(l.productId, l.unitId) * l.qty)}
                    </span>
                  </li>
                );
              })}
            </ul>

            {others.length > 0 && (
              <div className="mt-2 rounded-[10px] bg-warn-soft p-2.5">
                <p className="text-[12.5px] font-bold text-warn">รอร้านยืนยันราคา</p>
                <ul className="mt-1 flex flex-col gap-0.5 text-[13.5px]">
                  {others.map((t, i) => (
                    <li key={i}>• {t}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-3 flex items-baseline justify-between border-t border-line pt-2.5">
              <span className="text-[15px] font-bold">ยอดที่ต้องเตรียม</span>
              <span className="num text-[24px] font-extrabold text-price">{num(total)} บาท</span>
            </div>
            <p className="mt-1.5 text-[12.5px] text-ink-3">
              ชำระเงินปลายทาง · ยอดจริงอาจต่างเล็กน้อยตามน้ำหนักที่ชั่งได้
              {others.length > 0 && " และยังไม่รวมของที่รอร้านยืนยันราคา"}
            </p>
          </div>

          {error && (
            <p
              id="checkout-error"
              role="alert"
              className="rounded-[10px] bg-price-soft px-3 py-2.5 text-[14px] font-bold text-price"
            >
              {error}
            </p>
          )}
        </div>

        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-[460px] border-t border-line bg-surface p-3">
          <button
            type="button"
            onClick={submit}
            disabled={sending || !canOrder}
            className="min-h-[56px] w-full rounded-[13px] bg-leaf text-[18px] font-bold text-white disabled:bg-line-strong disabled:text-ink-3"
          >
            {sending ? "กำลังส่งออเดอร์…" : "ยืนยันสั่งซื้อ"}
          </button>
        </div>
      </div>
    );
  }

  /* ── หน้าเลือกสินค้า ──────────────────────────────────────────── */
  return (
    <div className="mx-auto max-w-[460px] pb-28">
      <header className="bg-head px-4 pb-4 pt-3.5 text-[#f2f7ef]">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-white/15 text-xl">
            🥬
          </div>
          <div>
            <div className="text-[19px] font-bold">{shop.shopName}</div>
            <div className="text-[12.5px] opacity-80">ผักสดส่งถึงบ้าน · เก็บเงินปลายทาง</div>
          </div>
        </div>
        {shop.announcement && (
          <p className="mt-3 flex gap-2 rounded-[10px] bg-white/10 px-2.5 py-2 text-[13px]">
            <span aria-hidden>📣</span>
            <span>{shop.announcement}</span>
          </p>
        )}
      </header>

      {group && round && (
        <div className="flex flex-col gap-1.5 border-b border-line bg-leaf-soft px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[16px] font-extrabold text-leaf-deep">{group.name}</span>
            <span className="rounded-full bg-leaf px-2.5 py-0.5 text-[11.5px] font-bold text-white">
              ล็อกวันส่งแล้ว
            </span>
            {group.addressMode === "fixed" && (
              <span className="rounded-full border border-line-strong bg-surface px-2.5 py-0.5 text-[11.5px] font-bold text-ink-2">
                ไม่ต้องกรอกที่อยู่
              </span>
            )}
          </div>
          <p className="text-[13.5px] text-ink-2">
            <b>วันส่ง</b> {thaiDate(round.deliveryDate)} · {round.timeWindow}
          </p>
          <p className="text-[13.5px] text-ink-2">
            <b>ปิดรับ</b> {thaiDateTime(round.cutoffAt)}
          </p>
          {group.addressMode === "fixed" && (
            <p className="text-[13.5px] text-ink-2">
              <b>จุดรับของ</b> {group.fixedAddress}
            </p>
          )}
        </div>
      )}

      {closedReason && (
        <p className="border-b border-line bg-warn-soft px-3 py-3 text-[14px] font-bold text-warn">
          {closedReason} — ดูของได้แต่ยังกดสั่งไม่ได้นะคะ
        </p>
      )}

      <div className="sticky top-0 z-20 border-b border-line bg-surface px-3 pb-2 pt-2.5">
        <label className="flex h-[46px] items-center gap-2 rounded-xl border border-line bg-surface-2 px-3">
          <span aria-hidden>🔍</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="search"
            placeholder="ค้นหาผัก เช่น ผักบุ้ง มะนาว"
            aria-label="ค้นหาสินค้า"
            className="h-full w-full bg-transparent outline-none placeholder:text-muted"
          />
        </label>
        {shownCats.length > 1 && (
          <div className="mt-2.5 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none]">
            {[{ id: "all", name: "ทั้งหมด" }, ...shownCats].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCat(c.id)}
                aria-pressed={cat === c.id}
                className={`min-h-[44px] flex-none whitespace-nowrap rounded-full border px-4 text-[14.5px] font-semibold ${
                  cat === c.id
                    ? "border-leaf bg-leaf text-white"
                    : "border-line-strong bg-surface text-ink-2"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 p-3">
        {visible.length === 0 && (
          <p className="py-10 text-center text-ink-3">ไม่เจอสินค้าที่ค้นหา ลองพิมพ์สั้นลงนะคะ</p>
        )}

        {visible.map((p) => {
          const u = unitOf(p);
          if (!u) return null;
          const key = `${p.id}|${u.id}`;
          const qty = cart[key] ?? 0;
          const price = priceOf(p.id, u.id);
          const buyable = p.isAvailable && !closedReason;
          // ทุกหน่วยของสินค้านี้ที่มีของอยู่ในตะกร้า ไม่ใช่เฉพาะหน่วยที่กำลังเลือก
          const inCartUnits = p.units.filter((uu) => (cart[`${p.id}|${uu.id}`] ?? 0) > 0);

          return (
            <article
              key={p.id}
              className={`flex gap-3 rounded-[14px] border bg-surface p-3 ${
                inCartUnits.length > 0
                  ? "border-leaf shadow-[inset_0_0_0_1px_var(--leaf)]"
                  : "border-line"
              } ${p.isAvailable ? "" : "opacity-60"}`}
            >
              <div
                className={`relative grid h-[92px] w-[92px] flex-none place-items-center rounded-[11px] bg-leaf-soft text-[42px] leading-none ${
                  p.isAvailable ? "" : "grayscale"
                }`}
              >
                <span aria-hidden>{p.emoji}</span>
                {!p.isAvailable && (
                  <span className="absolute inset-x-1.5 bottom-1.5 rounded-md bg-ink py-0.5 text-center text-[11.5px] font-bold text-surface">
                    ของหมด
                  </span>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div>
                  <h2 className="text-[18px] font-bold leading-tight">{p.name}</h2>
                  {p.note && <p className="text-[12.5px] text-ink-3">{p.note}</p>}
                </div>

                {p.units.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {p.units.map((uu) => (
                      <button
                        key={uu.id}
                        type="button"
                        disabled={!p.isAvailable}
                        aria-pressed={uu.id === u.id}
                        onClick={() => setPicked((prev) => ({ ...prev, [p.id]: uu.id }))}
                        className={`min-h-[42px] rounded-[10px] border px-2.5 py-1.5 text-left leading-tight disabled:opacity-50 ${
                          uu.id === u.id
                            ? "border-price bg-price-soft"
                            : "border-line-strong bg-surface"
                        }`}
                      >
                        <span className="block text-[12px] text-ink-2">{uu.label}</span>
                        <span className="num block text-[15px] font-bold text-price">
                          {num(priceOf(p.id, uu.id))} ฿
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-baseline gap-1.5">
                  <span className="num whitespace-nowrap text-[22px] font-extrabold text-price">
                    {num(price)} บาท
                  </span>
                  <span className="whitespace-nowrap text-[13.5px] font-semibold text-ink-3">
                    ต่อ{u.label}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!buyable || qty <= 0}
                    onClick={() => bump(p.id, u.id, -u.step)}
                    aria-label={`ลดจำนวน ${p.name}`}
                    className="h-[52px] flex-1 rounded-xl border border-line-strong bg-surface-2 text-2xl font-bold active:scale-95 disabled:opacity-35"
                  >
                    −
                  </button>
                  <span className="num w-16 text-center text-xl font-extrabold" aria-live="polite">
                    {qty > 0 ? num(qty) : "0"}
                  </span>
                  <button
                    type="button"
                    disabled={!buyable}
                    onClick={() => bump(p.id, u.id, u.step)}
                    aria-label={`เพิ่มจำนวน ${p.name}`}
                    className="h-[52px] flex-1 rounded-xl border border-leaf bg-leaf text-2xl font-bold text-white active:scale-95 disabled:opacity-35"
                  >
                    +
                  </button>
                </div>

                {inCartUnits.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {inCartUnits.map((cu) => {
                      const cuPrice = priceOf(p.id, cu.id);
                      const cuQty = cart[`${p.id}|${cu.id}`] ?? 0;
                      return (
                        <li
                          key={cu.id}
                          className="flex items-center gap-2 rounded-[9px] bg-leaf-soft px-2.5 py-1.5 text-sm font-semibold text-leaf-deep"
                        >
                          <span className="min-w-0 flex-1">
                            {num(cuQty)} {cu.label} × {num(cuPrice)} ฿
                          </span>
                          <span className="num flex-none">{num(cuQty * cuPrice)} บาท</span>
                          <button
                            type="button"
                            onClick={() => removeLine(p.id, cu.id)}
                            aria-label={`เอา ${p.name} ${cu.label} ออกจากตะกร้า`}
                            className="min-h-[36px] flex-none px-1 text-[13px] font-bold text-danger"
                          >
                            เอาออก
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </article>
          );
        })}

        {group?.allowOther && !closedReason && (
          <section className="flex flex-col gap-2.5 rounded-[14px] border-2 border-dashed border-line-strong bg-surface-2 p-3.5">
            <h2 className="text-[16px] font-bold">อยากได้อย่างอื่นที่ไม่มีในรายการ?</h2>
            <p className="text-[13px] leading-relaxed text-ink-3">{group.otherHint}</p>
            <textarea
              value={otherDraft}
              onChange={(e) => setOtherDraft(e.target.value)}
              rows={3}
              placeholder="พิมพ์ชื่อของกับจำนวนที่อยากได้"
              aria-label="พิมพ์สินค้าที่ไม่มีในรายการ"
              className="w-full rounded-[11px] border-[1.5px] border-line-strong bg-surface p-3 outline-none focus:border-leaf"
            />
            <button
              type="button"
              disabled={!otherDraft.trim()}
              onClick={() => {
                setOthers((prev) => [...prev, otherDraft.trim()]);
                setOtherDraft("");
              }}
              className="min-h-[48px] rounded-[11px] bg-leaf font-bold text-white disabled:bg-line-strong disabled:text-ink-3"
            >
              เพิ่มเข้าตะกร้า (รอร้านยืนยันราคา)
            </button>
            {others.map((t, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-[10px] bg-warn-soft px-2.5 py-2">
                <span className="flex-1 text-sm">
                  {t}
                  <span className="block text-xs font-bold text-warn">⏳ รอร้านยืนยันราคา</span>
                </span>
                <button
                  type="button"
                  onClick={() => setOthers((prev) => prev.filter((_, j) => j !== i))}
                  className="min-h-[40px] px-1 text-[13px] font-bold text-danger"
                  aria-label={`ลบรายการ ${t}`}
                >
                  ลบ
                </button>
              </div>
            ))}
          </section>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-[460px] items-center gap-3 border-t border-line bg-surface p-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] text-ink-3">
            {lines.length === 0 && others.length === 0
              ? "ยังไม่ได้เลือกสินค้า"
              : [
                  lines.length ? `${lines.length} รายการในตะกร้า` : "",
                  others.length ? `${others.length} รายการรอยืนยันราคา` : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
          </p>
          <p className="num text-2xl font-extrabold">{num(total)} บาท</p>
          {others.length > 0 && (
            <p className="text-xs font-semibold text-warn">ยังไม่รวมของที่รอร้านยืนยันราคา</p>
          )}
        </div>
        <button
          type="button"
          disabled={!canOrder || Boolean(closedReason)}
          onClick={() => setStep("checkout")}
          className="min-h-[54px] rounded-[13px] bg-leaf px-6 text-[17px] font-bold text-white disabled:bg-line-strong disabled:text-ink-3"
        >
          สั่งซื้อ
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13.5px] font-bold">
        {label}
        {required && <span className="text-price"> *</span>}
      </span>
      {children}
      {hint && <span className="text-[12.5px] text-ink-3">{hint}</span>}
    </label>
  );
}
