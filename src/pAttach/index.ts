import { getBoneName, MAX_BONE_ID } from "@/bone";
import { RGBA_RED, SELECT_TD_COLOR } from "@/constants";
import { DIALOG_ID, DIALOG_LISTITEM_ATTACH } from "@/dialog";
import { ID_TYPE } from "@/idType";
import { getModelName } from "@/model";
import { g_PlayerData, getPlayerEditAttached } from "@/player";
import { showPlayerTextDrawMode, TD_MODE } from "@/tdMode";
import { aRGBtoA, aRGBtoRGB, setARGBAlpha } from "@/utils/color";
import { fixRot } from "@/utils/math";
import { SafetyMap } from "@/utils/safetyMap";
import {
  Dialog,
  DialogStylesEnum,
  GameMode,
  IDialogResCommon,
  ObjectMpEvent,
  Player,
  PlayerEvent,
} from "@infernus/core";

export const MAX_PLAYERATTACH_INDEX = 10;
export const INVALID_PLAYERATTACH_INDEX = -1;

export interface IPlayerAttachData {
  toggle: boolean;
  model: number;
  bone: number;
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  sx: number;
  sy: number;
  sz: number;
  color1: number;
  color2: number;
}

export const g_PlayerAttachData = new SafetyMap<number, IPlayerAttachData[]>(
  () => {
    return Array.from({ length: MAX_PLAYERATTACH_INDEX }, () => ({
      toggle: false,
      model: 0,
      bone: 1,
      x: 0.0,
      y: 0.0,
      z: 0.0,
      rx: 0.0,
      ry: 0.0,
      rz: 0.0,
      sx: 1.0,
      sy: 1.0,
      sz: 1.0,
      color1: 0xffffffff,
      color2: 0xffffffff,
    }));
  }
);

GameMode.onInit(({ next }) => {
  Player.getInstances().forEach((p) => {
    if (p.isConnected()) {
      for (let attachIdx = 0; attachIdx < MAX_PLAYERATTACH_INDEX; attachIdx++) {
        defaultPlayerAttachData(p, attachIdx);
        p.removeAttachedObject(attachIdx);
      }
    }
  });
  return next();
});

GameMode.onExit(({ next }) => {
  g_PlayerAttachData.clear();
  return next();
});

PlayerEvent.onConnect(({ player, next }) => {
  for (let attachIdx = 0; attachIdx < MAX_PLAYERATTACH_INDEX; attachIdx++) {
    defaultPlayerAttachData(player, attachIdx);
  }
  return next();
});

ObjectMpEvent.onPlayerEditAttached(
  ({
    player,
    index,
    response,
    modelId,
    boneId,
    fOffsetX,
    fOffsetY,
    fOffsetZ,
    fRotX,
    fRotY,
    fRotZ,
    fScaleX,
    fScaleY,
    fScaleZ,
    next,
  }) => {
    if (getPlayerEditAttached(player) === index) {
      if (response) {
        g_PlayerAttachData.get(player.id)[index].model = modelId;
        g_PlayerAttachData.get(player.id)[index].bone = boneId;
        g_PlayerAttachData.get(player.id)[index].x = fOffsetX;
        g_PlayerAttachData.get(player.id)[index].y = fOffsetY;
        g_PlayerAttachData.get(player.id)[index].z = fOffsetZ;
        g_PlayerAttachData.get(player.id)[index].rx = fRotX;
        g_PlayerAttachData.get(player.id)[index].ry = fRotY;
        g_PlayerAttachData.get(player.id)[index].rz = fRotZ;
        g_PlayerAttachData.get(player.id)[index].sx = fScaleX;
        g_PlayerAttachData.get(player.id)[index].sy = fScaleY;
        g_PlayerAttachData.get(player.id)[index].sz = fScaleZ;
      }
      applyPlayerAttachData(player, index);
      showAttachedDialog(player, DIALOG_ID.ATTACH_MAIN);
      player.selectTextDraw(SELECT_TD_COLOR);
    }
    return next();
  }
);

