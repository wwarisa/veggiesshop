/**
 * โครงข้อมูลทั้งหมดของระบบ
 * ตรงกับที่ออกแบบไว้ใน docs/architecture.md
 */

/* ── สินค้า ───────────────────────────────────────────────────────── */

/** ประเภทหน่วยขาย ใช้ตัดสินใจว่าปรับตามน้ำหนักจริงได้ไหม */
export type UnitType = "weight" | "bunch" | "bag" | "piece";

export interface ProductUnit {
  id: string;
  /** ชื่อหน่วยที่ลูกค้าเห็น เช่น "กิโลกรัม" "มัด" "ขีด" */
  label: string;
  unitType: UnitType;
  /** ราคากลาง ใช้กับทุกลิงก์ที่ไม่ได้ตั้งราคาเฉพาะกลุ่มไว้ */
  price: number;
  /** ราคาก่อนแก้ครั้งล่าสุด ใช้โชว์ให้เจ้าของเทียบตอนตั้งราคา */
  prevPrice: number;
  /** กดบวก-ลบทีละเท่าไหร่ เช่น 0.5 สำหรับกิโลกรัม */
  step: number;
  isDefault: boolean;
  isAvailable: boolean;
  /** ปรับจำนวนตามที่ชั่งได้จริงก่อนส่งได้ไหม */
  allowWeightAdjust: boolean;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  note: string;
  /** ใช้แทนรูปจนกว่าเจ้าของจะอัปโหลดรูปจริง */
  emoji: string;
  /** รูปย่อ 300px WebP เป็น data URI ใช้ในการ์ดหน้าแรก */
  thumbData: string;
  sortOrder: number;
  /** เจ้าของกดเปิด/ปิดการขาย */
  isAvailable: boolean;
  isDeleted: boolean;
  /** คำค้นภาษาไทยเพิ่มเติม เช่น ["ผักบุ้งจีน", "ผักบุ้ง"] */
  searchTerms: string[];
  units: ProductUnit[];
  createdAt: string;
  updatedAt: string;
}

/** รูปเต็มเก็บแยกเอกสาร ไม่ให้หน้าแรกโหลดหนัก */
export interface ProductImage {
  id: string;
  /** 800px WebP เป็น data URI */
  fullData: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
}

export interface PriceHistory {
  id: string;
  productId: string;
  productName: string;
  unitId: string;
  unitLabel: string;
  /** ว่างไว้ = ราคากลาง ถ้ามีค่า = ราคาเฉพาะกลุ่มนั้น */
  groupId: string | null;
  oldPrice: number | null;
  newPrice: number | null;
  changedBy: string;
  changedAt: string;
  /** รหัสชุดการแก้ ทำให้รู้ว่าแก้พร้อมกันครั้งเดียว */
  batchId: string;
}

/* ── กลุ่มและรอบส่ง ───────────────────────────────────────────────── */

/** ให้ลูกค้ากรอกที่อยู่เอง หรือส่งจุดเดียวกันทั้งกลุ่ม */
export type AddressMode = "ask" | "fixed";

export interface Group {
  id: string;
  name: string;
  /** สินค้าที่กลุ่มนี้เห็น เรียงตามลำดับที่อยากให้แสดง */
  productIds: string[];
  /** ราคาเฉพาะกลุ่ม คีย์คือ "productId|unitId" ตัวไหนไม่มี = ใช้ราคากลาง */
  prices: Record<string, number>;
  addressMode: AddressMode;
  fixedAddress: string;
  /** เปิดช่อง "อื่นๆ" ให้ลูกค้าพิมพ์ขอของนอกรายการไหม */
  allowOther: boolean;
  otherHint: string;
  zoneId: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface Zone {
  id: string;
  name: string;
  deliveryFee: number;
  note: string;
  sortOrder: number;
  isActive: boolean;
}

export type RoundStatus = "draft" | "open" | "closed" | "delivering" | "done";

/** รอบส่ง 1 รอบ = ลิงก์สั่งซื้อ 1 อัน */
export interface Round {
  id: string;
  /** ส่วนท้ายลิงก์ เช่น bni-1208 → /r/bni-1208 */
  slug: string;
  name: string;
  groupId: string | null;
  zoneId: string | null;
  /** วันที่ส่ง รูปแบบ YYYY-MM-DD */
  deliveryDate: string;
  timeWindow: string;
  /** ปิดรับออเดอร์เมื่อไหร่ เป็น ISO string */
  cutoffAt: string;
  status: RoundStatus;
  /** true = โผล่ให้เลือกในหน้าเว็บหลักด้วย */
  isPublic: boolean;
  maxOrders: number | null;
  note: string;
  summary: RoundSummary | null;
  createdAt: string;
}

export interface RoundSummary {
  delivered: number;
  failed: number;
  cashCollected: number;
  transferCollected: number;
  outstanding: number;
  closedAt: string;
}

/* ── ลูกค้าและออเดอร์ ─────────────────────────────────────────────── */

export interface Customer {
  /** id คือเบอร์โทรที่ตัดขีดออกแล้ว */
  id: string;
  phone: string;
  name: string;
  address: string;
  zoneId: string | null;
  note: string;
  orderCount: number;
  totalSpent: number;
  outstanding: number;
  lastOrderAt: string | null;
  createdAt: string;
  /** เผื่อไว้ต่อแจ้งเตือน LINE ในอนาคต */
  lineUserId: string | null;
  points: number;
  tier: string | null;
}

export type DeliveryStatus =
  | "pending_price"
  | "received"
  | "packing"
  | "delivering"
  | "delivered"
  | "failed"
  | "cancelled";

export type PaymentStatus = "unpaid" | "paid" | "owed";
export type PaymentMethod = "cash" | "transfer";

export interface OrderItem {
  productId: string;
  productName: string;
  unitId: string;
  unitLabel: string;
  /** ราคา ณ เวลาที่สั่ง คิดจากฝั่งเซิร์ฟเวอร์เสมอ */
  unitPrice: number;
  qty: number;
  lineTotal: number;
  /** จำนวนที่ชั่งได้จริง ว่างไว้ = ยังไม่ได้ปรับ */
  realQty: number | null;
  realLineTotal: number | null;
  adjustNote: string;
}

/** รายการ "อื่นๆ" ที่ลูกค้าพิมพ์เอง ยังไม่มีราคาจนกว่าร้านจะยืนยัน */
export interface CustomItem {
  id: string;
  text: string;
  price: number | null;
  status: "pending" | "confirmed" | "unavailable";
  confirmedBy: string | null;
  confirmedAt: string | null;
}

export interface OrderEvent {
  id: string;
  at: string;
  by: string;
  kind: string;
  /** ข้อความอ่านง่ายสำหรับเจ้าของ เช่น "แก้คะน้าจาก 0.5 กก. เป็น 0.6 กก." */
  message: string;
}

export interface Order {
  id: string;
  /** เลขที่ที่ลูกค้าเห็น เช่น 260807-001 */
  orderNo: string;

