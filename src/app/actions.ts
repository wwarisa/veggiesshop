"use server";

import { lookupCustomer, placeOrder } from "@/lib/orders";
import type { CartLine } from "@/lib/pricing";

/** ท่าที่หน้าเว็บฝั่งลูกค้าเรียกใช้ได้ — ทุกอย่างตรวจซ้ำที่เซิร์ฟเวอร์ */

export interface PlaceOrderPayload {
  name: string;
  phone: string;
  address: string;
  note: string;
  roundId: string | null;
  groupId: string | null;
  lines: CartLine[];
  otherTexts: string[];
  idempotencyKey: string;
}

export async function placeOrderAction(payload: PlaceOrderPayload) {
  const result = await placeOrder(payload);
  if (!result.ok) return { ok: false as const, error: result.error };
  return {
    ok: true as const,
    orderNo: result.order.orderNo,
    total: result.order.total,
    reused: result.reused,
  };
}

/** ลูกค้าประจำกรอกเบอร์แล้วดึงชื่อกับที่อยู่เดิมขึ้นมาให้ */
export async function lookupCustomerAction(phone: string) {
  const found = await lookupCustomer(phone);
  if (!found) return null;
  return { name: found.name, address: found.address, orderCount: found.orderCount };
}
