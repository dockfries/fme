import { INVALID_ANIM_INDEX } from "@/anim";
import { g_CamModeData } from "@/camMode";
import { destroyClickDragObject, refreshClickDragObject } from "@/clickDragObj";
import { RGBA_ORANGE, RGBA_RED, SELECT_TD_COLOR } from "@/constants";
import { DIALOG_ID, DIALOG_LISTITEM_ACTOR } from "@/dialog";
import { ID_TYPE } from "@/idType";
import { g_PlayerData, getPlayerEditActor } from "@/player";
import {
  applySelectListRowData,
  g_SelectActListData,
  MAX_SELECT_LIST_ROWS,
} from "@/selectList";
import { g_SkinNameCache, getSkinName, isValidSkin } from "@/skin";
import { showPlayerTextDrawMode, TD_MODE } from "@/tdMode";
import { fixRot } from "@/utils/math";
import { SafetyMap } from "@/utils/safetyMap";
import {
  Actor,
  ActorEvent,
  Dialog,
  DialogStylesEnum,
  EditResponseTypesEnum,
  GameMode,
  IDialogResCommon,
  InvalidEnum,
  ObjectMp,
  ObjectMpEvent,
  Player,
} from "@infernus/core";

interface IActorData {
  skin: number;
  animIndex: number;
  animDelta: number;
  animLoop: boolean;
  animLockX: boolean;
  animLockY: boolean;
  animFreeze: boolean;
  animTime: number;
  comment: string | null;
  memoryX: number;
  memoryY: number;
  memoryZ: number;
  memoryA: number;
}

export const g_ActorData = new SafetyMap<number, IActorData>(() => {
  return {
    skin: 0,
    animIndex: INVALID_ANIM_INDEX,
    animDelta: 0,
    animLoop: false,
    animLockX: false,
    animLockY: false,
    animFreeze: false,
    animTime: 0,
    comment: "",
    memoryX: 0,
    memoryY: 0,
    memoryZ: 0,
    memoryA: 0,
  };
});

GameMode.onInit(({ next }) => {
  Actor.getInstances().forEach((a) => {
    if (a.isValid()) {
      a.destroy();
    }
  });
  return next();
});

GameMode.onExit(({ next }) => {
  g_ActorData.clear();
  return next();
});

ActorEvent.onStreamIn(({ actor, next }) => {
  applyActorAnimationData(actor);
  return next();
});

