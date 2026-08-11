import { effectivePrice, productsForGroup } from "./pricing";
import { getCategories, getGroup, getProducts, getPublicOpenRounds, getShopSettings } from "./repo";
import type { Group, Round } from "./types";

/** เตรียมข้อมูลให้หน้าร้าน ใช้ร่วมกันทั้งหน้าเว็บหลักและลิงก์ของกลุ่ม */
export async function buildShopView(group: Group | null, round: Round | null) {
  const [shop, allProducts, categories, publicRounds] = await Promise.all([
    getShopSettings(),
    getProducts(),
    getCategories(),
    getPublicOpenRounds(),
  ]);

  const products = productsForGroup(allProducts, group);

  // ราคาที่ใช้จริงในบริบทนี้ ส่งไปให้หน้าเว็บแสดง แต่ตอนคิดเงินเซิร์ฟเวอร์คิดใหม่เองอยู่ดี
  const priceMap: Record<string, number> = {};
  for (const p of products) {
    for (const u of p.units) {
      priceMap[`${p.id}|${u.id}`] = effectivePrice(p, u, group);
    }
  }

  return { shop, products, categories, publicRounds, priceMap, group, round };
}

export async function groupOf(round: Round | null): Promise<Group | null> {
  return round ? getGroup(round.groupId) : null;
}
