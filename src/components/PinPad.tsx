"use client";

import { useActionState, useEffect, useState } from "react";
import type { LoginState } from "@/app/admin/login/actions";

/**
 * แป้นกดรหัส 6 หลัก ปุ่มใหญ่พอกดด้วยนิ้วโป้งขณะยืนหน้าแผงผัก
 * กดครบ 6 หลักแล้วส่งให้เซิร์ฟเวอร์ตรวจเอง หน้าเว็บไม่รู้รหัสที่ถูกต้อง
 */
export function PinPad({
  action,
  next,
  hint,
}: {
  action: (prev: LoginState, formData: FormData) => Promise<LoginState>;
  next: string;
  hint: string;
}) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(action, {});
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);

  // กดผิดแล้วสั่นเตือน พร้อมล้างตัวเลขให้กดใหม่ได้เลย
  useEffect(() => {
    if (state.error) {
      setPin("");
      setShake(true);
      const t = setTimeout(() => setShake(false), 320);
      return () => clearTimeout(t);
    }
  }, [state.error]);

  function press(digit: string) {
    if (pending || pin.length >= 6) return;
    const next6 = pin + digit;
    setPin(next6);
    if (next6.length === 6) {
      const form = new FormData();
      form.set("pin", next6);
      form.set("next", next);
      formAction(form);
    }
  }

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "ลบ", "0", ""];

  return (
    <div
      className="mx-auto w-full max-w-[360px] rounded-[18px] border border-line bg-surface p-6 text-center"
      style={{
        boxShadow: "var(--shadow)",
        animation: shake ? "vg-shake .3s" : undefined,
      }}
    >
      <div className="text-[34px] leading-none" aria-hidden>
        🔒
      </div>
      <h1 className="mt-2.5 text-xl font-extrabold">ใส่รหัสของเจ้าของร้าน</h1>
      <p className="mt-0.5 text-[13.5px] text-ink-3">{hint}</p>

      <div className="my-5 flex justify-center gap-[11px]" role="img" aria-label={`ใส่รหัสแล้ว ${pin.length} จาก 6 หลัก`}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`h-[15px] w-[15px] rounded-full border-2 ${
              i < pin.length ? "border-leaf bg-leaf" : "border-line-strong"
            }`}
          />
        ))}
      </div>

      <p
        className={`min-h-[20px] text-[13px] ${state.error ? "font-bold text-danger" : "text-ink-3"}`}
        role="status"
        aria-live="polite"
      >
        {pending ? "กำลังตรวจรหัส…" : (state.error ?? "กดตัวเลข 6 หลักแล้วระบบจะเข้าให้เอง")}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {keys.map((k, i) =>
          k === "" ? (
            <div key={i} />
          ) : (
            <button
              key={i}
              type="button"
              disabled={pending}
              onClick={() => (k === "ลบ" ? setPin(pin.slice(0, -1)) : press(k))}
              className={
                k === "ลบ"
                  ? "min-h-[58px] rounded-[13px] text-[15px] font-bold text-ink-2 disabled:opacity-50"
                  : "num min-h-[58px] rounded-[13px] border border-line-strong bg-surface-2 text-[23px] font-bold active:scale-95 disabled:opacity-50"
              }
            >
              {k}
            </button>
          ),
        )}
      </div>

      <style>{`@keyframes vg-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-7px)}75%{transform:translateX(7px)}}`}</style>
    </div>
  );
}
