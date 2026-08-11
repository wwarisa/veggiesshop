"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { COL, db } from "@/lib/db";
import { money, parseAmount, todayISO } from "@/lib/format";
import { readSession } from "@/lib/session";
import {
  adjustItemQty,
  confirmCustomItem,
  recordPayment,
  refreshCustomerOutstanding,
  setDeliveryStatus,
} from "@/lib/orders";
import { changePin } from "@/lib/auth";
import type {
  DeliveryStatus,
  Group,
  PaymentMethod,
  PriceHistory,
  Product,
  ProductUnit,
  Round,
  RoundStatus,
  ShopSettings,
  Zone,
} from "@/lib/types";

/**
 * ทุก action ในไฟล์นี้ตรวจสิทธิ์ด้วยตัวเองอีกชั้น
 * ไม่พึ่ง middleware อย่างเดียว เพราะ action ถูกเรียกตรงได้
 */
async function requireOwner() {
  const session = await readSession();
  if (!session) redirect("/admin/login");
  return session;
}

export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
}

/* ── แก้ราคาประจำวัน ─────────────────────────────────────────────── */

/**
 * บันทึกราคาทั้งหน้าในครั้งเดียว
 * ค่าที่ส่งมาเป็นคู่ "สินค้า|หน่วย" → ราคาใหม่ ถ้าเป็นค่าว่างในโหมดกลุ่มแปลว่ากลับไปใช้ราคากลาง
 */
export async function savePricesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireOwner();
  const scope = String(formData.get("scope") ?? "base");
  const store = db();
  const batchId = `b-${Date.now()}`;
  const nowISO = new Date().toISOString();

  const products = await store.list<Product>(COL.products);
  const byId = new Map(products.map((p) => [p.id, p]));
  const group = scope === "base" ? null : await store.get<Group>(COL.groups, scope);
  if (scope !== "base" && !group) return { error: "ไม่พบกลุ่มนี้" };

  let changed = 0;
  const history: PriceHistory[] = [];
  const touchedProducts = new Map<string, Product>();
  const groupPrices = { ...(group?.prices ?? {}) };

  for (const [rawKey, rawValue] of formData.entries()) {
    if (!rawKey.startsWith("price:")) continue;
    const key = rawKey.slice("price:".length);
    const [productId, unitId] = key.split("|");
    const product = touchedProducts.get(productId) ?? byId.get(productId);
    if (!product) continue;
    const unit = product.units.find((u) => u.id === unitId);
    if (!unit) continue;

    const text = String(rawValue).trim();
    const useBase = formData.get(`base:${key}`) === "1";

    if (scope === "base") {
      const value = parseAmount(text);
      if (value === null || value < 0 || value === unit.price) continue;
      const updated: Product = {
        ...product,
        units: product.units.map((u) =>
          u.id === unitId ? { ...u, prevPrice: u.price, price: money(value) } : u,
        ),
        updatedAt: nowISO,
      };
      touchedProducts.set(productId, updated);
      history.push({
        id: `${batchId}-${key}`,
        productId,
        productName: product.name,
        unitId,
        unitLabel: unit.label,
        groupId: null,
        oldPrice: unit.price,
        newPrice: money(value),
        changedBy: session.name,
        changedAt: nowISO,
        batchId,
      });
      changed += 1;
    } else {
      const existing = groupPrices[key];
      if (useBase) {
        if (existing === undefined) continue;
        delete groupPrices[key];
        history.push({
          id: `${batchId}-${key}`,
          productId,
          productName: product.name,
          unitId,
          unitLabel: unit.label,
          groupId: scope,
          oldPrice: existing,
          newPrice: null,
          changedBy: session.name,
          changedAt: nowISO,
          batchId,
        });
        changed += 1;
        continue;
      }
      const value = parseAmount(text);
      if (value === null || value < 0 || value === existing) continue;
      groupPrices[key] = money(value);
      history.push({
        id: `${batchId}-${key}`,
        productId,
        productName: product.name,
        unitId,
        unitLabel: unit.label,
        groupId: scope,
        oldPrice: existing ?? unit.price,
        newPrice: money(value),
        changedBy: session.name,
        changedAt: nowISO,
        batchId,
      });
      changed += 1;
    }
  }

  for (const p of touchedProducts.values()) await store.set(COL.products, p);
  if (group) await store.set(COL.groups, { ...group, prices: groupPrices });
  for (const h of history) await store.set(COL.priceHistory, h);

  revalidatePath("/admin/prices");
  revalidatePath("/");
  return changed === 0
    ? { ok: true, message: "ไม่มีอะไรเปลี่ยน ราคายังเหมือนเดิม" }
    : { ok: true, message: `บันทึกแล้ว ${changed} รายการ ราคาใหม่ขึ้นหน้าเว็บลูกค้าเรียบร้อย` };
}

