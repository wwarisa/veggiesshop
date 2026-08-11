import { Firestore, type Settings } from "@google-cloud/firestore";
import { COL, type ListOptions, type Store } from "./store";

/**
 * ที่เก็บข้อมูลจริงบน Cloud Firestore แพลนฟรี
 *
 * ใช้ @google-cloud/firestore ตรงๆ ไม่ผ่าน firebase-admin
 * เพราะเราไม่ได้ใช้ Storage กับ Auth ของ Firebase เลย จึงไม่ต้องลากมาด้วย
 */

let db: Firestore | null = null;

function getDb(): Firestore {
  if (db) return db;

  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  const clientEmail = process.env.FIRESTORE_CLIENT_EMAIL;
  const privateKey = process.env.FIRESTORE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  const settings: Settings = { projectId };
  if (clientEmail && privateKey) {
    settings.credentials = { client_email: clientEmail, private_key: privateKey };
  }

  db = new Firestore(settings);
  return db;
}

/** Firestore เก็บ undefined ไม่ได้ ต้องตัดทิ้งก่อน */
function clean<T extends Record<string, unknown>>(value: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    if (v !== undefined) out[key] = v;
  }
  return out;
}

export function createFirestoreStore(): Store {
  return {
    driver: "firestore",

    async get<T>(collection: string, id: string): Promise<T | null> {
      const snap = await getDb().collection(collection).doc(id).get();
      return snap.exists ? ({ ...snap.data(), id: snap.id } as T) : null;
    },

    async list<T>(collection: string, options: ListOptions = {}): Promise<T[]> {
      let query = getDb().collection(collection) as FirebaseFirestore.Query;
      for (const [field, op, value] of options.where ?? []) {
        query = query.where(field, op, value);
      }
      if (options.orderBy) {
        query = query.orderBy(options.orderBy.field, options.orderBy.dir ?? "asc");
      }
      if (options.limit) query = query.limit(options.limit);
      const snap = await query.get();
      return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as T);
    },

    async set<T extends { id: string }>(collection: string, value: T): Promise<T> {
      await getDb()
        .collection(collection)
        .doc(value.id)
        .set(clean(value as unknown as Record<string, unknown>));
      return value;
    },

    async update(collection, id, patch): Promise<void> {
      await getDb().collection(collection).doc(id).update(clean(patch));
    },

    async remove(collection, id): Promise<void> {
      await getDb().collection(collection).doc(id).delete();
    },

    async nextSeq(name: string): Promise<number> {
      // ใช้ transaction เลขที่ออเดอร์จึงไม่ซ้ำกันแม้ลูกค้ากดสั่งพร้อมกันหลายคน
      const ref = getDb().collection(COL.counters).doc(name);
      return getDb().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const next = (snap.exists ? (snap.data()?.value as number) : 0) + 1;
        tx.set(ref, { value: next });
        return next;
      });
    },
  };
}

/** ตั้งค่าครบพอที่จะต่อ Firestore ได้หรือยัง */
export function hasFirestoreConfig(): boolean {
  return Boolean(
    process.env.GOOGLE_CLOUD_PROJECT &&
      process.env.FIRESTORE_CLIENT_EMAIL &&
      process.env.FIRESTORE_PRIVATE_KEY,
  );
}