ObjectMpEvent.onPlayerEdit(
  ({ player, objectMp, isPlayerObject, response, fX, fY, fZ, fRotZ, next }) => {
    const actorId = getPlayerEditActor(player);
    const actor = Actor.getInstance(actorId);

    if (
      isPlayerObject &&
      objectMp.id === g_PlayerData.get(player.id).clickDragPoId &&
      actor &&
      actor.isValid()
    ) {
      switch (response) {
        case EditResponseTypesEnum.FINAL: {
          actor.setPos(fX, fY, fZ);

          const newActor = recreateActor(actorId, fRotZ);
          if (!newActor) {
            player.sendClientMessage(
              RGBA_RED,
              "ERROR: This actor could not be rotated / re-created!"
            );
          }

          destroyClickDragObject(player);
          showActorDialog(player, DIALOG_ID.ACTOR_MAIN);
          break;
        }
        case EditResponseTypesEnum.CANCEL: {
          actor.setPos(
            g_ActorData.get(actor.id).memoryX,
            g_ActorData.get(actor.id).memoryY,
            g_ActorData.get(actor.id).memoryZ
          );

          const newActor = recreateActor(
            actorId,
            g_ActorData.get(actor.id).memoryA
          );
          if (!newActor) {
            player.sendClientMessage(
              RGBA_RED,
              "ERROR: This actor could not be rotated / re-created!"
            );
          }
          break;
        }
        case EditResponseTypesEnum.UPDATE: {
          actor.setPos(fX, fY, fZ);

          const newActor = recreateActor(actorId, fRotZ);
          if (!newActor) {
            player.sendClientMessage(
              RGBA_RED,
              "ERROR: This actor could not be rotated / re-created!"
            );
          }
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
    case DIALOG_ID.ACTOR_MAIN: {
      const actorId = getPlayerEditActor(player);
      const actor = Actor.getInstance(actorId);
      if (!actor || !actor.isValid()) {
        g_PlayerData.get(player.id).editIdType = ID_TYPE.NONE;
        return 1;
      }

      if (!response) {
        return 1;
      }

      switch (listItem) {
        case DIALOG_LISTITEM_ACTOR.GOTO: {
          const { x, y, z } = actor.getPos();
          if (g_CamModeData.get(player.id).toggle) {
            const playerObject = ObjectMp.getInstance(
              g_CamModeData.get(player.id).poId,
              player
            );
            if (playerObject) {
              playerObject.stop();
              playerObject.setPos(x, y, z);
            }
          } else {
            player.setPos(x, y, z);
          }
          break;
        }
        case DIALOG_LISTITEM_ACTOR.GET: {
          const { x, y, z } = player.getPos();
          actor.setPos(x, y, z);
          break;
        }
        case DIALOG_LISTITEM_ACTOR.COORD: {
          showActorDialog(player, DIALOG_ID.ACTOR_COORD);
          return 1;
        }
        case DIALOG_LISTITEM_ACTOR.MOVE: {
          const objectId = refreshClickDragObject(player);
          const object = ObjectMp.getInstance(objectId, player);
          if (!object) {
            player.sendClientMessage(
              RGBA_RED,
              "ERROR: This actor cannot be moved right now!"
            );
          } else {
            const { x, y, z } = actor.getPos();
            g_ActorData.get(actor.id).memoryX = x;
            g_ActorData.get(actor.id).memoryY = y;
            g_ActorData.get(actor.id).memoryZ = z;

            const { angle } = actor.getFacingAngle();
            g_ActorData.get(actor.id).memoryA = angle;

            object.edit();

            player.sendClientMessage(
              RGBA_ORANGE,
              "Click & Drag Edit: {FFFFFF}Hold ~k~~PED_SPRINT~ to look around and press ESC to cancel."
            );
            return 1;
          }
          break;
        }
        case DIALOG_LISTITEM_ACTOR.REMOVE: {
          actor.destroy();
          return 1;
        }
        case DIALOG_LISTITEM_ACTOR.DUPLICATE: {
          const { angle } = actor.getFacingAngle();

          const newActorId = copyActor(actorId, angle);
          if (newActorId === InvalidEnum.ACTOR_ID) {
            player.sendClientMessage(
              RGBA_RED,
              "ERROR: This actor could not be duplicated!"
            );
          } else {
            g_PlayerData.get(player.id).editIdType = ID_TYPE.ACTOR;
            g_PlayerData.get(player.id).editId = newActorId;
          }
          break;
        }
        case DIALOG_LISTITEM_ACTOR.COMMENT: {
          showActorDialog(player, DIALOG_ID.ACTOR_COMMENT);
          return 1;
        }
        case DIALOG_LISTITEM_ACTOR.COMMENT_RESET: {
          const g_CommentString = getSkinName(g_ActorData.get(actor.id).skin);
          g_ActorData.get(actor.id).comment = g_CommentString;
          break;
        }
        case DIALOG_LISTITEM_ACTOR.ANIM_INDEX: {
          player.selectTextDraw(SELECT_TD_COLOR);
          showPlayerTextDrawMode(player, TD_MODE.ANIMLIST);
          return 1;
        }
        case DIALOG_LISTITEM_ACTOR.ANIM_DELTA: {
          showActorDialog(player, DIALOG_ID.ACTOR_ANIM_DELTA);
          return 1;
        }
        case DIALOG_LISTITEM_ACTOR.ANIM_LOOP: {
          g_ActorData.get(actor.id).animLoop = !g_ActorData.get(actor.id)
            .animLoop;
          applyActorAnimationData(actor);
          break;
        }
        case DIALOG_LISTITEM_ACTOR.ANIM_LOCKX: {
          g_ActorData.get(actor.id).animLockX = !g_ActorData.get(actor.id)
            .animLockX;
          applyActorAnimationData(actor);
          break;
        }
        case DIALOG_LISTITEM_ACTOR.ANIM_LOCKY: {
          g_ActorData.get(actor.id).animLockY = !g_ActorData.get(actor.id)
            .animLockY;
          applyActorAnimationData(actor);
          break;
        }
        case DIALOG_LISTITEM_ACTOR.ANIM_FREEZE: {
          g_ActorData.get(actor.id).animFreeze = !g_ActorData.get(actor.id)
            .animFreeze;
          applyActorAnimationData(actor);
          break;
        }
        case DIALOG_LISTITEM_ACTOR.ANIM_TIME: {
          showActorDialog(player, DIALOG_ID.ACTOR_ANIM_TIME);
          return 1;
        }
        case DIALOG_LISTITEM_ACTOR.ANIM_UPDATE: {
          applyActorAnimationData(actor);
          break;
        }
        case DIALOG_LISTITEM_ACTOR.ANIM_REMOVE: {
          defaultActorAnimationData(actor.id);
          actor.clearAnimations();
          break;
        }
      }

      return showActorDialog(player, dialogId);
    }
    case DIALOG_ID.ACTOR_COORD: {
      const actorId = getPlayerEditActor(player);
      const actor = Actor.getInstance(actorId);
      if (!actor || !actor.isValid()) {
        g_PlayerData.get(player.id).editIdType = ID_TYPE.NONE;
        return 1;
      }

      if (!response) {
        showActorDialog(player, DIALOG_ID.ACTOR_MAIN);
        return 1;
      }

      const splits = inputText.split(" ");
      const cmd = splits[0].trim();
      const value = +splits[1];
      if (!cmd.length || Number.isNaN(value)) {
        showActorDialog(player, dialogId);
        return 1;
      }

      let { x, y, z } = actor.getPos();
      let { angle } = actor.getFacingAngle();

      if (cmd === "x") {
        x = value;
      } else if (cmd === "y") {
        y = value;
      } else if (cmd === "z") {
        z = value;
      } else if (cmd === "a") {
        angle = fixRot(value);
      } else {
        showActorDialog(player, dialogId);
        return 1;
      }

      actor.setPos(x, y, z);
      actor.setFacingAngle(angle);
      showActorDialog(player, dialogId);
      return 1;
    }
    case DIALOG_ID.ACTOR_COMMENT: {
      const actorId = getPlayerEditActor(player);
      const actor = Actor.getInstance(actorId);
      if (!actor || !actor.isValid()) {
        g_PlayerData.get(player.id).editIdType = ID_TYPE.NONE;
        return 1;
      }

      if (!response) {
        showActorDialog(player, DIALOG_ID.ACTOR_MAIN);
      } else {
        g_ActorData.get(actor.id).comment = inputText;
        showActorDialog(player, dialogId);
      }
      return 1;
    }
    case DIALOG_ID.ACTOR_ANIM_DELTA: {
      const actorId = getPlayerEditActor(player);
      const actor = Actor.getInstance(actorId);

      if (!actor || !actor.isValid()) {
        g_PlayerData.get(player.id).editIdType = ID_TYPE.NONE;
        return 1;
      }

      if (!response) {
        showActorDialog(player, DIALOG_ID.ACTOR_MAIN);
        return 1;
      }

      const delta = +inputText;
      if (!inputText.trim().length || Number.isNaN(delta)) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You did not enter a float value into the textfield!"
        );
      } else if (delta < 0) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You cannot enter a negative value into the textfield!"
        );
      } else {
        g_ActorData.get(actor.id).animDelta = delta;
        applyActorAnimationData(actor);
      }
      showActorDialog(player, dialogId);
      return 1;
    }
    case DIALOG_ID.ACTOR_ANIM_TIME: {
      const actorId = getPlayerEditActor(player);
      const actor = Actor.getInstance(actorId);

      if (!actor || !actor.isValid()) {
        g_PlayerData.get(player.id).editIdType = ID_TYPE.NONE;
        return 1;
      }

      if (!response) {
        showActorDialog(player, DIALOG_ID.ACTOR_MAIN);
        return 1;
      }

      const time = +inputText;
      if (!inputText.trim().length || Number.isNaN(time)) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You did not enter a numeric value!"
        );
      } else if (time < 0) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You cannot enter a negative value!"
        );
      } else {
        g_ActorData.get(actor.id).animTime = time;
        applyActorAnimationData(actor);
      }
      showActorDialog(player, dialogId);
      return 1;
    }
  }
}

