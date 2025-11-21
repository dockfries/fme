import { g_CamModeData } from "@/camMode";
import {
  GLOBAL_CHARSET,
  INVALID_ARRAY_INDEX,
  MAX_OBJECT_INDEX,
  RGBA_ORANGE,
  RGBA_RED,
  SELECT_TD_COLOR,
} from "@/constants";
import {
  DIALOG_ID,
  DIALOG_LISTITEM_OBJECT,
  DIALOG_LISTITEM_OINDEX,
} from "@/dialog";
import { ID_TYPE } from "@/idType";
import { getAlignmentName, isValidMaterialAlignment } from "@/matAlign";
import { MATERIAL_INDEX_TYPE } from "@/matIndexType";
import { getMaterialSizeName, MAX_MATERIAL_SIZES } from "@/matSize";
import { g_ModelCache, getModelCacheIndex, getModelName } from "@/model";
import { toggleOffsetEdit } from "@/offsetEdit";
import { g_PlayerData, getPlayerEditObject } from "@/player";
import {
  applySelectListRowData,
  g_SelectObjListData,
  MAX_SELECT_LIST_ROWS,
} from "@/selectList";
import { showPlayerTextDrawMode, TD_MODE } from "@/tdMode";
import { getTextureData, INVALID_TEXTURE_ID } from "@/texture";
import { aRGBtoA, aRGBtoRGB, setARGBAlpha } from "@/utils/color";
import { positionFromOffset } from "@/utils/math";
import { SafetyMap } from "@/utils/safetyMap";
import { g_VehicleData } from "@/vehicle";
import {
  Dialog,
  DialogStylesEnum,
  EditResponseTypesEnum,
  GameMode,
  IDialogResCommon,
  InvalidEnum,
  ObjectMaterialTextSizeEnum,
  ObjectMp,
  ObjectMpEvent,
  Player,
  SelectObjectTypesEnum,
  Vehicle,
} from "@infernus/core";

export const MAX_OBJECT_FONTSIZE = 255;
export const MAX_MATERIALINDEX_MODCOUNT = 16;

export interface IObjectData {
  memoryX: number;
  memoryY: number;
  memoryZ: number;
  memoryRx: number;
  memoryRy: number;
  memoryRz: number;
  attachIdType: number;
  attachId: number;
  attachX: number;
  attachY: number;
  attachZ: number;
  attachRx: number;
  attachRy: number;
  attachRz: number;
  matIndexModCount: number;
  matIndexType: number[];
  matIndexTexture: number[];
  matIndexSize: number[];
  matIndexFontSize: number[];
  matIndexIsBold: boolean[];
  matIndexColor: number[];
  matIndexFontColor: number[];
  matIndexAlignment: number[];
  comment: string;
}

export const g_ObjectData = new SafetyMap<number, IObjectData>(() => {
  return {
    memoryX: 0,
    memoryY: 0,
    memoryZ: 0,
    memoryRx: 0,
    memoryRy: 0,
    memoryRz: 0,
    attachIdType: 0,
    attachId: 0,
    attachX: 0,
    attachY: 0,
    attachZ: 0,
    attachRx: 0,
    attachRy: 0,
    attachRz: 0,
    matIndexModCount: 0,
    matIndexType: Array.from(
      { length: MAX_MATERIALINDEX_MODCOUNT },
      () => MATERIAL_INDEX_TYPE.NONE
    ),
    matIndexTexture: Array.from(
      { length: MAX_MATERIALINDEX_MODCOUNT },
      () => INVALID_TEXTURE_ID
    ),
    matIndexSize: Array.from({ length: MAX_MATERIALINDEX_MODCOUNT }, () => 0),
    matIndexFontSize: Array.from(
      { length: MAX_MATERIALINDEX_MODCOUNT },
      () => 24
    ),
    matIndexIsBold: Array.from(
      { length: MAX_MATERIALINDEX_MODCOUNT },
      () => true
    ),
    matIndexColor: Array.from({ length: MAX_MATERIALINDEX_MODCOUNT }, () => 0),
    matIndexFontColor: Array.from(
      { length: MAX_MATERIALINDEX_MODCOUNT },
      () => 0xffffffff
    ),
    matIndexAlignment: Array.from(
      { length: MAX_MATERIALINDEX_MODCOUNT },
      () => 0
    ),
    comment: "",
  };
});

export const g_ObjectText = new SafetyMap<number, string[]>(() => {
  return Array.from({ length: MAX_OBJECT_INDEX }, () => "Example Text");
});

export const g_ObjectFont = new SafetyMap<number, string[]>(() => {
  return Array.from({ length: MAX_OBJECT_INDEX }, () => "Arial");
});

GameMode.onInit(({ next }) => {
  ObjectMp.getInstances().forEach((o) => {
    if (!o.isValid()) {
      return;
    }
    const g_CommentString = getModelName(o.getModel());
    if (g_CommentString.ret) {
      g_ObjectData.get(o.id - 1).comment = g_CommentString.name;
    }

    g_ObjectData.get(o.id - 1).matIndexModCount = MAX_MATERIALINDEX_MODCOUNT;
    for (
      let materialIndex = 0;
      materialIndex < MAX_OBJECT_INDEX;
      materialIndex++
    ) {
      g_ObjectData.get(o.id - 1).matIndexType[materialIndex] =
        MATERIAL_INDEX_TYPE.NONE;
    }
  });
  return next();
});

GameMode.onExit(({ next }) => {
  g_ObjectData.clear();
  g_ObjectText.clear();
  g_ObjectFont.clear();
  return next();
});

ObjectMpEvent.onPlayerSelect(({ player, type, objectMp, next }) => {
  if (type === SelectObjectTypesEnum.GLOBAL_OBJECT && objectMp.isValid()) {
    player.endObjectEditing();
    g_PlayerData.get(player.id).editIdType = ID_TYPE.OBJECT;
    g_PlayerData.get(player.id).editId = objectMp.id;
    showObjectDialog(player, DIALOG_ID.OBJECT_MAIN);
  }
  return next();
});

ObjectMpEvent.onPlayerEdit(
  ({
    player,
    isPlayerObject,
    objectMp,
    response,
    fX,
    fY,
    fZ,
    fRotX,
    fRotY,
    fRotZ,
    next,
  }) => {
    if (!isPlayerObject && objectMp.id === getPlayerEditObject(player)) {
      switch (response) {
        case EditResponseTypesEnum.FINAL: {
          objectMp.setPos(fX, fY, fZ);
          objectMp.setRot(fRotX, fRotY, fRotZ);
          showObjectDialog(player, DIALOG_ID.OBJECT_MAIN);
          break;
        }
        case EditResponseTypesEnum.CANCEL: {
          objectMp.setPos(
            g_ObjectData.get(objectMp.id - 1).memoryX,
            g_ObjectData.get(objectMp.id - 1).memoryY,
            g_ObjectData.get(objectMp.id - 1).memoryZ
          );
          objectMp.setRot(
            g_ObjectData.get(objectMp.id - 1).memoryRx,
            g_ObjectData.get(objectMp.id - 1).memoryRy,
            g_ObjectData.get(objectMp.id - 1).memoryRz
          );
          showObjectDialog(player, DIALOG_ID.OBJECT_MAIN);
          break;
        }
        // case EditResponseTypesEnum.UPDATE: {
        //   objectMp.setPos(fX, fY, fZ);
        //   objectMp.setRot(fRotX, fRotY, fRotZ);
        //   break;
        // }
      }
    }
    return next();
  }
);

