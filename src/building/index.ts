import { logger } from "@/logger";
import { g_ResourceDB } from "@/sqlite";
import { getDistanceBetweenPoints } from "@/utils/math";
import { SafetyMap } from "@/utils/safetyMap";
import { GameMode, Player, PlayerEvent } from "@infernus/core";

export const BUILDING_DATA_SIZE = 44763;
export const INVALID_BUILDING_ID = -1;
export const MIN_BUILDING_ID = 0;
export const MAX_BUILDING_ID = BUILDING_DATA_SIZE - 1;
export const REMOVE_BUILDING_RANGE = 0.1;
export const INVALID_BUILDING_LOD_MODEL = 0xffff;

export enum BUILDING_INC_MODE {
  ALL,
  REMOVED,
  EXISTING,
}

export interface IBuildingData {
  model: number;
  lodModel: number;
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  offset: number;
  isLoaded: boolean;
  isRemoved: boolean;
}

export const g_BuildingData = new SafetyMap<number, IBuildingData>(() => {
  return {
    model: 0,
    lodModel: INVALID_BUILDING_LOD_MODEL,
    x: 0,
    y: 0,
    z: 0,
    rx: 0,
    ry: 0,
    rz: 0,
    offset: 0,
    isLoaded: false,
    isRemoved: false,
  };
});

GameMode.onInit(({ next }) => {
  loadBuildingCache();
  return next();
});

GameMode.onExit(({ next }) => {
  g_BuildingData.clear();
  return next();
});

PlayerEvent.onConnect(({ player, next }) => {
  g_BuildingData.forEach((building, buildingId) => {
    if (building.isLoaded && building.isRemoved) {
      removeBuildingIDForPlayer(player, buildingId);
    }
  });
  return next();
});

export function isValidBuildingID(id: number) {
  return id >= MIN_BUILDING_ID && id <= MAX_BUILDING_ID;
}

export function loadBuildingCache() {
  const stmt = g_ResourceDB.prepare("SELECT * FROM `building_data`");
  const g_DBResult = stmt.all() as {
    x: number;
    y: number;
    z: number;
    rx: number;
    ry: number;
    rz: number;
    offset: number;
    lodmodel: number;
    model: number;
    buildingid: number;
  }[];

  const rows = g_DBResult.length;
  let buildingsLoaded = 0;
  let buildingId = 0;

  for (let row = 0; row < rows; row++) {
    buildingId = g_DBResult[row].buildingid;

    if (
      isValidBuildingID(buildingId) &&
      !g_BuildingData.get(buildingId).isLoaded
    ) {
      g_BuildingData.get(buildingId).model = g_DBResult[row].model;
      g_BuildingData.get(buildingId).lodModel = g_DBResult[row].lodmodel;
      g_BuildingData.get(buildingId).x = g_DBResult[row].x;
      g_BuildingData.get(buildingId).y = g_DBResult[row].y;
      g_BuildingData.get(buildingId).z = g_DBResult[row].z;
      g_BuildingData.get(buildingId).rx = g_DBResult[row].rx;
      g_BuildingData.get(buildingId).ry = g_DBResult[row].ry;
      g_BuildingData.get(buildingId).rz = g_DBResult[row].rz;
      g_BuildingData.get(buildingId).offset = g_DBResult[row].offset;
      g_BuildingData.get(buildingId).isLoaded = true;

      buildingsLoaded++;
    }
  }

  if (buildingsLoaded !== BUILDING_DATA_SIZE) {
    logger.error(
      `error: ${buildingsLoaded} / ${BUILDING_DATA_SIZE} buildings were loaded!`
    );
  }
}

