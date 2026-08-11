import { COL, db } from "./db";
import { todayISO } from "./format";
import type {
  Category,
  Group,
  NotificationSettings,
  PrintSettings,
  Product,
  ProductUnit,
  Round,
  ShopSettings,
  Zone,
} from "./types";

/**
 * ข้อมูลตัวอย่าง — ผักไทยที่ขายจริงในตลาดสด ราคาสมจริง
 * ใส่ไว้ให้เห็นภาพระบบตอนทดลองใช้ เจ้าของร้านลบทิ้งแล้วใส่ของตัวเองได้
 */

const now = new Date().toISOString();

const CATEGORIES: Category[] = [
  { id: "leaf", name: "ผักใบ", icon: "🥬", sortOrder: 1, isActive: true },
  { id: "herb", name: "สมุนไพร เครื่องแกง", icon: "🌿", sortOrder: 2, isActive: true },
  { id: "fruit", name: "ผักผล", icon: "🍅", sortOrder: 3, isActive: true },
  { id: "root", name: "หัว หอม กระเทียม", icon: "🧅", sortOrder: 4, isActive: true },
  { id: "etc", name: "ไข่ และอื่นๆ", icon: "🥚", sortOrder: 5, isActive: true },
];

type UnitSeed = [label: string, price: number, step: number, type: ProductUnit["unitType"]];

interface ProductSeed {
  id: string;
  cat: string;
  name: string;
  emoji: string;
  note?: string;
  on?: boolean;
  units: UnitSeed[];
  terms?: string[];
}

const PRODUCTS: ProductSeed[] = [
  { id: "p01", cat: "leaf", name: "ผักบุ้งจีน", emoji: "🥬", note: "เก็บเช้านี้ ก้านกรอบ",
    units: [["มัด", 15, 1, "bunch"], ["กิโลกรัม", 45, 0.5, "weight"]], terms: ["ผักบุ้ง"] },
  { id: "p02", cat: "leaf", name: "คะน้ายอด", emoji: "🥬", note: "ยอดอ่อน ไม่แก่",
    units: [["ขีด", 7, 1, "weight"], ["กิโลกรัม", 60, 0.5, "weight"]], terms: ["คะน้า"] },
  { id: "p03", cat: "leaf", name: "ผักกาดขาวปลี", emoji: "🥬",
    units: [["กิโลกรัม", 35, 0.5, "weight"]], terms: ["ผักกาด", "ผักกาดขาว"] },
  { id: "p04", cat: "leaf", name: "กะหล่ำปลี", emoji: "🥬", note: "หัวแน่น",
    units: [["หัว", 35, 1, "piece"], ["กิโลกรัม", 30, 0.5, "weight"]], terms: ["กะหล่ำ"] },
  { id: "p05", cat: "leaf", name: "ผักกาดหอม", emoji: "🥗", on: false,
    units: [["กิโลกรัม", 70, 0.5, "weight"]], terms: ["สลัด"] },
  { id: "p06", cat: "herb", name: "ต้นหอม", emoji: "🌿",
    units: [["ขีด", 12, 1, "weight"], ["กิโลกรัม", 110, 0.5, "weight"]], terms: ["หอมซอย"] },
  { id: "p07", cat: "herb", name: "ผักชี", emoji: "🌿", note: "หอม รากติดมาด้วย",
    units: [["ขีด", 15, 1, "weight"]] },
  { id: "p08", cat: "herb", name: "ใบกะเพรา", emoji: "🌱",
    units: [["ถุง", 10, 1, "bag"], ["ขีด", 20, 1, "weight"]], terms: ["กะเพรา"] },
  { id: "p09", cat: "herb", name: "ใบโหระพา", emoji: "🌱",
    units: [["ถุง", 10, 1, "bag"]], terms: ["โหระพา"] },
  { id: "p10", cat: "herb", name: "พริกขี้หนูสวน", emoji: "🌶️", note: "เผ็ดจัด",
    units: [["ขีด", 25, 1, "weight"], ["กิโลกรัม", 230, 0.5, "weight"]], terms: ["พริก"] },
  { id: "p11", cat: "herb", name: "ตะไคร้", emoji: "🌾",
    units: [["มัด", 10, 1, "bunch"]] },
  { id: "p12", cat: "fruit", name: "มะนาว", emoji: "🍋", note: "ลูกใหญ่ น้ำเยอะ",
    units: [["ลูก", 5, 1, "piece"], ["ถุง 10 ลูก", 45, 1, "bag"]] },
  { id: "p13", cat: "fruit", name: "มะเขือเทศสีดา", emoji: "🍅",
    units: [["กิโลกรัม", 55, 0.5, "weight"]], terms: ["มะเขือเทศ"] },
  { id: "p14", cat: "fruit", name: "แตงกวา", emoji: "🥒",
    units: [["กิโลกรัม", 40, 0.5, "weight"]] },
  { id: "p15", cat: "fruit", name: "ถั่วฝักยาว", emoji: "🫛",
    units: [["มัด", 20, 1, "bunch"], ["กิโลกรัม", 65, 0.5, "weight"]], terms: ["ถั่ว"] },
  { id: "p16", cat: "fruit", name: "มะเขือเปราะ", emoji: "🍆", on: false,
    units: [["กิโลกรัม", 50, 0.5, "weight"]], terms: ["มะเขือ"] },
  { id: "p17", cat: "root", name: "หอมแดง", emoji: "🧅", note: "ศรีสะเกษ",
    units: [["ขีด", 15, 1, "weight"], ["กิโลกรัม", 140, 0.5, "weight"]], terms: ["หอม"] },
  { id: "p18", cat: "root", name: "กระเทียมไทย", emoji: "🧄", note: "กลีบเล็ก หอม",
    units: [["ขีด", 18, 1, "weight"]], terms: ["กระเทียม"] },
  { id: "p19", cat: "root", name: "ขิงแก่", emoji: "🫚",
    units: [["ขีด", 12, 1, "weight"]], terms: ["ขิง"] },
  { id: "p20", cat: "etc", name: "ไข่ไก่ เบอร์ 2", emoji: "🥚",
    units: [["ฟอง", 5, 1, "piece"], ["แผง 30 ฟอง", 135, 1, "bag"]], terms: ["ไข่"] },
];

