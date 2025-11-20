import { g_ResourceDB } from "@/sqlite";

export const INVALID_CATEGORY_ID = 0;
export const INVALID_CATEGORY_BIND_ID = 0;

export function isModelCategoryIDCreated(categoryId: number) {
  const g_QueryString =
    "SELECT * FROM model_category_data WHERE categoryid = ?";
  const g_DBResult = g_ResourceDB.prepare(g_QueryString).get(categoryId);
  return !!g_DBResult;
}

export function isVehicleCategoryIDCreated(categoryId: number) {
  const g_QueryString = "SELECT * FROM veh_category_data WHERE categoryid = ?";
  const g_DBResult = g_ResourceDB.prepare(g_QueryString).get(categoryId);
  return !!g_DBResult;
}

export function isSkinCategoryIDCreated(categoryId: number) {
  const g_QueryString = "SELECT * FROM skin_category_data WHERE categoryid = ?";
  const g_DBResult = g_ResourceDB.prepare(g_QueryString).get(categoryId);
  return !!g_DBResult;
}

export function isTextureCategoryIDCreated(categoryId: number) {
  const g_QueryString =
    "SELECT * FROM texture_category_data WHERE categoryid = ?";
  const g_DBResult = g_ResourceDB.prepare(g_QueryString).get(categoryId);
  return !!g_DBResult;
}

export function isModelCategoryNameCreated(name: string) {
  const g_QueryString =
    "SELECT * FROM model_category_data WHERE lower(name) = ?";
  const g_DBResult = g_ResourceDB
    .prepare(g_QueryString)
    .get(`%${name}%`.toLocaleLowerCase());
  return !!g_DBResult;
}

export function isVehicleCategoryNameCreated(name: string) {
  const g_QueryString = "SELECT * FROM veh_category_data WHERE lower(name) = ?";
  const g_DBResult = g_ResourceDB
    .prepare(g_QueryString)
    .get(`%${name}%`.toLocaleLowerCase());
  return !!g_DBResult;
}

export function isSkinCategoryNameCreated(name: string) {
  const g_QueryString =
    "SELECT * FROM skin_category_data WHERE lower(name) = ?";
  const g_DBResult = g_ResourceDB
    .prepare(g_QueryString)
    .get(`%${name}%`.toLocaleLowerCase());
  return !!g_DBResult;
}

export function isTextureCategoryNameCreated(name: string) {
  const g_QueryString =
    "SELECT * FROM texture_category_data WHERE lower(name) = ?";
  const g_DBResult = g_ResourceDB
    .prepare(g_QueryString)
    .get(`%${name}%`.toLocaleLowerCase());
  return !!g_DBResult;
}

export function getModelCategoryName(categoryId: number) {
  const g_QueryString =
    "SELECT name FROM model_category_data WHERE categoryid = ?";
  const g_DBResult = g_ResourceDB.prepare(g_QueryString).get(categoryId) as
    | { name: string }
    | undefined;
  const categoryFound = !!g_DBResult;
  let name = "";
  if (categoryFound) {
    name = g_DBResult.name;
  } else {
    name = "Unknown";
  }
  return { categoryFound, name };
}

export function getVehicleCategoryName(categoryId: number) {
  const g_QueryString =
    "SELECT name FROM veh_category_data WHERE categoryid = ?";
  const g_DBResult = g_ResourceDB.prepare(g_QueryString).get(categoryId) as
    | { name: string }
    | undefined;
  const categoryFound = !!g_DBResult;
  let name = "";
  if (categoryFound) {
    name = g_DBResult.name;
  } else {
    name = "Unknown";
  }
  return { categoryFound, name };
}

export function getSkinCategoryName(categoryId: number) {
  const g_QueryString =
    "SELECT name FROM skin_category_data WHERE categoryid = ?";
  const g_DBResult = g_ResourceDB.prepare(g_QueryString).get(categoryId) as
    | { name: string }
    | undefined;
  const categoryFound = !!g_DBResult;
  let name = "";
  if (categoryFound) {
    name = g_DBResult.name;
  } else {
    name = "Unknown";
  }
  return { categoryFound, name };
}

