import Database from "better-sqlite3";
import { logger } from "@/logger";

function openDB(path: string) {
  try {
    const db = new Database(path);
    db.pragma("journal_mode = WAL");
    return db;
  } catch (e) {
    logger.error(`ERROR: ${path} failed to open!`);
    throw e;
  }
}

export const g_ResourceDB = openDB("scriptfiles/mapedit.db");
export const g_MapDB = openDB("scriptfiles/mapedit_maps.db");