function buildProduct(seed: ProductSeed, index: number): Product {
  return {
    id: seed.id,
    name: seed.name,
    categoryId: seed.cat,
    note: seed.note ?? "",
    emoji: seed.emoji,
    thumbData: "",
    sortOrder: index + 1,
    isAvailable: seed.on !== false,
    isDeleted: false,
    searchTerms: [seed.name, ...(seed.terms ?? [])],
    units: seed.units.map(([label, price, step, unitType], i) => ({
      id: `u${i + 1}`,
      label,
      unitType,
      price,
      prevPrice: price,
      step,
      isDefault: i === 0,
      isAvailable: true,
      // ของที่ต้องชั่งเท่านั้นที่ปรับตามน้ำหนักจริงได้
      allowWeightAdjust: unitType === "weight",
    })),
    createdAt: now,
    updatedAt: now,
  };
}

const ZONES: Zone[] = [
  { id: "z1", name: "หมู่บ้านสุขใจ", deliveryFee: 0, note: "", sortOrder: 1, isActive: true },
  { id: "z2", name: "หมู่บ้านร่มเย็น", deliveryFee: 0, note: "", sortOrder: 2, isActive: true },
  { id: "z3", name: "อาคาร BNI Icon", deliveryFee: 0, note: "ส่งจุดเดียว", sortOrder: 3, isActive: true },
];

const GROUPS: Group[] = [
  {
    id: "bni",
    name: "BNI Icon",
    productIds: ["p01", "p02", "p10", "p12", "p20"],
    // ราคาพิเศษเฉพาะกลุ่มนี้ ที่เหลือใช้ราคากลาง
    prices: { "p01|u1": 12, "p20|u2": 130 },
    addressMode: "fixed",
    fixedAddress: "อาคาร BNI Icon ชั้น 3 · รับของหน้าห้องประชุม",
    allowOther: true,
    otherHint: "อยากได้อย่างอื่นพิมพ์บอกได้ ทางร้านจะเช็กราคาแล้วแจ้งกลับก่อนจัดของ",
    zoneId: "z3",
    isActive: true,
    sortOrder: 1,
    createdAt: now,
  },
  {
    id: "moobaan",
    name: "หมู่บ้านสุขใจ",
    productIds: ["p01", "p02", "p04", "p06", "p07", "p08", "p10", "p12", "p14", "p20"],
    prices: {},
    addressMode: "ask",
    fixedAddress: "",
    allowOther: true,
    otherHint: "อยากได้อย่างอื่นพิมพ์บอกได้ ทางร้านจะเช็กราคาแล้วแจ้งกลับก่อนจัดของ",
    zoneId: "z1",
    isActive: true,
    sortOrder: 2,
    createdAt: now,
  },
];