function onDialogResponse(
  player: Player,
  res: IDialogResCommon,
  dialogId: number
) {
  const { inputText, response, listItem } = res;
  switch (dialogId) {
    case DIALOG_ID.OBJECT_MAIN: {
      const objectId = getPlayerEditObject(player);

      if (!ObjectMp.isValid(objectId)) {
        g_PlayerData.get(player.id).editIdType = ID_TYPE.NONE;
        return 1;
      }

      if (!response) {
        return 1;
      }

      if (
        listItem >= DIALOG_LISTITEM_OBJECT.INDEX_START &&
        listItem <= DIALOG_LISTITEM_OBJECT.INDEX_END
      ) {
        g_PlayerData.get(player.id).editObjMatIdx =
          listItem - DIALOG_LISTITEM_OBJECT.INDEX_START;
        showObjectDialog(player, DIALOG_ID.OBJECT_INDEX);
        return 1;
      } else {
        switch (listItem) {
          case DIALOG_LISTITEM_OBJECT.GOTO: {
            const obj = ObjectMp.getInstance(objectId)!;
            const { x, y, z } = obj.getPos();
            if (g_CamModeData.get(player.id).toggle) {
              const pObj = ObjectMp.getInstance(
                g_CamModeData.get(player.id).poId,
                player
              )!;
              pObj?.stop();
              pObj?.setPos(x, y, z);
            } else {
              player.setPos(x, y, z);
            }
            break;
          }
          case DIALOG_LISTITEM_OBJECT.GET: {
            const { x, y, z } = player.getPos();
            const obj = ObjectMp.getInstance(objectId)!;
            obj.setPos(x, y, z);
            break;
          }
          case DIALOG_LISTITEM_OBJECT.COORD: {
            showObjectDialog(player, DIALOG_ID.OBJECT_COORD);
            return 1;
          }
          case DIALOG_LISTITEM_OBJECT.MOVE: {
            if (g_ObjectData.get(objectId - 1).attachIdType === ID_TYPE.NONE) {
              const obj = ObjectMp.getInstance(objectId)!;
              const pos = obj.getPos();
              g_ObjectData.get(objectId - 1).memoryX = pos.x;
              g_ObjectData.get(objectId - 1).memoryY = pos.y;
              g_ObjectData.get(objectId - 1).memoryZ = pos.z;
              const rot = obj.getRot();
              g_ObjectData.get(objectId - 1).memoryRx = rot.x;
              g_ObjectData.get(objectId - 1).memoryRy = rot.y;
              g_ObjectData.get(objectId - 1).memoryRz = rot.z;

              obj.edit(player);

              player.sendClientMessage(
                RGBA_ORANGE,
                "Click & Drag Edit: {FFFFFF}Hold ~k~~PED_SPRINT~ to look around and press ESC to cancel."
              );
            } else {
              player.cancelSelectTextDraw();
              toggleOffsetEdit(player, true);
            }
            return 1;
          }
          case DIALOG_LISTITEM_OBJECT.ATTACH_SELECT: {
            g_PlayerData.get(player.id).editAttachObject = objectId;
            break;
          }
          case DIALOG_LISTITEM_OBJECT.ATTACH_APPLY: {
            const attachObjectId = g_PlayerData.get(player.id).editAttachObject;
            if (
              ObjectMp.isValid(attachObjectId) &&
              attachObjectId !== objectId
            ) {
              g_ObjectData.get(attachObjectId - 1).attachIdType =
                ID_TYPE.OBJECT;
              g_ObjectData.get(attachObjectId - 1).attachId = objectId;

              applyObjectAttachData(attachObjectId);

              g_PlayerData.get(player.id).editAttachObject =
                InvalidEnum.OBJECT_ID;
              g_PlayerData.get(player.id).editIdType = ID_TYPE.OBJECT;
              g_PlayerData.get(player.id).editId = attachObjectId;
            }
            break;
          }
          case DIALOG_LISTITEM_OBJECT.ATTACH_REMOVE: {
            const newObjectId = recreateObject(objectId, false);
            if (newObjectId === InvalidEnum.OBJECT_ID) {
              player.sendClientMessage(
                RGBA_RED,
                "ERROR: This object could not be unattached / re-created!"
              );
            }
            break;
          }
          case DIALOG_LISTITEM_OBJECT.MATERIALS_COPY: {
            g_PlayerData.get(player.id).editMaterialObj = objectId;
            break;
          }
          case DIALOG_LISTITEM_OBJECT.MATERIALS_PASTE: {
            const copyFromObjectId = g_PlayerData.get(
              player.id
            ).editMaterialObj;
            if (
              ObjectMp.isValid(copyFromObjectId) &&
              copyFromObjectId !== objectId
            ) {
              for (let matIdx = 0; matIdx < MAX_OBJECT_INDEX; matIdx++) {
                defaultObjectMaterialIndexData(objectId, matIdx);
                migrateObjectMaterialIndexData(
                  copyFromObjectId,
                  objectId,
                  matIdx
                );
              }

              const newObjectId = recreateObject(objectId);
              if (newObjectId === InvalidEnum.OBJECT_ID) {
                player.sendClientMessage(
                  RGBA_RED,
                  "ERROR: This object could not be textured / texted / re-created!"
                );
              }
            }
            break;
          }
          case DIALOG_LISTITEM_OBJECT.DUPLICATE: {
            const newObjectId = copyObject(objectId);
            if (newObjectId === InvalidEnum.OBJECT_ID) {
              player.sendClientMessage(
                RGBA_RED,
                "ERROR: This object could not be duplicated!"
              );
            } else {
              if (!copyObjectAttachments(objectId, newObjectId)) {
                player.sendClientMessage(
                  RGBA_RED,
                  "WARNING: All attachments could not be duplicated!"
                );
              }

              g_PlayerData.get(player.id).editIdType = ID_TYPE.OBJECT;
              g_PlayerData.get(player.id).editId = newObjectId;
            }
            break;
          }
          case DIALOG_LISTITEM_OBJECT.RECREATE: {
            const newObjectId = recreateObject(objectId);
            if (newObjectId === InvalidEnum.OBJECT_ID) {
              player.sendClientMessage(
                RGBA_RED,
                "ERROR: This object could not be re-created!"
              );
            }
            break;
          }
          case DIALOG_LISTITEM_OBJECT.REMOVE: {
            const obj = ObjectMp.getInstance(objectId);
            obj?.destroy();
            return 1;
          }
          case DIALOG_LISTITEM_OBJECT.COMMENT: {
            showObjectDialog(player, DIALOG_ID.OBJECT_COMMENT);
            return 1;
          }
          case DIALOG_LISTITEM_OBJECT.COMMENT_RESET: {
            const obj = ObjectMp.getInstance(objectId)!;
            const g_CommentString = getModelName(obj.getModel()).name;
            g_ObjectData.get(objectId - 1).comment = g_CommentString;
            break;
          }
        }
      }

      showObjectDialog(player, dialogId);
      return 1;
    }
    case DIALOG_ID.OBJECT_COORD: {
      const objectId = getPlayerEditObject(player);

      if (!ObjectMp.isValid(objectId)) {
        g_PlayerData.get(player.id).editIdType = ID_TYPE.NONE;
        return 1;
      }

      if (!response) {
        showObjectDialog(player, DIALOG_ID.OBJECT_MAIN);
        return 1;
      }

      const [cmd, value] = inputText.split(" ");
      if (!cmd.trim().length || typeof value === "undefined") {
        showObjectDialog(player, dialogId);
        return 1;
      }

      let x = 0,
        y = 0,
        z = 0,
        rx = 0,
        ry = 0,
        rz = 0;
      switch (g_ObjectData.get(objectId - 1).attachIdType) {
        case ID_TYPE.OBJECT:
        case ID_TYPE.VEHICLE: {
          x = g_ObjectData.get(objectId - 1).attachX;
          y = g_ObjectData.get(objectId - 1).attachY;
          z = g_ObjectData.get(objectId - 1).attachZ;
          rx = g_ObjectData.get(objectId - 1).attachRx;
          ry = g_ObjectData.get(objectId - 1).attachRy;
          rz = g_ObjectData.get(objectId - 1).attachRz;
          break;
        }
        default: {
          const obj = ObjectMp.getInstance(objectId);
          const pos = obj?.getPos();
          if (pos) {
            x = pos.x;
            y = pos.y;
            z = pos.z;
          }
          const rot = obj?.getRot();
          if (rot) {
            rx = rot.x;
            ry = rot.y;
            rz = rot.z;
          }
        }
      }

      if (cmd === "x") {
        x = +value;
      } else if (cmd === "y") {
        y = +value;
      } else if (cmd === "z") {
        z = +value;
      } else if (cmd === "rx") {
        rx = +value;
      } else if (cmd === "ry") {
        ry = +value;
      } else if (cmd === "rz") {
        rz = +value;
      } else {
        showObjectDialog(player, dialogId);
        return 1;
      }

      switch (g_ObjectData.get(objectId - 1).attachIdType) {
        case ID_TYPE.OBJECT:
        case ID_TYPE.VEHICLE: {
          g_ObjectData.get(objectId - 1).attachX = x;
          g_ObjectData.get(objectId - 1).attachY = y;
          g_ObjectData.get(objectId - 1).attachZ = z;
          g_ObjectData.get(objectId - 1).attachRx = rx;
          g_ObjectData.get(objectId - 1).attachRy = ry;
          g_ObjectData.get(objectId - 1).attachRz = rz;
          applyObjectAttachData(objectId);
          break;
        }
        default: {
          const obj = ObjectMp.getInstance(objectId);
          obj?.setPos(x, y, z);
          obj?.setRot(rx, ry, rz);
        }
      }

      showObjectDialog(player, dialogId);
      return 1;
    }
    case DIALOG_ID.OBJECT_COMMENT: {
      const objectId = getPlayerEditObject(player);
      if (!ObjectMp.isValid(objectId)) {
        g_PlayerData.get(player.id).editIdType = ID_TYPE.NONE;
        return 1;
      }

      if (!response) {
        showObjectDialog(player, DIALOG_ID.OBJECT_MAIN);
      } else {
        g_ObjectData.get(objectId - 1).comment = inputText;
        showObjectDialog(player, dialogId);
      }
      return 1;
    }
    case DIALOG_ID.OBJECT_INDEX: {
      const objectId = getPlayerEditObject(player);
      if (!ObjectMp.isValid(objectId)) {
        g_PlayerData.get(player.id).editIdType = ID_TYPE.NONE;
        return 1;
      }

      if (!response) {
        showObjectDialog(player, DIALOG_ID.OBJECT_MAIN);
        return 1;
      }

      switch (listItem) {
        case DIALOG_LISTITEM_OINDEX.REMOVE: {
          g_ObjectData.get(objectId - 1).matIndexType[
            g_PlayerData.get(player.id).editObjMatIdx
          ] = MATERIAL_INDEX_TYPE.NONE;

          const newObjectId = recreateObject(objectId);
          if (newObjectId === InvalidEnum.OBJECT_ID) {
            player.sendClientMessage(
              RGBA_RED,
              "ERROR: This object could not be materialindex reset / re-created!"
            );
          }
          break;
        }
        case DIALOG_LISTITEM_OINDEX.MAT: {
          player.selectTextDraw(SELECT_TD_COLOR);
          showPlayerTextDrawMode(player, TD_MODE.TEXTURELIST);
          return 1;
        }
        case DIALOG_LISTITEM_OINDEX.MAT_COLOR_S: {
          player.selectTextDraw(SELECT_TD_COLOR);
          showPlayerTextDrawMode(player, TD_MODE.COLORLIST_TEXTURE);
          return 1;
        }
        case DIALOG_LISTITEM_OINDEX.MAT_COLOR_A: {
          showObjectDialog(player, DIALOG_ID.COLORALPHA_TEXTURE);
          return 1;
        }
        case DIALOG_LISTITEM_OINDEX.MAT_COLOR_R: {
          const materialIndex = g_PlayerData.get(player.id).editObjMatIdx;
          if (
            g_ObjectData.get(objectId - 1).matIndexType[materialIndex] !=
            MATERIAL_INDEX_TYPE.TEXTURE
          ) {
            g_ObjectData.get(objectId - 1).matIndexType[materialIndex] =
              MATERIAL_INDEX_TYPE.TEXTURE;
            defaultObjectMaterialIndexData(objectId, materialIndex);
          }

          g_ObjectData.get(objectId - 1).matIndexColor[materialIndex] = 0x0;

          if (
            g_ObjectData.get(objectId - 1).matIndexModCount >=
            MAX_MATERIALINDEX_MODCOUNT
          ) {
            const newObjectId = recreateObject(objectId);
            if (newObjectId === InvalidEnum.OBJECT_ID) {
              player.sendClientMessage(
                RGBA_RED,
                "ERROR: This object could not be color reset / re-created!"
              );
            }
          } else {
            applyObjectMaterialIndexData(objectId, materialIndex);
          }
          break;
        }
        case DIALOG_LISTITEM_OINDEX.TXT: {
          showObjectDialog(player, DIALOG_ID.OBJECT_TEXT);
          return 1;
        }
        case DIALOG_LISTITEM_OINDEX.TXT_MATSIZE: {
          showObjectDialog(player, DIALOG_ID.OBJECT_MATSIZE);
          return 1;
        }
        case DIALOG_LISTITEM_OINDEX.TXT_FONTFACE: {
          player.selectTextDraw(SELECT_TD_COLOR);
          showPlayerTextDrawMode(player, TD_MODE.FONTLIST);
          return 1;
        }
        case DIALOG_LISTITEM_OINDEX.TXT_FONTSIZE: {
          showObjectDialog(player, DIALOG_ID.OBJECT_FONTSIZE);
          return 1;
        }
        case DIALOG_LISTITEM_OINDEX.TXT_ISBOLD: {
          const materialIndex = g_PlayerData.get(player.id).editObjMatIdx;
          if (
            g_ObjectData.get(objectId - 1).matIndexType[materialIndex] !=
            MATERIAL_INDEX_TYPE.TEXT
          ) {
            g_ObjectData.get(objectId - 1).matIndexType[materialIndex] =
              MATERIAL_INDEX_TYPE.TEXT;
            defaultObjectMaterialIndexData(objectId, materialIndex);
          }

          g_ObjectData.get(objectId - 1).matIndexIsBold[materialIndex] =
            !g_ObjectData.get(objectId - 1).matIndexIsBold[materialIndex];

          if (
            g_ObjectData.get(objectId - 1).matIndexModCount >=
            MAX_MATERIALINDEX_MODCOUNT
          ) {
            const newObjectId = recreateObject(objectId);
            if (newObjectId === InvalidEnum.OBJECT_ID) {
              player.sendClientMessage(
                RGBA_RED,
                "ERROR: This object could not be texted / re-created!"
              );
            }
          } else {
            applyObjectMaterialIndexData(objectId, materialIndex);
          }
          break;
        }
        case DIALOG_LISTITEM_OINDEX.TXT_ALIGN: {
          const materialIndex = g_PlayerData.get(player.id).editObjMatIdx;
          if (
            g_ObjectData.get(objectId - 1).matIndexType[materialIndex] !=
            MATERIAL_INDEX_TYPE.TEXT
          ) {
            g_ObjectData.get(objectId - 1).matIndexType[materialIndex] =
              MATERIAL_INDEX_TYPE.TEXT;
            defaultObjectMaterialIndexData(objectId, materialIndex);
          }

          g_ObjectData.get(objectId - 1).matIndexAlignment[materialIndex]++;

          if (
            !isValidMaterialAlignment(
              g_ObjectData.get(objectId - 1).matIndexAlignment[materialIndex]
            )
          ) {
            g_ObjectData.get(objectId - 1).matIndexAlignment[materialIndex] = 0;
          }

          if (
            g_ObjectData.get(objectId - 1).matIndexModCount >=
            MAX_MATERIALINDEX_MODCOUNT
          ) {
            const newObjectId = recreateObject(objectId);
            if (newObjectId === InvalidEnum.OBJECT_ID) {
              player.sendClientMessage(
                RGBA_RED,
                "ERROR: This object could not be texted / re-created!"
              );
            }
          } else {
            applyObjectMaterialIndexData(objectId, materialIndex);
          }
          break;
        }
        case DIALOG_LISTITEM_OINDEX.TXT_FONTCOLOR_S: {
          player.selectTextDraw(SELECT_TD_COLOR);
          showPlayerTextDrawMode(player, TD_MODE.COLORLIST_FONTFACE);
          return 1;
        }
        case DIALOG_LISTITEM_OINDEX.TXT_FONTCOLOR_A: {
          showObjectDialog(player, DIALOG_ID.COLORALPHA_FONTFACE);
          return 1;
        }
        case DIALOG_LISTITEM_OINDEX.TXT_BACKCOLOR_S: {
          player.selectTextDraw(SELECT_TD_COLOR);
          showPlayerTextDrawMode(player, TD_MODE.COLORLIST_FONTBACK);
          return 1;
        }
        case DIALOG_LISTITEM_OINDEX.TXT_BACKCOLOR_O: {
          const materialIndex = g_PlayerData.get(player.id).editObjMatIdx;
          if (
            g_ObjectData.get(objectId - 1).matIndexType[materialIndex] !=
            MATERIAL_INDEX_TYPE.TEXT
          ) {
            g_ObjectData.get(objectId - 1).matIndexType[materialIndex] =
              MATERIAL_INDEX_TYPE.TEXT;
            defaultObjectMaterialIndexData(objectId, materialIndex);
          }

          g_ObjectData.get(objectId - 1).matIndexColor[materialIndex] =
            setARGBAlpha(
              g_ObjectData.get(objectId - 1).matIndexColor[materialIndex],
              0xff
            );

          if (
            g_ObjectData.get(objectId - 1).matIndexModCount >=
            MAX_MATERIALINDEX_MODCOUNT
          ) {
            const newObjectId = recreateObject(objectId);
            if (newObjectId === InvalidEnum.OBJECT_ID) {
              player.sendClientMessage(
                RGBA_RED,
                "ERROR: This object could not be colored / re-created!"
              );
            }
          } else {
            applyObjectMaterialIndexData(objectId, materialIndex);
          }
          break;
        }
        case DIALOG_LISTITEM_OINDEX.TXT_BACKCOLOR_T:
          {
            const materialIndex = g_PlayerData.get(player.id).editObjMatIdx;
            if (
              g_ObjectData.get(objectId - 1).matIndexType[materialIndex] !=
              MATERIAL_INDEX_TYPE.TEXT
            ) {
              g_ObjectData.get(objectId - 1).matIndexType[materialIndex] =
                MATERIAL_INDEX_TYPE.TEXT;
              defaultObjectMaterialIndexData(objectId, materialIndex);
            }

            g_ObjectData.get(objectId - 1).matIndexColor[materialIndex] = 0x0;

            if (
              g_ObjectData.get(objectId - 1).matIndexModCount >=
              MAX_MATERIALINDEX_MODCOUNT
            ) {
              const newObjectId = recreateObject(objectId);
              if (newObjectId === InvalidEnum.OBJECT_ID) {
                player.sendClientMessage(
                  RGBA_RED,
                  "ERROR: This object could not be texted / re-created!"
                );
              }
            } else {
              applyObjectMaterialIndexData(objectId, materialIndex);
            }
          }
          break;
      }

      showObjectDialog(player, dialogId);
      return 1;
    }
    case DIALOG_ID.OBJECT_MATSIZE: {
      const objectId = getPlayerEditObject(player);
      if (!ObjectMp.isValid(objectId)) {
        g_PlayerData.get(player.id).editIdType = ID_TYPE.NONE;
        return 1;
      }

      if (!response) {
        showObjectDialog(player, DIALOG_ID.OBJECT_INDEX);
        return 1;
      }

      const materialIndex = g_PlayerData.get(player.id).editObjMatIdx;
      if (
        g_ObjectData.get(objectId - 1).matIndexType[materialIndex] !=
        MATERIAL_INDEX_TYPE.TEXT
      ) {
        g_ObjectData.get(objectId - 1).matIndexType[materialIndex] =
          MATERIAL_INDEX_TYPE.TEXT;
        defaultObjectMaterialIndexData(objectId, materialIndex);
      }

      g_ObjectData.get(objectId - 1).matIndexSize[materialIndex] =
        (listItem + 1) * 10;

      if (
        g_ObjectData.get(objectId - 1).matIndexModCount >=
        MAX_MATERIALINDEX_MODCOUNT
      ) {
        const newObjectId = recreateObject(objectId);
        if (newObjectId === InvalidEnum.OBJECT_ID) {
          player.sendClientMessage(
            RGBA_RED,
            "ERROR: This object could not be texted / re-created!"
          );
        }
      } else {
        applyObjectMaterialIndexData(objectId, materialIndex);
      }

      showObjectDialog(player, dialogId);
      return 1;
    }
    case DIALOG_ID.OBJECT_TEXT: {
      const objectId = getPlayerEditObject(player);
      if (!ObjectMp.isValid(objectId)) {
        g_PlayerData.get(player.id).editIdType = ID_TYPE.NONE;
        return 1;
      }

      if (!response) {
        showObjectDialog(player, DIALOG_ID.OBJECT_INDEX);
        return 1;
      }

      const materialIndex = g_PlayerData.get(player.id).editObjMatIdx;
      if (
        g_ObjectData.get(objectId - 1).matIndexType[materialIndex] !=
        MATERIAL_INDEX_TYPE.TEXT
      ) {
        g_ObjectData.get(objectId - 1).matIndexType[materialIndex] =
          MATERIAL_INDEX_TYPE.TEXT;
        defaultObjectMaterialIndexData(objectId, materialIndex);
      }

      g_ObjectText.get(objectId - 1)[materialIndex] = inputText;

      if (
        g_ObjectData.get(objectId - 1).matIndexModCount >=
        MAX_MATERIALINDEX_MODCOUNT
      ) {
        const newObjectId = recreateObject(objectId);
        if (newObjectId === InvalidEnum.OBJECT_ID) {
          player.sendClientMessage(
            RGBA_RED,
            "ERROR: This object could not be texted / re-created!"
          );
        }
      } else {
        applyObjectMaterialIndexData(objectId, materialIndex);
      }

      showObjectDialog(player, dialogId);
      return 1;
    }
    case DIALOG_ID.OBJECT_FONTSIZE: {
      const objectId = getPlayerEditObject(player);
      if (!ObjectMp.isValid(objectId)) {
        g_PlayerData.get(player.id).editIdType = ID_TYPE.NONE;
        return 1;
      }

      if (!response) {
        showObjectDialog(player, DIALOG_ID.OBJECT_INDEX);
        return 1;
      }

      const fontSize = +inputText;
      if (!inputText.trim().length || Number.isNaN(fontSize)) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You did not enter a numeric value into the textfield!"
        );
        showObjectDialog(player, dialogId);
        return 1;
      }

      if (fontSize < 0 || fontSize > MAX_OBJECT_FONTSIZE) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You did not enter a valid fontsize into the textfield!"
        );
        showObjectDialog(player, dialogId);
        return 1;
      }

      const materialIndex = g_PlayerData.get(player.id).editObjMatIdx;
      if (
        g_ObjectData.get(objectId - 1).matIndexType[materialIndex] !=
        MATERIAL_INDEX_TYPE.TEXT
      ) {
        g_ObjectData.get(objectId - 1).matIndexType[materialIndex] =
          MATERIAL_INDEX_TYPE.TEXT;
        defaultObjectMaterialIndexData(objectId, materialIndex);
      }

      g_ObjectData.get(objectId - 1).matIndexFontSize[materialIndex] = fontSize;

      if (
        g_ObjectData.get(objectId - 1).matIndexModCount >=
        MAX_MATERIALINDEX_MODCOUNT
      ) {
        const newObjectId = recreateObject(objectId);
        if (newObjectId === InvalidEnum.OBJECT_ID) {
          player.sendClientMessage(
            RGBA_RED,
            "ERROR: This object could not be texted / re-created!"
          );
        }
      } else {
        applyObjectMaterialIndexData(objectId, materialIndex);
      }
      showObjectDialog(player, dialogId);
      return 1;
    }
    case DIALOG_ID.COLORALPHA_TEXTURE:
    case DIALOG_ID.COLORALPHA_FONTFACE: {
      const objectId = getPlayerEditObject(player);
      if (!ObjectMp.isValid(objectId)) {
        return 1;
      }

      if (!response) {
        showObjectDialog(player, DIALOG_ID.OBJECT_INDEX);
        return 1;
      }

      const alpha = +inputText;
      if (!inputText.trim().length || Number.isNaN(alpha)) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You must enter a decimal or hexadecimal value!"
        );
        showObjectDialog(player, dialogId);
        return 1;
      }

      if (alpha < 0x00 || alpha > 0xff) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You must enter a value between 0 - 255!"
        );
        showObjectDialog(player, dialogId);
        return 1;
      }

      const materialIndex = g_PlayerData.get(player.id).editObjMatIdx;
      if (!isValidMaterialIndex(materialIndex)) {
        return 1;
      }

      switch (dialogId) {
        case DIALOG_ID.COLORALPHA_TEXTURE: {
          if (
            g_ObjectData.get(objectId - 1).matIndexType[materialIndex] !=
            MATERIAL_INDEX_TYPE.TEXTURE
          ) {
            g_ObjectData.get(objectId - 1).matIndexType[materialIndex] =
              MATERIAL_INDEX_TYPE.TEXTURE;
            defaultObjectMaterialIndexData(objectId, materialIndex);
          }

          g_ObjectData.get(objectId - 1).matIndexColor[materialIndex] =
            setARGBAlpha(
              g_ObjectData.get(objectId - 1).matIndexColor[materialIndex],
              alpha
            );
          break;
        }
        case DIALOG_ID.COLORALPHA_FONTFACE:
          {
            if (
              g_ObjectData.get(objectId - 1).matIndexType[materialIndex] !=
              MATERIAL_INDEX_TYPE.TEXT
            ) {
              g_ObjectData.get(objectId - 1).matIndexType[materialIndex] =
                MATERIAL_INDEX_TYPE.TEXT;
              defaultObjectMaterialIndexData(objectId, materialIndex);
            }

            g_ObjectData.get(objectId - 1).matIndexFontColor[materialIndex] =
              setARGBAlpha(
                g_ObjectData.get(objectId - 1).matIndexFontColor[materialIndex],
                alpha
              );
          }
          break;
      }

      if (
        g_ObjectData.get(objectId - 1).matIndexModCount >=
        MAX_MATERIALINDEX_MODCOUNT
      ) {
        const newObjectId = recreateObject(objectId);
        if (newObjectId === InvalidEnum.OBJECT_ID) {
          player.sendClientMessage(
            RGBA_RED,
            "ERROR: This object could not be colored / re-created!"
          );
        }
      } else {
        applyObjectMaterialIndexData(objectId, materialIndex);
      }

      showObjectDialog(player, dialogId);
      return 1;
    }
  }

  return 0;
}