  customerPhone: string;
  customerName: string;
  customerAddress: string;
  zoneId: string | null;
  zoneName: string;

  roundId: string | null;
  roundLabel: string;
  groupId: string | null;
  /** เข้ามาทางหน้าเว็บหลัก หรือทางลิงก์ของกลุ่ม */
  source: "web" | "link";

  items: OrderItem[];
  customItems: CustomItem[];

  subtotal: number;
  deliveryFee: number;
  total: number;
  /** ยอดหลังปรับตามน้ำหนักจริงและหลังยืนยันราคาของรายการอื่นๆ */
  adjustedTotal: number;

  deliveryStatus: DeliveryStatus;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  paymentMethod: PaymentMethod | null;
  /** รูปสลิปที่บีบแล้ว เป็น data URI */
  slipData: string;

  note: string;
  cancelReason: string;
  failReason: string;

  /** เผื่อไว้สำหรับโปรโมชั่นและส่วนลดในอนาคต */
  discountTotal: number;
  promotionId: string | null;
  paymentRef: string | null;
  paymentProvider: string | null;

  createdAt: string;
  updatedAt: string;
}

/* ── ตั้งค่าร้าน ───────────────────────────────────────────────────── */

export interface ShopSettings {
  id: "shop";
  shopName: string;
  logoData: string;
  phone: string;
  announcement: string;
  /** เวลาปิดรับออเดอร์ประจำวัน รูปแบบ HH:mm */
  cutoffTime: string;
  deliveryFee: number;
  /** ของหมดให้แสดงเป็นสีเทา หรือซ่อนไปเลย */
  soldOutBehavior: "gray" | "hide";
  isOpen: boolean;
  closedMessage: string;
  orderPrefix: string;
  updatedAt: string;
}

export interface PrintSettings {
  id: "print";
  /** ความกว้างกระดาษเป็นมิลลิเมตร */
  paperWidthMm: 58 | 80;
  /** พิมพ์ใบส่งของกี่ชุด (กระดาษคาร์บอนมักใช้ 2) */
  copies: number;
  footerNote: string;
  updatedAt: string;
}

export interface NotificationSettings {
  id: "notifications";
  lineEnabled: boolean;
  /** ปลายทางที่จะส่งเข้า LINE (userId หรือ groupId) */
  lineTargets: string[];
  /** ส่งทันทีทุกออเดอร์ หรือรวมส่งเป็นรอบ */
  mode: "instant" | "digest";
  digestMinutes: number;
  notifyOn: string[];
  /** นับโควต้าที่ใช้ไปในเดือนนั้น แพลนฟรีของไทยได้ 500 ข้อความ/เดือน */
  quotaUsed: number;
  quotaMonth: string;
  quotaLimit: number;
  updatedAt: string;
}

export interface AdminUser {
  id: string;
  name: string;
  /** เก็บเป็น hash เท่านั้น ไม่เก็บรหัสจริง */
  pinHash: string;
  role: "owner" | "staff";
  isActive: boolean;
  failedCount: number;
  /** ล็อกถึงเมื่อไหร่ เป็น ISO string */
  lockedUntil: string | null;
  createdAt: string;
}

/* ── สถิติและงานระบบ ─────────────────────────────────────────────── */

export interface DailyStats {
  /** id คือวันที่ รูปแบบ YYYY-MM-DD */
  id: string;
  totalSales: number;
  orderCount: number;
  byGroup: Record<string, number>;
  byProduct: Record<string, { amount: number; qty: number; unitLabel: string }>;
  byGroupProduct: Record<string, { amount: number; qty: number }>;
  updatedAt: string;
}

export interface NotificationJob {
  id: string;
  kind: string;
  orderId: string | null;
  channel: "line" | "webpush";
  status: "pending" | "sent" | "failed";
  message: string;
  error: string;
  retryCount: number;
  createdAt: string;
  sentAt: string | null;
}

export interface Counter {
  id: string;
  value: number;
}

export interface IdempotencyRecord {
  id: string;
  orderId: string;
  createdAt: string;
}
