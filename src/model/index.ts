import { INVALID_CATEGORY_ID } from "@/category";
import { INVALID_ARRAY_INDEX } from "@/constants";
import { g_ResourceDB } from "@/sqlite";
import { SafetyMap } from "@/utils/safetyMap";
import { GameMode } from "@infernus/core";

export const MIN_MODEL_ID = 320;
export const MAX_MODEL_ID = 19999;
export const MAX_MODELS = 11404;

export interface IModelCacheData {
  id: number;
  name: string;
  sphereRadius: number;
  sphereOffX: number;
  sphereOffY: number;
  sphereOffZ: number;
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

export const g_ModelCache = new SafetyMap<number, IModelCacheData>(() => {
  return {
    id: 0,
    name: "",
    sphereRadius: 0,
    sphereOffX: 0,
    sphereOffY: 0,
    sphereOffZ: 0,
    minX: 0,
    minY: 0,
    minZ: 0,
    maxX: 0,
    maxY: 0,
    maxZ: 0,
  };
});

export const g_ModelCacheIndex: Record<number, number> = {};

GameMode.onExit(({ next }) => {
  g_ModelCache.clear();
  return next();
});

let g_ModelCacheLimit = 0;

export function loadModelCache() {
  g_ModelCacheLimit = 0;

  const g_DBResult = g_ResourceDB.prepare("SELECT * FROM model_data").all() as {
    name: string;
    max_z: number;
    max_y: number;
    max_x: number;
    min_z: number;
    min_y: number;
    min_x: number;
    sphere_off_z: number;
    sphere_off_y: number;
    sphere_off_x: number;
    sphere_radius: number;
    modelid: number;
  }[];

  for (let row = 0, rows = g_DBResult.length; row < rows; row++) {
    if (g_ModelCacheLimit < MAX_MODELS) {
      const modelId = g_DBResult[row].modelid;

      if (modelId >= MIN_MODEL_ID && modelId <= MAX_MODEL_ID) {
        g_ModelCacheIndex[modelId - MIN_MODEL_ID] = g_ModelCacheLimit;
      }

      g_ModelCache.get(g_ModelCacheLimit).id = modelId;
      g_ModelCache.get(g_ModelCacheLimit).sphereRadius =
        g_DBResult[row].sphere_radius;
      g_ModelCache.get(g_ModelCacheLimit).sphereOffX =
        g_DBResult[row].sphere_off_x;
      g_ModelCache.get(g_ModelCacheLimit).sphereOffY =
        g_DBResult[row].sphere_off_y;
      g_ModelCache.get(g_ModelCacheLimit).sphereOffZ =
        g_DBResult[row].sphere_off_z;
      g_ModelCache.get(g_ModelCacheLimit).minX = g_DBResult[row].min_x;
      g_ModelCache.get(g_ModelCacheLimit).minY = g_DBResult[row].min_y;
      g_ModelCache.get(g_ModelCacheLimit).minZ = g_DBResult[row].min_z;
      g_ModelCache.get(g_ModelCacheLimit).maxX = g_DBResult[row].max_x;
      g_ModelCache.get(g_ModelCacheLimit).maxY = g_DBResult[row].max_y;
      g_ModelCache.get(g_ModelCacheLimit).maxZ = g_DBResult[row].max_z;

      const g_ModelString = g_DBResult[row].name;
      g_ModelCache.get(g_ModelCacheLimit).name = g_ModelString;
    }
    g_ModelCacheLimit++;
  }
}

export function findModels(
  result: number[],
  resultSize: number,
  search: string,
  categoryId: number,
  offset: number
) {
  let rowsAdded = 0;
  let maxOffset = 0;
  let g_QueryString = "";
  let g_DBResult: { max_rowcount: number; modelid: number }[] = [];

  const _search = `%${search}%`;

  if (categoryId === INVALID_CATEGORY_ID) {
    if (!search.trim().length) {
      for (let i = offset; i < g_ModelCacheLimit; i++) {
        if (rowsAdded >= resultSize) {
          break;
        }

        result[rowsAdded++] = g_ModelCache.get(i).id;
      }

      maxOffset = g_ModelCacheLimit - 1;

      return { rowsAdded, maxOffset };
    } else {
      g_QueryString =
        "\
                SELECT modelid, \
                (SELECT COUNT(*) FROM model_data WHERE modelid LIKE ? OR name LIKE ?) AS max_rowcount \
                FROM model_data \
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
                (SELECT COUNT(*) FROM model_category_bind WHERE categoryid = '?') AS max_rowcount \
                FROM model_category_bind \
                WHERE categoryid = '?' \
                LIMIT ? OFFSET ?";
      g_DBResult = g_ResourceDB
        .prepare(g_QueryString)
        .all(categoryId, categoryId, resultSize, offset) as typeof g_DBResult;
    } else {
      g_QueryString =
        "\
                SELECT b.modelid AS modelid, \
                (\
                    SELECT COUNT(*) \
                    FROM model_category_bind b \
                    INNER JOIN model_data d ON b.modelid = d.modelid \
                    WHERE b.categoryid = '?' AND (d.modelid LIKE ? OR d.name LIKE ?)\
                ) AS max_rowcount \
                FROM model_category_bind b \
                INNER JOIN model_data d ON b.modelid = d.modelid \
                WHERE b.categoryid = '?' AND (d.modelid LIKE ? OR d.name LIKE ?) \
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

export function getModelCacheIndex(modelId: number) {
  if (modelId >= MIN_MODEL_ID && modelId <= MAX_MODEL_ID) {
    const cacheIndex = g_ModelCacheIndex[modelId - MIN_MODEL_ID];

    if (g_ModelCache.get(cacheIndex).id === modelId) {
      return cacheIndex;
    }
  }
  return INVALID_ARRAY_INDEX;
}

export function getModelName(modelId: number) {
  const cacheIndex = getModelCacheIndex(modelId);
  if (cacheIndex === INVALID_ARRAY_INDEX) {
    return { name: "Unknown Model", ret: false };
  }

  return { name: g_ModelCache.get(cacheIndex).name, ret: true };
}

export function getModelSphere(modelId: number) {
  const cacheIndex = getModelCacheIndex(modelId);
  if (cacheIndex === INVALID_ARRAY_INDEX) {
    return { ret: false, radius: 0, offX: 0, offY: 0, offZ: 0 };
  }

  const radius = g_ModelCache.get(cacheIndex).sphereRadius;
  const offX = g_ModelCache.get(cacheIndex).sphereOffX;
  const offY = g_ModelCache.get(cacheIndex).sphereOffY;
  const offZ = g_ModelCache.get(cacheIndex).sphereOffZ;
  return { ret: true, radius, offX, offY, offZ };
}

export function getModelMinMaxXYZ(modelId: number) {
  const cacheIndex = getModelCacheIndex(modelId);
  if (cacheIndex === INVALID_ARRAY_INDEX) {
    return { ret: false, minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 };
  }

  const minX = g_ModelCache.get(cacheIndex).minX;
  const minY = g_ModelCache.get(cacheIndex).minY;
  const minZ = g_ModelCache.get(cacheIndex).minZ;
  const maxX = g_ModelCache.get(cacheIndex).maxX;
  const maxY = g_ModelCache.get(cacheIndex).maxY;
  const maxZ = g_ModelCache.get(cacheIndex).maxZ;
  return { ret: true, minX, minY, minZ, maxX, maxY, maxZ };
}

export function getModelMinX(modelId: number) {
  const cacheIndex = getModelCacheIndex(modelId);
  if (cacheIndex === INVALID_ARRAY_INDEX) {
    return { ret: false, min: 0 };
  }
  const min = g_ModelCache.get(cacheIndex).minX;
  return { ret: true, min };
}

export function getModelMinY(modelId: number) {
  const cacheIndex = getModelCacheIndex(modelId);
  if (cacheIndex === INVALID_ARRAY_INDEX) {
    return { ret: false, min: 0 };
  }
  const min = g_ModelCache.get(cacheIndex).minY;
  return { ret: true, min };
}

export function getModelMinZ(modelId: number) {
  const cacheIndex = getModelCacheIndex(modelId);
  if (cacheIndex === INVALID_ARRAY_INDEX) {
    return { ret: false, min: 0 };
  }
  const min = g_ModelCache.get(cacheIndex).minZ;
  return { ret: true, min };
}

export function getModelMaxX(modelId: number) {
  const cacheIndex = getModelCacheIndex(modelId);
  if (cacheIndex === INVALID_ARRAY_INDEX) {
    return { ret: false, max: 0 };
  }
  const max = g_ModelCache.get(cacheIndex).maxX;
  return { ret: true, max };
}

export function getModelMaxY(modelId: number) {
  const cacheIndex = getModelCacheIndex(modelId);
  if (cacheIndex === INVALID_ARRAY_INDEX) {
    return { ret: false, max: 0 };
  }
  const max = g_ModelCache.get(cacheIndex).maxY;
  return { ret: true, max };
}

export function getModelMaxZ(modelId: number) {
  const cacheIndex = getModelCacheIndex(modelId);
  if (cacheIndex === INVALID_ARRAY_INDEX) {
    return { ret: false, max: 0 };
  }
  const max = g_ModelCache.get(cacheIndex).maxZ;
  return { ret: true, max };
}
