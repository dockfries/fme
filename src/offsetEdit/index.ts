import { RGBA_ORANGE, SELECT_TD_COLOR } from "@/constants";
import { DIALOG_ID } from "@/dialog";
import {
  showObjectDialog,
  g_ObjectData,
  applyObjectAttachData,
} from "@/object";
import { getPlayerEditObject } from "@/player";
import { fixRot } from "@/utils/math";
import { SafetyMap } from "@/utils/safetyMap";
import {
  GameMode,
  GameText,
  isHolding,
  isPressed,
  KeysEnum,
  ObjectMp,
  Player,
  PlayerEvent,
} from "@infernus/core";

export const OFFSETEDIT_UPDATE_INTERVAL = 100;
export const OFFSETEDIT_MULTIPLIER_ADD = 0.02;
export const OFFSETEDIT_MULTIPLIER_LIMIT = 1.0;
export const OFFSETEDIT_MOVE_SLOW = 0.5;
export const OFFSETEDIT_MOVE_NORMAL = 1.0;

export enum OFFSET_EDIT_MODE {
  X,
  Y,
  Z,
  RX,
  RY,
  RZ,
}

export interface IOffsetEditData {
  toggle: boolean;
  mode: number;
  multiplier: number;
}

export const g_OffsetEditData = new SafetyMap<number, IOffsetEditData>(() => {
  return {
    toggle: false,
    mode: 0,
    multiplier: 1,
  };
});

let g_OffsetEditTimer: NodeJS.Timeout | null = null;

GameMode.onInit(({ next }) => {
  if (g_OffsetEditTimer) {
    clearInterval(g_OffsetEditTimer);
  }
  g_OffsetEditTimer = setInterval(
    onOffsetEditUpdate,
    OFFSETEDIT_UPDATE_INTERVAL
  );

  Player.getInstances().forEach((p) => {
    if (p.isConnected()) {
      defaultOffsetEditData(p);
    }
  });
  return next();
});

GameMode.onExit(({ next }) => {
  g_OffsetEditData.clear();
  if (g_OffsetEditTimer) {
    clearInterval(g_OffsetEditTimer);
    g_OffsetEditTimer = null;
  }
  return next();
});

PlayerEvent.onConnect(({ player, next }) => {
  defaultOffsetEditData(player);
  return next();
});

PlayerEvent.onKeyStateChange(({ player, newKeys, oldKeys, next }) => {
  if (g_OffsetEditData.get(player.id).toggle) {
    if (isPressed(newKeys, oldKeys, KeysEnum.SECONDARY_ATTACK)) {
      toggleOffsetEdit(player, false);
      player.clearAnimations();
      showObjectDialog(player, DIALOG_ID.OBJECT_MAIN);
      player.selectTextDraw(SELECT_TD_COLOR);
    }

    if (isHolding(newKeys, KeysEnum.SPRINT)) {
      if (isPressed(newKeys, oldKeys, KeysEnum.ANALOG_LEFT)) {
        if (--g_OffsetEditData.get(player.id).mode < OFFSET_EDIT_MODE.X) {
          g_OffsetEditData.get(player.id).mode = OFFSET_EDIT_MODE.RZ;
        }

        showOffsetEditMode(player);
      } else if (isPressed(newKeys, oldKeys, KeysEnum.ANALOG_RIGHT)) {
        if (++g_OffsetEditData.get(player.id).mode > OFFSET_EDIT_MODE.RZ) {
          g_OffsetEditData.get(player.id).mode = OFFSET_EDIT_MODE.X;
        }

        showOffsetEditMode(player);
      }
    }
  }

  return next();
});

function onOffsetEditUpdate() {
  Player.getInstances().forEach((p) => {
    if (!p.isConnected()) {
      return;
    }

    if (!g_OffsetEditData.get(p.id).toggle) {
      return;
    }

    const { keys } = p.getKeys();

    if (keys & KeysEnum.SPRINT) {
      return;
    }

    if (keys & KeysEnum.ANALOG_RIGHT) {
      if (g_OffsetEditData.get(p.id).multiplier < 0.0) {
        g_OffsetEditData.get(p.id).multiplier = 0.0;
      }

      g_OffsetEditData.get(p.id).multiplier += OFFSETEDIT_MULTIPLIER_ADD;
      if (g_OffsetEditData.get(p.id).multiplier > OFFSETEDIT_MULTIPLIER_LIMIT) {
        g_OffsetEditData.get(p.id).multiplier = OFFSETEDIT_MULTIPLIER_LIMIT;
      }
    } else if (keys & KeysEnum.ANALOG_LEFT) {
      if (g_OffsetEditData.get(p.id).multiplier > 0.0) {
        g_OffsetEditData.get(p.id).multiplier = 0.0;
      }

      g_OffsetEditData.get(p.id).multiplier -= OFFSETEDIT_MULTIPLIER_ADD;
      if (
        g_OffsetEditData.get(p.id).multiplier < -OFFSETEDIT_MULTIPLIER_LIMIT
      ) {
        g_OffsetEditData.get(p.id).multiplier = -OFFSETEDIT_MULTIPLIER_LIMIT;
      }
    } else {
      g_OffsetEditData.get(p.id).multiplier = 0.0;
      return;
    }

    const objectId = getPlayerEditObject(p);
    if (!ObjectMp.isValid(objectId)) {
      toggleOffsetEdit(p, false);
      return;
    }

    let moveAmount = 0;
    if (keys & KeysEnum.WALK) {
      moveAmount = g_OffsetEditData.get(p.id).multiplier * OFFSETEDIT_MOVE_SLOW;
    } else {
      moveAmount =
        g_OffsetEditData.get(p.id).multiplier * OFFSETEDIT_MOVE_NORMAL;
    }

    switch (g_OffsetEditData.get(p.id).mode) {
      case OFFSET_EDIT_MODE.X: {
        g_ObjectData.get(objectId - 1).attachX += moveAmount;
        break;
      }
      case OFFSET_EDIT_MODE.Y: {
        g_ObjectData.get(objectId - 1).attachY += moveAmount;
        break;
      }
      case OFFSET_EDIT_MODE.Z: {
        g_ObjectData.get(objectId - 1).attachZ += moveAmount;
        break;
      }
      case OFFSET_EDIT_MODE.RX: {
        g_ObjectData.get(objectId - 1).attachRx = fixRot(
          g_ObjectData.get(objectId - 1).attachRx + moveAmount
        );
        break;
      }
      case OFFSET_EDIT_MODE.RY: {
        g_ObjectData.get(objectId - 1).attachRy = fixRot(
          g_ObjectData.get(objectId - 1).attachRy + moveAmount
        );
        break;
      }
      case OFFSET_EDIT_MODE.RZ: {
        g_ObjectData.get(objectId - 1).attachRz = fixRot(
          g_ObjectData.get(objectId - 1).attachRz + moveAmount
        );
        break;
      }
      default: {
        return;
      }
    }

    showOffsetEditOffset(p, objectId);
    applyObjectAttachData(objectId);
  });
}