/** เปิด/ปิดการขายรายสินค้า กดปุ่มเดียวเมื่อของหมด */
export async function setProductAvailabilityAction(
  productId: string,
  isAvailable: boolean,
): Promise<void> {
  await requireOwner();
  const store = db();
  const product = await store.get<Product>(COL.products, productId);
  if (!product) return;
  await store.update(COL.products, productId, {
    isAvailable,
    updatedAt: new Date().toISOString(),
  });
  revalidatePath("/admin/prices");
  revalidatePath("/admin/products");
  revalidatePath("/");
}

/* ── จัดการสินค้า ────────────────────────────────────────────────── */

function parseUnits(formData: FormData): ProductUnit[] {
  const units: ProductUnit[] = [];
  for (let i = 1; i <= 3; i += 1) {
    const label = String(formData.get(`unitLabel${i}`) ?? "").trim();
    const priceText = String(formData.get(`unitPrice${i}`) ?? "").trim();
    if (!label) continue;
    const price = parseAmount(priceText);
    if (price === null || price < 0) continue;
    const type = String(formData.get(`unitType${i}`) ?? "piece") as ProductUnit["unitType"];
    units.push({
      id: `u${units.length + 1}`,
      label,
      unitType: type,
      price: money(price),
      prevPrice: money(price),
      step: type === "weight" ? 0.5 : 1,
      isDefault: units.length === 0,
      isAvailable: true,
      allowWeightAdjust: type === "weight",
    });
  }
  return units;
}

export async function saveProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireOwner();
  const store = db();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "🥬").trim() || "🥬";
  const thumbData = String(formData.get("thumbData") ?? "");

  if (name.length < 2) return { error: "ใส่ชื่อสินค้าด้วยนะคะ" };
  const units = parseUnits(formData);
  if (units.length === 0) return { error: "ต้องมีหน่วยขายอย่างน้อย 1 หน่วย พร้อมราคา" };

  const nowISO = new Date().toISOString();

  if (id) {
    const existing = await store.get<Product>(COL.products, id);
    if (!existing) return { error: "ไม่พบสินค้านี้" };
    // เก็บสถานะเดิมของหน่วยที่ชื่อตรงกันไว้ จะได้ไม่รีเซ็ตการเปิด-ปิดขายรายหน่วย
    const merged = units.map((u) => {
      const old = existing.units.find((o) => o.label === u.label);
      return old ? { ...u, id: old.id, prevPrice: old.price, isAvailable: old.isAvailable } : u;
    });
    await store.set<Product>(COL.products, {
      ...existing,
      name,
      categoryId,
      note,
      emoji,
      thumbData: thumbData || existing.thumbData,
      units: merged,
      searchTerms: [name, ...existing.searchTerms.filter((t) => t !== existing.name)],
      updatedAt: nowISO,
    });
  } else {
    const all = await store.list<Product>(COL.products);
    const newId = `p-${Date.now().toString(36)}`;
    await store.set<Product>(COL.products, {
      id: newId,
      name,
      categoryId,
      note,
      emoji,
      thumbData,
      sortOrder: all.length + 1,
      isAvailable: true,
      isDeleted: false,
      searchTerms: [name],
      units,
      createdAt: nowISO,
      updatedAt: nowISO,
    });
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin/prices");
  revalidatePath("/");
  return { ok: true, message: id ? `แก้ไข ${name} เรียบร้อย` : `เพิ่ม ${name} แล้ว` };
}

/**
 * ลบสินค้า — ทำเครื่องหมายว่าลบ ไม่ได้ลบทิ้งจริง
 * ออเดอร์เก่ายังเก็บชื่อกับราคาไว้ครบ รายงานย้อนหลังจึงไม่เพี้ยน
 */