export function isValidMaterialIndex(index: number) {
  return index >= 0 && index < MAX_OBJECT_INDEX;
}

export function getObjectAttachObject(objectId: number) {
  if (g_ObjectData.get(objectId - 1).attachIdType === ID_TYPE.OBJECT) {
    return g_ObjectData.get(objectId - 1).attachId;
  }
  return InvalidEnum.OBJECT_ID;
}

export function getObjectAttachVehicle(objectId: number) {
  if (g_ObjectData.get(objectId - 1).attachIdType === ID_TYPE.VEHICLE) {
    return g_ObjectData.get(objectId - 1).attachId;
  }
  return InvalidEnum.VEHICLE_ID;
}

export function migrateObjectMaterialIndexData(
  fromObjectId: number,
  toObjectId: number,
  materialIndex: number
) {
  switch (g_ObjectData.get(fromObjectId - 1).matIndexType[materialIndex]) {
    case MATERIAL_INDEX_TYPE.TEXTURE: {
      g_ObjectData.get(toObjectId - 1).matIndexTexture[materialIndex] =
        g_ObjectData.get(fromObjectId - 1).matIndexTexture[materialIndex];
      g_ObjectData.get(toObjectId - 1).matIndexColor[materialIndex] =
        g_ObjectData.get(fromObjectId - 1).matIndexColor[materialIndex];
      break;
    }
    case MATERIAL_INDEX_TYPE.TEXT: {
      const g_ObjectTextString = g_ObjectText.get(fromObjectId - 1)[
        materialIndex
      ];
      const g_FontString = g_ObjectFont.get(fromObjectId - 1)[materialIndex];

      g_ObjectText.get(toObjectId - 1)[materialIndex] = g_ObjectTextString;
      g_ObjectFont.get(toObjectId - 1)[materialIndex] = g_FontString;
      g_ObjectData.get(toObjectId - 1).matIndexSize[materialIndex] =
        g_ObjectData.get(fromObjectId - 1).matIndexSize[materialIndex];
      g_ObjectData.get(toObjectId - 1).matIndexFontSize[materialIndex] =
        g_ObjectData.get(fromObjectId - 1).matIndexFontSize[materialIndex];
      g_ObjectData.get(toObjectId - 1).matIndexIsBold[materialIndex] =
        g_ObjectData.get(fromObjectId - 1).matIndexIsBold[materialIndex];
      g_ObjectData.get(toObjectId - 1).matIndexFontColor[materialIndex] =
        g_ObjectData.get(fromObjectId - 1).matIndexFontColor[materialIndex];
      g_ObjectData.get(toObjectId - 1).matIndexColor[materialIndex] =
        g_ObjectData.get(fromObjectId - 1).matIndexColor[materialIndex];
      g_ObjectData.get(toObjectId - 1).matIndexAlignment[materialIndex] =
        g_ObjectData.get(fromObjectId - 1).matIndexAlignment[materialIndex];
      break;
    }
    default: {
      return 0;
    }
  }

  g_ObjectData.get(toObjectId - 1).matIndexType[materialIndex] =
    g_ObjectData.get(fromObjectId - 1).matIndexType[materialIndex];
  return 1;
}

