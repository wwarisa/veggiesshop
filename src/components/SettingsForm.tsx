"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  changePinAction,
  removeZoneAction,
  saveSettingsAction,
  saveZoneAction,
  type ActionState,
} from "@/app/admin/actions";
import { btnPlain, btnPrimary, Field, inputClass } from "@/components/ui";
import type { ShopSettings, Zone } from "@/lib/types";

export function SettingsForm({ shop, zones }: { shop: ShopSettings; zones: Zone[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveSettingsAction,
    {},
  );
  const [zoneState, zoneAction] = useActionState<ActionState, FormData>(saveZoneAction, {});
  const [pinState, pinAction] = useActionState<ActionState, FormData>(changePinAction, {});
  const [removing, startRemoving] = useTransition();

  return (
    <div className="flex flex-col gap-5">
      <form action={formAction} className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-3.5">
        <h2 className="text-[17px] font-extrabold">ข้อมูลร้าน</h2>

        <Field label="ชื่อร้าน" hint="ชื่อนี้จะขึ้นทั้งหน้าเว็บและบนใบพิมพ์">
          <input name="shopName" defaultValue={shop.shopName} className={inputClass} />
        </Field>

        <Field label="เบอร์ติดต่อร้าน">
          <input name="phone" defaultValue={shop.phone} className={`num ${inputClass}`} />
        </Field>

        <Field label="ข้อความประกาศหน้าเว็บ" hint="ขึ้นบนหัวเว็บให้ลูกค้าเห็นทุกคน">
          <textarea
            name="announcement"
            defaultValue={shop.announcement}
            rows={2}
            className="w-full rounded-[11px] border-[1.5px] border-line-strong bg-surface p-3 outline-none focus:border-leaf"
          />
        </Field>

        <div className="flex flex-wrap gap-2.5">
          <div className="min-w-[140px] flex-1">
            <Field label="เวลาปิดรับออเดอร์ประจำวัน">
              <input type="time" name="cutoffTime" defaultValue={shop.cutoffTime} className={inputClass} />
            </Field>
          </div>
          <div className="min-w-[140px] flex-1">
            <Field label="ค่าส่ง (บาท)" hint="ใส่ 0 ถ้าส่งฟรี">
              <input
                name="deliveryFee"
                defaultValue={shop.deliveryFee}
                inputMode="decimal"
                className={`num ${inputClass}`}
              />
            </Field>
          </div>
        </div>

        <Field label="สินค้าที่ปิดขาย ให้แสดงยังไง">
          <select name="soldOutBehavior" defaultValue={shop.soldOutBehavior} className={inputClass}>
            <option value="gray">แสดงเป็นสีเทาพร้อมป้ายของหมด</option>
            <option value="hide">ซ่อนไปเลย ไม่ต้องแสดง</option>
          </select>
        </Field>

        <label className="flex items-start gap-2.5 rounded-[11px] bg-surface-2 p-3 text-[14px]">
          <input
            type="checkbox"
            name="isOpen"
            defaultChecked={shop.isOpen}
            className="mt-1 h-5 w-5 accent-[var(--leaf)]"
          />
          <span>
            เปิดรับออเดอร์อยู่
            <span className="block text-[12.5px] text-ink-3">
              ติ๊กออกเมื่ออยากปิดร้านชั่วคราว ลูกค้าจะยังดูของได้แต่กดสั่งไม่ได้
            </span>
          </span>
        </label>

        <Field label="ข้อความตอนปิดร้าน">
          <input name="closedMessage" defaultValue={shop.closedMessage} className={inputClass} />
        </Field>

        {state.error && (
          <p role="alert" className="text-[14px] font-bold text-danger">
            {state.error}
          </p>
        )}
        {state.message && (
          <p role="status" className="rounded-[10px] bg-leaf-soft px-3 py-2.5 text-[14px] font-bold text-leaf-deep">
            {state.message}
          </p>
        )}

        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "กำลังบันทึก…" : "บันทึกการตั้งค่า"}
        </button>
      </form>

      <section className="rounded-[14px] border border-line bg-surface p-3.5">
        <h2 className="text-[17px] font-extrabold">หมู่บ้าน / โซนจัดส่ง</h2>
        <ul className="mt-2.5 flex flex-col gap-2">
          {zones.map((z) => (
            <li key={z.id} className="flex items-center gap-2.5 rounded-[11px] bg-surface-2 p-2.5">
              <span className="flex-1 text-[14.5px] font-semibold">{z.name}</span>
              <button
                type="button"
                disabled={removing}
                onClick={() =>
                  startRemoving(async () => {
                    await removeZoneAction(z.id);
                    router.refresh();
                  })
                }
                className="min-h-[40px] px-2 text-[13px] font-bold text-danger"
              >
                เอาออก
              </button>
            </li>
          ))}
          {zones.length === 0 && <li className="text-[14px] text-ink-3">ยังไม่มีโซน</li>}
        </ul>

        <form action={zoneAction} className="mt-3 flex flex-wrap gap-2">
          <input
            name="name"
            placeholder="ชื่อหมู่บ้านหรือโซนใหม่"
            className={`${inputClass} min-w-[180px] flex-1`}
            aria-label="ชื่อโซนใหม่"
          />
          <button type="submit" className={btnPlain}>
            เพิ่มโซน
          </button>
        </form>
        {zoneState.error && (
          <p role="alert" className="mt-2 text-[14px] font-bold text-danger">
            {zoneState.error}
          </p>
        )}
      </section>

      <form action={pinAction} className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-3.5">
        <h2 className="text-[17px] font-extrabold">เปลี่ยนรหัสเข้าหน้าจัดการ</h2>
        <Field label="รหัสเดิม">
          <input
            name="currentPin"
            type="password"
            inputMode="numeric"
            maxLength={6}
            className={`num ${inputClass} text-center tracking-[.3em]`}
          />
        </Field>
        <Field label="รหัสใหม่ 6 หลัก">
          <input
            name="newPin"
            type="password"
            inputMode="numeric"
            maxLength={6}
            className={`num ${inputClass} text-center tracking-[.3em]`}
          />
        </Field>
        {pinState.error && (
          <p role="alert" className="text-[14px] font-bold text-danger">
            {pinState.error}
          </p>
        )}
        {pinState.message && (
          <p role="status" className="rounded-[10px] bg-leaf-soft px-3 py-2.5 text-[14px] font-bold text-leaf-deep">
            {pinState.message}
          </p>
        )}
        <button type="submit" className={btnPrimary}>
          เปลี่ยนรหัส
        </button>
      </form>
    </div>
  );
}
