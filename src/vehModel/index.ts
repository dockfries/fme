import { INVALID_CATEGORY_ID } from "@/category";
import { INVALID_ARRAY_INDEX } from "@/constants";
import { g_ResourceDB } from "@/sqlite";

export const MIN_VEHMODEL_ID = 400;
export const MAX_VEHMODEL_ID = 611;
export const MAX_VEHMODELS = 212;

export const g_VehModelNameCache: Record<number, string> = {};

export function isValidVehicleModel(id: number) {
  return id >= MIN_VEHMODEL_ID && id <= MAX_VEHMODEL_ID;
}

export function loadVehicleModelCache() {
  const g_DBResult = g_ResourceDB.prepare("SELECT * FROM veh_data").all() as {
    modelid: number;
    name: string;
  }[];

  for (let row = 0, rows = g_DBResult.length, modelId; row < rows; row++) {
    modelId = g_DBResult[row].modelid;
    if (isValidVehicleModel(modelId)) {
      g_VehModelNameCache[modelId - MIN_VEHMODEL_ID] = g_DBResult[row].name;
    }
  }
}

export function getVehicleModelCacheIndex(modelId: number) {
  if (!isValidVehicleModel(modelId)) {
    return INVALID_ARRAY_INDEX;
  }
  return modelId - MIN_VEHMODEL_ID;
}

export function getVehicleModelName(modelId: number) {
  if (!isValidVehicleModel(modelId)) {
    return null;
  }
  return g_VehModelNameCache[modelId - MIN_VEHMODEL_ID];
}

export function findVehicleModels(
  result: number[],
  resultSize: number,
  search: string,
  categoryId: number,
  offset: number
) {
  let rowsAdded = 0;
  let maxOffset = 0;
  let g_DBResult: { max_rowcount: number; modelid: number }[] = [];
  let g_QueryString = "";

  if (categoryId === INVALID_CATEGORY_ID) {
    if (!search.trim().length) {
      for (let i = offset; i < MAX_VEHMODELS; i++) {
        if (rowsAdded >= resultSize) {
          break;
        }

        result[rowsAdded++] = i + MIN_VEHMODEL_ID;
      }

      maxOffset = MAX_VEHMODELS - 1;

      return { rowsAdded, maxOffset };
    } else {
      const _search = `%${search}%`;
      g_QueryString =
        "\
                SELECT modelid, \
                (SELECT COUNT(*) FROM veh_data WHERE modelid LIKE ? OR name LIKE ?) AS max_rowcount \
                FROM veh_data \
                WHERE modelid LIKE ? OR name LIKE ? \
                LIMIT ? OFFSET ?";
      g_DBResult = g_ResourceDB
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
  } else {
    if (!search.trim().length) {
      g_QueryString =
        "\
                SELECT modelid, \
                (SELECT COUNT(*) FROM veh_category_bind WHERE categoryid = ?) AS max_rowcount \
                FROM veh_category_bind \
                WHERE categoryid = ? \
                LIMIT ? OFFSET ?";
      g_DBResult = g_ResourceDB
        .prepare(g_QueryString)
        .all(categoryId, categoryId, resultSize, offset) as typeof g_DBResult;
    } else {
      const _search = `%${search}%`;
      g_QueryString =
        "\
                SELECT b.modelid AS modelid, \
                (\
                    SELECT COUNT(*) \
                    FROM veh_category_bind b \
                    INNER JOIN veh_data d ON b.modelid = d.modelid \
                    WHERE b.categoryid = ? AND (d.modelid LIKE ? OR d.name LIKE ?) \
                ) AS max_rowcount \
                FROM veh_category_bind b \
                INNER JOIN veh_data d ON b.modelid = d.modelid \
                WHERE b.categoryid = ? AND (d.modelid LIKE ? OR d.name LIKE ?) \
                LIMIT ? OFFSET ?";
      g_DBResult = g_ResourceDB
        .prepare(g_QueryString)
        .all(
          categoryId,
          _search,
          _search,
          categoryId,
          _search,
          _search,
          resultSize,
          offset
        ) as typeof g_DBResult;
    }
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

    result[rowsAdded++] = g_DBResult[row].modelid;
  }

  return { rowsAdded, maxOffset };
}
