import { g_CamModeData } from "@/camMode";
import { destroyClickDragObject, refreshClickDragObject } from "@/clickDragObj";
import {
  INVALID_ARRAY_INDEX,
  INVALID_MODEL_ID,
  RGBA_ORANGE,
  RGBA_RED,
} from "@/constants";
import { DIALOG_ID, DIALOG_LISTITEM_PICKUP } from "@/dialog";
import { ID_TYPE } from "@/idType";
import { g_ModelCache, getModelCacheIndex, getModelName } from "@/model";
import { g_PlayerData, getPlayerEditPickup } from "@/player";
import {
  applySelectListRowData,
  g_SelectPickListData,
  MAX_SELECT_LIST_ROWS,
} from "@/selectList";
import { TD_MODE } from "@/tdMode";
import { SafetyMap } from "@/utils/safetyMap";
import {
  Dialog,
  DialogStylesEnum,
  EditResponseTypesEnum,
  GameMode,
  IDialogResCommon,
  InvalidEnum,
  LimitsEnum,
  ObjectMp,
  ObjectMpEvent,
  Pickup,
  Player,
} from "@infernus/core";

export const INVALID_PICKUP_ID = -1;

export interface IPickupData {
  isValid: boolean;
  model: number;
  x: number;
  y: number;
  z: number;
  comment: string;
  memoryX: number;
  memoryY: number;
  memoryZ: number;
}

export const g_PickupData = new SafetyMap<number, IPickupData>(() => {
  return {
    isValid: false,
    model: INVALID_MODEL_ID,
    x: 0,
    y: 0,
    z: 0,
    comment: "",
    memoryX: 0,
    memoryY: 0,
    memoryZ: 0,
  };
});

GameMode.onExit(({ next }) => {
  g_PickupData.clear();
  return next();
});

