import { getModelName } from "@/model";
import { InvalidEnum, ObjectMp, Player } from "@infernus/core";
import { g_ObjectData, getObjectAttachObject } from ".";
import { ID_TYPE } from "@/idType";
import { MATERIAL_INDEX_TYPE } from "@/matIndexType";
import { g_PlayerData, getPlayerEditObject } from "@/player";
import {
  g_SelectListPTD,
  g_SelectObjListData,
  MAX_SELECT_LIST_ROWS,
} from "@/selectList";
import { INVALID_ROW, MAX_OBJECT_INDEX } from "@/constants";
import { TD_MODE } from "@/tdMode";

const orig_CreateObject = ObjectMp.__inject__.create;

function h_CreateObject(
  modelId: number,
  x: number,
  y: number,
  z: number,
  rX: number,
  rY: number,
  rZ: number,
  drawDistance?: number | undefined
) {
  const objectId = orig_CreateObject(
    modelId,
    x,
    y,
    z,
    rX,
    rY,
    rZ,
    drawDistance
  );
  if (objectId !== InvalidEnum.OBJECT_ID) {
    const g_CommentString = getModelName(modelId);
    if (g_CommentString.ret) {
      g_ObjectData.get(objectId - 1).comment = g_CommentString.name;
    }

    g_ObjectData.get(objectId - 1).attachIdType = ID_TYPE.NONE;
    g_ObjectData.get(objectId - 1).attachX = 0.0;
    g_ObjectData.get(objectId - 1).attachY = 0.0;
    g_ObjectData.get(objectId - 1).attachZ = 0.0;
    g_ObjectData.get(objectId - 1).attachRx = 0.0;
    g_ObjectData.get(objectId - 1).attachRy = 0.0;
    g_ObjectData.get(objectId - 1).attachRz = 0.0;

    g_ObjectData.get(objectId - 1).matIndexModCount = 0;
    for (
      let materialIndex = 0;
      materialIndex < MAX_OBJECT_INDEX;
      materialIndex++
    ) {
      g_ObjectData.get(objectId - 1).matIndexType[materialIndex] =
        MATERIAL_INDEX_TYPE.NONE;
    }
  }
  return objectId;
}

ObjectMp.__inject__.create = h_CreateObject;

const orig_CreatePlayerObject = ObjectMp.__inject__.createPlayer;

function h_CreatePlayerObject(
  playerId: number,
  modelId: number,
  x: number,
  y: number,
  z: number,
  rX: number,
  rY: number,
  rZ: number,
  drawDistance?: number | undefined
) {
  const objectId = orig_CreatePlayerObject(
    playerId,
    modelId,
    x,
    y,
    z,
    rX,
    rY,
    rZ,
    drawDistance
  );
  if (objectId !== InvalidEnum.OBJECT_ID) {
    const g_CommentString = getModelName(modelId);
    if (g_CommentString.ret) {
      g_ObjectData.get(objectId - 1).comment = g_CommentString.name;
    }

    g_ObjectData.get(objectId - 1).attachIdType = ID_TYPE.NONE;
    g_ObjectData.get(objectId - 1).attachX = 0.0;
    g_ObjectData.get(objectId - 1).attachY = 0.0;
    g_ObjectData.get(objectId - 1).attachZ = 0.0;
    g_ObjectData.get(objectId - 1).attachRx = 0.0;
    g_ObjectData.get(objectId - 1).attachRy = 0.0;
    g_ObjectData.get(objectId - 1).attachRz = 0.0;

    g_ObjectData.get(objectId - 1).matIndexModCount = 0;
    for (
      let materialIndex = 0;
      materialIndex < MAX_OBJECT_INDEX;
      materialIndex++
    ) {
      g_ObjectData.get(objectId - 1).matIndexType[materialIndex] =
        MATERIAL_INDEX_TYPE.NONE;
    }
  }
  return objectId;
}

ObjectMp.__inject__.createPlayer = h_CreatePlayerObject;

const orig_DestroyObject = ObjectMp.__inject__.destroy;