export function migrateObjectAttachData(
  fromObjectId: number,
  toObjectId: number,
  attachToId: number
) {
  switch (g_ObjectData.get(fromObjectId - 1).attachIdType) {
    case ID_TYPE.OBJECT:
    case ID_TYPE.VEHICLE: {
      break;
    }
    default: {
      return 0;
    }
  }

  g_ObjectData.get(toObjectId - 1).attachIdType = g_ObjectData.get(
    fromObjectId - 1
  ).attachIdType;
  g_ObjectData.get(toObjectId - 1).attachId = attachToId;
  g_ObjectData.get(toObjectId - 1).attachX = g_ObjectData.get(
    fromObjectId - 1
  ).attachX;
  g_ObjectData.get(toObjectId - 1).attachY = g_ObjectData.get(
    fromObjectId - 1
  ).attachY;
  g_ObjectData.get(toObjectId - 1).attachZ = g_ObjectData.get(
    fromObjectId - 1
  ).attachZ;
  g_ObjectData.get(toObjectId - 1).attachRx = g_ObjectData.get(
    fromObjectId - 1
  ).attachRx;
  g_ObjectData.get(toObjectId - 1).attachRy = g_ObjectData.get(
    fromObjectId - 1
  ).attachRy;
  g_ObjectData.get(toObjectId - 1).attachRz = g_ObjectData.get(
    fromObjectId - 1
  ).attachRz;
  return 1;
}

