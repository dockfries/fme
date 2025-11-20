import { g_ResourceDB } from "@/sqlite";

export const INVALID_FONT_ID = -1;
export const MAX_FONTS = 44;

export const g_FontCache: Record<number, string> = {};

export function isValidFontID(id: number) {
  return id >= 0 && id < MAX_FONTS;
}

export function getFontName(fontId: number) {
  if (!isValidFontID(fontId)) {
    return null;
  }
  return g_FontCache[fontId];
}

export function findFonts(
  result: number[],
  resultSize: number,
  search: string,
  offset: number
) {
  let rowsAdded = 0;
  let maxOffset = 0;

  if (!search.trim().length) {
    for (let fontId = offset; fontId < MAX_FONTS; fontId++) {
      if (rowsAdded >= resultSize) {
        break;
      }

      result[rowsAdded++] = fontId;
    }

    maxOffset = MAX_FONTS - 1;
  } else {
    const _search = `%${search}%`;
    const g_QueryString =
      "\
            SELECT fontid, \
            (SELECT COUNT(*) FROM font_data WHERE fontid LIKE ? OR name LIKE ?) AS max_rowcount \
            FROM font_data \
            WHERE fontid LIKE ? OR name LIKE ? \
            LIMIT ? OFFSET ?";

    const g_DBResult = g_ResourceDB
      .prepare(g_QueryString)
      .all(_search, _search, _search, _search, resultSize, offset) as {
      max_rowcount: number;
      fontid: number;
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

      result[rowsAdded++] = g_DBResult[row].fontid;
    }
  }
  return { rowsAdded, maxOffset };
}

export function loadFontCache() {
  const g_DBResult = g_ResourceDB.prepare("SELECT * FROM font_data").all() as {
    fontid: number;
    name: string;
  }[];
  const rows = g_DBResult.length;
  for (let row = 0; row < rows; row++) {
    const fontId = g_DBResult[row].fontid;
    if (isValidFontID(fontId)) {
      g_FontCache[fontId] = g_DBResult[row].name;
    }
  }
}
