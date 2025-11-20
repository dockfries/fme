import { INVALID_CATEGORY_ID } from "@/category";
import { g_ResourceDB } from "@/sqlite";

export const MAX_SKINS = 312;

export const g_SkinNameCache: Record<number, string> = {};

export function isValidSkin(skinId: number) {
  return skinId >= 0 && skinId < MAX_SKINS && skinId !== 74;
}

export function loadSkinCache() {
  const g_DBResult = g_ResourceDB.prepare("SELECT * FROM skin_data").all() as {
    modelid: number;
    name: string;
  }[];
  g_DBResult.forEach((row) => {
    const skinId = row.modelid;
    if (isValidSkin(skinId)) {
      g_SkinNameCache[skinId] = row.name;
    }
  });
}

export function getSkinName(skinId: number) {
  if (!isValidSkin(skinId)) return null;
  return g_SkinNameCache[skinId] || null;
}

export function findSkins(
  result: number[],
  resultSize: number,
  search: string,
  categoryId: number,
  offset: number
) {
  let rowsAdded = 0;
  let maxOffset = 0;
  let g_QueryString = "";
  let g_DBResult: {
    modelid: number;
    max_rowcount: number;
  }[] = [];

  if (categoryId === INVALID_CATEGORY_ID) {
    if (!search.trim().length) {
      for (let skinId = offset; skinId < MAX_SKINS; skinId++) {
        if (rowsAdded >= resultSize) {
          break;
        }

        result[rowsAdded++] = skinId;
      }

      maxOffset = MAX_SKINS - 1;

      return { rowsAdded, maxOffset };
    } else {
      const _search = `%${search}%`;
      g_QueryString =
        "\
                SELECT modelid, \
                (SELECT COUNT(*) FROM skin_data WHERE modelid LIKE ? OR name LIKE ?) AS max_rowcount \
                FROM skin_data \
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
                (SELECT COUNT(*) FROM skin_category_bind WHERE categoryid = ?) AS max_rowcount \
                FROM skin_category_bind \
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
                    FROM skin_category_bind b \
                    INNER JOIN skin_data d ON b.modelid = d.modelid \
                    WHERE b.categoryid = ? AND (d.modelid LIKE ? OR d.name LIKE ?)\
                ) AS max_rowcount \
                FROM skin_category_bind b \
                INNER JOIN skin_data d ON b.modelid = d.modelid \
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