export function getOffsetEditModeName(mode: number) {
  let modeName = "";
  switch (mode) {
    case OFFSET_EDIT_MODE.X: {
      modeName = "x";
      break;
    }
    case OFFSET_EDIT_MODE.Y: {
      modeName = "y";
      break;
    }
    case OFFSET_EDIT_MODE.Z: {
      modeName = "z";
      break;
    }
    case OFFSET_EDIT_MODE.RX: {
      modeName = "rx";
      break;
    }
    case OFFSET_EDIT_MODE.RY: {
      modeName = "ry";
      break;
    }
    case OFFSET_EDIT_MODE.RZ: {
      modeName = "rz";
      break;
    }
    default: {
      modeName = "-";
    }
  }
  return modeName;
}

export function showOffsetEditMode(player: Player) {
  const text = `~r~editing ${getOffsetEditModeName(
    g_OffsetEditData.get(player.id).mode
  )} offset`;
  new GameText(text, 2000, 4).forPlayer(player);
}

export function showOffsetEditOffset(player: Player, objectId: number) {
  let text = "";
  switch (g_OffsetEditData.get(player.id).mode) {
    case OFFSET_EDIT_MODE.X: {
      text = `~r~${getOffsetEditModeName(
        OFFSET_EDIT_MODE.X
      )} offset: ~w~${g_ObjectData.get(objectId - 1).attachX.toFixed(4)}`;
      break;
    }
    case OFFSET_EDIT_MODE.Y: {
      text = `~r~${getOffsetEditModeName(
        OFFSET_EDIT_MODE.Y
      )} offset: ~w~${g_ObjectData.get(objectId - 1).attachY.toFixed(4)}`;
      break;
    }
    case OFFSET_EDIT_MODE.Z: {
      text = `~r~${getOffsetEditModeName(
        OFFSET_EDIT_MODE.Z
      )} offset: ~w~${g_ObjectData.get(objectId - 1).attachZ.toFixed(4)}`;
      break;
    }
    case OFFSET_EDIT_MODE.RX: {
      text = `~r~${getOffsetEditModeName(
        OFFSET_EDIT_MODE.RX
      )} offset: ~w~${g_ObjectData.get(objectId - 1).attachRx.toFixed(4)}`;
      break;
    }
    case OFFSET_EDIT_MODE.RY: {
      text = `~r~${getOffsetEditModeName(
        OFFSET_EDIT_MODE.RY
      )} offset: ~w~${g_ObjectData.get(objectId - 1).attachRy.toFixed(4)}`;
      break;
    }
    case OFFSET_EDIT_MODE.RZ: {
      text = `~r~${getOffsetEditModeName(
        OFFSET_EDIT_MODE.RZ
      )} offset: ~w~${g_ObjectData.get(objectId - 1).attachRz.toFixed(4)}`;
      break;
    }
    default: {
      return 0;
    }
  }
  new GameText(text, 1000, 4).forPlayer(player);
  return 1;
}

export function toggleOffsetEdit(player: Player, toggle: boolean) {
  if (toggle === g_OffsetEditData.get(player.id).toggle) {
    return 0;
  }

  g_OffsetEditData.get(player.id).toggle = toggle;

  if (toggle) {
    g_OffsetEditData.get(player.id).multiplier = 0.0;

    new GameText("~w~offset editor ~g~toggled", 4000, 4).forPlayer(player);

    player.sendClientMessage(RGBA_ORANGE, "Offset Edit Keys:");
    player.sendClientMessage(
      RGBA_ORANGE,
      "Direction: {FFFFFF}+~k~~VEHICLE_TURRETRIGHT~ / -~k~~VEHICLE_TURRETLEFT~"
    );
    player.sendClientMessage(
      RGBA_ORANGE,
      "Move Slower: {FFFFFF}~k~~SNEAK_ABOUT~ + Direction Key"
    );
    player.sendClientMessage(
      RGBA_ORANGE,
      "Change Mode: {FFFFFF}~k~~PED_SPRINT~ + Direction Key"
    );
    player.sendClientMessage(RGBA_ORANGE, " ");
  } else {
    new GameText("~w~offset editor ~r~untoggled", 4000, 4).forPlayer(player);
  }
  return 1;
}

export function defaultOffsetEditData(player: Player) {
  g_OffsetEditData.get(player.id).toggle = false;
  g_OffsetEditData.get(player.id).mode = OFFSET_EDIT_MODE.X;
  g_OffsetEditData.get(player.id).multiplier = 0.0;
}
