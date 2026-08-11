import Link from "next/link";

/** หน้าไม่พบ — ภาษาไทยเหมือนหน้าอื่นทั้งเว็บ */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[460px] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-[40px] leading-none" aria-hidden>
        🥬
      </p>
      <h1 className="text-[22px] font-extrabold">ไม่เจอหน้าที่ต้องการ</h1>
      <p className="text-[14.5px] leading-relaxed text-ink-2">
        ลิงก์อาจพิมพ์ผิด หรือรอบส่งนี้ถูกลบไปแล้ว
        ลองเช็กลิงก์อีกครั้ง หรือกลับไปหน้าร้านเพื่อเลือกของใหม่
      </p>
      <div className="mt-2 flex w-full flex-col gap-2.5">
        <Link
          href="/"
          className="grid min-h-[52px] place-items-center rounded-[12px] bg-leaf text-[16px] font-bold text-white"
        >
          ไปหน้าร้าน
        </Link>
        <Link
          href="/track"
          className="grid min-h-[50px] place-items-center rounded-[12px] border border-line-strong bg-surface font-bold"
        >
          ติดตามออเดอร์ที่สั่งไว้
        </Link>
      </div>
    </main>
  );
}
