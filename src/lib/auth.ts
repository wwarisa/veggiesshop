import "server-only";
import { COL, db } from "./db";
import { hashPin, verifyPin } from "./hash";
import { createSession } from "./session";
import type { AdminUser } from "./types";

/**
 * ตรวจรหัสของเจ้าของร้าน
 *
 * - รหัส 6 หลัก เก็บเป็น hash เท่านั้น ไม่เก็บตัวเลขจริงไว้ที่ไหนเลย
 * - ตรวจที่เซิร์ฟเวอร์เสมอ หน้าเว็บโกงไม่ได้
 * - กดผิดครบ 5 ครั้ง ล็อก 15 นาที นับที่เซิร์ฟเวอร์
 */

export const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

/** ออกบัตรผ่านให้เจ้าของหลังใส่รหัสถูก */
export async function startSessionFor(user: AdminUser): Promise<void> {
  await createSession({ userId: user.id, name: user.name, role: user.role });
}

export type LoginResult =
  | { ok: true; user: AdminUser }
  | { ok: false; reason: "wrong"; triesLeft: number }
  | { ok: false; reason: "locked"; minutesLeft: number }
  | { ok: false; reason: "nouser" };

/** ตรวจรหัสและจัดการการล็อกเมื่อกดผิดหลายครั้ง */
export async function attemptLogin(pin: string): Promise<LoginResult> {
  const store = db();
  const users = await store.list<AdminUser>(COL.adminUsers, {
    where: [["isActive", "==", true]],
  });
  if (users.length === 0) return { ok: false, reason: "nouser" };

  const now = Date.now();

  // ถ้าทุกบัญชีถูกล็อกอยู่ ให้บอกเวลาที่เหลือของอันที่จะปลดเร็วที่สุด
  const unlocked = users.filter(
    (u) => !u.lockedUntil || new Date(u.lockedUntil).getTime() <= now,
  );
  if (unlocked.length === 0) {
    const soonest = Math.min(
      ...users.map((u) => new Date(u.lockedUntil as string).getTime()),
    );
    return {
      ok: false,
      reason: "locked",
      minutesLeft: Math.max(1, Math.ceil((soonest - now) / 60_000)),
    };
  }

  for (const user of unlocked) {
    if (await verifyPin(pin, user.pinHash)) {
      await store.update(COL.adminUsers, user.id, { failedCount: 0, lockedUntil: null });
      return { ok: true, user };
    }
  }

  // รหัสผิด — นับครั้งที่ผิดของทุกบัญชีที่ยังไม่ถูกล็อก
  let triesLeft = MAX_FAILED;
  for (const user of unlocked) {
    const failed = (user.failedCount ?? 0) + 1;
    const shouldLock = failed >= MAX_FAILED;
    await store.update(COL.adminUsers, user.id, {
      failedCount: shouldLock ? 0 : failed,
      lockedUntil: shouldLock
        ? new Date(now + LOCK_MINUTES * 60_000).toISOString()
        : null,
    });
    if (shouldLock) {
      return { ok: false, reason: "locked", minutesLeft: LOCK_MINUTES };
    }
    triesLeft = Math.min(triesLeft, MAX_FAILED - failed);
  }

  return { ok: false, reason: "wrong", triesLeft };
}

/** เปลี่ยนรหัสของเจ้าของร้าน */
export async function changePin(
  userId: string,
  currentPin: string,
  newPin: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!/^\d{6}$/.test(newPin)) {
    return { ok: false, error: "รหัสใหม่ต้องเป็นตัวเลข 6 หลัก" };
  }
  const store = db();
  const user = await store.get<AdminUser>(COL.adminUsers, userId);
  if (!user) return { ok: false, error: "ไม่พบบัญชีนี้" };
  if (!(await verifyPin(currentPin, user.pinHash))) {
    return { ok: false, error: "รหัสเดิมไม่ถูกต้อง" };
  }
  await store.update(COL.adminUsers, userId, { pinHash: await hashPin(newPin) });
  return { ok: true };
}