ObjectMpEvent.onPlayerEdit(
  ({ player, objectMp, isPlayerObject, response, fX, fY, fZ, next }) => {
    const pickupId = getPlayerEditPickup(player);

    if (
      isPlayerObject &&
      objectMp.id === g_PlayerData.get(player.id).clickDragPoId &&
      Pickup.isValid(pickupId)
    ) {
      switch (response) {
        case EditResponseTypesEnum.FINAL: {
          g_PickupData.get(pickupId).x = fX;
          g_PickupData.get(pickupId).y = fY;
          g_PickupData.get(pickupId).z = fZ;

          if (recreatePickup(pickupId) === INVALID_PICKUP_ID) {
            player.sendClientMessage(
              RGBA_RED,
              "ERROR: This pickup could not be moved / re-created"
            );
          }

          destroyClickDragObject(player);
          showPickupDialog(player, DIALOG_ID.PICKUP_MAIN);
          break;
        }
        case EditResponseTypesEnum.CANCEL: {
          g_PickupData.get(pickupId).x = g_PickupData.get(pickupId).memoryX;
          g_PickupData.get(pickupId).y = g_PickupData.get(pickupId).memoryY;
          g_PickupData.get(pickupId).z = g_PickupData.get(pickupId).memoryZ;

          if (recreatePickup(pickupId) === INVALID_PICKUP_ID) {
            player.sendClientMessage(
              RGBA_RED,
              "ERROR: This pickup could not be moved / re-created"
            );
          }
          break;
        }
        case EditResponseTypesEnum.UPDATE: {
          g_PickupData.get(pickupId).x = fX;
          g_PickupData.get(pickupId).y = fY;
          g_PickupData.get(pickupId).z = fZ;

          recreatePickup(pickupId);
          break;
        }
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
    case DIALOG_ID.PICKUP_MAIN: {
      const pickupId = getPlayerEditPickup(player);
      if (
        pickupId === InvalidEnum.PICKUP_ID ||
        !g_PickupData.get(pickupId).isValid
      ) {
        g_PlayerData.get(player.id).editIdType = ID_TYPE.NONE;
        return 1;
      }

      if (!response) {
        return 1;
      }

      switch (listItem) {
        case DIALOG_LISTITEM_PICKUP.GOTO: {
          const x = g_PickupData.get(pickupId).x;
          const y = g_PickupData.get(pickupId).y;
          const z = g_PickupData.get(pickupId).z;

          if (g_CamModeData.get(player.id).toggle) {
            const pObj = ObjectMp.getInstance(
              g_CamModeData.get(player.id).poId,
              player
            );
            pObj?.stop();
            pObj?.setPos(x, y, z);
          } else {
            player.setPos(x, y, z);
          }
          break;
        }
        case DIALOG_LISTITEM_PICKUP.GET: {
          const pos = player.getPos();
          g_PickupData.get(pickupId).x = pos.x;
          g_PickupData.get(pickupId).y = pos.y;
          g_PickupData.get(pickupId).z = pos.z;

          const newPickupId = recreatePickup(pickupId);
          if (newPickupId === INVALID_PICKUP_ID) {
            player.sendClientMessage(
              RGBA_RED,
              "ERROR: This pickup could not be moved / re-created"
            );
          }
          break;
        }
        case DIALOG_LISTITEM_PICKUP.COORD: {
          showPickupDialog(player, DIALOG_ID.PICKUP_COORD);
          return 1;
        }
        case DIALOG_LISTITEM_PICKUP.MOVE: {
          const objectId = refreshClickDragObject(player);
          if (objectId === InvalidEnum.OBJECT_ID) {
            player.sendClientMessage(
              RGBA_RED,
              "ERROR: This pickup cannot be moved right now!"
            );
          } else {
            g_PickupData.get(pickupId).memoryX = g_PickupData.get(pickupId).x;
            g_PickupData.get(pickupId).memoryY = g_PickupData.get(pickupId).y;
            g_PickupData.get(pickupId).memoryZ = g_PickupData.get(pickupId).z;

            const pObj = ObjectMp.getInstance(objectId, player);
            pObj?.edit();

            player.sendClientMessage(
              RGBA_ORANGE,
              "Click & Drag Edit: {FFFFFF}Hold ~k~~PED_SPRINT~ to look around and press ESC to cancel."
            );
            return 1;
          }
          break;
        }
        case DIALOG_LISTITEM_PICKUP.REMOVE: {
          Pickup.getInstance(pickupId)?.destroy();
          return 1;
        }
        case DIALOG_LISTITEM_PICKUP.DUPLICATE: {
          const newPickupId = copyPickup(pickupId);
          if (newPickupId === INVALID_PICKUP_ID) {
            player.sendClientMessage(
              RGBA_RED,
              "ERROR: This pickup could not be duplicated!"
            );
          } else {
            g_PlayerData.get(player.id).editIdType = ID_TYPE.PICKUP;
            g_PlayerData.get(player.id).editId = newPickupId;
          }
          break;
        }
        case DIALOG_LISTITEM_PICKUP.COMMENT: {
          showPickupDialog(player, DIALOG_ID.PICKUP_COMMENT);
          return 1;
        }
        case DIALOG_LISTITEM_PICKUP.COMMENT_RESET: {
          const g_CommentString = getModelName(
            g_PickupData.get(pickupId).model
          ).name;
          g_PickupData.get(pickupId).comment = g_CommentString;
          break;
        }
      }

      showPickupDialog(player, dialogId);
      return 1;
    }
    case DIALOG_ID.PICKUP_COORD: {
      const pickupId = getPlayerEditPickup(player);
      if (
        pickupId === InvalidEnum.PICKUP_ID ||
        !g_PickupData.get(pickupId).isValid
      ) {
        g_PlayerData.get(player.id).editIdType = ID_TYPE.NONE;
        return 1;
      }

      if (!response) {
        showPickupDialog(player, DIALOG_ID.PICKUP_MAIN);
        return 1;
      }

      const [cmd, value] = inputText.split(" ");
      if (!cmd || typeof value === "undefined") {
        showPickupDialog(player, dialogId);
        return 1;
      }

      if (cmd === "x") {
        g_PickupData.get(pickupId).x = +value;
      } else if (cmd === "y") {
        g_PickupData.get(pickupId).y = +value;
      } else if (cmd === "z") {
        g_PickupData.get(pickupId).z = +value;
      } else {
        showPickupDialog(player, dialogId);
        return 1;
      }

      const newPickupId = recreatePickup(pickupId);
      if (newPickupId === INVALID_PICKUP_ID) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: This pickup could not be moved / re-created"
        );
      }

      showPickupDialog(player, dialogId);
      return 1;
    }
    case DIALOG_ID.PICKUP_COMMENT: {
      const pickupId = getPlayerEditPickup(player);
      if (
        pickupId === InvalidEnum.PICKUP_ID ||
        !g_PickupData.get(pickupId).isValid
      ) {
        g_PlayerData.get(player.id).editIdType = ID_TYPE.NONE;
        return 1;
      }

      if (!response) {
        showPickupDialog(player, DIALOG_ID.PICKUP_MAIN);
      } else {
        g_PickupData.get(pickupId).comment = inputText;
        showPickupDialog(player, dialogId);
      }
      return 1;
    }
  }

  return 0;
}

