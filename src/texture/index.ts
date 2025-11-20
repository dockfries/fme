import { INVALID_CATEGORY_ID } from "@/category";
import { g_ResourceDB } from "@/sqlite";
import { SafetyMap } from "@/utils/safetyMap";
import { GameMode } from "@infernus/core";

export const MAX_TEXTURES = 9064;
export const INVALID_TEXTURE_ID = -1;
export const MAX_TEXTURE_TXD = 19;

export interface ITextureCacheData {
  modelId: number;
  txd: string;
  name: string;
}

export const g_TextureCache = new SafetyMap<number, ITextureCacheData>(() => {
  return {
    modelId: 0,
    txd: "",
    name: "",
  };
});

GameMode.onExit(({ next }) => {
  g_TextureCache.clear();
  return next();
});

export function isValidTextureID(texture: number) {
  return texture >= 0 && texture < MAX_TEXTURES;
}

export function loadTextureCache() {
  const g_DBResult = g_ResourceDB
    .prepare("SELECT * FROM texture_data")
    .all() as {
    textureid: number;
    modelid: number;
    txd: string;
    name: string;
  }[];

  for (let row = 0, rows = g_DBResult.length; row < rows; row++) {
    const textureId = g_DBResult[row].textureid;

    if (isValidTextureID(textureId)) {
      g_TextureCache.get(textureId).modelId = g_DBResult[row].modelid;
      const g_TextureTXDString = g_DBResult[row].txd;
      const g_TextureNameString = g_DBResult[row].name;
      g_TextureCache.get(textureId).txd = g_TextureTXDString;
      g_TextureCache.get(textureId).name = g_TextureNameString;
    }
  }
}

export function getTextureID(modelId: number, txd: string, name: string) {
  let textureId = INVALID_TEXTURE_ID;

  const g_QueryString =
    "SELECT textureid FROM texture_data WHERE modelid = ? AND txd = ? AND name = ?";
  const g_DBResult = g_ResourceDB
    .prepare(g_QueryString)
    .get(modelId, txd, name) as { textureid: number } | undefined;

  if (g_DBResult) {
    textureId = g_DBResult.textureid;
  }

  return textureId;
}

export function getTextureData(textureId: number) {
  if (!isValidTextureID(textureId)) {
    return { modelId: -1, txd: "none", name: "none", ret: false };
  }

  return {
    modelId: g_TextureCache.get(textureId).modelId,
    txd: g_TextureCache.get(textureId).txd,
    name: g_TextureCache.get(textureId).name,
    ret: true,
  };
}

export function findTextures(
  result: number[],
  resultSize: number,
  search: string,
  categoryId: number,
  offset: number
) {
  let rowsAdded = 0;
  let maxOffset = 0;
  let g_QueryString = "";
  const _search = `%${search}%`;
  let g_DBResult: { max_rowcount: number; textureid: number }[] = [];

  if (categoryId === INVALID_CATEGORY_ID) {
    if (!search.trim().length) {
      for (let textureId = offset; textureId < MAX_TEXTURES; textureId++) {
        if (rowsAdded >= resultSize) {
          break;
        }

        result[rowsAdded++] = textureId;
      }

      maxOffset = MAX_TEXTURES - 1;

      return { rowsAdded, maxOffset };
    } else {
      g_QueryString =
        "\
                SELECT textureid, \
                (\
                    SELECT COUNT(*) \
                    FROM texture_data \
                    WHERE textureid LIKE ? OR modelid LIKE ? OR txd LIKE ? OR name LIKE ?\
                ) AS max_rowcount \
                FROM texture_data \
                WHERE textureid LIKE ? OR modelid LIKE ? OR txd LIKE ? OR name LIKE ? \
                LIMIT ? OFFSET ?";

      g_DBResult = g_ResourceDB
        .prepare(g_QueryString)
        .all(
          _search,
          _search,
          _search,
          _search,
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
                SELECT textureid, \
                (SELECT COUNT(*) FROM texture_category_bind WHERE categoryid = '?') AS max_rowcount \
                FROM texture_category_bind \
                WHERE categoryid = '?' \
                LIMIT ? OFFSET ?";
      g_DBResult = g_ResourceDB
        .prepare(g_QueryString)
        .all(categoryId, categoryId, resultSize, offset) as typeof g_DBResult;
    } else {
      g_QueryString = "SELECT b.textureid AS textureid,";

      let g_SubQueryString =
        "\
                (\
                    SELECT COUNT(*) FROM texture_category_bind b \
                    INNER JOIN texture_data d ON b.textureid = d.textureid \
                    WHERE b.categoryid = '?' AND (d.textureid LIKE ? OR d.modelid LIKE ? OR d.txd LIKE ? OR d.name LIKE ?)\
                ) AS max_rowcount ";

      g_QueryString += g_SubQueryString;

      g_SubQueryString =
        "\
                FROM texture_category_bind b \
                INNER JOIN texture_data d ON b.textureid = d.textureid \
                WHERE b.categoryid = '?' AND (d.textureid LIKE ? OR d.modelid LIKE ? OR d.txd LIKE ? OR d.name LIKE ?) \
                LIMIT ? OFFSET ?";

      g_QueryString += g_SubQueryString;

      g_DBResult = g_ResourceDB
        .prepare(g_QueryString)
        .all(
          categoryId,
          _search,
          _search,
          _search,
          _search,
          categoryId,
          _search,
          _search,
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

    result[rowsAdded++] = g_DBResult[row].textureid;
  }

  return { rowsAdded, maxOffset };
}