export async function showActorDialog(player: Player, dialogId: number) {
  let g_DialogInfo = "";

  switch (dialogId) {
    case DIALOG_ID.ACTOR_MAIN: {
      const actorId = getPlayerEditActor(player);
      const actor = Actor.getInstance(actorId);

      if (!actor || !actor.isValid()) {
        return 1;
      }

      for (let listItem = 0; listItem < DIALOG_LISTITEM_ACTOR.MAX; listItem++) {
        switch (listItem) {
          case DIALOG_LISTITEM_ACTOR.GOTO: {
            g_DialogInfo += "Goto\t \n";
            break;
          }
          case DIALOG_LISTITEM_ACTOR.GET: {
            g_DialogInfo += "Get\t \n";
            break;
          }
          case DIALOG_LISTITEM_ACTOR.COORD: {
            g_DialogInfo += "Coordinates\t \n";
            break;
          }
          case DIALOG_LISTITEM_ACTOR.MOVE: {
            g_DialogInfo += g_DialogInfo += "Click & Drag Move\t \n";
            break;
          }
          case DIALOG_LISTITEM_ACTOR.REMOVE: {
            g_DialogInfo += "Remove\t \n";
            break;
          }
          case DIALOG_LISTITEM_ACTOR.DUPLICATE: {
            g_DialogInfo += "Duplicate\t \n";
            break;
          }
          case DIALOG_LISTITEM_ACTOR.COMMENT: {
            const g_CommentString = g_ActorData.get(actor.id).comment;
            const g_DialogInfoRow = `Comment\t${g_CommentString}\n`;
            g_DialogInfo += g_DialogInfoRow;
            break;
          }
          case DIALOG_LISTITEM_ACTOR.COMMENT_RESET: {
            const g_SkinString = getSkinName(g_ActorData.get(actor.id).skin);
            const g_DialogInfoRow = `Reset Comment To\t${g_SkinString}\n`;
            g_DialogInfo += g_DialogInfoRow;
            break;
          }
          case DIALOG_LISTITEM_ACTOR.ANIM_INDEX: {
            const animIndex = g_ActorData.get(actor.id).animIndex;
            if (animIndex === INVALID_ANIM_INDEX) {
              g_DialogInfo += "Animation\tnone\n";
            } else {
              const { animLib, animName } =
                GameMode.getAnimationName(animIndex);
              const g_DialogInfoRow = `Animation\t${animIndex} ${animLib} ${animName}\n`;
              g_DialogInfo += g_DialogInfoRow;
            }
            break;
          }
          case DIALOG_LISTITEM_ACTOR.ANIM_DELTA: {
            if (g_ActorData.get(actor.id).animIndex === INVALID_ANIM_INDEX) {
              g_DialogInfo += "Animation Delta\tnone\n";
            } else {
              const g_DialogInfoRow = `Animation Delta\t${
                g_ActorData.get(actor.id).animDelta
              }\n`;
              g_DialogInfo += g_DialogInfoRow;
            }
            break;
          }
          case DIALOG_LISTITEM_ACTOR.ANIM_LOOP: {
            if (g_ActorData.get(actor.id).animIndex === INVALID_ANIM_INDEX) {
              g_DialogInfo += "Animation Loop\tnone\n";
            } else if (g_ActorData.get(actor.id).animLoop) {
              g_DialogInfo += "Animation Loop\ttrue\n";
            } else {
              g_DialogInfo += "Animation Loop\tfalse\n";
            }
            break;
          }
          case DIALOG_LISTITEM_ACTOR.ANIM_LOCKX: {
            if (g_ActorData.get(actor.id).animIndex === INVALID_ANIM_INDEX) {
              g_DialogInfo += "Animation Lock X\tnone\n";
            } else if (g_ActorData.get(actor.id).animLockX) {
              g_DialogInfo += "Animation Lock X\ttrue\n";
            } else {
              g_DialogInfo += "Animation Lock X\tfalse\n";
            }
            break;
          }
          case DIALOG_LISTITEM_ACTOR.ANIM_LOCKY: {
            if (g_ActorData.get(actor.id).animIndex === INVALID_ANIM_INDEX) {
              g_DialogInfo += "Animation Lock Y\tnone\n";
            } else if (g_ActorData.get(actor.id).animLockY) {
              g_DialogInfo += "Animation Lock Y\ttrue\n";
            } else {
              g_DialogInfo += "Animation Lock Y\tfalse\n";
            }
            break;
          }
          case DIALOG_LISTITEM_ACTOR.ANIM_FREEZE: {
            if (g_ActorData.get(actor.id).animIndex === INVALID_ANIM_INDEX) {
              g_DialogInfo += "Animation Freeze\tnone\n";
            } else if (g_ActorData.get(actor.id).animFreeze) {
              g_DialogInfo += "Animation Freeze\ttrue\n";
            } else {
              g_DialogInfo += "Animation Freeze\tfalse\n";
            }
            break;
          }
          case DIALOG_LISTITEM_ACTOR.ANIM_TIME: {
            if (g_ActorData.get(actor.id).animIndex === INVALID_ANIM_INDEX) {
              g_DialogInfo += "Animation Time\tnone\n";
            } else {
              const g_DialogInfoRow = `Animation Time\t${
                g_ActorData.get(actor.id).animTime
              }\n`;
              g_DialogInfo += g_DialogInfoRow;
            }
            break;
          }
          case DIALOG_LISTITEM_ACTOR.ANIM_UPDATE: {
            g_DialogInfo += "Update Animation\t \n";
            break;
          }
          case DIALOG_LISTITEM_ACTOR.ANIM_REMOVE: {
            g_DialogInfo += "Remove Animation\t \n";
            break;
          }
          default: {
            g_DialogInfo += " \t \n";
          }
        }
      }
      const res = await new Dialog({
        style: DialogStylesEnum.TABLIST,
        caption: "Actor",
        info: g_DialogInfo,
        button1: "Select",
        button2: "Cancel",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    case DIALOG_ID.ACTOR_COORD: {
      const actorId = getPlayerEditActor(player);
      const actor = Actor.getInstance(actorId);
      if (!actor || !actor.isValid()) {
        return 1;
      }

      const { x, y, z } = actor.getPos();
      const a = actor.getFacingAngle();

      let g_DialogInfoRow = "";
      g_DialogInfoRow += `x\t${x}\n`;
      g_DialogInfo += g_DialogInfoRow;
      g_DialogInfoRow += `y\t${y}\n`;
      g_DialogInfo += g_DialogInfoRow;
      g_DialogInfoRow += `z\t${z}\n`;
      g_DialogInfo += g_DialogInfoRow;
      g_DialogInfoRow += `a\t${a}\n`;
      g_DialogInfo += g_DialogInfoRow;

      const res = await new Dialog({
        style: DialogStylesEnum.INPUT,
        caption: "Actor Coordinates",
        info: g_DialogInfo,
        button1: "Enter",
        button2: "Cancel",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    case DIALOG_ID.ACTOR_COMMENT: {
      const actorId = getPlayerEditActor(player);
      const g_CommentString = g_ActorData.get(actorId).comment;
      g_DialogInfo += `Current Comment: ${g_CommentString}`;
      const res = await new Dialog({
        style: DialogStylesEnum.INPUT,
        caption: "Actor Comment",
        info: g_DialogInfo,
        button1: "Enter",
        button2: "Cancel",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    case DIALOG_ID.ACTOR_ANIM_DELTA: {
      const actorId = getPlayerEditActor(player);
      g_DialogInfo += `Current Value: ${g_ActorData.get(actorId).animDelta}`;
      const res = await new Dialog({
        style: DialogStylesEnum.INPUT,
        caption: "Actor Animation Delta",
        info: g_DialogInfo,
        button1: "Enter",
        button2: "Cancel",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    case DIALOG_ID.ACTOR_ANIM_TIME: {
      const actorId = getPlayerEditActor(player);
      g_DialogInfo += `Current Value: ${g_ActorData.get(actorId).animTime}`;
      const res = await new Dialog({
        style: DialogStylesEnum.INPUT,
        caption: "Actor Animation Time",
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

export function defaultActorAnimationData(actorId: number) {
  const actorData = g_ActorData.get(actorId);
  actorData.animIndex = INVALID_ANIM_INDEX;
  actorData.animDelta = 4.1;
  actorData.animLoop = true;
  actorData.animLockX = false;
  actorData.animLockY = false;
  actorData.animFreeze = false;
  actorData.animTime = 0;
}

export function applyActorAnimationData(actor: Actor) {
  const animIdx = g_ActorData.get(actor.id).animIndex;
  if (animIdx === INVALID_ANIM_INDEX) {
    return actor.clearAnimations();
  }

  const { animLib: g_AnimLibString, animName: g_AnimNameString } =
    GameMode.getAnimationName(animIdx);

  actor.applyAnimation(
    g_AnimLibString,
    g_AnimNameString,
    g_ActorData.get(actor.id).animDelta,
    g_ActorData.get(actor.id).animLoop,
    g_ActorData.get(actor.id).animLockX,
    g_ActorData.get(actor.id).animLockY,
    g_ActorData.get(actor.id).animFreeze,
    g_ActorData.get(actor.id).animTime
  );
  return true;
}

export function copyActor(copyActorId: number, a: number) {
  try {
    const copyActor = Actor.getInstance(copyActorId);
    if (!copyActor) {
      return InvalidEnum.ACTOR_ID;
    }

    const actorData = g_ActorData.get(copyActorId);
    const { x, y, z } = copyActor.getPos();

    const pasteActor = new Actor({
      skin: actorData.skin,
      x,
      y,
      z,
      rotation: a,
    });
    pasteActor.create();

    const pasteActorData = g_ActorData.get(pasteActor.id);

    const g_CommentString = actorData.comment;
    pasteActorData.comment = g_CommentString;

    const animIndex = actorData.animIndex;
    if (animIndex !== INVALID_ANIM_INDEX) {
      pasteActorData.animIndex = animIndex;
      pasteActorData.animDelta = actorData.animDelta;
      pasteActorData.animLoop = actorData.animLoop;
      pasteActorData.animLockX = actorData.animLockX;
      pasteActorData.animLockY = actorData.animLockY;
      pasteActorData.animFreeze = actorData.animFreeze;
      pasteActorData.animTime = actorData.animTime;
    }

    pasteActorData.memoryX = actorData.memoryX;
    pasteActorData.memoryY = actorData.memoryY;
    pasteActorData.memoryZ = actorData.memoryZ;
    pasteActorData.memoryA = actorData.memoryA;

    return pasteActor.id;
  } catch {
    return InvalidEnum.ACTOR_ID;
  }
}

export function recreateActor(actorId: number, a: number) {
  const pasteActorId = copyActor(actorId, a);

  if (pasteActorId !== InvalidEnum.ACTOR_ID) {
    Player.getInstances().forEach((p) => {
      if (!p.isConnected()) {
        return;
      }

      if (getPlayerEditActor(p) === actorId) {
        g_PlayerData.get(p.id).editId = pasteActorId;
      }

      for (let row = 0; row < MAX_SELECT_LIST_ROWS; row++) {
        if (actorId !== g_SelectActListData.get(p.id).rowId[row]) {
          continue;
        }

        g_SelectActListData.get(p.id).rowId[row] = pasteActorId;

        if (g_PlayerData.get(p.id).tdMode === TD_MODE.SELECTLIST_ACTOR) {
          applySelectListRowData(p, row);
        }
      }
    });

    const actor = Actor.getInstance(actorId);

    if (actor && actor.isValid()) {
      actor.destroy();
    }
  }

  return pasteActorId;
}

export function findActors(
  result: number[],
  resultSize: number,
  search: string,
  offset: number
) {
  let rowsFound = 0;
  let rowsAdded = 0;
  let searchInt = -1;

  const searchInt_ = parseInt(search);
  if (!isNaN(searchInt_)) {
    searchInt = searchInt_;
  }

  Actor.getInstances().forEach((a) => {
    if (!a.isValid()) {
      return;
    }

    const skinId = g_ActorData.get(a.id).skin;

    if (
      !search.trim().length ||
      searchInt === a.id ||
      searchInt === g_ActorData.get(a.id).skin ||
      g_ActorData.get(a.id).comment?.includes(search) ||
      (isValidSkin(skinId) && g_SkinNameCache[skinId].includes(search))
    ) {
      if (rowsFound++ < offset) {
        return;
      }

      if (rowsAdded < resultSize) {
        result[rowsAdded++] = a.id;
      }
    }
  });

  let maxOffset = rowsFound - 1;
  if (maxOffset < 0) {
    maxOffset = 0;
  }

  return { rowsAdded, maxOffset };
}