export async function deleteProductAction(productId: string): Promise<void> {
  await requireOwner();
  const store = db();
  const product = await store.get<Product>(COL.products, productId);
  if (!product) return;

  await store.update(COL.products, productId, {
    isDeleted: true,
    isAvailable: false,
    updatedAt: new Date().toISOString(),
  });

  // เอาออกจากทุกกลุ่มที่ขายอยู่ พร้อมล้างราคาเฉพาะกลุ่มของสินค้านั้น
  const groups = await store.list<Group>(COL.groups);
  for (const g of groups) {
    if (!g.productIds.includes(productId)) continue;
    const prices = { ...g.prices };
    for (const key of Object.keys(prices)) {
      if (key.split("|")[0] === productId) delete prices[key];
    }
    await store.set<Group>(COL.groups, {
      ...g,
      productIds: g.productIds.filter((x) => x !== productId),
      prices,
    });
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin/prices");
  revalidatePath("/admin/groups");
  revalidatePath("/");
}

/* ── กลุ่มและลิงก์ ───────────────────────────────────────────────── */

export async function saveGroupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireOwner();
  const store = db();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "ใส่ชื่อกลุ่มด้วยนะคะ" };

  const productIds = formData.getAll("productIds").map(String);
  const addressMode = formData.get("addressMode") === "fixed" ? "fixed" : "ask";
  const fixedAddress = String(formData.get("fixedAddress") ?? "").trim();
  if (addressMode === "fixed" && fixedAddress.length < 5) {
    return { error: "เลือกส่งจุดเดียวกันแล้ว ต้องใส่จุดรับของด้วย" };
  }

  const existing = id ? await store.get<Group>(COL.groups, id) : null;
  const groupId = id || `g-${Date.now().toString(36)}`;
  const all = await store.list<Group>(COL.groups);

  await store.set<Group>(COL.groups, {
    id: groupId,
    name,
    productIds,
    prices: existing?.prices ?? {},
    addressMode,
    fixedAddress,
    allowOther: formData.get("allowOther") === "on",
    otherHint:
      String(formData.get("otherHint") ?? "").trim() ||
      "อยากได้อย่างอื่นพิมพ์บอกได้ ทางร้านจะเช็กราคาแล้วแจ้งกลับก่อนจัดของ",
    zoneId: String(formData.get("zoneId") ?? "") || null,
    isActive: true,
    sortOrder: existing?.sortOrder ?? all.length + 1,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  });

  revalidatePath("/admin/groups");
  return { ok: true, message: `บันทึกกลุ่ม ${name} แล้ว` };
}

function slugify(text: string, fallback: string): string {
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || fallback;
}

export async function saveRoundAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireOwner();
  const store = db();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const deliveryDate = String(formData.get("deliveryDate") ?? "").trim();
  const timeWindow = String(formData.get("timeWindow") ?? "").trim();
  const cutoffLocal = String(formData.get("cutoffAt") ?? "").trim();
  const groupId = String(formData.get("groupId") ?? "") || null;

  if (name.length < 2) return { error: "ใส่ชื่อรอบด้วยนะคะ เช่น รอบเย็นหมู่บ้าน A" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)) return { error: "เลือกวันที่ส่งด้วยนะคะ" };
  if (!cutoffLocal) return { error: "ใส่เวลาปิดรับออเดอร์ด้วยนะคะ" };

  const cutoffAt = new Date(cutoffLocal).toISOString();
  const existing = id ? await store.get<Round>(COL.rounds, id) : null;

  const wanted =
    String(formData.get("slug") ?? "").trim() ||
    slugify(name, `rob-${deliveryDate.slice(5).replace("-", "")}`);
  // กันลิงก์ซ้ำกัน เพราะลิงก์ซ้ำจะพาไปคนละรอบ
  const others = (await store.list<Round>(COL.rounds)).filter((r) => r.id !== id);
  let slug = wanted;
  let n = 2;
  while (others.some((r) => r.slug === slug)) {
    slug = `${wanted}-${n}`;
    n += 1;
  }

  const group = groupId ? await store.get<Group>(COL.groups, groupId) : null;
  const roundId = id || `r-${Date.now().toString(36)}`;

  await store.set<Round>(COL.rounds, {
    id: roundId,
    slug,
    name,
    groupId,
    zoneId: group?.zoneId ?? null,
    deliveryDate,
    timeWindow,
    cutoffAt,
    status: (String(formData.get("status") ?? "open") as RoundStatus) || "open",
    isPublic: formData.get("isPublic") === "on",
    maxOrders: Number(formData.get("maxOrders")) || null,
    note: String(formData.get("note") ?? "").trim(),
    summary: existing?.summary ?? null,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  });

  revalidatePath("/admin/rounds");
  revalidatePath("/");
  return { ok: true, message: `บันทึกรอบ ${name} แล้ว · ลิงก์คือ /r/${slug}` };
}

