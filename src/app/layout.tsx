import type { Metadata, Viewport } from "next";
import { getShopSettings } from "@/lib/repo";
import "./globals.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const shop = await getShopSettings();
  return {
    title: `${shop.shopName} — ผักสดส่งถึงบ้าน`,
    description: "สั่งผักสดออนไลน์ ส่งถึงบ้าน เก็บเงินปลายทาง",
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // ให้แถบบนของมือถือกลมกลืนกับหัวเว็บ
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#24501e" },
    { media: "(prefers-color-scheme: dark)", color: "#1b2c18" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