export function isValidPickup(pickupId: number) {
  return (
    pickupId >= 0 &&
    pickupId < LimitsEnum.MAX_PICKUPS &&
    g_PickupData.get(pickupId).isValid
  );
}

export async function showPickupDialog(player: Player, dialogId: number) {
  switch (dialogId) {
    case DIALOG_ID.PICKUP_MAIN: {
      const pickupId = getPlayerEditPickup(player);
      if (!Pickup.isValid(pickupId)) {
        return 1;
      }

      let g_DialogInfo = "";

      for (
        let listItem = 0;
        listItem < DIALOG_LISTITEM_PICKUP.MAX;
        listItem++
      ) {
        switch (listItem) {
          case DIALOG_LISTITEM_PICKUP.GOTO: {
            g_DialogInfo += "Goto\t \n";
            break;
          }
          case DIALOG_LISTITEM_PICKUP.GET: {
            g_DialogInfo += "Get\t \n";
            break;
          }
          case DIALOG_LISTITEM_PICKUP.COORD: {
            g_DialogInfo += "Coordinates\t \n";
            break;
          }
          case DIALOG_LISTITEM_PICKUP.MOVE: {
            g_DialogInfo += "Click & Drag Move\t \n";
            break;
          }
          case DIALOG_LISTITEM_PICKUP.REMOVE: {
            g_DialogInfo += "Remove\t \n";
            break;
          }
          case DIALOG_LISTITEM_PICKUP.DUPLICATE: {
            g_DialogInfo += "Duplicate\t \n";
            break;
          }
          case DIALOG_LISTITEM_PICKUP.COMMENT: {
            const g_CommentString = g_PickupData.get(pickupId).comment;
            const g_DialogInfoRow = `Comment\t${g_CommentString}\n`;
            g_DialogInfo += g_DialogInfoRow;
            break;
          }
          case DIALOG_LISTITEM_PICKUP.COMMENT_RESET: {
            const g_ModelString = getModelName(
              g_PickupData.get(pickupId).model
            ).name;
            const g_DialogInfoRow = `Reset Comment To\t${g_ModelString}\n`;
            g_DialogInfo += g_DialogInfoRow;
            break;
          }
          default: {
            g_DialogInfo += " \t \n";
          }
        }
      }
      const res = await new Dialog({
        style: DialogStylesEnum.TABLIST,
        caption: "Pickup",
        info: g_DialogInfo,
        button1: "Select",
        button2: "Cancel",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    case DIALOG_ID.PICKUP_COORD: {
      const pickupId = getPlayerEditPickup(player);
      if (!Pickup.isValid(pickupId)) {
        return 1;
      }

      let g_DialogInfo = "";
      let g_DialogInfoRow = `x\t${g_PickupData.get(pickupId).x}\n`;
      g_DialogInfo += g_DialogInfoRow;
      g_DialogInfoRow = `y\t${g_PickupData.get(pickupId).y}\n`;
      g_DialogInfo += g_DialogInfoRow;
      g_DialogInfoRow = `z\t${g_PickupData.get(pickupId).z}\n`;
      g_DialogInfo += g_DialogInfoRow;
      const res = await new Dialog({
        style: DialogStylesEnum.INPUT,
        caption: "Pickup Coordinates",
        info: g_DialogInfo,
        button1: "Enter",
        button2: "Cancel",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    case DIALOG_ID.PICKUP_COMMENT: {
      const pickupId = getPlayerEditPickup(player);
      if (!Pickup.isValid(pickupId)) {
        return 1;
      }

      const g_CommentString = g_PickupData.get(pickupId).comment;
      const g_DialogInfo = `Current Comment: ${g_CommentString}`;
      const res = await new Dialog({
        style: DialogStylesEnum.INPUT,
        caption: "Pickup Comment",
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

export function recreatePickup(copyPickupId: number) {
  const pastePickupId = copyPickup(copyPickupId);
  if (pastePickupId !== INVALID_PICKUP_ID) {
    Player.getInstances().forEach((p) => {
      if (!p.isConnected()) {
        return;
      }

      if (getPlayerEditPickup(p) === copyPickupId) {
        g_PlayerData.get(p.id).editId = pastePickupId;
      }

      for (let row = 0; row < MAX_SELECT_LIST_ROWS; row++) {
        if (copyPickupId !== g_SelectPickListData.get(p.id).rowId[row]) {
          continue;
        }

        g_SelectPickListData.get(p.id).rowId[row] = pastePickupId;

        if (g_PlayerData.get(p.id).tdMode === TD_MODE.SELECTLIST_PICKUP) {
          applySelectListRowData(p, row);
        }
      }
    });
    const pickup = Pickup.getInstance(copyPickupId);
    pickup?.destroy();
  }
  return pastePickupId;
}

export function copyPickup(copyPickupId: number) {
  try {
    const pickup = new Pickup({
      model: g_PickupData.get(copyPickupId).model,
      type: 1,
      x: g_PickupData.get(copyPickupId).x,
      y: g_PickupData.get(copyPickupId).y,
      z: g_PickupData.get(copyPickupId).z,
      virtualWorld: -1,
    });
    pickup.create();
    const pastePickupId = pickup.id;

    if (pastePickupId !== INVALID_PICKUP_ID) {
      const g_CommentString = g_PickupData.get(copyPickupId).comment;
      g_PickupData.get(pastePickupId).comment = g_CommentString;

      g_PickupData.get(pastePickupId).memoryX =
        g_PickupData.get(copyPickupId).memoryX;
      g_PickupData.get(pastePickupId).memoryY =
        g_PickupData.get(copyPickupId).memoryY;
      g_PickupData.get(pastePickupId).memoryZ =
        g_PickupData.get(copyPickupId).memoryZ;
    }
    return pastePickupId;
  } catch {
    return InvalidEnum.PICKUP_ID;
  }
}

export function findPickups(
  result: number[],
  resultSize: number,
  search: string,
  offset: number
) {
  let rowsFound = 0;
  let rowsAdded = 0;
  let maxOffset = 0;
  const searchInt = +search;

  Pickup.getInstances().forEach((p) => {
    if (!g_PickupData.get(p.id).isValid) {
      return;
    }

    const modelId = g_PickupData.get(p.id).model;
    const cacheIndex = getModelCacheIndex(modelId);

    if (
      !search.trim().length ||
      searchInt === p.id ||
      searchInt === modelId ||
      g_PickupData.get(p.id).comment.includes(search) ||
      (cacheIndex !== INVALID_ARRAY_INDEX &&
        g_ModelCache.get(cacheIndex).name.includes(search))
    ) {
      if (rowsFound++ < offset) {
        return;
      }

      if (rowsAdded < resultSize) {
        result[rowsAdded++] = p.id;
      }
    }

    maxOffset = rowsFound - 1;
    if (maxOffset < 0) {
      maxOffset = 0;
    }
  });

  return { rowsAdded, maxOffset };
}
