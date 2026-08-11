import { ProductManager } from "@/components/ProductManager";
import { getCategories, getGroups, getProducts } from "@/lib/repo";
import { PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [products, categories, groups] = await Promise.all([
    getProducts(),
    getCategories(),
    getGroups(),
  ]);

  return (
    <>
      <PageTitle title="สินค้าทั้งหมด" sub={`มีอยู่ ${products.length} รายการ เพิ่มได้ไม่จำกัด`} />
      <ProductManager products={products} categories={categories} groups={groups} />
    </>
  );
}
