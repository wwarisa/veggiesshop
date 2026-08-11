"use server";

import { redirect } from "next/navigation";
import { attemptLogin, startSessionFor } from "@/lib/auth";
import { destroySession } from "@/lib/session";
import { isValidPin } from "@/lib/hash";
import { runFirstSetup } from "@/lib/setup";

export interface LoginState {
  error?: string;
}

/** ตรวจรหัสที่เจ้าของกดเข้ามา ตรวจฝั่งเซิร์ฟเวอร์ทั้งหมด */
export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const pin = String(formData.get("pin") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!isValidPin(pin)) {
    return { error: "ใส่รหัสให้ครบ 6 หลัก" };
  }

  const result = await attemptLogin(pin);

  if (!result.ok) {
    if (result.reason === "locked") {
      return {
        error: `กดผิดหลายครั้งเกินไป ระบบล็อกไว้ ลองใหม่อีก ${result.minutesLeft} นาที`,
      };
    }
    if (result.reason === "nouser") {
      return { error: "ยังไม่ได้ตั้งค่าระบบ กดที่ปุ่มเริ่มต้นใช้งานด้านล่าง" };
    }
    return { error: `รหัสไม่ถูกต้อง ลองใหม่ได้อีก ${result.triesLeft} ครั้ง` };
  }

  await startSessionFor(result.user);
  // กันคนแนบลิงก์ปลายทางไปเว็บอื่น อนุญาตเฉพาะเส้นทางภายในหน้าจัดการ
  redirect(next.startsWith("/admin") ? next : "/admin");
}

/** ตั้งค่าครั้งแรก — เจ้าของตั้งรหัสของตัวเอง */
export async function setupAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const pin = String(formData.get("pin") ?? "");
  const confirm = String(formData.get("confirmPin") ?? "");
  const withSample = formData.get("withSample") === "on";

  const result = await runFirstSetup(pin, confirm, withSample);
  if (!result.ok) return { error: result.error };

  const login = await attemptLogin(pin);
  if (login.ok) await startSessionFor(login.user);
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}
