
import { openDB, IDBPDatabase } from 'idb';

export interface HistoryItem {
  id: string;
  timestamp: number;
  sketch: string;
  userContext: string;
  imagePrompt: string;
  generatedImage: string;
  videoPrompt: string;
  videoBlob: Blob | null;
  videoFileName: string;
}

const DB_NAME = 'sketch-to-cinema-db';
const STORE_NAME = 'history';

let dbPromise: Promise<IDBPDatabase> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

export async function saveHistoryItem(item: HistoryItem) {
  const db = await getDB();
  await db.put(STORE_NAME, item);
}

export async function getAllHistory() {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

export async function deleteHistoryItem(id: string) {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

export async function clearAllHistory() {
  const db = await getDB();
  await db.clear(STORE_NAME);
}
