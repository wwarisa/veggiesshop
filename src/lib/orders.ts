import "server-only";
import { COL, db } from "./db";
import { money, normalizePhone, todayISO } from "./format";
import { priceCart, type CartLine } from "./pricing";
import { getGroup, getProducts, getShopSettings, roundClosedReason } from "./repo";
import type {
  CustomItem,
  Customer,
  DailyStats,
  DeliveryStatus,
  IdempotencyRecord,
  Order,
  OrderEvent,
  OrderItem,
  PaymentMethod,
  Round,
} from "./types";

/**
 * ระบบออเดอร์ — ทุกอย่างในไฟล์นี้ทำงานฝั่งเซิร์ฟเวอร์เท่านั้น
 *
 * กฎที่ห้ามพลาด
 *   - ยอดเงินคำนวณที่นี่เสมอ ไม่เชื่อตัวเลขที่ส่งมาจากหน้าเว็บ
 *   - กดสั่งซ้ำต้องได้ออเดอร์เดิม ไม่สร้างใบใหม่
 *   - ทุกการแก้ยอดต้องบันทึกไว้ว่าแก้จากเท่าไหร่เป็นเท่าไหร่ ใครแก้ เมื่อไหร่
 */

export interface PlaceOrderInput {
  name: string;
  phone: string;
  address: string;
  note: string;
  roundId: string | null;
  groupId: string | null;
  lines: CartLine[];
  /** รายการที่ลูกค้าพิมพ์เอง ยังไม่มีราคา */
  otherTexts: string[];
  /** กุญแจครั้งเดียว กันกดสั่งซ้ำ */
  idempotencyKey: string;
}

export type PlaceOrderResult =
  | { ok: true; order: Order; reused: boolean }
  | { ok: false; error: string };

