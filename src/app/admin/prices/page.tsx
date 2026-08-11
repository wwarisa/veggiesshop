import Link from "next/link";
import { PriceEditor } from "@/components/PriceEditor";
import { getGroups, getProducts } from "@/lib/repo";
import { COL, db } from "@/lib/db";
import { PageTitle } from "@/components/ui";
import type { PriceHistory } from "@/lib/types";

export const dynamic = "force-dynamic";

/** แก้ราคาประจำวัน — หน้าที่เจ้าของร้านใช้ทุกวัน ต้องเร็วที่สุด */
export default async function PricesPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { scope } = await searchParams;
  const [products, groups, history] = await Promise.all([
    getProducts(),
    getGroups(),
    db().list<PriceHistory>(COL.priceHistory),
  ]);

  const activeScope = scope && groups.some((g) => g.id === scope) ? scope : "base";
  const group = groups.find((g) => g.id === activeScope) ?? null;

  const shown = group
    ? group.productIds
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is (typeof products)[number] => Boolean(p))
    : products;

  const recent = history
    .sort((a, b) => b.changedAt.localeCompare(a.changedAt))
    .slice(0, 40);

  return (
    <>
      <PageTitle
        title="แก้ราคาประจำวัน"
        sub="แก้กี่ช่องก็ได้ในหน้าเดียว แล้วกดบันทึกครั้งเดียวจบ ราคาใหม่ขึ้นหน้าเว็บทันที"
      />

      <nav className="mb-3 flex flex-wrap gap-1.5" aria-label="เลือกว่ากำลังแก้ราคาของใคร">
        <Link
          href="/admin/prices"
          aria-current={activeScope === "base" ? "page" : undefined}
          className={`min-h-[42px] rounded-full border px-4 py-2 text-[14px] font-bold ${
            activeScope === "base"
              ? "border-leaf bg-leaf text-white"
              : "border-line-strong bg-surface text-ink-2"
          }`}
        >
          ราคากลาง (ใช้ทุกที่)
        </Link>
        {groups.map((g) => (
          <Link
            key={g.id}
            href={`/admin/prices?scope=${g.id}`}
            aria-current={activeScope === g.id ? "page" : undefined}
            className={`min-h-[42px] rounded-full border px-4 py-2 text-[14px] font-bold ${
              activeScope === g.id
                ? "border-leaf bg-leaf text-white"
                : "border-line-strong bg-surface text-ink-2"
            }`}
          >
            {g.name}
          </Link>
        ))}
      </nav>

      <PriceEditor
        scope={activeScope}
        scopeName={group?.name ?? ""}
        products={shown}
        groupPrices={group?.prices ?? {}}
        history={recent}
      />
    </>
  );
}
