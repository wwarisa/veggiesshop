"use client";

import { useActionState } from "react";
import { setupAction, type LoginState } from "./actions";

/**
 * หน้าตั้งค่าครั้งแรก — ขึ้นเฉพาะตอนที่ยังไม่มีบัญชีเจ้าของร้าน
 * ระบบไม่มีรหัสเริ่มต้นติดมาให้ เจ้าของตั้งรหัสของตัวเองที่นี่
 */
export function SetupForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(setupAction, {});

  return (
    <form
      action={formAction}
      className="mx-auto w-full max-w-[420px] rounded-[18px] border border-line bg-surface p-6"
      style={{ boxShadow: "var(--shadow)" }}
    >
      <div className="text-center text-[34px] leading-none" aria-hidden>
        🌱
      </div>
      <h1 className="mt-2.5 text-center text-xl font-extrabold">เริ่มต้นใช้งานครั้งแรก</h1>
      <p className="mt-1 text-center text-[13.5px] text-ink-3">
        ตั้งรหัส 6 หลักสำหรับเข้าหน้าจัดการ จำให้ดีนะคะ ใช้ทุกครั้งที่เข้ามาแก้ของ
      </p>

      <div className="mt-5 flex flex-col gap-1.5">
        <label htmlFor="pin" className="text-[13.5px] font-bold">
          ตั้งรหัส 6 หลัก
        </label>
        <input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          maxLength={6}
          required
          placeholder="••••••"
          className="num min-h-[52px] rounded-[11px] border-[1.5px] border-line-strong bg-surface px-3 text-center text-[22px] tracking-[.3em] outline-none focus:border-leaf"
        />
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        <label htmlFor="confirmPin" className="text-[13.5px] font-bold">
          ใส่รหัสเดิมอีกครั้ง
        </label>
        <input
          id="confirmPin"
          name="confirmPin"
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          maxLength={6}
          required
          placeholder="••••••"
          className="num min-h-[52px] rounded-[11px] border-[1.5px] border-line-strong bg-surface px-3 text-center text-[22px] tracking-[.3em] outline-none focus:border-leaf"
        />
      </div>

      <label className="mt-4 flex items-start gap-2.5 rounded-[11px] bg-surface-2 p-3 text-[14px]">
        <input
          type="checkbox"
          name="withSample"
          defaultChecked
          className="mt-1 h-5 w-5 accent-[var(--leaf)]"
        />
        <span>
          ใส่ผักตัวอย่างให้ด้วย
          <span className="block text-[12.5px] text-ink-3">
            ผักไทย 20 อย่างพร้อมราคา กลุ่มลูกค้าและรอบส่งตัวอย่าง ลบทิ้งทีหลังได้
          </span>
        </span>
      </label>

      {state.error && (
        <p className="mt-3 text-[13.5px] font-bold text-danger" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 min-h-[54px] w-full rounded-[13px] bg-leaf text-[17px] font-bold text-white disabled:opacity-60"
      >
        {pending ? "กำลังตั้งค่า…" : "เริ่มใช้งาน"}
      </button>

      <p className="mt-3 text-[12.5px] text-ink-3">
        อย่าใช้เลขที่เดาง่าย เช่น 111111 หรือ 123456 เพราะใครก็ตามที่รู้รหัสนี้จะแก้ราคาและดูออเดอร์ได้ทั้งหมด
      </p>
    </form>
  );
}
