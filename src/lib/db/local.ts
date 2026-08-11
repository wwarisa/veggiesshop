import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { COL, matches, sortRows, type ListOptions, type Store } from "./store";

/**
 * ที่เก็บข้อมูลแบบไฟล์ในเครื่อง — ใช้ตอนลองใช้งานก่อนสมัคร Firebase
 *
 * เก็บคอลเลกชันละ 1 ไฟล์ JSON ในโฟลเดอร์ .data/
 * เขียนแบบเขียนไฟล์ชั่วคราวก่อนแล้วค่อยสลับชื่อ ไฟล์จึงไม่พังกลางคัน
 * ทุกการเขียนต่อคิวกัน ข้อมูลจึงไม่ชนกันเวลามีหลายคำขอพร้อมกัน
 */

/** หาโฟลเดอร์เก็บข้อมูลตอนใช้จริง ไม่ใช่ตอนโหลดไฟล์ */
function dataDir(): string {
  return process.env.LOCAL_DATA_DIR || join(process.cwd(), ".data");
}

type Row = Record<string, unknown> & { id: string };

/** อ่านมาแล้วเก็บไว้ในหน่วยความจำ ไม่ต้องอ่านไฟล์ซ้ำทุกครั้ง */
const cache = new Map<string, Row[]>();

/** คิวการเขียน กันสองคำขอเขียนไฟล์เดียวกันพร้อมกัน */
let writeChain: Promise<unknown> = Promise.resolve();

function fileOf(collection: string): string {
  return join(dataDir(), `${collection}.json`);
}

async function load(collection: string): Promise<Row[]> {
  const cached = cache.get(collection);
  if (cached) return cached;
  try {
    const raw = await readFile(fileOf(collection), "utf8");
    const rows = JSON.parse(raw) as Row[];
    cache.set(collection, rows);
    return rows;
  } catch {
    cache.set(collection, []);
    return [];
  }
}

async function save(collection: string, rows: Row[]): Promise<void> {
  cache.set(collection, rows);
  writeChain = writeChain.then(async () => {
    const path = fileOf(collection);
    await mkdir(dirname(path), { recursive: true });
    const tmp = `${path}.tmp`;
    await writeFile(tmp, JSON.stringify(rows, null, 2), "utf8");
    await rename(tmp, path);
  });
  await writeChain;
}

export function createLocalStore(): Store {
  return {
    driver: "local",

    async get<T>(collection: string, id: string): Promise<T | null> {
      const rows = await load(collection);
      return (rows.find((r) => r.id === id) as T | undefined) ?? null;
    },

    async list<T>(collection: string, options: ListOptions = {}): Promise<T[]> {
      const rows = await load(collection);
      const filtered = rows.filter((r) => matches(r, options.where));
      const sorted = sortRows(filtered, options.orderBy);
      return (options.limit ? sorted.slice(0, options.limit) : sorted) as T[];
    },

    async set<T extends { id: string }>(collection: string, value: T): Promise<T> {
      const rows = [...(await load(collection))];
      const at = rows.findIndex((r) => r.id === value.id);
      if (at === -1) rows.push(value as unknown as Row);
      else rows[at] = value as unknown as Row;
      await save(collection, rows);
      return value;
    },

    async update(collection, id, patch): Promise<void> {
      const rows = [...(await load(collection))];
      const at = rows.findIndex((r) => r.id === id);
      if (at === -1) throw new Error(`ไม่พบข้อมูล ${collection}/${id}`);
      rows[at] = { ...rows[at], ...patch, id };
      await save(collection, rows);
    },

    async remove(collection, id): Promise<void> {
      const rows = (await load(collection)).filter((r) => r.id !== id);
      await save(collection, rows);
    },

    async nextSeq(name: string): Promise<number> {
      // ต่อคิวไว้ในสายเดียวกับการเขียน เลขจึงไม่ซ้ำแม้มีหลายคำขอพร้อมกัน
      const run = writeChain.then(async () => {
        const rows = [...(await load(COL.counters))];
        const at = rows.findIndex((r) => r.id === name);
        const next = at === -1 ? 1 : ((rows[at].value as number) ?? 0) + 1;
        if (at === -1) rows.push({ id: name, value: next });
        else rows[at] = { id: name, value: next };
        cache.set(COL.counters, rows);
        const path = fileOf(COL.counters);
        await mkdir(dirname(path), { recursive: true });
        const tmp = `${path}.tmp`;
        await writeFile(tmp, JSON.stringify(rows, null, 2), "utf8");
        await rename(tmp, path);
        return next;
      });
      writeChain = run;
      return run;
    },
  };
}

/** ล้างที่จำไว้ ใช้ตอนใส่ข้อมูลตัวอย่างใหม่ */
export function clearLocalCache(): void {
  cache.clear();
}
