import { createLocalStore } from "./local";
import { createFirestoreStore, hasFirestoreConfig } from "./firestore";
import type { Store } from "./store";

/**
 * เลือกที่เก็บข้อมูลอัตโนมัติ
 *
 *   ใส่ค่า Firestore ครบใน .env.local  → ใช้ Firestore ของจริง
 *   ยังไม่ได้ใส่                         → เก็บเป็นไฟล์ในเครื่อง (โหมดลองใช้)
 *
 * ทำแบบนี้เพื่อให้เปิดเว็บลองเล่นได้ทันทีโดยยังไม่ต้องสมัครอะไรเลย
 * แล้วค่อยใส่ค่าตอนพร้อมเปิดจริง โดยไม่ต้องแก้โค้ดสักบรรทัด
 */

let store: Store | null = null;

export function db(): Store {
  if (store) return store;
  store = hasFirestoreConfig() ? createFirestoreStore() : createLocalStore();
  return store;
}

export { COL } from "./store";
export type { Store, ListOptions, Where } from "./store";