export function defaultObjectMaterialIndexData(
  objectId: number,
  materialIndex: number
) {
  switch (g_ObjectData.get(objectId - 1).matIndexType[materialIndex]) {
    case MATERIAL_INDEX_TYPE.TEXTURE: {
      g_ObjectData.get(objectId - 1).matIndexTexture[materialIndex] =
        INVALID_TEXTURE_ID;
      g_ObjectData.get(objectId - 1).matIndexColor[materialIndex] = 0x0;
      break;
    }
    case MATERIAL_INDEX_TYPE.TEXT: {
      g_ObjectText.get(objectId - 1)[materialIndex] = "Example Text";
      g_ObjectData.get(objectId - 1).matIndexSize[materialIndex] =
        ObjectMaterialTextSizeEnum._256x128;
      g_ObjectFont.get(objectId - 1)[materialIndex] = "Arial";
      g_ObjectData.get(objectId - 1).matIndexFontSize[materialIndex] = 24;
      g_ObjectData.get(objectId - 1).matIndexIsBold[materialIndex] = true;
      g_ObjectData.get(objectId - 1).matIndexFontColor[
        materialIndex
      ] = 0xffffffff;
      g_ObjectData.get(objectId - 1).matIndexColor[materialIndex] = 0x0;
      g_ObjectData.get(objectId - 1).matIndexAlignment[materialIndex] = 0;
      break;
    }
  }
}

export function applyObjectMaterialIndexData(
  objectId: number,
  materialIndex: number
) {
  switch (g_ObjectData.get(objectId - 1).matIndexType[materialIndex]) {
    case MATERIAL_INDEX_TYPE.TEXTURE: {
      const textureId = g_ObjectData.get(objectId - 1).matIndexTexture[
        materialIndex
      ];
      const {
        modelId,
        txd: g_TextureTXDString,
        name: g_TextureNameString,
      } = getTextureData(textureId);
      ObjectMp.getInstance(objectId)?.setMaterial(
        materialIndex,
        modelId,
        g_TextureTXDString,
        g_TextureNameString,
        g_ObjectData.get(objectId - 1).matIndexColor[materialIndex]
      );
      break;
    }
    case MATERIAL_INDEX_TYPE.TEXT: {
      const g_ObjectTextString = g_ObjectText.get(objectId - 1)[materialIndex];
      const g_FontString = g_ObjectFont.get(objectId - 1)[materialIndex];
      ObjectMp.getInstance(objectId)?.setMaterialText(
        GLOBAL_CHARSET,
        g_ObjectTextString,
        materialIndex,
        g_ObjectData.get(objectId - 1).matIndexSize[materialIndex],
        g_FontString,
        g_ObjectData.get(objectId - 1).matIndexFontSize[materialIndex],
        g_ObjectData.get(objectId - 1).matIndexIsBold[materialIndex],
        g_ObjectData.get(objectId - 1).matIndexFontColor[materialIndex],
        g_ObjectData.get(objectId - 1).matIndexColor[materialIndex],
        g_ObjectData.get(objectId - 1).matIndexAlignment[materialIndex]
      );
      break;
    }
    default: {
      return 0;
    }
  }
  return 1;
}

export function applyObjectAttachData(objectId: number) {
  switch (g_ObjectData.get(objectId - 1).attachIdType) {
    case ID_TYPE.OBJECT: {
      const obj = ObjectMp.getInstance(objectId);
      const attachObj = ObjectMp.getInstance(
        g_ObjectData.get(objectId - 1).attachId
      );
      if (obj && attachObj) {
        obj?.attachToObject(
          attachObj,
          g_ObjectData.get(objectId - 1).attachX,
          g_ObjectData.get(objectId - 1).attachY,
          g_ObjectData.get(objectId - 1).attachZ,
          g_ObjectData.get(objectId - 1).attachRx,
          g_ObjectData.get(objectId - 1).attachRy,
          g_ObjectData.get(objectId - 1).attachRz
        );
      }
      break;
    }
    case ID_TYPE.VEHICLE: {
      const obj = ObjectMp.getInstance(objectId);
      const attachVehicle = Vehicle.getInstance(
        g_ObjectData.get(objectId - 1).attachId
      );
      if (obj && attachVehicle) {
        obj.attachToVehicle(
          attachVehicle,
          g_ObjectData.get(objectId - 1).attachX,
          g_ObjectData.get(objectId - 1).attachY,
          g_ObjectData.get(objectId - 1).attachZ,
          g_ObjectData.get(objectId - 1).attachRx,
          g_ObjectData.get(objectId - 1).attachRy,
          g_ObjectData.get(objectId - 1).attachRz
        );
      }
      break;
    }
    default: {
      return 0;
    }
  }
  return 1;
}

export function copyObject(copyObjectId: number, copyAttachTo = true) {
  if (!ObjectMp.isValid(copyObjectId)) {
    return InvalidEnum.OBJECT_ID;
  }

  const obj = ObjectMp.getInstance(copyObjectId)!;

  const modelId = obj.getModel();
  let x = 0;
  let y = 0;
  let z = 0;
  let rx = 0;
  let ry = 0;
  let rz = 0;
  const attachToId = g_ObjectData.get(copyObjectId - 1).attachId;
  let isValidAttachToObject = false;
  let isValidAttachToVehicle = false;

  switch (g_ObjectData.get(copyObjectId - 1).attachIdType) {
    case ID_TYPE.OBJECT: {
      isValidAttachToObject = ObjectMp.isValid(attachToId);
      break;
    }
    case ID_TYPE.VEHICLE: {
      isValidAttachToVehicle = Vehicle.isValid(attachToId);
      break;
    }
  }

  if (isValidAttachToObject || isValidAttachToVehicle) {
    let attX = 0;
    let attY = 0;
    let attZ = 0;
    let attRx = 0;
    let attRy = 0;
    let attRz = 0;
    let offX = 0;
    let offY = 0;
    let offZ = 0;
    let offRx = 0;
    let offRy = 0;
    let offRz = 0;

    if (isValidAttachToObject) {
      const attachToObj = ObjectMp.getInstance(attachToId)!;
      const pos = attachToObj.getPos();
      attX = pos.x;
      attY = pos.y;
      attZ = pos.z;
      const rot = attachToObj.getRot();
      attRx = rot.x;
      attRy = rot.y;
      attRz = rot.z;
    } else if (isValidAttachToVehicle) {
      const veh = Vehicle.getInstance(attachToId)!;
      const pos = veh.getPos();
      attX = pos.x;
      attY = pos.y;
      attZ = pos.z;
      const angle = veh.getZAngle().angle;
      attRz = angle;
    }

    offX = g_ObjectData.get(copyObjectId - 1).attachX;
    offY = g_ObjectData.get(copyObjectId - 1).attachY;
    offZ = g_ObjectData.get(copyObjectId - 1).attachZ;
    offRx = g_ObjectData.get(copyObjectId - 1).attachRx;
    offRy = g_ObjectData.get(copyObjectId - 1).attachRy;
    offRz = g_ObjectData.get(copyObjectId - 1).attachRz;

    const pos = positionFromOffset(
      attX,
      attY,
      attZ,
      attRx,
      attRy,
      attRz,
      offX,
      offY,
      offZ
    );
    x = pos.x;
    y = pos.y;
    z = pos.z;

    rx = attRx + offRx;
    ry = attRy + offRy;
    rz = attRz + offRz;
  } else {
    const pos = obj.getPos();
    x = pos.x;
    y = pos.y;
    z = pos.z;
    const rot = obj.getRot();
    rx = rot.x;
    ry = rot.y;
    rz = rot.z;
  }

  try {
    const pasteObj = new ObjectMp({
      modelId,
      x,
      y,
      z,
      rx,
      ry,
      rz,
    });
    pasteObj.create();
    const pasteObjectId = pasteObj.id;

    for (
      let materialIndex = 0;
      materialIndex < MAX_OBJECT_INDEX;
      materialIndex++
    ) {
      if (
        migrateObjectMaterialIndexData(
          copyObjectId,
          pasteObjectId,
          materialIndex
        )
      ) {
        applyObjectMaterialIndexData(pasteObjectId, materialIndex);
      }
    }

    const g_CommentString = g_ObjectData.get(copyObjectId - 1).comment;
    g_ObjectData.get(pasteObjectId - 1).comment = g_CommentString;

    g_ObjectData.get(pasteObjectId - 1).memoryX = g_ObjectData.get(
      copyObjectId - 1
    ).memoryX;
    g_ObjectData.get(pasteObjectId - 1).memoryY = g_ObjectData.get(
      copyObjectId - 1
    ).memoryY;
    g_ObjectData.get(pasteObjectId - 1).memoryZ = g_ObjectData.get(
      copyObjectId - 1
    ).memoryZ;
    g_ObjectData.get(pasteObjectId - 1).memoryRx = g_ObjectData.get(
      copyObjectId - 1
    ).memoryRx;
    g_ObjectData.get(pasteObjectId - 1).memoryRy = g_ObjectData.get(
      copyObjectId - 1
    ).memoryRy;
    g_ObjectData.get(pasteObjectId - 1).memoryRz = g_ObjectData.get(
      copyObjectId - 1
    ).memoryRz;

    if (copyAttachTo) {
      if (migrateObjectAttachData(copyObjectId, pasteObjectId, attachToId)) {
        applyObjectAttachData(pasteObjectId);
      }
    }

    return pasteObjectId;
  } catch {
    return InvalidEnum.OBJECT_ID;
  }
}

