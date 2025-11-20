import { InvalidEnum, Pickup, Player } from "@infernus/core";
import { g_PickupData } from ".";
import { getModelName } from "@/model";
import { g_PlayerData, getPlayerEditPickup } from "@/player";
import { ID_TYPE } from "@/idType";
import {
  g_SelectListPTD,
  g_SelectPickListData,
  MAX_SELECT_LIST_ROWS,
} from "@/selectList";
import { INVALID_ROW } from "@/constants";
import { TD_MODE } from "@/tdMode";

const orig_CreatePickup = Pickup.__inject__.create;

function hook_CreatePickup(
  model: number,
  type: number,
  x: number,
  y: number,
  z: number,
  virtualWorld = 0
) {
  const pickupId = orig_CreatePickup(model, type, x, y, z, virtualWorld);
  if (pickupId !== InvalidEnum.PICKUP_ID) {
    g_PickupData.get(pickupId).isValid = true;
    g_PickupData.get(pickupId).model = model;
    g_PickupData.get(pickupId).x = x;
    g_PickupData.get(pickupId).y = y;
    g_PickupData.get(pickupId).z = z;

    const g_CommentString = getModelName(model);
    if (g_CommentString.ret) {
      g_PickupData.get(pickupId).comment = g_CommentString.name;
    }
  }
  return pickupId;
}

Pickup.__inject__.create = hook_CreatePickup;

const orig_DestroyPickup = Pickup.__inject__.destroy;

function hook_DestroyPickup(pickupId: number) {
  const isValid = Pickup.isValid(pickupId);

  const ret = orig_DestroyPickup(pickupId);

  if (isValid) {
    g_PickupData.get(pickupId).isValid = false;

    Player.getInstances().forEach((p) => {
      if (!p.isConnected()) {
        return;
      }

      if (getPlayerEditPickup(p) === pickupId) {
        g_PlayerData.get(p.id).editIdType = ID_TYPE.NONE;
      }

      const editRow = g_SelectPickListData.get(p.id).editRow;
      if (editRow !== INVALID_ROW) {
        const editPickupId = g_SelectPickListData.get(p.id).rowId[editRow];

        if (pickupId === editPickupId) {
          g_SelectPickListData.get(p.id).editRow = INVALID_ROW;
        }
      }

      for (let row = 0; row < MAX_SELECT_LIST_ROWS; row++) {
        if (pickupId !== g_SelectPickListData.get(p.id).rowId[row]) {
          continue;
        }

        g_SelectPickListData.get(p.id).rowId[row] = InvalidEnum.PICKUP_ID;

        if (g_PlayerData.get(p.id).tdMode !== TD_MODE.SELECTLIST_PICKUP) {
          continue;
        }

        g_SelectListPTD.get(p.id).idRow[row]?.hide();
        g_SelectListPTD.get(p.id).commentRow[row]?.hide();
      }
    });
  }

  return ret;
}

Pickup.__inject__.destroy = hook_DestroyPickup;
