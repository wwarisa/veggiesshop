import bcrypt from "bcryptjs";

/** เข้ารหัสและตรวจรหัสผ่าน แยกไว้ไฟล์เดียวไม่ผูกกับ Next */

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}
