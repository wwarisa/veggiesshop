/** ฟังก์ชันจัดรูปแบบตัวเลขและวันที่ ใช้ได้ทั้งฝั่งเซิร์ฟเวอร์และเบราว์เซอร์ */

const TH_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

const TH_DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

/** ตัดทศนิยมที่ไม่จำเป็นออก เช่น 45.00 → 45 แต่ 0.5 ยังเป็น 0.5 */
export function num(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return rounded.toLocaleString("th-TH", { maximumFractionDigits: 2 });
}

export function baht(value: number): string {
  return `${num(value)} บาท`;
}

/** ปัดเงินให้ลงตัวที่ทศนิยม 2 ตำแหน่ง กันเศษจากการคูณทศนิยม */
export function money(value: number): number {
  return Math.round(value * 100) / 100;
}

/** "2026-08-07" → "ศุกร์ที่ 7 ส.ค." */
export function thaiDate(iso: string, withDay = true): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const day = withDay ? `${TH_DAYS[d.getDay()]}ที่ ` : "";
  return `${day}${d.getDate()} ${TH_MONTHS_SHORT[d.getMonth()]}`;
}

/** ISO เต็ม → "7 ส.ค. 14:30 น." */
export function thaiDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${TH_MONTHS_SHORT[d.getMonth()]} ${hh}:${mm} น.`;
}

/** เก็บเบอร์โทรเป็นตัวเลขล้วน ใช้เป็นรหัสลูกค้า */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** 0812345678 → 081-234-5678 */
export function prettyPhone(phone: string): string {
  const p = normalizePhone(phone);
  if (p.length === 10) return `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}`;
  if (p.length === 9) return `${p.slice(0, 2)}-${p.slice(2, 5)}-${p.slice(5)}`;
  return phone;
}

export function isValidPhone(phone: string): boolean {
  const p = normalizePhone(phone);
  return p.length >= 9 && p.length <= 10 && p.startsWith("0");
}

/** วันที่วันนี้ในเขตเวลาไทย รูปแบบ YYYY-MM-DD */
export function todayISO(now: Date = new Date()): string {
  const bangkok = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60_000);
  return bangkok.toISOString().slice(0, 10);
}

/**
 * อ่านตัวเลขจากช่องที่ผู้ใช้กรอก แบบไม่ตัดอะไรทิ้งเงียบๆ
 *
 * คืน null เมื่อเป็นค่าว่างหรือไม่ใช่ตัวเลข เพื่อให้ผู้เรียกแยกได้ว่า
 * "ไม่ได้ใส่" กับ "ใส่มาผิด" ต่างกัน และเครื่องหมายลบไม่ถูกตัดทิ้ง
 * ชั้นตรวจสอบข้างในจึงมีโอกาสปฏิเสธค่าติดลบได้จริง
 */
export function parseAmount(text: string): number | null {
  const cleaned = text.trim().replace(/,/g, "");
  if (cleaned === "") return null;
  if (!/^-?\d*\.?\d+$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}