export async function setRoundStatusAction(roundId: string, status: RoundStatus): Promise<void> {
  await requireOwner();
  await db().update(COL.rounds, roundId, { status });
  revalidatePath("/admin/rounds");
  revalidatePath("/");
}

/** ปิดรอบแล้วสรุปยอด ส่งสำเร็จกี่ราย เก็บเงินได้เท่าไหร่ ค้างเท่าไหร่ */
export async function closeRoundAction(roundId: string): Promise<void> {
  await requireOwner();
  const store = db();
  const round = await store.get<Round>(COL.rounds, roundId);
  if (!round) return;
  const orders = await store.list<{ [k: string]: unknown }>(COL.orders, {
    where: [["roundId", "==", roundId]],
  });

  let delivered = 0;
  let failed = 0;
  let cash = 0;
  let transfer = 0;
  let outstanding = 0;

  for (const raw of orders) {
    const o = raw as unknown as {
      deliveryStatus: DeliveryStatus;
      paymentMethod: PaymentMethod | null;
      paidAmount: number;
      adjustedTotal: number;
      paymentStatus: string;
    };
    if (o.deliveryStatus === "delivered") delivered += 1;
    if (o.deliveryStatus === "failed") failed += 1;
    if (o.paymentMethod === "cash") cash += o.paidAmount;
    if (o.paymentMethod === "transfer") transfer += o.paidAmount;
    if (o.deliveryStatus !== "cancelled" && o.paymentStatus !== "paid") {
      outstanding += Math.max(0, o.adjustedTotal - o.paidAmount);
    }
  }

  await store.set<Round>(COL.rounds, {
    ...round,
    status: "done",
    summary: {
      delivered,
      failed,
      cashCollected: money(cash),
      transferCollected: money(transfer),
      outstanding: money(outstanding),
      closedAt: new Date().toISOString(),
    },
  });
  revalidatePath("/admin/rounds");
}

/* ── ออเดอร์ ─────────────────────────────────────────────────────── */

export async function adjustQtyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireOwner();
  const orderId = String(formData.get("orderId") ?? "");
  const index = Number(formData.get("index"));
  const raw = String(formData.get("realQty") ?? "").trim();
  // เว้นว่าง = ยกเลิกการปรับ ส่วนค่าที่พิมพ์มาผิดต้องเตือน ไม่ใช่แปลงเป็น 0 เงียบๆ
  const realQty = raw === "" ? null : parseAmount(raw);
  if (raw !== "" && realQty === null) {
    return { error: "จำนวนจริงต้องเป็นตัวเลขเท่านั้น เช่น 1.2" };
  }

  const result = await adjustItemQty(orderId, index, realQty, session.name);
  if (!result.ok) return { error: result.error };
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, message: "ปรับยอดตามน้ำหนักจริงแล้ว" };
}

export async function confirmCustomItemAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireOwner();
  const orderId = String(formData.get("orderId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const unavailable = formData.get("unavailable") === "1";
  const raw = String(formData.get("price") ?? "").trim();
  const price = unavailable ? null : parseAmount(raw);
  if (!unavailable && price === null) {
    return { error: "ใส่ราคาเป็นตัวเลขด้วยนะคะ หรือกดปุ่มไม่มีของถ้าไม่มีสินค้านี้" };
  }

  const result = await confirmCustomItem(orderId, itemId, price, session.name);
  if (!result.ok) return { error: result.error };
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, message: unavailable ? "บันทึกว่าไม่มีของแล้ว" : "ยืนยันราคาแล้ว" };
}

