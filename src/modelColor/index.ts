import { g_ResourceDB } from "@/sqlite";
import { SafetyMap } from "@/utils/safetyMap";

export const MAX_MODELCOLORS = 138;

export interface IModelColorCacheData {
  rgb: number;
  name: string;
}

export const g_ModelColorCache = new SafetyMap<number, IModelColorCacheData>(
  () => {
    return {
      rgb: 0,
      name: "",
    };
  }
);

export function isValidModelColor(color: number) {
  return color >= 0 && color < MAX_MODELCOLORS;
}

export function loadModelColorCache() {
  const g_DBResult = g_ResourceDB
    .prepare("SELECT * FROM modelcolor_data")
    .all() as { colorid: number; rgb: number; name: string }[];

  for (let row = 0, rows = g_DBResult.length; row < rows; row++) {
    const colorId = g_DBResult[row].colorid;
    if (isValidModelColor(colorId)) {
      g_ModelColorCache.get(colorId).rgb = g_DBResult[row].rgb;
      const g_ModelColorString = g_DBResult[row].name;
      g_ModelColorCache.get(colorId).name = g_ModelColorString;
    }
  }
}

export function getModelColorRGB(colorId: number) {
  if (isValidModelColor(colorId)) {
    return g_ModelColorCache.get(colorId).rgb;
  }
  return 0x000000;
}

export function getModelColorName(colorId: number) {
  if (isValidModelColor(colorId)) {
    return { ret: true, name: g_ModelColorCache.get(colorId).name };
  }
  return { ret: false, name: "Unknown Color" };
}

export function findModelColors(
  result: number[],
  resultSize: number,
  search: string,
  offset: number
) {
  let rowsAdded = 0;
  let maxOffset = 0;

  if (!search.trim().length) {
    for (let colorId = offset; colorId < MAX_MODELCOLORS; colorId++) {
      if (rowsAdded >= resultSize) {
        break;
      }

      result[rowsAdded++] = colorId;
    }

    maxOffset = MAX_MODELCOLORS - 1;
  } else {
    const _search = `%${search}%`;
    const g_QueryString =
      "\
            SELECT colorid, \
            (SELECT COUNT(*) FROM modelcolor_data WHERE colorid LIKE ? OR name LIKE ?) AS max_rowcount \
            FROM modelcolor_data \
            WHERE colorid LIKE ? OR name LIKE ? \
            LIMIT ? OFFSET ?";

    const g_DBResult = g_ResourceDB
      .prepare(g_QueryString)
      .all(_search, _search, _search, _search, resultSize, offset) as {
      max_rowcount: number;
      colorid: number;
    }[];

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

      result[rowsAdded++] = g_DBResult[row].colorid;
    }
  }

  return { rowsAdded, maxOffset };
}