export function getTextureCategoryName(categoryId: number) {
  const g_QueryString =
    "SELECT name FROM texture_category_data WHERE categoryid = ?";
  const g_DBResult = g_ResourceDB.prepare(g_QueryString).get(categoryId) as
    | { name: string }
    | undefined;
  const categoryFound = !!g_DBResult;
  let name = "";
  if (categoryFound) {
    name = g_DBResult.name;
  } else {
    name = "Unknown";
  }
  return { categoryFound, name };
}

export function findModelCategories(
  result: number[],
  resultSize: number,
  search: string,
  offset: number
) {
  let rowsAdded = 0;
  let g_QueryString = "";
  let g_DBResult: { max_rowcount: number; categoryid: number }[] = [];

  if (!search.trim().length) {
    g_QueryString =
      "\
            SELECT categoryid, \
            (SELECT COUNT(*) FROM model_category_data) AS max_rowcount \
            FROM model_category_data \
            LIMIT ? OFFSET ?";
    g_DBResult = g_ResourceDB
      .prepare(g_QueryString)
      .all(resultSize, offset) as typeof g_DBResult;
  } else {
    const _search = `%${search}%`;
    const g_QueryString =
      "\
            SELECT categoryid, \
            (SELECT COUNT(*) FROM model_category_data WHERE categoryid LIKE ? OR name LIKE ?) AS max_rowcount \
            FROM model_category_data \
            WHERE categoryid LIKE ? OR name LIKE ? \
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

  const resultRows = g_DBResult.length;

  let maxOffset = 0;
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

    result[rowsAdded++] = g_DBResult[row].categoryid;
  }

  return { rowsAdded, maxOffset };
}

export function findVehicleCategories(
  result: number[],
  resultSize: number,
  search: string,
  offset: number
) {
  let rowsAdded = 0;
  let g_QueryString = "";
  let g_DBResult: { max_rowcount: number; categoryid: number }[] = [];

  if (!search.trim().length) {
    g_QueryString =
      "\
            SELECT categoryid, \
            (SELECT COUNT(*) FROM veh_category_data) AS max_rowcount \
            FROM veh_category_data \
            LIMIT ? OFFSET ?";
    g_DBResult = g_ResourceDB
      .prepare(g_QueryString)
      .all(resultSize, offset) as typeof g_DBResult;
  } else {
    const _search = `%${search}%`;
    g_QueryString =
      "\
            SELECT categoryid, \
            (SELECT COUNT(*) FROM veh_category_data WHERE categoryid LIKE ? OR name LIKE ?) AS max_rowcount \
            FROM veh_category_data \
            WHERE categoryid LIKE ? OR name LIKE ? \
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

  const resultRows = g_DBResult.length;

  let maxOffset = 0;
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

    result[rowsAdded++] = g_DBResult[row].categoryid;
  }

  return { rowsAdded, maxOffset };
}

export function findSkinCategories(
  result: number[],
  resultSize: number,
  search: string,
  offset: number
) {
  let rowsAdded = 0;
  let g_QueryString = "";
  let g_DBResult: { max_rowcount: number; categoryid: number }[] = [];

  if (!search.trim().length) {
    g_QueryString =
      "\
            SELECT categoryid, \
            (SELECT COUNT(*) FROM skin_category_data) AS max_rowcount \
            FROM skin_category_data \
            LIMIT ? OFFSET ?";
    g_DBResult = g_ResourceDB
      .prepare(g_QueryString)
      .all(resultSize, offset) as typeof g_DBResult;
  } else {
    const _search = `%${search}%`;
    g_QueryString =
      "\
            SELECT categoryid, \
            (SELECT COUNT(*) FROM skin_category_data WHERE categoryid LIKE ? OR name LIKE ?) AS max_rowcount \
            FROM skin_category_data \
            WHERE categoryid LIKE ? OR name LIKE ? \
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

  const resultRows = g_DBResult.length;

  let maxOffset = 0;
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

    result[rowsAdded++] = g_DBResult[row].categoryid;
  }

  return { rowsAdded, maxOffset };
}