export async function setStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireOwner();
  const orderId = String(formData.get("orderId") ?? "");
  const status = String(formData.get("status") ?? "") as DeliveryStatus;
  const reason = String(formData.get("reason") ?? "");

  const result = await setDeliveryStatus(orderId, status, session.name, reason);
  if (!result.ok) return { error: result.error };
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return { ok: true, message: "เปลี่ยนสถานะแล้ว" };
}

export async function recordPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireOwner();
  const orderId = String(formData.get("orderId") ?? "");
  const amount = parseAmount(String(formData.get("amount") ?? ""));
  if (amount === null) return { error: "ยอดเงินต้องเป็นตัวเลขเท่านั้น" };
  const method = (String(formData.get("method") ?? "cash") as PaymentMethod) || "cash";
  const slipData = String(formData.get("slipData") ?? "");

  const result = await recordPayment(orderId, amount, method, session.name, slipData);
  if (!result.ok) return { error: result.error };
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/debts");
  return { ok: true, message: "บันทึกการเก็บเงินแล้ว" };
}

/* ── ตั้งค่าร้าน ─────────────────────────────────────────────────── */

export async function saveSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireOwner();
  const store = db();
  const current = await store.get<ShopSettings>(COL.settings, "shop");
  const shopName = String(formData.get("shopName") ?? "").trim();
  if (shopName.length < 1) return { error: "ใส่ชื่อร้านด้วยนะคะ" };

  await store.set<ShopSettings>(COL.settings, {
    id: "shop",
    shopName,
    logoData: String(formData.get("logoData") ?? "") || (current?.logoData ?? ""),
    phone: String(formData.get("phone") ?? "").trim(),
    announcement: String(formData.get("announcement") ?? "").trim(),
    cutoffTime: String(formData.get("cutoffTime") ?? "15:00"),
    deliveryFee: Number(formData.get("deliveryFee")) || 0,
    soldOutBehavior: formData.get("soldOutBehavior") === "hide" ? "hide" : "gray",
    isOpen: formData.get("isOpen") === "on",
    closedMessage: String(formData.get("closedMessage") ?? "").trim(),
    orderPrefix: String(formData.get("orderPrefix") ?? "").trim(),
    updatedAt: new Date().toISOString(),
  });

  revalidatePath("/admin/settings");
  revalidatePath("/");
  return { ok: true, message: "บันทึกการตั้งค่าแล้ว" };
}

export async function saveZoneAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireOwner();
  const store = db();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "ใส่ชื่อหมู่บ้านหรือโซนด้วยนะคะ" };
  const all = await store.list<Zone>(COL.zones);
  await store.set<Zone>(COL.zones, {
    id: `z-${Date.now().toString(36)}`,
    name,
    deliveryFee: Number(formData.get("deliveryFee")) || 0,
    note: String(formData.get("note") ?? "").trim(),
    sortOrder: all.length + 1,
    isActive: true,
  });
  revalidatePath("/admin/settings");
  return { ok: true, message: `เพิ่มโซน ${name} แล้ว` };
}

export async function removeZoneAction(zoneId: string): Promise<void> {
  await requireOwner();
  await db().update(COL.zones, zoneId, { isActive: false });
  revalidatePath("/admin/settings");
}

export async function changePinAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireOwner();
  const result = await changePin(
    session.userId,
    String(formData.get("currentPin") ?? ""),
    String(formData.get("newPin") ?? ""),
  );
  if (!result.ok) return { error: result.error };
  return { ok: true, message: "เปลี่ยนรหัสเรียบร้อย ครั้งหน้าใช้รหัสใหม่นะคะ" };
}

/** ยอดค้างของลูกค้าคำนวณใหม่ทั้งหมด เผื่อข้อมูลเก่าไม่ตรง */
export async function recalcOutstandingAction(): Promise<void> {
  await requireOwner();
  const customers = await db().list<{ id: string }>(COL.customers);
  for (const c of customers) await refreshCustomerOutstanding(c.id);
  revalidatePath("/admin/debts");
}

export async function todayAction(): Promise<string> {
  return todayISO();
}