export function recreateObject(copyObjectId: number, copyAttachTo = true) {
  const pasteObjectId = copyObject(copyObjectId, copyAttachTo);

  if (pasteObjectId !== InvalidEnum.OBJECT_ID) {
    transferObjectAttachments(copyObjectId, pasteObjectId);

    Player.getInstances().forEach((p) => {
      if (!p.isConnected()) {
        return;
      }

      if (getPlayerEditObject(p) === copyObjectId) {
        g_PlayerData.get(p.id).editId = pasteObjectId;
      }

      if (g_PlayerData.get(p.id).editAttachObject === copyObjectId) {
        g_PlayerData.get(p.id).editAttachObject = pasteObjectId;
      }

      if (g_PlayerData.get(p.id).editMaterialObj === copyObjectId) {
        g_PlayerData.get(p.id).editMaterialObj = pasteObjectId;
      }

      for (let row = 0; row < MAX_SELECT_LIST_ROWS; row++) {
        if (copyObjectId !== g_SelectObjListData.get(p.id).rowId[row]) {
          continue;
        }

        g_SelectObjListData.get(p.id).rowId[row] = pasteObjectId;

        if (g_PlayerData.get(p.id).tdMode === TD_MODE.SELECTLIST_OBJECT) {
          applySelectListRowData(p, row);
        }
      }
    });

    const copyObj = ObjectMp.getInstance(copyObjectId)!;
    copyObj.destroy();
  }

  return pasteObjectId;
}

export function copyObjectAttachments(
  fromObjectId: number,
  toObjectId: number
) {
  ObjectMp.getInstances().forEach((o) => {
    if (!o.isValid() || o.id === fromObjectId || o.id === toObjectId) {
      return;
    }

    if (getObjectAttachObject(o.id) !== fromObjectId) {
      return;
    }

    const pasteObjectId = copyObject(o.id, false);

    if (pasteObjectId === InvalidEnum.OBJECT_ID) {
      return 0;
    }

    if (migrateObjectAttachData(o.id, pasteObjectId, toObjectId)) {
      applyObjectAttachData(pasteObjectId);
    }
  });
  return 1;
}

export function transferObjectAttachments(
  fromObjectId: number,
  toObjectId: number
) {
  ObjectMp.getInstances().forEach((o) => {
    if (!o.isValid() || o.id === fromObjectId || o.id === toObjectId) {
      return;
    }

    if (getObjectAttachObject(o.id) === fromObjectId) {
      g_ObjectData.get(o.id - 1).attachId = toObjectId;
      applyObjectAttachData(o.id);
    }
  });
}

