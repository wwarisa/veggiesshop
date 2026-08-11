/**
 * หน้าตาของที่เก็บข้อมูล
 *
 * มี 2 ตัวที่ทำงานได้จริง เลือกอัตโนมัติใน index.ts
 *   - local.ts     เก็บเป็นไฟล์ในเครื่อง ใช้ตอนลองใช้งานก่อนสมัคร Firebase
 *   - firestore.ts ของจริงตอนขึ้นออนไลน์
 *
 * ตั้งใจให้เล็กที่สุดเท่าที่พอใช้ เพราะร้านผักหมู่บ้านมีข้อมูลไม่มาก
 */

export type WhereOp = "==" | "!=" | ">" | ">=" | "<" | "<=" | "in";

export type Where = [field: string, op: WhereOp, value: unknown];

export interface ListOptions {
  where?: Where[];
  orderBy?: { field: string; dir?: "asc" | "desc" };
  limit?: number;
}

export interface Store {
  get<T>(collection: string, id: string): Promise<T | null>;
  list<T>(collection: string, options?: ListOptions): Promise<T[]>;
  set<T extends { id: string }>(collection: string, value: T): Promise<T>;
  update(collection: string, id: string, patch: Record<string, unknown>): Promise<void>;
  remove(collection: string, id: string): Promise<void>;
  /** เพิ่มตัวนับทีละ 1 แล้วคืนค่าใหม่ ใช้ทำเลขที่ออเดอร์ ห้ามซ้ำกันเด็ดขาด */
  nextSeq(name: string): Promise<number>;
  /** ชื่อที่เอาไว้บอกผู้ใช้ว่ากำลังเก็บข้อมูลไว้ที่ไหน */
  readonly driver: "local" | "firestore";
}

/** ชื่อคอลเลกชันทั้งหมด รวมไว้ที่เดียวกันพิมพ์ผิดยาก */
export const COL = {
  products: "products",
  productImages: "product_images",
  categories: "categories",
  priceHistory: "price_history",
  groups: "groups",
  zones: "zones",
  rounds: "delivery_rounds",
  customers: "customers",
  orders: "orders",
  orderEvents: "order_events",
  settings: "settings",
  adminUsers: "admin_users",
  dailyStats: "daily_stats",
  notifications: "notifications",
  counters: "counters",
  idempotency: "idempotency",
} as const;

/** กรองข้อมูลในหน่วยความจำ ใช้กับตัวเก็บแบบไฟล์ */
export function matches(row: Record<string, unknown>, where: Where[] = []): boolean {
  return where.every(([field, op, value]) => {
    const actual = field.split(".").reduce<unknown>(
      (acc, key) => (acc == null ? acc : (acc as Record<string, unknown>)[key]),
      row,
    );
    switch (op) {
      case "==":
        return actual === value;
      case "!=":
        return actual !== value;
      case ">":
        return (actual as number) > (value as number);
      case ">=":
        return (actual as number) >= (value as number);
      case "<":
        return (actual as number) < (value as number);
      case "<=":
        return (actual as number) <= (value as number);
      case "in":
        return Array.isArray(value) && value.includes(actual);
      default:
        return true;
    }
  });
}

/** เรียงข้อมูลในหน่วยความจำ ใช้กับตัวเก็บแบบไฟล์ */
export function sortRows<T extends Record<string, unknown>>(
  rows: T[],
  orderBy?: ListOptions["orderBy"],
): T[] {
  if (!orderBy) return rows;
  const dir = orderBy.dir === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = a[orderBy.field] as string | number | null;
    const bv = b[orderBy.field] as string | number | null;
    if (av === bv) return 0;
    if (av === null || av === undefined) return 1;
    if (bv === null || bv === undefined) return -1;
    return av < bv ? -dir : dir;
  });
}