/** สร้างรอบส่งตัวอย่างให้เปิดรับอยู่ 2 รอบ นับจากวันที่รันคำสั่งใส่ข้อมูล */
function buildRounds(): Round[] {
  const today = new Date();
  const inDays = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d;
  };
  const dayISO = (d: Date) => todayISO(d);
  const at = (d: Date, hh: number, mm: number) => {
    const x = new Date(d);
    x.setHours(hh, mm, 0, 0);
    return x.toISOString();
  };

  const d3 = inDays(3);
  const d2 = inDays(2);

  return [
    {
      id: "r1",
      slug: `bni-${dayISO(d3).slice(5).replace("-", "")}`,
      name: "รอบเที่ยง BNI Icon",
      groupId: "bni",
      zoneId: "z3",
      deliveryDate: dayISO(d3),
      timeWindow: "11:30 – 12:30 น.",
      cutoffAt: at(d2, 20, 0),
      status: "open",
      isPublic: false,
      maxOrders: null,
      note: "รับของหน้าห้องประชุมชั้น 3",
      summary: null,
      createdAt: now,
    },
    {
      id: "r2",
      slug: `sukjai-${dayISO(d3).slice(5).replace("-", "")}`,
      name: "รอบเย็นหมู่บ้านสุขใจ",
      groupId: "moobaan",
      zoneId: "z1",
      deliveryDate: dayISO(d3),
      timeWindow: "17:00 – 19:00 น.",
      cutoffAt: at(d3, 15, 0),
      status: "open",
      isPublic: true,
      maxOrders: null,
      note: "",
      summary: null,
      createdAt: now,
    },
  ];
}

const SHOP: ShopSettings = {
  id: "shop",
  shopName: "[ชื่อร้าน]",
  logoData: "",
  phone: "081-234-5678",
  announcement: "ผักสดเก็บเช้าทุกวัน ปิดรับออเดอร์ 15:00 น. ส่งรอบเย็นวันเดียวกัน",
  cutoffTime: "15:00",
  deliveryFee: 0,
  soldOutBehavior: "gray",
  isOpen: true,
  closedMessage: "วันนี้ร้านปิด ขออภัยค่ะ พรุ่งนี้เปิดตามปกติ",
  orderPrefix: "",
  updatedAt: now,
};

const PRINT: PrintSettings = {
  id: "print",
  paperWidthMm: 80,
  copies: 2,
  footerNote: "ขอบคุณที่อุดหนุนค่ะ",
  updatedAt: now,
};

const NOTIFY: NotificationSettings = {
  id: "notifications",
  lineEnabled: false,
  lineTargets: [],
  mode: "instant",
  digestMinutes: 30,
  notifyOn: ["new_order", "cancelled"],
  quotaUsed: 0,
  quotaMonth: todayISO().slice(0, 7),
  quotaLimit: 500,
  updatedAt: now,
};

/**
 * ใส่ข้อมูลตัวอย่างลงฐานข้อมูล
 * เรียกซ้ำได้ ข้อมูลเดิมจะถูกเขียนทับด้วยของชุดเดียวกัน
 */
export async function seedSampleData(): Promise<{ driver: string; products: number }> {
  const store = db();

  for (const c of CATEGORIES) await store.set(COL.categories, c);
  for (const [i, p] of PRODUCTS.entries()) await store.set(COL.products, buildProduct(p, i));
  for (const z of ZONES) await store.set(COL.zones, z);
  for (const g of GROUPS) await store.set(COL.groups, g);
  for (const r of buildRounds()) await store.set(COL.rounds, r);

  await store.set(COL.settings, SHOP);
  await store.set(COL.settings, PRINT);
  await store.set(COL.settings, NOTIFY);


  return { driver: store.driver, products: PRODUCTS.length };
}
