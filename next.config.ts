import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // แพ็กเกจฝั่งเซิร์ฟเวอร์ล้วน ไม่ต้องเอาไปรวมกับโค้ดที่ส่งให้เบราว์เซอร์
  serverExternalPackages: ["@google-cloud/firestore", "bcryptjs"],
};

export default nextConfig;
