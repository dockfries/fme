import { g_ResourceDB } from "@/sqlite";

export const INVALID_ANIM_INDEX = 0;
export const MAX_ANIM_LIB = 12;
export const MIN_ANIM_ID = 1;
export const MAX_ANIM_ID = 1812;
export const MAX_ANIMS = MAX_ANIM_ID - MIN_ANIM_ID + 1;

export function findAnimations(
  result: number[],
  resultSize: number,
  search: string,
  offset: number
) {
  let rowsAdded = 0;
  let maxOffset = 0;

  if (!search.trim().length) {
    for (let animId = MIN_ANIM_ID + offset; animId <= MAX_ANIM_ID; animId++) {
      if (rowsAdded >= resultSize) {
        break;
      }

      result[rowsAdded++] = animId;
    }

    maxOffset = MAX_ANIMS - 1;
  } else {
    const g_QueryString = g_ResourceDB.prepare(
      "SELECT animidx, \
            (SELECT COUNT(*) FROM anim_data WHERE animidx LIKE ? OR lib LIKE ? OR name LIKE ?) AS max_rowcount \
            FROM anim_data \
            WHERE animidx LIKE ? OR lib LIKE ? OR name LIKE ? \
            LIMIT ? OFFSET ?"
    );

    const _search = `%${search}%`;

    const g_DBResult = g_QueryString.all(
      _search,
      _search,
      _search,
      _search,
      _search,
      _search,
      resultSize,
      offset
    ) as [{ animidx: number; max_rowcount: number }];

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

      result[rowsAdded++] = g_DBResult[row].animidx;
    }
  }

  return { rowsAdded, maxOffset };
}

export function getAnimationIndex(lib: string, name: string) {
  let index = INVALID_ANIM_INDEX;

  if (!lib.trim().length || !name.trim().length) {
    return index;
  }

  const g_QueryString = g_ResourceDB.prepare(
    "SELECT animidx FROM anim_data WHERE lib = @lib AND name = @name"
  );
  const g_DBResult = g_QueryString.get({ lib, name }) as
    | { animidx: number }
    | undefined;

  if (g_DBResult) {
    index = g_DBResult.animidx;
  }

  return index;
}
