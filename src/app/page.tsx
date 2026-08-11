import Link from "next/link";
import { getCategories, getProducts, getShopSettings } from "@/lib/repo";
import { num } from "@/lib/format";

export const dynamic = "force-dynamic";

/** หน้าร้านของลูกค้า — เวอร์ชันเริ่มต้น ตะกร้ากับการสั่งซื้อมาในส่วนถัดไป */
export default async function Home() {
  const [shop, products, categories] = await Promise.all([
    getShopSettings(),
    getProducts(),
    getCategories(),
  ]);

  const catName = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <main className="mx-auto max-w-[460px] pb-16">
      <header className="bg-head px-4 pb-4 pt-3.5 text-[#f2f7ef]">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-white/15 text-xl">
            🥬
          </div>
          <div>
            <div className="text-[19px] font-bold">{shop.shopName}</div>
            <div className="text-[12.5px] opacity-80">ผักสดส่งถึงบ้าน · เก็บเงินปลายทาง</div>
          </div>
        </div>
        {shop.announcement && (
          <p className="mt-3 flex gap-2 rounded-[10px] bg-white/10 px-2.5 py-2 text-[13px]">
            <span aria-hidden>📣</span>
            <span>{shop.announcement}</span>
          </p>
        )}
      </header>

      {products.length === 0 ? (
        <p className="px-4 py-12 text-center text-ink-3">
          ยังไม่มีสินค้าในร้าน เจ้าของร้านเพิ่มได้ที่หน้าจัดการ
        </p>
      ) : (
        <div className="flex flex-col gap-3 p-3">
          {products.map((p) => (
            <article
              key={p.id}
              className={`flex gap-3 rounded-[14px] border border-line bg-surface p-3 ${
                p.isAvailable ? "" : "opacity-60"
              }`}
            >
              <div
                className={`relative grid h-[92px] w-[92px] flex-none place-items-center rounded-[11px] bg-leaf-soft text-[42px] leading-none ${
                  p.isAvailable ? "" : "grayscale"
                }`}
              >
                <span aria-hidden>{p.emoji}</span>
                {!p.isAvailable && (
                  <span className="absolute inset-x-1.5 bottom-1.5 rounded-md bg-ink py-0.5 text-center text-[11.5px] font-bold text-surface">
                    ของหมด
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-[18px] font-bold leading-tight">{p.name}</h2>
                <p className="text-[12.5px] text-ink-3">
                  {p.note || catName.get(p.categoryId) || ""}
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {p.units.map((u) => (
                    <li
                      key={u.id}
                      className="rounded-[10px] border border-line-strong px-2.5 py-1.5 leading-tight"
                    >
                      <span className="block text-[12px] text-ink-2">{u.label}</span>
                      <span className="num block text-[15px] font-bold text-price">
                        {num(u.price)} ฿
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="px-4 pt-2 text-center text-[12.5px] text-ink-3">
        <Link href="/admin" className="font-bold text-leaf underline-offset-4 hover:underline">
          เจ้าของร้านเข้าหน้าจัดการ
        </Link>
      </p>
    </main>
  );
}
