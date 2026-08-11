import { COL, db } from "./db";
import { hashPin, isValidPin } from "./hash";
import { seedSampleData } from "./seed";
import type { AdminUser } from "./types";

/**
 * ตั้งค่าครั้งแรก
 *
 * ระบบไม่มีรหัสเริ่มต้นติดมาให้เลย เจ้าของร้านเป็นคนตั้งรหัสเองตอนเปิดใช้ครั้งแรก
 * ทำแบบนี้เพราะรหัสเริ่มต้นที่ทุกคนรู้ คือช่องโหว่ที่ใหญ่ที่สุดของระบบเล็กๆ แบบนี้
 */

export async function needsSetup(): Promise<boolean> {
  const users = await db().list<AdminUser>(COL.adminUsers);
  return users.length === 0;
}

export type SetupResult = { ok: true } | { ok: false; error: string };

export async function runFirstSetup(
  pin: string,
  confirmPin: string,
  withSampleData: boolean,
): Promise<SetupResult> {
  if (!(await needsSetup())) {
    return { ok: false, error: "ระบบตั้งค่าไว้แล้ว ถ้าลืมรหัสให้ดูวิธีกู้คืนในคู่มือ" };
  }
  if (!isValidPin(pin)) {
    return { ok: false, error: "รหัสต้องเป็นตัวเลข 6 หลัก" };
  }
  if (pin !== confirmPin) {
    return { ok: false, error: "รหัสสองช่องไม่ตรงกัน ลองใส่ใหม่อีกครั้ง" };
  }
  if (/^(\d)\1{5}$/.test(pin) || pin === "123456" || pin === "654321") {
    return { ok: false, error: "รหัสนี้เดาง่ายเกินไป ลองเลือกเลขอื่นที่คนอื่นเดาไม่ถูก" };
  }

  const owner: AdminUser = {
    id: "owner",
    name: "เจ้าของร้าน",
    pinHash: await hashPin(pin),
    role: "owner",
    isActive: true,
    failedCount: 0,
    lockedUntil: null,
    createdAt: new Date().toISOString(),
  };
  await db().set(COL.adminUsers, owner);

  if (withSampleData) await seedSampleData();

  return { ok: true };
}