export function findTextureCategories(
  result: number[],
  resultSize: number,
  search: string,
  offset: number
) {
  let rowsAdded = 0;
  let g_QueryString = "";
  let g_DBResult: { max_rowcount: number; categoryid: number }[] = [];

  if (!search.trim().length) {
    g_QueryString =
      "\
            SELECT categoryid, \
            (SELECT COUNT(*) FROM texture_category_data) AS max_rowcount \
            FROM texture_category_data \
            LIMIT ? OFFSET ?";
    g_DBResult = g_ResourceDB
      .prepare(g_QueryString)
      .all(resultSize, offset) as typeof g_DBResult;
  } else {
    const _search = `%${search}%`;
    g_QueryString =
      "\
            SELECT categoryid, \
            (SELECT COUNT(*) FROM texture_category_data WHERE categoryid LIKE ? OR name LIKE ?) \
            FROM texture_category_data \
            WHERE categoryid LIKE ? OR name LIKE ? \
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

  const resultRows = g_DBResult.length;

  let maxOffset = 0;
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

    result[rowsAdded++] = g_DBResult[row].categoryid;
  }

  return { rowsAdded, maxOffset };
}

export function createModelCategory(name: string) {
  if (isModelCategoryNameCreated(name)) {
    return false;
  }
  const g_QueryString = "INSERT INTO model_category_data (name) VALUES (?)";
  const info = g_ResourceDB.prepare(g_QueryString).run(name);
  return info.changes === 1;
}

export function createVehicleCategory(name: string) {
  if (isVehicleCategoryNameCreated(name)) {
    return false;
  }
  const g_QueryString = "INSERT INTO veh_category_data (name) VALUES (?)";
  const info = g_ResourceDB.prepare(g_QueryString).run(name);
  return info.changes === 1;
}

export function createSkinCategory(name: string) {
  if (isSkinCategoryNameCreated(name)) {
    return false;
  }
  const g_QueryString = "INSERT INTO skin_category_data (name) VALUES (?)";
  const info = g_ResourceDB.prepare(g_QueryString).run(name);
  return info.changes === 1;
}

export function createTextureCategory(name: string) {
  if (isTextureCategoryNameCreated(name)) {
    return false;
  }
  const g_QueryString = "INSERT INTO texture_category_data (name) VALUES (?)";
  const info = g_ResourceDB.prepare(g_QueryString).run(name);
  return info.changes === 1;
}

export function destroyModelCategory(categoryId: number) {
  if (!isModelCategoryIDCreated(categoryId)) {
    return false;
  }
  const g_QueryString = "DELETE FROM model_category_data WHERE categoryid = ?";
  const info = g_ResourceDB.prepare(g_QueryString).run(categoryId);
  return info.changes === 1;
}

export function destroyVehicleCategory(categoryId: number) {
  if (!isVehicleCategoryIDCreated(categoryId)) {
    return false;
  }
  const g_QueryString = "DELETE FROM veh_category_data WHERE categoryid = ?";
  const info = g_ResourceDB.prepare(g_QueryString).run(categoryId);
  return info.changes === 1;
}

export function destroySkinCategory(categoryId: number) {
  if (!isSkinCategoryIDCreated(categoryId)) {
    return false;
  }
  const g_QueryString = "DELETE FROM skin_category_data WHERE categoryid = ?";
  const info = g_ResourceDB.prepare(g_QueryString).run(categoryId);
  return info.changes === 1;
}

export function destroyTextureCategory(categoryId: number) {
  if (!isTextureCategoryIDCreated(categoryId)) {
    return false;
  }
  const g_QueryString =
    "DELETE FROM texture_category_data WHERE categoryid = ?";
  const info = g_ResourceDB.prepare(g_QueryString).run(categoryId);
  return info.changes === 1;
}