export async function showObjectDialog(player: Player, dialogId: number) {
  switch (dialogId) {
    case DIALOG_ID.OBJECT_MAIN: {
      const objectId = getPlayerEditObject(player);
      if (!ObjectMp.isValid(objectId)) {
        return 1;
      }

      let g_DialogInfo = "";

      for (
        let listItem = 0;
        listItem < DIALOG_LISTITEM_OBJECT.MAX;
        listItem++
      ) {
        if (
          dialogId >= DIALOG_LISTITEM_OBJECT.INDEX_START &&
          dialogId <= DIALOG_LISTITEM_OBJECT.INDEX_END
        ) {
          let g_DialogInfoRow = "";
          const materialIndex = listItem - DIALOG_LISTITEM_OBJECT.INDEX_START;
          switch (g_ObjectData.get(objectId - 1).matIndexType[materialIndex]) {
            case MATERIAL_INDEX_TYPE.TEXTURE: {
              const textureId = g_ObjectData.get(objectId - 1).matIndexTexture[
                materialIndex
              ];
              const colorArgb = g_ObjectData.get(objectId - 1).matIndexColor[
                materialIndex
              ];
              const colorRgb = aRGBtoRGB(colorArgb)
                .toString(16)
                .padStart(6, "0");

              if (textureId === INVALID_TEXTURE_ID) {
                g_DialogInfoRow = `Material Index ${materialIndex}\t0x${colorRgb}Color\n`;
              } else {
                const {
                  modelId,
                  txd: g_TextureTXDString,
                  name: g_TextureNameString,
                } = getTextureData(textureId);
                g_DialogInfoRow = `Material Index ${materialIndex}\t0x${colorRgb} ${modelId} ${g_TextureTXDString} ${g_TextureNameString}\n`;
              }
              break;
            }
            case MATERIAL_INDEX_TYPE.TEXT: {
              const colorArgb = g_ObjectData.get(objectId - 1)
                .matIndexFontColor[materialIndex];
              const colorRgb = aRGBtoRGB(colorArgb)
                .toString(16)
                .padStart(6, "0");

              const g_ObjectTextString = g_ObjectText.get(objectId - 1)[
                materialIndex
              ];
              g_DialogInfoRow = `Material Index ${materialIndex}\t0x${colorRgb}${g_ObjectTextString}\n`;
              break;
            }
            default: {
              g_DialogInfoRow = `Material Index ${materialIndex}\tDefault / Unknown\n`;
            }
          }
          g_DialogInfo += g_DialogInfoRow;
        } else {
          switch (listItem) {
            case DIALOG_LISTITEM_OBJECT.GOTO: {
              g_DialogInfo += "Goto\t \n";
              break;
            }
            case DIALOG_LISTITEM_OBJECT.GET: {
              g_DialogInfo += "Get\t \n";
              break;
            }
            case DIALOG_LISTITEM_OBJECT.COORD: {
              if (
                g_ObjectData.get(objectId - 1).attachIdType === ID_TYPE.NONE
              ) {
                g_DialogInfo += "Coordinates & Rotation\t \n";
              } else {
                g_DialogInfo += "Offset & Rotation\t \n";
              }
              break;
            }
            case DIALOG_LISTITEM_OBJECT.MOVE: {
              if (
                g_ObjectData.get(objectId - 1).attachIdType === ID_TYPE.NONE
              ) {
                g_DialogInfo += "Click & Drag Move\t \n";
              } else {
                g_DialogInfo += "Toggle Offset Editor\t \n";
              }
              break;
            }
            case DIALOG_LISTITEM_OBJECT.ATTACH_SELECT: {
              g_DialogInfo += "Select as Attachment\t \n";
              break;
            }
            case DIALOG_LISTITEM_OBJECT.ATTACH_APPLY: {
              const attachObject = g_PlayerData.get(player.id).editAttachObject;
              if (
                !ObjectMp.isValid(attachObject) ||
                attachObject === objectId
              ) {
                g_DialogInfo += " \t \n";
              } else {
                const g_CommentString = g_ObjectData.get(
                  attachObject - 1
                ).comment;
                const g_DialogInfoRow = `Attach Selected Object\t${g_CommentString}\n`;
                g_DialogInfo += g_DialogInfoRow;
              }
              break;
            }
            case DIALOG_LISTITEM_OBJECT.ATTACH_REMOVE: {
              switch (g_ObjectData.get(objectId - 1).attachIdType) {
                case ID_TYPE.OBJECT: {
                  const attachObject = g_ObjectData.get(objectId - 1).attachId;
                  const g_CommentString = g_ObjectData.get(
                    attachObject - 1
                  ).comment;
                  const g_DialogInfoRow = `Un-Attach from Object\t${g_CommentString}\n`;
                  g_DialogInfo += g_DialogInfoRow;
                  break;
                }
                case ID_TYPE.VEHICLE: {
                  const attachVehicle = g_ObjectData.get(objectId - 1).attachId;
                  const g_CommentString = g_VehicleData.get(
                    attachVehicle - 1
                  ).comment;
                  const g_DialogInfoRow = `Un-Attach from Vehicle\t${g_CommentString}\n`;
                  g_DialogInfo += g_DialogInfoRow;
                  break;
                }
                default: {
                  g_DialogInfo += "Attempt to Un-Attach\t \n";
                }
              }
              break;
            }
            case DIALOG_LISTITEM_OBJECT.MATERIALS_COPY: {
              g_DialogInfo += "Select Material Data\t \n";
              break;
            }
            case DIALOG_LISTITEM_OBJECT.MATERIALS_PASTE: {
              const copyFromObjectid = g_PlayerData.get(
                player.id
              ).editMaterialObj;
              if (
                !ObjectMp.isValid(copyFromObjectid) ||
                objectId === copyFromObjectid
              ) {
                g_DialogInfo += " \t \n";
              } else {
                const g_CommentString = g_ObjectData.get(
                  copyFromObjectid - 1
                ).comment;
                const g_DialogInfoRow = `Paste Material Data from\t${g_CommentString}\n`;
                g_DialogInfo += g_DialogInfoRow;
              }
              break;
            }
            case DIALOG_LISTITEM_OBJECT.DUPLICATE: {
              g_DialogInfo += "Duplicate\t \n";
              break;
            }
            case DIALOG_LISTITEM_OBJECT.RECREATE: {
              g_DialogInfo += "Recreate\t \n";
              break;
            }
            case DIALOG_LISTITEM_OBJECT.REMOVE: {
              g_DialogInfo += "Remove\t \n";
              break;
            }
            case DIALOG_LISTITEM_OBJECT.COMMENT: {
              const g_CommentString = g_ObjectData.get(objectId - 1).comment;
              const g_DialogInfoRow = `Comment\t${g_CommentString}\n`;
              g_DialogInfo += g_DialogInfoRow;
              break;
            }
            case DIALOG_LISTITEM_OBJECT.COMMENT_RESET: {
              const obj = ObjectMp.getInstance(objectId)!;
              const g_ModelString = getModelName(obj.getModel()).name;
              const g_DialogInfoRow = `Reset Comment To\t${g_ModelString}\n`;
              g_DialogInfo += g_DialogInfoRow;
              break;
            }
            default: {
              g_DialogInfo += " \t \n";
            }
          }
        }
      }
      const res = await new Dialog({
        style: DialogStylesEnum.TABLIST,
        caption: "Object",
        info: g_DialogInfo,
        button1: "Select",
        button2: "Cancel",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    case DIALOG_ID.OBJECT_INDEX: {
      const objectId = getPlayerEditObject(player);
      if (!ObjectMp.isValid(objectId)) {
        return 1;
      }

      const materialIndex = g_PlayerData.get(player.id).editObjMatIdx;
      const indexType = g_ObjectData.get(objectId - 1).matIndexType[
        materialIndex
      ];

      const g_DialogCaption = `Material Index: ${materialIndex}`;
      let g_DialogInfo = "";

      for (
        let listItem = 0;
        listItem < DIALOG_LISTITEM_OINDEX.MAX;
        listItem++
      ) {
        switch (listItem) {
          case DIALOG_LISTITEM_OINDEX.REMOVE: {
            g_DialogInfo += "All\tReset Material Index\t-\n";
            break;
          }
          case DIALOG_LISTITEM_OINDEX.MAT: {
            if (indexType === MATERIAL_INDEX_TYPE.TEXTURE) {
              const textureId = g_ObjectData.get(objectId - 1).matIndexTexture[
                materialIndex
              ];

              const {
                modelId,
                txd: g_TextureTXDString,
                name: g_TextureNameString,
              } = getTextureData(textureId);

              const g_DialogInfoRow = `Texture\tTexture\t${modelId} ${g_TextureTXDString} ${g_TextureNameString}\n`;
              g_DialogInfo += g_DialogInfoRow;
            } else {
              g_DialogInfo += "Texture\tTexture\t-\n";
            }
            break;
          }
          case DIALOG_LISTITEM_OINDEX.MAT_COLOR_S: {
            if (indexType === MATERIAL_INDEX_TYPE.TEXTURE) {
              const argb = g_ObjectData.get(objectId - 1).matIndexColor[
                materialIndex
              ];
              const rgb = aRGBtoRGB(argb).toString(16).padStart(6, "0");
              const g_DialogInfoRow = `Texture\tColor\t0x${rgb}Color\n`;
              g_DialogInfo += g_DialogInfoRow;
            } else {
              g_DialogInfo += "Texture\tColor\t-\n";
            }
            break;
          }
          case DIALOG_LISTITEM_OINDEX.MAT_COLOR_A: {
            if (indexType === MATERIAL_INDEX_TYPE.TEXTURE) {
              const argb = g_ObjectData.get(objectId - 1).matIndexColor[
                materialIndex
              ];
              const g_DialogInfoRow = `Texture\tAlpha\t${aRGBtoA(
                argb
              )}/${0xff}\n`;
              g_DialogInfo += g_DialogInfoRow;
            } else {
              g_DialogInfo += "Texture\tAlpha\t-\n";
            }
            break;
          }
          case DIALOG_LISTITEM_OINDEX.MAT_COLOR_R: {
            g_DialogInfo += "Texture\tReset Color\t-\n";
            break;
          }
          case DIALOG_LISTITEM_OINDEX.TXT: {
            if (indexType === MATERIAL_INDEX_TYPE.TEXT) {
              const g_ObjectTextString = g_ObjectText.get(objectId - 1)[
                materialIndex
              ];
              const g_DialogInfoRow = `Text\tString\t${g_ObjectTextString}\n`;
              g_DialogInfo += g_DialogInfoRow;
            } else {
              g_DialogInfo += "Text\tString\t-\n";
            }
            break;
          }
          case DIALOG_LISTITEM_OINDEX.TXT_MATSIZE: {
            if (indexType === MATERIAL_INDEX_TYPE.TEXT) {
              const materialSize = g_ObjectData.get(objectId - 1).matIndexSize[
                materialIndex
              ];
              const g_MaterialSizeString = getMaterialSizeName(materialSize);
              const g_DialogInfoRow = `Text\tMaterial Size\t${g_MaterialSizeString}\n`;
              g_DialogInfo += g_DialogInfoRow;
            } else {
              g_DialogInfo += "Text\tMaterial Size\t-\n";
            }
            break;
          }
          case DIALOG_LISTITEM_OINDEX.TXT_FONTFACE: {
            if (indexType === MATERIAL_INDEX_TYPE.TEXT) {
              const g_FontString = g_ObjectFont.get(objectId - 1)[
                materialIndex
              ];
              const g_DialogInfoRow = `Text\tFont Face\t${g_FontString}\n`;
              g_DialogInfo += g_DialogInfoRow;
            } else {
              g_DialogInfo += "Text\tFont Face\t-\n";
            }
            break;
          }
          case DIALOG_LISTITEM_OINDEX.TXT_FONTSIZE: {
            if (indexType === MATERIAL_INDEX_TYPE.TEXT) {
              const fontSize = g_ObjectData.get(objectId - 1).matIndexFontSize[
                materialIndex
              ];
              const g_DialogInfoRow = `Text\tFont Size\t${fontSize}\n`;
              g_DialogInfo += g_DialogInfoRow;
            } else {
              g_DialogInfo += "Text\tFont Size\t-\n";
            }
            break;
          }
          case DIALOG_LISTITEM_OINDEX.TXT_ISBOLD: {
            if (indexType === MATERIAL_INDEX_TYPE.TEXT) {
              const yesOrNo = g_ObjectData.get(objectId - 1).matIndexIsBold[
                materialIndex
              ]
                ? "Yes"
                : "No";
              const g_DialogInfoRow = `Text\tFont Bold\t${yesOrNo}\n`;
              g_DialogInfo += g_DialogInfoRow;
            } else {
              g_DialogInfo += "Text\tFont Bold\t-\n";
            }
            break;
          }
          case DIALOG_LISTITEM_OINDEX.TXT_ALIGN: {
            if (indexType === MATERIAL_INDEX_TYPE.TEXT) {
              const alignment = g_ObjectData.get(objectId - 1)
                .matIndexAlignment[materialIndex];
              const g_MaterialAlignString = getAlignmentName(alignment);
              const g_DialogInfoRow = `Text\tFont Alignment\t${g_MaterialAlignString}\n`;
              g_DialogInfo += g_DialogInfoRow;
            } else {
              g_DialogInfo += "Text\tFont Alignment\t-\n";
            }
            break;
          }
          case DIALOG_LISTITEM_OINDEX.TXT_FONTCOLOR_S: {
            if (indexType === MATERIAL_INDEX_TYPE.TEXT) {
              const fontColor = g_ObjectData.get(objectId - 1)
                .matIndexFontColor[materialIndex];
              const rgb = aRGBtoRGB(fontColor).toString(16).padStart(6, "0");
              const g_DialogInfoRow = `Text\tFont Color\t0x${rgb}Color\n`;
              g_DialogInfo += g_DialogInfoRow;
            } else {
              g_DialogInfo += "Text\tFont Color\t-\n";
            }
            break;
          }
          case DIALOG_LISTITEM_OINDEX.TXT_FONTCOLOR_A: {
            if (indexType === MATERIAL_INDEX_TYPE.TEXT) {
              const fontColor = g_ObjectData.get(objectId - 1)
                .matIndexFontColor[materialIndex];
              const g_DialogInfoRow = `Text\tFont Alpha\t${aRGBtoA(
                fontColor
              )}/${0xff}\n`;
              g_DialogInfo += g_DialogInfoRow;
            } else {
              g_DialogInfo += "Text\tFont Alpha\t-\n";
            }
            break;
          }
          case DIALOG_LISTITEM_OINDEX.TXT_BACKCOLOR_S: {
            if (indexType === MATERIAL_INDEX_TYPE.TEXT) {
              const argb = g_ObjectData.get(objectId - 1).matIndexColor[
                materialIndex
              ];
              const rgb = aRGBtoRGB(argb).toString(16).padStart(6, "0");
              const g_DialogInfoRow = `Text\tBackground Color\t0x${rgb}Color\n`;
              g_DialogInfo += g_DialogInfoRow;
            } else {
              g_DialogInfo += "Text\tBackground Color\t-\n";
            }
            break;
          }
          case DIALOG_LISTITEM_OINDEX.TXT_BACKCOLOR_O: {
            g_DialogInfo += "Text\tBackground Opaque\t-\n";
            break;
          }
          case DIALOG_LISTITEM_OINDEX.TXT_BACKCOLOR_T: {
            g_DialogInfo += "Text\tBackground Transparent\t-\n";
            break;
          }
          default: {
            g_DialogInfo += "-\t-\t-\n";
          }
        }
      }
      const res = await new Dialog({
        style: DialogStylesEnum.TABLIST,
        caption: g_DialogCaption,
        info: g_DialogInfo,
        button1: "Select",
        button2: "Cancel",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    case DIALOG_ID.OBJECT_COORD: {
      const objectId = getPlayerEditObject(player);
      if (!ObjectMp.isValid(objectId)) {
        return 1;
      }

      let x = 0,
        y = 0,
        z = 0,
        rx = 0,
        ry = 0,
        rz = 0;
      if (g_ObjectData.get(objectId - 1).attachIdType === ID_TYPE.NONE) {
        const obj = ObjectMp.getInstance(objectId);
        const pos = obj?.getPos();
        if (pos) {
          x = pos.x;
          y = pos.y;
          z = pos.z;
        }
        const rot = obj?.getRot();
        if (rot) {
          rx = rot.x;
          ry = rot.y;
          rz = rot.z;
        }
      } else {
        x = g_ObjectData.get(objectId - 1).attachX;
        y = g_ObjectData.get(objectId - 1).attachY;
        z = g_ObjectData.get(objectId - 1).attachZ;
        rx = g_ObjectData.get(objectId - 1).attachRx;
        ry = g_ObjectData.get(objectId - 1).attachRy;
        rz = g_ObjectData.get(objectId - 1).attachRz;
      }

      let g_DialogInfo = "";
      let g_DialogInfoRow = `x \t${x}\n`;
      g_DialogInfo += g_DialogInfoRow;
      g_DialogInfoRow = `y \t${y}\n`;
      g_DialogInfo += g_DialogInfoRow;
      g_DialogInfoRow = `z \t${z}\n`;
      g_DialogInfo += g_DialogInfoRow;
      g_DialogInfoRow = `rx\t${rx}\n`;
      g_DialogInfo += g_DialogInfoRow;
      g_DialogInfoRow = `ry\t${ry}\n`;
      g_DialogInfo += g_DialogInfoRow;
      g_DialogInfoRow = `rz\t${rz}\n`;
      g_DialogInfo += g_DialogInfoRow;

      const res = await new Dialog({
        style: DialogStylesEnum.INPUT,
        caption: "Object Coordinates",
        info: g_DialogInfo,
        button1: "Enter",
        button2: "Cancel",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    case DIALOG_ID.OBJECT_COMMENT: {
      const objectId = getPlayerEditObject(player);
      if (!ObjectMp.isValid(objectId)) {
        return 1;
      }

      const g_CommentString = g_ObjectData.get(objectId - 1).comment;
      const g_DialogInfo = `Current Comment: ${g_CommentString}`;
      const res = await new Dialog({
        style: DialogStylesEnum.INPUT,
        caption: "Object Comment",
        info: g_DialogInfo,
        button1: "Enter",
        button2: "Cancel",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    case DIALOG_ID.OBJECT_MATSIZE: {
      let g_DialogInfo = "";

      for (let i = 0; i < MAX_MATERIAL_SIZES; i++) {
        const materialSize = (i + 1) * 10;
        const g_MaterialSizeString = getMaterialSizeName(materialSize);
        const g_DialogInfoRow = `${materialSize}\t${g_MaterialSizeString}\n`;
        g_DialogInfo += g_DialogInfoRow;
      }

      const res = await new Dialog({
        style: DialogStylesEnum.TABLIST,
        caption: "Material Sizes",
        info: g_DialogInfo,
        button1: "Select",
        button2: "Cancel",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    case DIALOG_ID.OBJECT_TEXT: {
      const objectId = getPlayerEditObject(player);
      if (!ObjectMp.isValid(objectId)) {
        return 1;
      }

      const materialIndex = g_PlayerData.get(player.id).editObjMatIdx;
      const g_ObjectTextString = g_ObjectText.get(objectId - 1)[materialIndex];
      const g_DialogInfo = `Current Text: ${g_ObjectTextString}`;
      const res = await new Dialog({
        style: DialogStylesEnum.INPUT,
        caption: "Object Text",
        info: g_DialogInfo,
        button1: "Enter",
        button2: "Cancel",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    case DIALOG_ID.OBJECT_FONTSIZE: {
      const objectId = getPlayerEditObject(player);
      if (!ObjectMp.isValid(objectId)) {
        return 1;
      }

      const materialIndex = g_PlayerData.get(player.id).editObjMatIdx;
      const fontSize = g_ObjectData.get(objectId - 1).matIndexFontSize[
        materialIndex
      ];

      const g_DialogInfo = `Current Value: ${fontSize}/${MAX_OBJECT_FONTSIZE}`;
      const res = await new Dialog({
        style: DialogStylesEnum.INPUT,
        caption: "Object Font Size",
        info: g_DialogInfo,
        button1: "Enter",
        button2: "Cancel",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    case DIALOG_ID.COLORALPHA_TEXTURE:
    case DIALOG_ID.COLORALPHA_FONTFACE: {
      const objectId = getPlayerEditObject(player);
      if (!ObjectMp.isValid(objectId)) {
        return 1;
      }

      const materialIndex = g_PlayerData.get(player.id).editObjMatIdx;
      let g_DialogInfo = "";
      let g_DialogCaption = "";
      switch (dialogId) {
        case DIALOG_ID.COLORALPHA_TEXTURE: {
          g_DialogCaption = "Object Material Alpha";

          if (
            g_ObjectData.get(objectId - 1).matIndexType[materialIndex] ===
            MATERIAL_INDEX_TYPE.TEXTURE
          ) {
            const argb = g_ObjectData.get(objectId - 1).matIndexColor[
              materialIndex
            ];
            const rgb = aRGBtoRGB(argb).toString(16).padStart(6, "0");
            g_DialogInfo = `Current Value: 0x${rgb}/${0xff}`;
          } else {
            g_DialogInfo = "Current Value: none";
          }
          break;
        }
        case DIALOG_ID.COLORALPHA_FONTFACE: {
          g_DialogCaption = "Object Text Alpha";

          if (
            g_ObjectData.get(objectId - 1).matIndexType[materialIndex] ===
            MATERIAL_INDEX_TYPE.TEXT
          ) {
            const argb = g_ObjectData.get(objectId - 1).matIndexFontColor[
              materialIndex
            ];
            const rgb = aRGBtoRGB(argb).toString(16).padStart(6, "0");
            g_DialogInfo = `Current Value: 0x${rgb}/${0xff}`;
          } else {
            g_DialogInfo = "Current Value: none";
          }
          break;
        }
        default: {
          return 0;
        }
      }
      const res = await new Dialog({
        style: DialogStylesEnum.INPUT,
        caption: g_DialogCaption,
        info: g_DialogInfo,
        button1: "Enter",
        button2: "Cancel",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    default: {
      return 0;
    }
  }
  return 1;
}

export function findObjects(
  result: number[],
  resultSize: number,
  search: string,
  offset: number
) {
  let rowsFound = 0;
  let rowsAdded = 0;
  let maxOffset = 0;
  const searchInt = Number.isNaN(+search) ? -1 : +search;

  ObjectMp.getInstances().forEach((o) => {
    if (!o.isValid()) {
      return;
    }

    const modelId = o.getModel();
    const cacheIndex = getModelCacheIndex(modelId);

    if (
      !search.trim().length ||
      searchInt === o.id ||
      searchInt === modelId ||
      g_ObjectData.get(o.id - 1).comment.includes(search) ||
      (cacheIndex !== INVALID_ARRAY_INDEX &&
        g_ModelCache.get(cacheIndex).name.includes(search))
    ) {
      if (rowsFound++ < offset) {
        return;
      }

      if (rowsAdded < resultSize) {
        result[rowsAdded++] = o.id;
      }
    }
  });

  maxOffset = rowsFound - 1;
  if (maxOffset < 0) {
    maxOffset = 0;
  }

  return { rowsAdded, maxOffset };
}