/** สร้างเลขที่ออเดอร์รูปแบบ ปีเดือนวัน-ลำดับ เช่น 260807-001 */
async function nextOrderNo(prefix: string): Promise<string> {
  const day = todayISO().replaceAll("-", "").slice(2);
  const seq = await db().nextSeq(`orderNo-${day}`);
  return `${prefix}${day}-${String(seq).padStart(3, "0")}`;
}

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const store = db();

  // กดสั่งซ้ำ เน็ตกระตุกแล้วส่งซ้ำ หรือกดปุ่มรัวๆ → คืนออเดอร์เดิม
  if (input.idempotencyKey) {
    const seen = await store.get<IdempotencyRecord>(COL.idempotency, input.idempotencyKey);
    if (seen) {
      const existing = await store.get<Order>(COL.orders, seen.orderId);
      if (existing) return { ok: true, order: existing, reused: true };
    }
  }

  const name = input.name.trim();
  const phone = normalizePhone(input.phone);
  if (name.length < 2) return { ok: false, error: "ใส่ชื่อผู้สั่งด้วยนะคะ" };
  if (phone.length < 9) return { ok: false, error: "เบอร์โทรไม่ถูกต้อง ใส่ให้ครบ 10 หลัก" };

  const shop = await getShopSettings();
  if (!shop.isOpen) {
    return { ok: false, error: shop.closedMessage || "วันนี้ร้านปิดรับออเดอร์ค่ะ" };
  }

  const group = await getGroup(input.groupId);

  // ลิงก์ของกลุ่มแบบส่งจุดเดียวกัน ไม่ต้องกรอกที่อยู่ ใช้ที่อยู่ที่เจ้าของตั้งไว้
  const address =
    group?.addressMode === "fixed" ? group.fixedAddress : input.address.trim();
  if (group?.addressMode !== "fixed" && address.length < 5) {
    return { ok: false, error: "ใส่ที่อยู่ให้ละเอียดหน่อยนะคะ จะได้ส่งถูกบ้าน" };
  }

  let round: Round | null = null;
  if (input.roundId) {
    round = await store.get<Round>(COL.rounds, input.roundId);
    if (!round) return { ok: false, error: "ไม่พบรอบส่งนี้ ลองเลือกใหม่อีกครั้ง" };
    const closed = roundClosedReason(round);
    if (closed) return { ok: false, error: closed };
    if (round.maxOrders) {
      const inRound = await store.list<Order>(COL.orders, {
        where: [["roundId", "==", round.id]],
      });
      const alive = inRound.filter((o) => o.deliveryStatus !== "cancelled");
      if (alive.length >= round.maxOrders) {
        return { ok: false, error: "รอบนี้รับออเดอร์เต็มแล้ว ลองเลือกรอบถัดไปนะคะ" };
      }
    }
  }

  // คิดราคาจากฝั่งเซิร์ฟเวอร์ ไม่เชื่อตัวเลขจากหน้าเว็บ
  const products = await getProducts();
  const priced = priceCart(input.lines, products, group);

  const otherTexts = input.otherTexts.map((t) => t.trim()).filter(Boolean).slice(0, 10);
  if (priced.lines.length === 0 && otherTexts.length === 0) {
    const why = priced.rejected[0]?.reason;
    return { ok: false, error: why ? `สั่งไม่สำเร็จ: ${why}` : "ยังไม่ได้เลือกสินค้าเลยค่ะ" };
  }

  const customItems: CustomItem[] = otherTexts.map((text, i) => ({
    id: `c${i + 1}`,
    text,
    price: null,
    status: "pending",
    confirmedBy: null,
    confirmedAt: null,
  }));

  const zone = round?.zoneId ?? group?.zoneId ?? null;
  const zoneDoc = zone ? await store.get<{ name: string }>(COL.zones, zone) : null;
  const deliveryFee = shop.deliveryFee ?? 0;
  const subtotal = priced.subtotal;
  const total = money(subtotal + deliveryFee);
  const nowISO = new Date().toISOString();

  const orderNo = await nextOrderNo(shop.orderPrefix ?? "");
  const order: Order = {
    id: orderNo,
    orderNo,
    customerPhone: phone,
    customerName: name,
    customerAddress: address,
    zoneId: zone,
    zoneName: zoneDoc?.name ?? "",
    roundId: round?.id ?? null,
    roundLabel: round ? `${round.name} · ${round.timeWindow}` : "",
    groupId: group?.id ?? null,
    source: group ? "link" : "web",
    items: priced.lines.map<OrderItem>((l) => ({
      ...l,
      realQty: null,
      realLineTotal: null,
      adjustNote: "",
    })),
    customItems,
    subtotal,
    deliveryFee,
    total,
    adjustedTotal: total,
    // มีของที่รอยืนยันราคา ออเดอร์ยังไม่ถือว่ารับเข้าระบบเต็มตัว
    deliveryStatus: customItems.length > 0 ? "pending_price" : "received",
    paymentStatus: "unpaid",
    paidAmount: 0,
    paymentMethod: null,
    slipData: "",
    note: input.note.trim().slice(0, 500),
    cancelReason: "",
    failReason: "",
    discountTotal: 0,
    promotionId: null,
    paymentRef: null,
    paymentProvider: null,
    createdAt: nowISO,
    updatedAt: nowISO,
  };

  await store.set(COL.orders, order);
  await addEvent(order.id, "system", "created", `รับออเดอร์ ${orderNo} ยอด ${total} บาท`);

  if (input.idempotencyKey) {
    await store.set<IdempotencyRecord>(COL.idempotency, {
      id: input.idempotencyKey,
      orderId: order.id,
      createdAt: nowISO,
    });
  }

  await rememberCustomer(order);
  await bumpDailyStats(order);

  return { ok: true, order, reused: false };
}