export function removeBuildingIDForPlayer(player: Player, buildingId: number) {
  player.removeBuilding(
    g_BuildingData.get(buildingId).model,
    g_BuildingData.get(buildingId).x,
    g_BuildingData.get(buildingId).y,
    g_BuildingData.get(buildingId).z,
    g_BuildingData.get(buildingId).offset + REMOVE_BUILDING_RANGE
  );

  if (g_BuildingData.get(buildingId).lodModel !== INVALID_BUILDING_LOD_MODEL) {
    player.removeBuilding(
      g_BuildingData.get(buildingId).lodModel,
      g_BuildingData.get(buildingId).x,
      g_BuildingData.get(buildingId).y,
      g_BuildingData.get(buildingId).z,
      g_BuildingData.get(buildingId).offset + REMOVE_BUILDING_RANGE
    );
  }
}

export function removeBuildingIDForAll(buildingId: number) {
  Player.getInstances().forEach((p) => {
    if (p.isConnected()) {
      removeBuildingIDForPlayer(p, buildingId);
    }
  });
}

export function getBuildingsInRange(
  result: number[],
  resultSize: number,
  searchModelId: number,
  searchX: number,
  searchY: number,
  searchZ: number,
  searchRadius: number
) {
  let resultCount = 0;
  let buildingModelId = 0;
  let buildingX = 0;
  let buildingY = 0;
  let buildingZ = 0;
  let buildingDistance = 0;

  for (let b = 0; b < BUILDING_DATA_SIZE; b++) {
    if (resultCount >= resultSize) {
      break;
    }

    buildingModelId = g_BuildingData.get(b).model;
    buildingX = g_BuildingData.get(b).x;
    buildingY = g_BuildingData.get(b).y;
    buildingZ = g_BuildingData.get(b).z;
    buildingDistance = getDistanceBetweenPoints(
      searchX,
      searchY,
      searchZ,
      buildingX,
      buildingY,
      buildingZ
    );

    if (
      (searchModelId === -1 || searchModelId === buildingModelId) &&
      buildingDistance <= searchRadius
    ) {
      result[resultCount++] = b;
    }
  }

  return resultCount;
}

export function getNearestBuilding(
  searchX: number,
  searchY: number,
  searchZ: number,
  retDistance: number,
  minDistance = 0.0,
  incMode: BUILDING_INC_MODE = BUILDING_INC_MODE.ALL
) {
  let retBuildingId = INVALID_BUILDING_ID;
  let buildingX = 0;
  let buildingY = 0;
  let buildingZ = 0;
  let buildingDistance = 0;
  for (let b = 0; b < BUILDING_DATA_SIZE; b++) {
    buildingX = g_BuildingData.get(b).x;
    buildingY = g_BuildingData.get(b).y;
    buildingZ = g_BuildingData.get(b).z;
    buildingDistance = getDistanceBetweenPoints(
      searchX,
      searchY,
      searchZ,
      buildingX,
      buildingY,
      buildingZ
    );

    if (
      (incMode === BUILDING_INC_MODE.ALL ||
        (incMode === BUILDING_INC_MODE.REMOVED &&
          g_BuildingData.get(b).isRemoved) ||
        (incMode === BUILDING_INC_MODE.EXISTING &&
          !g_BuildingData.get(b).isRemoved)) &&
      (minDistance === 0.0 || buildingDistance > minDistance) &&
      (retBuildingId === INVALID_BUILDING_ID || buildingDistance < retDistance)
    ) {
      retBuildingId = b;
      retDistance = buildingDistance;
    }
  }

  return { retBuildingId, retDistance };
}

export function findBuildings(
  result: number[],
  resultSize: number,
  offset: number,
  incMode: BUILDING_INC_MODE,
  x: number,
  y: number,
  z: number
) {
  let rowsFound = 0;
  let rowsAdded = 0;
  let minDistance = 0;

  for (let b = 0; b < BUILDING_DATA_SIZE; b++) {
    const { retBuildingId, retDistance } = getNearestBuilding(
      x,
      y,
      z,
      minDistance,
      minDistance,
      incMode
    );
    minDistance = retDistance;

    if (retBuildingId === INVALID_BUILDING_ID) {
      break;
    }

    if (rowsFound++ < offset) {
      continue;
    }

    if (rowsAdded >= resultSize) {
      break;
    }

    result[rowsAdded++] = retBuildingId;
  }

  return rowsAdded;
}
