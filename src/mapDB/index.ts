import { INVALID_MAP_ID } from "@/constants";
import { g_MapDB } from "@/sqlite";

export function createMapID(mapName: string) {
  const g_QueryString = "INSERT INTO maps (name) VALUES (?)";
  g_MapDB.prepare(g_QueryString).run(mapName);
}

export function destroyMapID(mapId: number) {
  const g_QueryString = "DELETE FROM maps WHERE mapid = ?";
  g_MapDB.prepare(g_QueryString).run(mapId);
}

export function getMapID(mapName: string) {
  let mapId = INVALID_MAP_ID;
  const g_QueryString = "SELECT mapid FROM maps WHERE lower(name) = ?";
  const g_DBResult = g_MapDB
    .prepare(g_QueryString)
    .get(mapName.toLowerCase()) as { mapid: number } | undefined;
  if (g_DBResult) {
    mapId = g_DBResult.mapid;
  }
  return mapId;
}

export function getMapName(mapId: number) {
  const g_QueryString = "SELECT name FROM maps WHERE mapid = ?";
  const g_DBResult = g_MapDB.prepare(g_QueryString).get(mapId) as
    | { name: string }
    | undefined;
  if (g_DBResult && g_DBResult.name) {
    return { ret: true, name: g_DBResult.name };
  }
  return { ret: false, name: "Unknown Map" };
}

export function findMaps(
  result: number[],
  resultSize: number,
  search: string,
  offset: number
) {
  let rowsAdded = 0;
  let maxOffset = 0;

  let g_QueryString = "";
  let g_DBResult: { mapid: number; max_rowcount: number }[] = [];

  if (!search.trim().length) {
    g_QueryString =
      "\
            SELECT mapid, \
            (SELECT COUNT(*) FROM maps) AS max_rowcount \
            FROM maps \
            LIMIT ? OFFSET ?";
    g_DBResult = g_MapDB
      .prepare(g_QueryString)
      .all(resultSize, offset) as typeof g_DBResult;
  } else {
    const _search = `%${search}%`;
    g_QueryString =
      "\
            SELECT mapid, \
            (SELECT COUNT(*) FROM maps WHERE mapid LIKE ? OR name LIKE ?) AS max_rowcount \
            FROM maps \
            WHERE mapid LIKE ? OR name LIKE ? \
            LIMIT ? OFFSET ?";
    g_DBResult = g_MapDB
      .prepare(g_QueryString)
      .all(
        _search,
        _search,
        _search,
        _search,
        resultSize,
        offset
      ) as typeof g_DBResult;
  }

  const resultRows = g_DBResult.length;

  if (resultRows > 0) {
    maxOffset = g_DBResult[0].max_rowcount - 1;
    if (maxOffset < 0) {
      maxOffset = 0;
    }
  }

  for (let row = 0; row < resultRows; row++) {
    if (rowsAdded >= resultSize) {
      break;
    }

    result[rowsAdded++] = g_DBResult[row].mapid;
  }

  return { rowsAdded, maxOffset };
}