/** จำลูกค้าประจำไว้ ครั้งหน้ากรอกเบอร์แล้วชื่อกับที่อยู่ขึ้นเอง */
async function rememberCustomer(order: Order): Promise<void> {
  const store = db();
  const existing = await store.get<Customer>(COL.customers, order.customerPhone);
  const base: Customer = existing ?? {
    id: order.customerPhone,
    phone: order.customerPhone,
    name: order.customerName,
    address: order.customerAddress,
    zoneId: order.zoneId,
    note: "",
    orderCount: 0,
    totalSpent: 0,
    outstanding: 0,
    lastOrderAt: null,
    createdAt: order.createdAt,
    lineUserId: null,
    points: 0,
    tier: null,
  };
  await store.set<Customer>(COL.customers, {
    ...base,
    name: order.customerName,
    // ที่อยู่จากลิงก์แบบส่งจุดเดียว ไม่ใช่ที่อยู่บ้านลูกค้า จึงไม่เอาไปทับของเดิม
    address: order.source === "link" && order.groupId ? base.address : order.customerAddress,
    zoneId: order.zoneId ?? base.zoneId,
    orderCount: base.orderCount + 1,
    totalSpent: money(base.totalSpent + order.total),
    lastOrderAt: order.createdAt,
  });
}

export async function lookupCustomer(phone: string): Promise<Customer | null> {
  const id = normalizePhone(phone);
  if (id.length < 9) return null;
  return db().get<Customer>(COL.customers, id);
}

/* ── บันทึกประวัติการเปลี่ยนแปลงของออเดอร์ ────────────────────────── */