function onDialogResponse(
  player: Player,
  res: IDialogResCommon,
  dialogId: number
) {
  const { listItem, inputText, response } = res;

  switch (dialogId) {
    case DIALOG_ID.ATTACH_INDEXLIST: {
      if (!isValidPlayerAttachIndex(listItem)) {
        g_PlayerData.get(player.id).editIdType = ID_TYPE.NONE;
        return 1;
      }

      if (!response) {
        return 1;
      }

      g_PlayerData.get(player.id).editIdType = ID_TYPE.ATTACH;
      g_PlayerData.get(player.id).editId = listItem;

      if (g_PlayerAttachData.get(player.id)[listItem].toggle) {
        showAttachedDialog(player, DIALOG_ID.ATTACH_MAIN);
      } else {
        player.selectTextDraw(SELECT_TD_COLOR);
        showPlayerTextDrawMode(player, TD_MODE.CREATELIST_ATTACH);
      }
      return 1;
    }
    case DIALOG_ID.ATTACH_MAIN: {
      const attachIndex = getPlayerEditAttached(player);
      if (
        attachIndex === INVALID_PLAYERATTACH_INDEX ||
        !g_PlayerAttachData.get(player.id)[attachIndex].toggle
      ) {
        g_PlayerData.get(player.id).editIdType = ID_TYPE.NONE;
        return 1;
      }

      if (!response) {
        showAttachedDialog(player, DIALOG_ID.ATTACH_INDEXLIST);
        return 1;
      }

      switch (listItem) {
        case DIALOG_LISTITEM_ATTACH.REMOVE: {
          defaultPlayerAttachData(player, attachIndex);
          player.removeAttachedObject(attachIndex);
          g_PlayerData.get(player.id).editIdType = ID_TYPE.NONE;
          showAttachedDialog(player, DIALOG_ID.ATTACH_INDEXLIST);
          return 1;
        }
        case DIALOG_LISTITEM_ATTACH.MODEL: {
          player.selectTextDraw(SELECT_TD_COLOR);
          showPlayerTextDrawMode(player, TD_MODE.CREATELIST_ATTACH);
          return 1;
        }
        case DIALOG_LISTITEM_ATTACH.BONE: {
          showAttachedDialog(player, DIALOG_ID.ATTACH_BONE);
          return 1;
        }
        case DIALOG_LISTITEM_ATTACH.COORD: {
          showAttachedDialog(player, DIALOG_ID.ATTACH_COORD);
          return 1;
        }
        case DIALOG_LISTITEM_ATTACH.MOVE: {
          player.cancelSelectTextDraw();
          player.editAttachedObject(attachIndex);
          return 1;
        }
        case DIALOG_LISTITEM_ATTACH.COLOR1: {
          player.selectTextDraw(SELECT_TD_COLOR);
          showPlayerTextDrawMode(player, TD_MODE.COLORLIST_ATTACH_1);
          return 1;
        }
        case DIALOG_LISTITEM_ATTACH.ALPHA1: {
          showAttachedDialog(player, DIALOG_ID.COLORALPHA_ATTACH_1);
          return 1;
        }
        case DIALOG_LISTITEM_ATTACH.COLOR2: {
          player.selectTextDraw(SELECT_TD_COLOR);
          showPlayerTextDrawMode(player, TD_MODE.COLORLIST_ATTACH_2);
          return 1;
        }
        case DIALOG_LISTITEM_ATTACH.ALPHA2: {
          showAttachedDialog(player, DIALOG_ID.COLORALPHA_ATTACH_2);
          return 1;
        }
      }

      showAttachedDialog(player, dialogId);
      return 1;
    }
    case DIALOG_ID.ATTACH_BONE: {
      const attachIndex = getPlayerEditAttached(player);
      if (
        attachIndex === INVALID_PLAYERATTACH_INDEX ||
        !g_PlayerAttachData.get(player.id)[attachIndex].toggle
      ) {
        g_PlayerData.get(player.id).editIdType = ID_TYPE.NONE;
        return 1;
      }

      if (!response) {
        showAttachedDialog(player, DIALOG_ID.ATTACH_MAIN);
      } else {
        g_PlayerAttachData.get(player.id)[attachIndex].bone = listItem + 1;
        applyPlayerAttachData(player, attachIndex);
        showAttachedDialog(player, dialogId);
      }
      return 1;
    }
    case DIALOG_ID.ATTACH_COORD: {
      const attachIndex = getPlayerEditAttached(player);
      if (
        attachIndex === INVALID_PLAYERATTACH_INDEX ||
        !g_PlayerAttachData.get(player.id)[attachIndex].toggle
      ) {
        g_PlayerData.get(player.id).editIdType = ID_TYPE.NONE;
        return 1;
      }

      if (!response) {
        showAttachedDialog(player, DIALOG_ID.ATTACH_MAIN);
        return 1;
      }

      const [cmd, value] = inputText.split(" ");
      if (!cmd || typeof value === "undefined") {
        showAttachedDialog(player, dialogId);
        return 1;
      }

      if (cmd === "x") {
        g_PlayerAttachData.get(player.id)[attachIndex].x = +value;
      } else if (cmd === "y") {
        g_PlayerAttachData.get(player.id)[attachIndex].y = +value;
      } else if (cmd === "z") {
        g_PlayerAttachData.get(player.id)[attachIndex].z = +value;
      } else if (cmd === "rx") {
        g_PlayerAttachData.get(player.id)[attachIndex].rx = fixRot(+value);
      } else if (cmd === "ry") {
        g_PlayerAttachData.get(player.id)[attachIndex].ry = fixRot(+value);
      } else if (cmd === "rz") {
        g_PlayerAttachData.get(player.id)[attachIndex].rz = fixRot(+value);
      } else if (cmd === "sx") {
        g_PlayerAttachData.get(player.id)[attachIndex].sx = +value;
      } else if (cmd === "sy") {
        g_PlayerAttachData.get(player.id)[attachIndex].sy = +value;
      } else if (cmd === "sz") {
        g_PlayerAttachData.get(player.id)[attachIndex].sz = +value;
      } else {
        showAttachedDialog(player, dialogId);
        return 1;
      }

      applyPlayerAttachData(player, attachIndex);

      showAttachedDialog(player, dialogId);
      return 1;
    }
    case DIALOG_ID.COLORALPHA_ATTACH_1:
    case DIALOG_ID.COLORALPHA_ATTACH_2: {
      const attachIndex = getPlayerEditAttached(player);
      if (
        attachIndex === INVALID_PLAYERATTACH_INDEX ||
        !g_PlayerAttachData.get(player.id)[attachIndex].toggle
      ) {
        return 1;
      }

      if (!response) {
        showAttachedDialog(player, DIALOG_ID.ATTACH_MAIN);
        return 1;
      }

      const alpha = +inputText;
      if (!inputText.trim().length || Number.isNaN(alpha)) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You must enter a decimal or hexadecimal value!"
        );
        showAttachedDialog(player, dialogId);
        return 1;
      }

      if (alpha < 0x00 || alpha > 0xff) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You must enter a value between 0 - 255!"
        );
        showAttachedDialog(player, dialogId);
        return 1;
      }

      switch (dialogId) {
        case DIALOG_ID.COLORALPHA_ATTACH_1: {
          g_PlayerAttachData.get(player.id)[attachIndex].color1 = setARGBAlpha(
            g_PlayerAttachData.get(player.id)[attachIndex].color1,
            alpha
          );
          break;
        }
        case DIALOG_ID.COLORALPHA_ATTACH_2: {
          g_PlayerAttachData.get(player.id)[attachIndex].color2 = setARGBAlpha(
            g_PlayerAttachData.get(player.id)[attachIndex].color2,
            alpha
          );
          break;
        }
      }

      applyPlayerAttachData(player, attachIndex);
      showAttachedDialog(player, dialogId);
      return 1;
    }
  }

  return 0;
}