function h_DestroyObject(objectId: number) {
  const isValid = ObjectMp.isValid(objectId);

  const ret = orig_DestroyObject(objectId);

  if (isValid) {
    Player.getInstances().forEach((p) => {
      if (!p.isConnected()) {
        return;
      }

      if (getPlayerEditObject(p) === objectId) {
        g_PlayerData.get(p.id).editIdType = ID_TYPE.NONE;
      }

      if (g_PlayerData.get(p.id).editAttachObject === objectId) {
        g_PlayerData.get(p.id).editAttachObject = InvalidEnum.OBJECT_ID;
      }

      if (g_PlayerData.get(p.id).editMaterialObj === objectId) {
        g_PlayerData.get(p.id).editMaterialObj = InvalidEnum.OBJECT_ID;
      }

      const editRow = g_SelectObjListData.get(p.id).editRow;
      if (editRow !== INVALID_ROW) {
        const editObjectId = g_SelectObjListData.get(p.id).rowId[editRow];

        if (objectId === editObjectId) {
          g_SelectObjListData.get(p.id).editRow = INVALID_ROW;
        }
      }

      for (let row = 0; row < MAX_SELECT_LIST_ROWS; row++) {
        if (objectId !== g_SelectObjListData.get(p.id).rowId[row]) {
          continue;
        }

        g_SelectObjListData.get(p.id).rowId[row] = InvalidEnum.OBJECT_ID;

        if (g_PlayerData.get(p.id).tdMode !== TD_MODE.SELECTLIST_OBJECT) {
          continue;
        }

        g_SelectListPTD.get(p.id).idRow[row]?.hide();
        g_SelectListPTD.get(p.id).commentRow[row]?.hide();
      }
    });

    ObjectMp.getInstances().forEach((o) => {
      if (o.isValid() && getObjectAttachObject(o.id) === objectId) {
        o.destroy();
      }
    });
  }

  return ret;
}

ObjectMp.__inject__.destroy = h_DestroyObject;

const orig_DestroyPlayerObject = ObjectMp.__inject__.destroyPlayer;

function h_DestroyPlayerObject(playerId: number, objectId: number) {
  const isValid = ObjectMp.isValid(objectId, playerId);

  const ret = orig_DestroyPlayerObject(playerId, objectId);

  if (isValid) {
    if (g_PlayerData.get(playerId).clickDragPoId === objectId) {
      g_PlayerData.get(playerId).clickDragPoId = InvalidEnum.OBJECT_ID;
    }
  }

  return ret;
}

ObjectMp.__inject__.destroyPlayer = h_DestroyPlayerObject;

const orig_SetObjectMaterial = ObjectMp.__inject__.setMaterial;

export function h_SetObjectMaterial(
  objectId: number,
  materialIndex: number,
  modelId: number,
  txdName: string,
  textureName: string,
  materialColor: string | number
) {
  const success = orig_SetObjectMaterial(
    objectId,
    materialIndex,
    modelId,
    txdName,
    textureName,
    materialColor
  );
  if (success) {
    g_ObjectData.get(objectId - 1).matIndexModCount++;
  }
  return success;
}

ObjectMp.__inject__.setMaterial = orig_SetObjectMaterial;

const orig_SetPlayerObjectMaterial = ObjectMp.__inject__.setMaterialPlayer;

function h_SetPlayerObjectMaterial(
  playerId: number,
  objectId: number,
  materialIndex: number,
  modelId: number,
  txdName: string,
  textureName: string,
  materialColor: string | number
) {
  const ret = orig_SetPlayerObjectMaterial(
    playerId,
    objectId,
    materialIndex,
    modelId,
    txdName,
    textureName,
    materialColor
  );
  if (ObjectMp.isValid(objectId, playerId)) {
    g_ObjectData.get(objectId - 1).matIndexModCount++;
  }
  return ret;
}

ObjectMp.__inject__.setMaterialPlayer = h_SetPlayerObjectMaterial;

const orig_SetObjectMaterialText = ObjectMp.__inject__.setMaterialText;

function h_SetObjectMaterialText(
  charset: string,
  objectId: number,
  text: string,
  materialIndex: number,
  materialSize: number,
  fontFace: string,
  fontSize: number,
  bold: boolean | undefined,
  fontColor: string | number,
  backColor: string | number,
  textAlignment: number
) {
  const success = orig_SetObjectMaterialText(
    charset,
    objectId,
    text,
    materialIndex,
    materialSize,
    fontFace,
    fontSize,
    bold,
    fontColor,
    backColor,
    textAlignment
  );
  if (success) {
    g_ObjectData.get(objectId - 1).matIndexModCount++;
  }
  return success;
}

ObjectMp.__inject__.setMaterialText = h_SetObjectMaterialText;

const orig_SetPlayerObjectMaterialText =
  ObjectMp.__inject__.setMaterialTextPlayer;

function h_SetPlayerObjectMaterialText(
  charset: string,
  playerId: number,
  objectId: number,
  text: string,
  materialIndex: number,
  materialSize: number,
  fontFace: string,
  fontsize: number,
  bold: boolean | undefined,
  fontColor: string | number,
  backColor: string | number,
  textAlignment: number
) {
  const ret = orig_SetPlayerObjectMaterialText(
    charset,
    playerId,
    objectId,
    text,
    materialIndex,
    materialSize,
    fontFace,
    fontsize,
    bold,
    fontColor,
    backColor,
    textAlignment
  );
  if (ObjectMp.isValid(objectId, playerId)) {
    g_ObjectData.get(objectId - 1).matIndexModCount++;
  }
  return ret;
}

ObjectMp.__inject__.setMaterialTextPlayer = h_SetPlayerObjectMaterialText;
