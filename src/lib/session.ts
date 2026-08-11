import "server-only";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_DAYS,
  signSession,
  verifySessionToken,
  type Session,
} from "./session-token";

/** จัดการ cookie ของบัตรผ่าน — HttpOnly อ่านจาก JavaScript ฝั่งหน้าเว็บไม่ได้ */

export async function createSession(session: Session): Promise<void> {
  const token = await signSession(session);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function readSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token) : null;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export { SESSION_COOKIE, verifySessionToken };
export type { Session };
