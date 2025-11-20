import { Actor, InvalidEnum, Player } from "@infernus/core";
import { defaultActorAnimationData, g_ActorData } from ".";
import { getSkinName } from "@/skin";
import { g_PlayerData, getPlayerEditActor } from "@/player";
import { ID_TYPE } from "@/idType";
import {
  g_SelectActListData,
  g_SelectListPTD,
  MAX_SELECT_LIST_ROWS,
} from "@/selectList";
import { INVALID_ROW } from "@/constants";
import { TD_MODE } from "@/tdMode";

const orig_CreateActor = Actor.__inject__.create;
const orig_DestroyActor = Actor.__inject__.destroy;

function hook_CreateActor(
  modelId: number,
  x: number,
  y: number,
  z: number,
  rotation: number
) {
  const actorId = orig_CreateActor(modelId, x, y, z, rotation);
  if (actorId !== InvalidEnum.ACTOR_ID) {
    g_ActorData.get(actorId).skin = modelId;
    const g_CommentString = getSkinName(modelId);
    if (g_CommentString) {
      g_ActorData.get(actorId).comment = g_CommentString;
    }

    defaultActorAnimationData(actorId);
  }
  return actorId;
}

Actor.__inject__.create = hook_CreateActor;

function hook_DestroyActor(actorId: number) {
  const success = orig_DestroyActor(actorId);
  if (success) {
    Player.getInstances().forEach((p) => {
      if (!p.isConnected()) {
        return;
      }

      if (getPlayerEditActor(p) === actorId) {
        g_PlayerData.get(p.id).editIdType = ID_TYPE.NONE;
      }

      const editRow = g_SelectActListData.get(p.id).editRow;
      if (editRow !== INVALID_ROW) {
        const editActorId = g_SelectActListData.get(p.id).rowId[editRow];

        if (actorId === editActorId) {
          g_SelectActListData.get(p.id).editRow = INVALID_ROW;
        }
      }

      for (let row = 0; row < MAX_SELECT_LIST_ROWS; row++) {
        if (actorId !== g_SelectActListData.get(p.id).rowId[row]) {
          continue;
        }

        g_SelectActListData.get(p.id).rowId[row] = InvalidEnum.ACTOR_ID;

        if (g_PlayerData.get(p.id).tdMode !== TD_MODE.SELECTLIST_ACTOR) {
          continue;
        }

        g_SelectListPTD.get(p.id).idRow[row]?.hide();
        g_SelectListPTD.get(p.id).commentRow?.[row]?.hide();
      }
    });
  }
  return success;
}

Actor.__inject__.destroy = hook_DestroyActor;