export function renameModelCategory(categoryId: number, newName: string) {
  if (
    !isModelCategoryIDCreated(categoryId) ||
    isModelCategoryNameCreated(newName)
  ) {
    return false;
  }
  const g_QueryString =
    "UPDATE model_category_data SET name = ? WHERE categoryid = ?";
  const info = g_ResourceDB.prepare(g_QueryString).run(newName, categoryId);
  return info.changes === 1;
}

export function renameVehicleCategory(categoryId: number, newName: string) {
  if (
    !isVehicleCategoryIDCreated(categoryId) ||
    isVehicleCategoryNameCreated(newName)
  ) {
    return false;
  }
  const g_QueryString =
    "UPDATE veh_category_data SET name = ? WHERE categoryid = ?";
  const info = g_ResourceDB.prepare(g_QueryString).run(newName, categoryId);
  return info.changes === 1;
}

export function renameSkinCategory(categoryId: number, newName: string) {
  if (
    !isSkinCategoryIDCreated(categoryId) ||
    isSkinCategoryNameCreated(newName)
  ) {
    return false;
  }
  const g_QueryString =
    "UPDATE skin_category_data SET name = ? WHERE categoryid = ?";
  const info = g_ResourceDB.prepare(g_QueryString).run(newName, categoryId);
  return info.changes === 1;
}

export function renameTextureCategory(categoryId: number, newName: string) {
  if (
    !isTextureCategoryIDCreated(categoryId) ||
    isTextureCategoryNameCreated(newName)
  ) {
    return false;
  }
  const g_QueryString =
    "UPDATE texture_category_data SET name = ? WHERE categoryid = ?";
  const info = g_ResourceDB.prepare(g_QueryString).run(newName, categoryId);
  return info.changes === 1;
}

export function getModelCategoryBindID(categoryId: number, modelId: number) {
  const g_QueryString =
    "SELECT bindid FROM model_category_bind WHERE categoryid = ? AND modelid = ?";
  const g_DBResult = g_ResourceDB
    .prepare(g_QueryString)
    .get(categoryId, modelId) as { bindid: number } | undefined;
  let bindId = INVALID_CATEGORY_BIND_ID;
  if (g_DBResult) {
    bindId = g_DBResult.bindid;
  }
  return bindId;
}

export function getVehicleCategoryBindID(categoryId: number, modelId: number) {
  const g_QueryString =
    "SELECT bindid FROM veh_category_bind WHERE categoryid = ? AND modelid = ?";
  const g_DBResult = g_ResourceDB
    .prepare(g_QueryString)
    .get(categoryId, modelId) as { bindid: number } | undefined;
  let bindId = INVALID_CATEGORY_BIND_ID;
  if (g_DBResult) {
    bindId = g_DBResult.bindid;
  }
  return bindId;
}

export function getSkinCategoryBindID(categoryId: number, modelId: number) {
  const g_QueryString =
    "SELECT bindid FROM skin_category_bind WHERE categoryid = ? AND modelid = ?";
  const g_DBResult = g_ResourceDB
    .prepare(g_QueryString)
    .get(categoryId, modelId) as { bindid: number } | undefined;
  let bindId = INVALID_CATEGORY_BIND_ID;
  if (g_DBResult) {
    bindId = g_DBResult.bindid;
  }
  return bindId;
}

export function getTextureCategoryBindID(
  categoryId: number,
  textureId: number
) {
  const g_QueryString =
    "SELECT bindid FROM texture_category_bind WHERE categoryid = ? AND textureid = ?";
  const g_DBResult = g_ResourceDB
    .prepare(g_QueryString)
    .get(categoryId, textureId) as { bindid: number } | undefined;
  let bindId = INVALID_CATEGORY_BIND_ID;
  if (g_DBResult) {
    bindId = g_DBResult.bindid;
  }
  return bindId;
}

