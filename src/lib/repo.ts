import { COL, db } from "./db";
import type {
  Category,
  Group,
  NotificationSettings,
  PrintSettings,
  Product,
  Round,
  ShopSettings,
  Zone,
} from "./types";

/** ฟังก์ชันอ่านข้อมูลที่ใช้บ่อย รวมไว้ที่เดียวจะได้ไม่เขียนซ้ำ */

export async function getShopSettings(): Promise<ShopSettings> {
  const found = await db().get<ShopSettings>(COL.settings, "shop");
  return found ?? FALLBACK_SHOP;
}

export async function getPrintSettings(): Promise<PrintSettings> {
  const found = await db().get<PrintSettings>(COL.settings, "print");
  return found ?? { id: "print", paperWidthMm: 80, copies: 2, footerNote: "", updatedAt: "" };
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const found = await db().get<NotificationSettings>(COL.settings, "notifications");
  return (
    found ?? {
      id: "notifications",
      lineEnabled: false,
      lineTargets: [],
      mode: "instant",
      digestMinutes: 30,
      notifyOn: ["new_order"],
      quotaUsed: 0,
      quotaMonth: "",
      quotaLimit: 500,
      updatedAt: "",
    }
  );
}

/** สินค้าทั้งหมดที่ยังไม่ถูกลบ เรียงตามลำดับที่เจ้าของจัดไว้ */
export async function getProducts(): Promise<Product[]> {
  const rows = await db().list<Product>(COL.products);
  return rows
    .filter((p) => !p.isDeleted)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getProduct(id: string): Promise<Product | null> {
  const found = await db().get<Product>(COL.products, id);
  return found && !found.isDeleted ? found : null;
}

export async function getCategories(): Promise<Category[]> {
  const rows = await db().list<Category>(COL.categories);
  return rows.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getGroups(): Promise<Group[]> {
  const rows = await db().list<Group>(COL.groups);
  return rows.filter((g) => g.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getGroup(id: string | null): Promise<Group | null> {
  if (!id) return null;
  return db().get<Group>(COL.groups, id);
}

export async function getZones(): Promise<Zone[]> {
  const rows = await db().list<Zone>(COL.zones);
  return rows.filter((z) => z.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getRounds(): Promise<Round[]> {
  const rows = await db().list<Round>(COL.rounds);
  return rows.sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));
}

export async function getRoundBySlug(slug: string): Promise<Round | null> {
  const rows = await db().list<Round>(COL.rounds, { where: [["slug", "==", slug]] });
  return rows[0] ?? null;
}

/** รอบที่ลูกค้าหน้าเว็บหลักเลือกได้ — เปิดรับอยู่ ยังไม่เลยเวลาปิด และตั้งให้เห็นสาธารณะ */
export async function getPublicOpenRounds(now: Date = new Date()): Promise<Round[]> {
  const rows = await getRounds();
  return rows.filter(
    (r) => r.isPublic && r.status === "open" && new Date(r.cutoffAt).getTime() > now.getTime(),
  );
}

/** ลิงก์ยังกดสั่งได้อยู่ไหม พร้อมเหตุผลถ้าสั่งไม่ได้ */
export function roundClosedReason(round: Round, now: Date = new Date()): string | null {
  if (round.status === "draft") return "รอบนี้ยังไม่เปิดรับออเดอร์";
  if (round.status === "closed") return "รอบนี้ปิดรับออเดอร์แล้ว";
  if (round.status === "delivering") return "รอบนี้กำลังจัดส่งอยู่ ปิดรับออเดอร์แล้ว";
  if (round.status === "done") return "รอบนี้ส่งเสร็จแล้ว";
  if (new Date(round.cutoffAt).getTime() <= now.getTime()) return "เลยเวลาปิดรับออเดอร์ของรอบนี้แล้ว";
  return null;
}

const FALLBACK_SHOP: ShopSettings = {
  id: "shop",
  shopName: "[ชื่อร้าน]",
  logoData: "",
  phone: "",
  announcement: "",
  cutoffTime: "15:00",
  deliveryFee: 0,
  soldOutBehavior: "gray",
  isOpen: true,
  closedMessage: "",
  orderPrefix: "",
  updatedAt: "",
};
