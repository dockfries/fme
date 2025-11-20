import { g_ResourceDB } from "@/sqlite";
import { SafetyMap } from "@/utils/safetyMap";
import { GameMode } from "@infernus/core";

export const MAX_VEHCOLORS = 256;
export const MIN_VEHCOLOR_ID = 0;
export const MAX_VEHCOLOR_ID = 255;

export interface IVehColorCacheData {
  rgb: number;
  name: string;
}

export const g_VehColorCache = new SafetyMap<number, IVehColorCacheData>(() => {
  return {
    rgb: 0,
    name: "",
  };
});

GameMode.onExit(({ next }) => {
  g_VehColorCache.clear();
  return next();
});

export function isValidVehicleColor(color: number) {
  return color >= 0 && color < MAX_VEHCOLORS;
}

export function loadVehicleColorCache() {
  const g_DBResult = g_ResourceDB
    .prepare("SELECT * FROM vehcolor_data")
    .all() as { colorid: number; rgb: number; name: string }[];

  for (let row = 0, rows = g_DBResult.length; row < rows; row++) {
    const colorId = g_DBResult[row].colorid;
    if (isValidVehicleColor(colorId)) {
      g_VehColorCache.get(colorId).rgb = g_DBResult[row].rgb;
      const g_VehColorString = g_DBResult[row].name;
      g_VehColorCache.get(colorId).name = g_VehColorString;
    }
  }
}

export function getVehicleColorRGB(colorId: number) {
  if (isValidVehicleColor(colorId)) {
    return g_VehColorCache.get(colorId).rgb;
  }
  return 0x000000;
}

export function getVehicleColorName(colorId: number) {
  if (isValidVehicleColor(colorId)) {
    return g_VehColorCache.get(colorId).name;
  }
  return "Unknown Color";
}

export function findVehicleColors(
  result: number[],
  resultSize: number,
  search: string,
  offset: number
) {
  let rowsAdded = 0;
  let maxOffset = 0;

  if (!search.trim().length) {
    for (let colorid = offset; colorid < MAX_VEHCOLORS; colorid++) {
      if (rowsAdded >= resultSize) {
        break;
      }

      result[rowsAdded++] = colorid;
    }

    maxOffset = MAX_VEHCOLORS - 1;
  } else {
    const _search = `%${search}%`;
    const g_QueryString =
      "\
            SELECT colorid, \
            (SELECT COUNT(*) FROM vehcolor_data WHERE colorid LIKE ? OR name LIKE ?) AS max_rowcount \
            FROM vehcolor_data \
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