export function createModelCategoryBind(categoryId: number, modelId: number) {
  if (
    !isModelCategoryIDCreated(categoryId) ||
    getModelCategoryBindID(categoryId, modelId) !== INVALID_CATEGORY_BIND_ID
  ) {
    return false;
  }
  const g_QueryString =
    "INSERT INTO model_category_bind (categoryid, modelid) VALUES (?, ?)";
  const info = g_ResourceDB.prepare(g_QueryString).run(categoryId, modelId);
  return info.changes === 1;
}

export function createVehicleCategoryBind(categoryId: number, modelId: number) {
  if (
    !isVehicleCategoryIDCreated(categoryId) ||
    getVehicleCategoryBindID(categoryId, modelId) !== INVALID_CATEGORY_BIND_ID
  ) {
    return false;
  }
  const g_QueryString =
    "INSERT INTO veh_category_bind (categoryid, modelid) VALUES (?, ?)";
  const info = g_ResourceDB.prepare(g_QueryString).run(categoryId, modelId);
  return info.changes === 1;
}

export function createSkinCategoryBind(categoryId: number, modelId: number) {
  if (
    !isSkinCategoryIDCreated(categoryId) ||
    getSkinCategoryBindID(categoryId, modelId) !== INVALID_CATEGORY_BIND_ID
  ) {
    return false;
  }
  const g_QueryString =
    "INSERT INTO skin_category_bind (categoryid, modelid) VALUES (?, ?)";
  const info = g_ResourceDB.prepare(g_QueryString).run(categoryId, modelId);
  return info.changes === 1;
}

export function createTextureCategoryBind(
  categoryId: number,
  textureId: number
) {
  if (
    !isTextureCategoryIDCreated(categoryId) ||
    getTextureCategoryBindID(categoryId, textureId) !== INVALID_CATEGORY_BIND_ID
  ) {
    return false;
  }
  const g_QueryString =
    "INSERT INTO texture_category_bind (categoryid, textureid) VALUES (?, ?)";
  const info = g_ResourceDB.prepare(g_QueryString).run(categoryId, textureId);
  return info.changes === 1;
}

export function destroyModelCategoryBind(categoryId: number, modelId: number) {
  const bindId = getModelCategoryBindID(categoryId, modelId);
  if (bindId === INVALID_CATEGORY_BIND_ID) {
    return false;
  }
  const g_QueryString = "DELETE FROM model_category_bind WHERE bindid = ?";
  const info = g_ResourceDB.prepare(g_QueryString).run(bindId);
  return info.changes === 1;
}

export function destroyVehicleCategoryBind(
  categoryId: number,
  modelId: number
) {
  const bindId = getVehicleCategoryBindID(categoryId, modelId);
  if (bindId === INVALID_CATEGORY_BIND_ID) {
    return false;
  }
  const g_QueryString = "DELETE FROM veh_category_bind WHERE bindid = ?";
  const info = g_ResourceDB.prepare(g_QueryString).run(bindId);
  return info.changes === 1;
}

export function destroySkinCategoryBind(categoryId: number, modelId: number) {
  const bindId = getSkinCategoryBindID(categoryId, modelId);
  if (bindId === INVALID_CATEGORY_BIND_ID) {
    return false;
  }
  const g_QueryString = "DELETE FROM skin_category_bind WHERE bindid = ?";
  const info = g_ResourceDB.prepare(g_QueryString).run(bindId);
  return info.changes === 1;
}

export function destroyTextureCategoryBind(
  categoryId: number,
  textureId: number
) {
  const bindId = getTextureCategoryBindID(categoryId, textureId);
  if (bindId === INVALID_CATEGORY_BIND_ID) {
    return false;
  }
  const g_QueryString = "DELETE FROM texture_category_bind WHERE bindid = ?";
  const info = g_ResourceDB.prepare(g_QueryString).run(bindId);
  return info.changes === 1;
}
