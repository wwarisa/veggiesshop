"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="min-h-[52px] rounded-[12px] bg-leaf px-5 text-[16px] font-bold text-white"
    >
      🖨 สั่งพิมพ์
    </button>
  );
}
