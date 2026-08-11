import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session-token";

/**
 * กันคนนอกเข้าหน้าจัดการ
 *
 * ทุกเส้นทางใต้ /admin ต้องมี session ที่ถูกต้อง ไม่งั้นเด้งไปหน้าใส่รหัส
 * ตรงนี้เป็นด่านแรกเท่านั้น ทุก action ที่แก้ข้อมูลยังตรวจซ้ำอีกชั้นที่ตัวมันเอง
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // เข้ามาแล้วแต่ยังวนอยู่หน้าใส่รหัส ส่งเข้าหน้าจัดการเลย
  if (pathname === "/admin/login" && session) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !session) {
    const url = new URL("/admin/login", request.url);
    // จำไว้ว่าจะกลับไปหน้าไหนหลังใส่รหัสถูก
    if (pathname !== "/admin") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
