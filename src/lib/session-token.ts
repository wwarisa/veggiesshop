import { SignJWT, jwtVerify } from "jose";

/**
 * เซ็นและตรวจบัตรผ่าน (session) — ไฟล์นี้ห้ามแตะฐานข้อมูลหรือระบบไฟล์
 * เพราะ middleware ทำงานบน Edge Runtime ซึ่งใช้ของพวกนั้นไม่ได้
 */

export const SESSION_COOKIE = "veggies_session";
export const SESSION_DAYS = 30;

export interface Session {
  userId: string;
  name: string;
  role: "owner" | "staff";
}

/** ตั้งค่ากุญแจครบพอที่จะเปิดใช้งานจริงหรือยัง */
export function hasSessionSecret(): boolean {
  return Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32);
}

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    // ในโหมดลองใช้ยอมให้ใช้ค่าสำรอง แต่ห้ามเด็ดขาดตอนขึ้นออนไลน์จริง
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ยังไม่ได้ตั้งค่า SESSION_SECRET — ต้องใส่ก่อนเปิดใช้งานจริง ดูวิธีในไฟล์ .env.example",
      );
    }
    return new TextEncoder().encode("โหมดลองใช้เท่านั้น-ห้ามใช้ตอนเปิดจริง-0123456789");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: Session): Promise<string> {
  return new SignJWT({ name: payload.name, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return {
      userId: String(payload.sub),
      name: String(payload.name ?? "เจ้าของร้าน"),
      role: (payload.role as "owner" | "staff") ?? "owner",
    };
  } catch {
    return null;
  }
}