export async function addEvent(
  orderId: string,
  by: string,
  kind: string,
  message: string,
): Promise<void> {
  const id = `${orderId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  await db().set<OrderEvent & { id: string; orderId: string }>(COL.orderEvents, {
    id,
    orderId,
    at: new Date().toISOString(),
    by,
    kind,
    message,
  } as OrderEvent & { orderId: string });
}

export async function getOrderEvents(orderId: string): Promise<OrderEvent[]> {
  const rows = await db().list<OrderEvent & { orderId: string }>(COL.orderEvents, {
    where: [["orderId", "==", orderId]],
  });
  return rows.sort((a, b) => a.at.localeCompare(b.at));
}

/* ── คิดยอดใหม่หลังปรับน้ำหนักจริงหรือยืนยันราคาของรายการอื่นๆ ─────── */

export function recomputeTotals(order: Order): { subtotal: number; adjustedTotal: number } {
  const itemsTotal = order.items.reduce(
    (sum, it) => sum + (it.realLineTotal ?? it.lineTotal),
    0,
  );
  const customTotal = order.customItems.reduce(
    (sum, c) => sum + (c.status === "confirmed" ? (c.price ?? 0) : 0),
    0,
  );
  const subtotal = money(itemsTotal + customTotal);
  return { subtotal, adjustedTotal: money(subtotal + order.deliveryFee - order.discountTotal) };
}

/** ยังมีรายการที่รอเจ้าของยืนยันราคาอยู่ไหม */
export function hasPendingItems(order: Order): boolean {
  return order.customItems.some((c) => c.status === "pending");
}

async function saveWithTotals(order: Order, by: string, message: string): Promise<Order> {
  const totals = recomputeTotals(order);
  const updated: Order = {
    ...order,
    ...totals,
    updatedAt: new Date().toISOString(),
  };
  await db().set(COL.orders, updated);
  await addEvent(order.id, by, "update", message);
  return updated;
}

/** แก้จำนวนตามที่ชั่งได้จริงก่อนส่ง */
export async function adjustItemQty(
  orderId: string,
  itemIndex: number,
  realQty: number | null,
  by: string,
): Promise<{ ok: boolean; error?: string; order?: Order }> {
  const store = db();
  const order = await store.get<Order>(COL.orders, orderId);
  if (!order) return { ok: false, error: "ไม่พบออเดอร์นี้" };
  const item = order.items[itemIndex];
  if (!item) return { ok: false, error: "ไม่พบรายการนี้ในออเดอร์" };
  if (realQty !== null && (!Number.isFinite(realQty) || realQty < 0)) {
    return { ok: false, error: "จำนวนต้องเป็นตัวเลขและติดลบไม่ได้" };
  }

  const before = item.realQty ?? item.qty;
  const items = [...order.items];
  items[itemIndex] = {
    ...item,
    realQty,
    realLineTotal: realQty === null ? null : money(realQty * item.unitPrice),
  };

  const after = realQty ?? item.qty;
  const updated = await saveWithTotals(
    { ...order, items },
    by,
    `แก้ ${item.productName} จาก ${before} ${item.unitLabel} เป็น ${after} ${item.unitLabel}`,
  );
  return { ok: true, order: updated };
}

/** ใส่ราคาให้รายการที่ลูกค้าพิมพ์ขอเอง หรือบอกว่าไม่มีของ */
export async function confirmCustomItem(
  orderId: string,
  itemId: string,
  price: number | null,
  by: string,
): Promise<{ ok: boolean; error?: string; order?: Order }> {
  const store = db();
  const order = await store.get<Order>(COL.orders, orderId);
  if (!order) return { ok: false, error: "ไม่พบออเดอร์นี้" };
  const idx = order.customItems.findIndex((c) => c.id === itemId);
  if (idx === -1) return { ok: false, error: "ไม่พบรายการนี้" };
  if (price !== null && (!Number.isFinite(price) || price < 0)) {
    return { ok: false, error: "ราคาต้องเป็นตัวเลขและติดลบไม่ได้" };
  }

  const customItems = [...order.customItems];
  const target = customItems[idx];
  customItems[idx] = {
    ...target,
    price,
    status: price === null ? "unavailable" : "confirmed",
    confirmedBy: by,
    confirmedAt: new Date().toISOString(),
  };

  const next: Order = { ...order, customItems };
  // ยืนยันครบทุกรายการแล้ว ออเดอร์ถึงจะเดินหน้าต่อได้
  if (next.deliveryStatus === "pending_price" && !hasPendingItems(next)) {
    next.deliveryStatus = "received";
  }

  const updated = await saveWithTotals(
    next,
    by,
    price === null
      ? `แจ้งว่าไม่มีของ: ${target.text}`
      : `ยืนยันราคา ${target.text} เป็น ${price} บาท`,
  );
  return { ok: true, order: updated };
}

const STATUS_LABEL: Record<DeliveryStatus, string> = {
  pending_price: "รอยืนยันราคา",
  received: "รับออเดอร์แล้ว",
  packing: "กำลังจัดของ",
  delivering: "กำลังจัดส่ง",
  delivered: "ส่งสำเร็จ",
  failed: "ส่งไม่สำเร็จ",
  cancelled: "ยกเลิกแล้ว",
};

export function statusLabel(status: DeliveryStatus): string {
  return STATUS_LABEL[status] ?? status;
}

export async function setDeliveryStatus(
  orderId: string,
  status: DeliveryStatus,
  by: string,
  reason = "",
): Promise<{ ok: boolean; error?: string }> {
  const store = db();
  const order = await store.get<Order>(COL.orders, orderId);
  if (!order) return { ok: false, error: "ไม่พบออเดอร์นี้" };
  if (order.deliveryStatus === "pending_price" && status !== "cancelled") {
    return { ok: false, error: "ยังมีรายการที่รอยืนยันราคา ใส่ราคาให้ครบก่อนนะคะ" };
  }
  if (status === "failed" && !reason.trim()) {
    return { ok: false, error: "ส่งไม่สำเร็จต้องระบุเหตุผลด้วย" };
  }
  if (status === "cancelled" && !reason.trim()) {
    return { ok: false, error: "ยกเลิกออเดอร์ต้องระบุเหตุผลด้วย" };
  }

  await store.set(COL.orders, {
    ...order,
    deliveryStatus: status,
    failReason: status === "failed" ? reason.trim() : order.failReason,
    cancelReason: status === "cancelled" ? reason.trim() : order.cancelReason,
    updatedAt: new Date().toISOString(),
  });
  await addEvent(
    orderId,
    by,
    "status",
    `เปลี่ยนสถานะเป็น ${statusLabel(status)}${reason ? ` (${reason.trim()})` : ""}`,
  );
  return { ok: true };
}

export async function recordPayment(
  orderId: string,
  amount: number,
  method: PaymentMethod,
  by: string,
  slipData = "",
): Promise<{ ok: boolean; error?: string }> {
  const store = db();
  const order = await store.get<Order>(COL.orders, orderId);
  if (!order) return { ok: false, error: "ไม่พบออเดอร์นี้" };
  if (!Number.isFinite(amount) || amount < 0) {
    return { ok: false, error: "ยอดเงินต้องเป็นตัวเลขและติดลบไม่ได้" };
  }

  const due = order.adjustedTotal;
  const paid = money(amount);
  const status = paid >= due ? "paid" : paid > 0 ? "owed" : "unpaid";

  await store.set(COL.orders, {
    ...order,
    paidAmount: paid,
    paymentMethod: method,
    paymentStatus: status,
    slipData: slipData || order.slipData,
    updatedAt: new Date().toISOString(),
  });
  await addEvent(
    orderId,
    by,
    "payment",
    `เก็บเงินได้ ${paid} บาท จากยอด ${due} บาท (${method === "cash" ? "เงินสด" : "โอน"})`,
  );
  await refreshCustomerOutstanding(order.customerPhone);
  return { ok: true };
}

/** คิดยอดค้างของลูกค้าใหม่จากออเดอร์ทั้งหมด */
export async function refreshCustomerOutstanding(phone: string): Promise<void> {
  const store = db();
  const customer = await store.get<Customer>(COL.customers, phone);
  if (!customer) return;
  const orders = await store.list<Order>(COL.orders, {
    where: [["customerPhone", "==", phone]],
  });
  const outstanding = orders
    .filter((o) => o.deliveryStatus === "delivered" && o.paymentStatus !== "paid")
    .reduce((sum, o) => sum + Math.max(0, o.adjustedTotal - o.paidAmount), 0);
  await store.update(COL.customers, phone, { outstanding: money(outstanding) });
}

/* ── สรุปยอดรายวัน เอาไว้ให้แดชบอร์ดอ่านทีเดียว ประหยัดโควต้าอ่าน ── */

async function bumpDailyStats(order: Order): Promise<void> {
  const store = db();
  const day = order.createdAt.slice(0, 10);
  const current =
    (await store.get<DailyStats>(COL.dailyStats, day)) ??
    ({
      id: day,
      totalSales: 0,
      orderCount: 0,
      byGroup: {},
      byProduct: {},
      byGroupProduct: {},
      updatedAt: "",
    } satisfies DailyStats);

  const groupKey = order.groupId ?? "web";
  current.totalSales = money(current.totalSales + order.total);
  current.orderCount += 1;
  current.byGroup[groupKey] = money((current.byGroup[groupKey] ?? 0) + order.total);

  for (const item of order.items) {
    const prev = current.byProduct[item.productId] ?? {
      amount: 0,
      qty: 0,
      unitLabel: item.unitLabel,
    };
    current.byProduct[item.productId] = {
      amount: money(prev.amount + item.lineTotal),
      qty: money(prev.qty + item.qty),
      unitLabel: item.unitLabel,
    };
    const gpKey = `${groupKey}|${item.productId}`;
    const prevGP = current.byGroupProduct[gpKey] ?? { amount: 0, qty: 0 };
    current.byGroupProduct[gpKey] = {
      amount: money(prevGP.amount + item.lineTotal),
      qty: money(prevGP.qty + item.qty),
    };
  }

  current.updatedAt = new Date().toISOString();
  await store.set(COL.dailyStats, current);
}

export async function getOrders(filter: {
  status?: DeliveryStatus;
  roundId?: string;
  phone?: string;
  date?: string;
} = {}): Promise<Order[]> {
  const rows = await db().list<Order>(COL.orders);
  return rows
    .filter((o) => (filter.status ? o.deliveryStatus === filter.status : true))
    .filter((o) => (filter.roundId ? o.roundId === filter.roundId : true))
    .filter((o) => (filter.phone ? o.customerPhone === normalizePhone(filter.phone) : true))
    .filter((o) => (filter.date ? o.createdAt.startsWith(filter.date) : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getOrder(id: string): Promise<Order | null> {
  return db().get<Order>(COL.orders, id);
}
