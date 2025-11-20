import Database from "better-sqlite3";

export const g_ResourceDB = new Database("scriptfiles/mapedit.db");
export const g_MapDB = new Database("scriptfiles/mapedit_maps.db");

g_ResourceDB.pragma("journal_mode = WAL");
g_MapDB.pragma("journal_mode = WAL");
