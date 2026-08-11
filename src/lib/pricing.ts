import { money } from "./format";
import type { Group, Product, ProductUnit } from "./types";

/**
 * กฎเรื่องราคา รวมไว้ที่ไฟล์เดียว
 *
 * ราคามี 2 ชั้น
 *   1. ราคากลาง        อยู่ใน product.units[].price แก้ในหน้าแก้ราคาประจำวัน
 *   2. ราคาเฉพาะกลุ่ม  อยู่ใน group.prices["สินค้า|หน่วย"] เฉพาะตัวที่ตั้งทับไว้
 *
 * ทุกฟังก์ชันในไฟล์นี้ถูกเรียกจากฝั่งเซิร์ฟเวอร์เท่านั้นตอนคิดเงินจริง
 * ไม่เชื่อตัวเลขที่ส่งมาจากหน้าเว็บเด็ดขาด
 */

export function priceKey(productId: string, unitId: string): string {
  return `${productId}|${unitId}`;
}

/** ราคาที่ใช้จริงของหน่วยนี้ในกลุ่มนี้ */
export function effectivePrice(
  product: Product,
  unit: ProductUnit,
  group?: Group | null,
): number {
  const own = group?.prices?.[priceKey(product.id, unit.id)];
  return typeof own === "number" ? own : unit.price;
}

/** กลุ่มนี้ตั้งราคาเฉพาะของตัวเองไว้ไหม หรือยังใช้ราคากลางอยู่ */
export function hasGroupPrice(
  productId: string,
  unitId: string,
  group?: Group | null,
): boolean {
  return typeof group?.prices?.[priceKey(productId, unitId)] === "number";
}

export function findUnit(product: Product, unitId: string): ProductUnit | null {
  return product.units.find((u) => u.id === unitId) ?? null;
}

export interface CartLine {
  productId: string;
  unitId: string;
  qty: number;
}

export interface PricedLine {
  productId: string;
  productName: string;
  unitId: string;
  unitLabel: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
}

export interface PriceResult {
  lines: PricedLine[];
  subtotal: number;
  /** เหตุผลของรายการที่คิดเงินไม่ได้ เอาไว้บอกลูกค้าตรงๆ */
  rejected: { productId: string; unitId: string; reason: string }[];
}

/**
 * คิดราคาตะกร้าจากฝั่งเซิร์ฟเวอร์
 *
 * หน้าเว็บส่งมาแค่ รหัสสินค้า + รหัสหน่วย + จำนวน
 * ที่เหลือระบบไปดึงราคาปัจจุบันมาคูณเอง จึงปลอมราคาไม่ได้
 */
export function priceCart(
  lines: CartLine[],
  products: Product[],
  group?: Group | null,
): PriceResult {
  const byId = new Map(products.map((p) => [p.id, p]));
  const out: PricedLine[] = [];
  const rejected: PriceResult["rejected"] = [];

  for (const line of lines) {
    const product = byId.get(line.productId);
    if (!product || product.isDeleted) {
      rejected.push({ ...line, reason: "ไม่มีสินค้านี้แล้ว" });
      continue;
    }
    if (!product.isAvailable) {
      rejected.push({ ...line, reason: `${product.name} ปิดขายอยู่` });
      continue;
    }
    // ลิงก์ของกลุ่มขายเฉพาะสินค้าที่เจ้าของเลือกไว้เท่านั้น
    if (group && !group.productIds.includes(product.id)) {
      rejected.push({ ...line, reason: `${product.name} ไม่ได้ขายในลิงก์นี้` });
      continue;
    }
    const unit = findUnit(product, line.unitId);
    if (!unit || !unit.isAvailable) {
      rejected.push({ ...line, reason: `${product.name} ไม่มีหน่วยขายนี้แล้ว` });
      continue;
    }
    // กันจำนวนติดลบและกันค่าที่ไม่ใช่ตัวเลข
    const qty = money(Number(line.qty));
    if (!Number.isFinite(qty) || qty <= 0) {
      rejected.push({ ...line, reason: "จำนวนไม่ถูกต้อง" });
      continue;
    }

    const unitPrice = effectivePrice(product, unit, group);
    out.push({
      productId: product.id,
      productName: product.name,
      unitId: unit.id,
      unitLabel: unit.label,
      unitPrice,
      qty,
      lineTotal: money(unitPrice * qty),
    });
  }

  return {
    lines: out,
    subtotal: money(out.reduce((sum, l) => sum + l.lineTotal, 0)),
    rejected,
  };
}

/** สินค้าที่ลิงก์นี้ขาย เรียงตามลำดับที่เจ้าของจัดไว้ */
export function productsForGroup(products: Product[], group?: Group | null): Product[] {
  const live = products.filter((p) => !p.isDeleted);
  if (!group) return live.sort((a, b) => a.sortOrder - b.sortOrder);
  const byId = new Map(live.map((p) => [p.id, p]));
  return group.productIds
    .map((id) => byId.get(id))
    .filter((p): p is Product => Boolean(p));
}