PlayerEvent.onSpawn(({ player, next }) => {
  for (let attachIdx = 0; attachIdx < MAX_PLAYERATTACH_INDEX; attachIdx++) {
    applyPlayerAttachData(player, attachIdx);
  }
  return next();
});

export function isValidPlayerAttachIndex(index: number) {
  return index >= 0 && index < MAX_PLAYERATTACH_INDEX;
}

export async function showAttachedDialog(player: Player, dialogId: number) {
  switch (dialogId) {
    case DIALOG_ID.ATTACH_INDEXLIST: {
      let g_DialogInfo = "Index\tModel ID\tModel Name\tBone\n";
      let g_DialogInfoRow = "";

      for (let index = 0; index < MAX_PLAYERATTACH_INDEX; index++) {
        if (g_PlayerAttachData.get(player.id)[index].toggle) {
          const modelId = g_PlayerAttachData.get(player.id)[index].model;
          const boneId = g_PlayerAttachData.get(player.id)[index].bone;

          const g_BoneString = getBoneName(boneId);

          const g_ModelString = getModelName(modelId);
          g_DialogInfoRow = `${index}\t{modelId}\t${g_ModelString}\t${g_BoneString}\n`;
        } else {
          g_DialogInfoRow = `${index}\t \t \t \n`;
        }
        g_DialogInfo += g_DialogInfoRow;
      }
      const res = await new Dialog({
        style: DialogStylesEnum.TABLIST_HEADERS,
        caption: "Attached Objects",
        info: g_DialogInfo,
        button1: "Select",
        button2: "Cancel",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    case DIALOG_ID.ATTACH_MAIN: {
      const index = getPlayerEditAttached(player);
      if (
        index === INVALID_PLAYERATTACH_INDEX ||
        !g_PlayerAttachData.get(player.id)[index].toggle
      ) {
        return 1;
      }

      const g_DialogCaption = `Attachment Index ${index}`;
      let g_DialogInfo = "";

      for (
        let listItem = 0;
        listItem < DIALOG_LISTITEM_ATTACH.MAX;
        listItem++
      ) {
        switch (listItem) {
          case DIALOG_LISTITEM_ATTACH.MODEL: {
            if (g_PlayerAttachData.get(player.id)[index].toggle) {
              const modelId = g_PlayerAttachData.get(player.id)[index].model;

              const g_ModelString = getModelName(modelId);

              let g_DialogInfoRow = "";
              if (g_ModelString.ret) {
                g_DialogInfoRow = `Model\t${modelId} ${g_ModelString}\n`;
              } else {
                g_DialogInfoRow = `Model\t${modelId} NOT FOUND\n`;
              }
              g_DialogInfo += g_DialogInfoRow;
            } else {
              g_DialogInfo += "Model\t \n";
            }
            break;
          }
          case DIALOG_LISTITEM_ATTACH.BONE: {
            if (g_PlayerAttachData.get(player.id)[index].toggle) {
              const boneId = g_PlayerAttachData.get(player.id)[index].bone;
              const g_BoneString = getBoneName(boneId);
              const g_DialogInfoRow = `Bone\t${boneId} ${g_BoneString}\n`;
              g_DialogInfo += g_DialogInfoRow;
            } else {
              g_DialogInfo += "Bone\t \n";
            }
            break;
          }
          case DIALOG_LISTITEM_ATTACH.COORD: {
            g_DialogInfo += "Offset, Rotation, Scale\t \n";
            break;
          }
          case DIALOG_LISTITEM_ATTACH.MOVE: {
            g_DialogInfo += "Click & Drag Move\t \n";
            break;
          }
          case DIALOG_LISTITEM_ATTACH.COLOR1: {
            if (g_PlayerAttachData.get(player.id)[index].toggle) {
              const color = aRGBtoRGB(
                g_PlayerAttachData.get(player.id)[index].color1
              )
                .toString(16)
                .padStart(6, "0");
              const g_DialogInfoRow = `Color 1\t0x${color}Color\n`;
              g_DialogInfo += g_DialogInfoRow;
            } else {
              g_DialogInfo += "Color 1\t \n";
            }
            break;
          }
          case DIALOG_LISTITEM_ATTACH.ALPHA1: {
            if (g_PlayerAttachData.get(player.id)[index].toggle) {
              const a = aRGBtoA(
                g_PlayerAttachData.get(player.id)[index].color1
              );
              const g_DialogInfoRow = `Color Alpha 1\t${a}/${0xff}\n`;
              g_DialogInfo += g_DialogInfoRow;
            } else {
              g_DialogInfo += "Color Alpha 1\t \n";
            }
            break;
          }
          case DIALOG_LISTITEM_ATTACH.COLOR2: {
            if (g_PlayerAttachData.get(player.id)[index].toggle) {
              const color = aRGBtoRGB(
                g_PlayerAttachData.get(player.id)[index].color2
              )
                .toString(16)
                .padStart(6, "0");
              const g_DialogInfoRow = `Color 2\t0x${color}Color\n`;
              g_DialogInfo += g_DialogInfoRow;
            } else {
              g_DialogInfo += "Color 2\t \n";
            }
            break;
          }
          case DIALOG_LISTITEM_ATTACH.ALPHA2: {
            if (g_PlayerAttachData.get(player.id)[index].toggle) {
              const a = aRGBtoA(
                g_PlayerAttachData.get(player.id)[index].color2
              );
              const g_DialogInfoRow = `Color Alpha 2\t${a}/${0xff}\n`;
              g_DialogInfo += g_DialogInfoRow;
            } else {
              g_DialogInfo += "Color Alpha 2\t \n";
            }
            break;
          }
          case DIALOG_LISTITEM_ATTACH.REMOVE: {
            g_DialogInfo += "Remove\t \n";
            break;
          }
          default: {
            g_DialogInfo += " \t \n";
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
    case DIALOG_ID.ATTACH_BONE: {
      let g_DialogInfo = "";

      for (let boneId = 1; boneId <= MAX_BONE_ID; boneId++) {
        const g_BoneString = getBoneName(boneId);
        const g_DialogInfoRow = `${boneId}\t${g_BoneString}\n`;
        g_DialogInfo += g_DialogInfoRow;
      }

      const res = await new Dialog({
        style: DialogStylesEnum.TABLIST,
        caption: "Attached Bones",
        info: g_DialogInfo,
        button1: "Select",
        button2: "Cancel",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    case DIALOG_ID.ATTACH_COORD: {
      const index = getPlayerEditAttached(player);
      if (
        index === INVALID_PLAYERATTACH_INDEX ||
        !g_PlayerAttachData.get(player.id)[index].toggle
      ) {
        return 1;
      }

      let g_DialogInfo = "";
      let g_DialogInfoRow = `x \t${
        g_PlayerAttachData.get(player.id)[index].x
      }\n`;
      g_DialogInfo += g_DialogInfoRow;
      g_DialogInfoRow = `y \t${g_PlayerAttachData.get(player.id)[index].y}\n`;
      g_DialogInfo += g_DialogInfoRow;
      g_DialogInfoRow = `z \t${g_PlayerAttachData.get(player.id)[index].z}\n`;
      g_DialogInfo += g_DialogInfoRow;
      g_DialogInfoRow = `rx\t${g_PlayerAttachData.get(player.id)[index].rx}\n`;
      g_DialogInfo += g_DialogInfoRow;
      g_DialogInfoRow = `ry\t${g_PlayerAttachData.get(player.id)[index].ry}\n`;
      g_DialogInfo += g_DialogInfoRow;
      g_DialogInfoRow = `rz\t${g_PlayerAttachData.get(player.id)[index].rz}\n`;
      g_DialogInfo += g_DialogInfoRow;
      g_DialogInfoRow = `sx\t${g_PlayerAttachData.get(player.id)[index].sx}\n`;
      g_DialogInfo += g_DialogInfoRow;
      g_DialogInfoRow = `sy\t${g_PlayerAttachData.get(player.id)[index].sy}\n`;
      g_DialogInfo += g_DialogInfoRow;
      g_DialogInfoRow = `sz\t${g_PlayerAttachData.get(player.id)[index].sz}\n`;
      g_DialogInfo += g_DialogInfoRow;

      const res = await new Dialog({
        style: DialogStylesEnum.INPUT,
        caption: "Attached Offsets",
        info: g_DialogInfo,
        button1: "Enter",
        button2: "Cancel",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    case DIALOG_ID.COLORALPHA_ATTACH_1:
    case DIALOG_ID.COLORALPHA_ATTACH_2: {
      const attachIdx = getPlayerEditAttached(player);
      if (
        attachIdx === INVALID_PLAYERATTACH_INDEX ||
        !g_PlayerAttachData.get(player.id)[attachIdx].toggle
      ) {
        return 1;
      }

      let attachColorArgb = 0;
      let g_DialogCaption = "";

      switch (dialogId) {
        case DIALOG_ID.COLORALPHA_ATTACH_1: {
          g_DialogCaption = "Attach Color 1 Alpha";
          attachColorArgb = g_PlayerAttachData.get(player.id)[attachIdx].color1;
          break;
        }
        case DIALOG_ID.COLORALPHA_ATTACH_2: {
          g_DialogCaption = "Attach Color 2 Alpha";
          attachColorArgb = g_PlayerAttachData.get(player.id)[attachIdx].color2;
          break;
        }
        default: {
          return 1;
        }
      }
      const color = aRGBtoA(attachColorArgb);
      const g_DialogInfo = `Current Value: ${color}/${0xff}`;
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

export function defaultPlayerAttachData(player: Player, index: number) {
  g_PlayerAttachData.get(player.id)[index].toggle = false;
  g_PlayerAttachData.get(player.id)[index].model = 0;
  g_PlayerAttachData.get(player.id)[index].bone = 1;
  g_PlayerAttachData.get(player.id)[index].x = 0.0;
  g_PlayerAttachData.get(player.id)[index].y = 0.0;
  g_PlayerAttachData.get(player.id)[index].z = 0.0;
  g_PlayerAttachData.get(player.id)[index].rx = 0.0;
  g_PlayerAttachData.get(player.id)[index].ry = 0.0;
  g_PlayerAttachData.get(player.id)[index].rz = 0.0;
  g_PlayerAttachData.get(player.id)[index].sx = 1.0;
  g_PlayerAttachData.get(player.id)[index].sy = 1.0;
  g_PlayerAttachData.get(player.id)[index].sz = 1.0;
  g_PlayerAttachData.get(player.id)[index].color1 = 0xffffffff;
  g_PlayerAttachData.get(player.id)[index].color2 = 0xffffffff;
}

export function applyPlayerAttachData(player: Player, index: number) {
  if (!isValidPlayerAttachIndex(index)) {
    return 0;
  }

  if (!g_PlayerAttachData.get(player.id)[index].toggle) {
    player.removeAttachedObject(index);
    return 1;
  }

  player.setAttachedObject(
    index,
    g_PlayerAttachData.get(player.id)[index].model,
    g_PlayerAttachData.get(player.id)[index].bone,
    g_PlayerAttachData.get(player.id)[index].x,
    g_PlayerAttachData.get(player.id)[index].y,
    g_PlayerAttachData.get(player.id)[index].z,
    g_PlayerAttachData.get(player.id)[index].rx,
    g_PlayerAttachData.get(player.id)[index].ry,
    g_PlayerAttachData.get(player.id)[index].rz,
    g_PlayerAttachData.get(player.id)[index].sx,
    g_PlayerAttachData.get(player.id)[index].sy,
    g_PlayerAttachData.get(player.id)[index].sz,
    g_PlayerAttachData.get(player.id)[index].color1,
    g_PlayerAttachData.get(player.id)[index].color2
  );
  return 1;
}
