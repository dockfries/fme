import { g_CamModeData } from "@/camMode";
import { destroyClickDragObject, refreshClickDragObject } from "@/clickDragObj";
import {
  INVALID_ARRAY_INDEX,
  INVALID_COLOR_ID,
  RGBA_ORANGE,
  RGBA_RED,
  SELECT_TD_COLOR,
} from "@/constants";
import { DIALOG_ID, DIALOG_LISTITEM_VEHICLE } from "@/dialog";
import { ID_TYPE } from "@/idType";
import {
  getModShopName,
  getModShopPosition,
  getVehicleModelModShop,
  INVALID_MODSHOP_ID,
} from "@/modShop";
import {
  g_ObjectData,
  applyObjectAttachData,
  showObjectDialog,
  getObjectAttachVehicle,
  copyObject,
  migrateObjectAttachData,
} from "@/object";
import { g_PlayerData, getPlayerEditVehicle } from "@/player";
import {
  applySelectListRowData,
  g_SelectVehListData,
  MAX_SELECT_LIST_ROWS,
} from "@/selectList";
import { showPlayerTextDrawMode, TD_MODE } from "@/tdMode";
import { SafetyMap } from "@/utils/safetyMap";
import { getVehicleColorRGB } from "@/vehColor";
import {
  g_VehModelNameCache,
  getVehicleModelCacheIndex,
  getVehicleModelName,
} from "@/vehModel";
import {
  Dialog,
  DialogStylesEnum,
  EditResponseTypesEnum,
  GameMode,
  IDialogResCommon,
  InvalidEnum,
  ObjectMp,
  ObjectMpEvent,
  Player,
  PlayerEvent,
  PlayerStateEnum,
  Vehicle,
  VehicleEvent,
} from "@infernus/core";

export const INVALID_PAINTJOB_ID = 3;
export const MAX_COMPONENT_SLOTS = 14;

export interface IVehicleData {
  memoryX: number;
  memoryY: number;
  memoryZ: number;
  memoryRz: number;
  color1: number;
  color2: number;
  paintJob: number;
  comment: string;
  modTpToggle: boolean;
  modTpX: number;
  modTpY: number;
  modTpZ: number;
  modTpA: number;
}

export const g_VehicleData = new SafetyMap<number, IVehicleData>(() => {
  return {
    memoryX: 0,
    memoryY: 0,
    memoryZ: 0,
    memoryRz: 0,
    color1: 0,
    color2: 0,
    paintJob: 0,
    comment: "",
    modTpToggle: false,
    modTpX: 0,
    modTpY: 0,
    modTpZ: 0,
    modTpA: 0,
  };
});

GameMode.onInit(({ next }) => {
  Vehicle.getInstances().forEach((v) => {
    if (!v.isValid()) {
      return;
    }

    const g_CommentString = getVehicleModelName(v.getModel());
    if (g_CommentString) {
      g_VehicleData.get(v.id - 1).comment = g_CommentString;
    }

    g_VehicleData.get(v.id - 1).color1 = INVALID_COLOR_ID;
    g_VehicleData.get(v.id - 1).color2 = INVALID_COLOR_ID;
    g_VehicleData.get(v.id - 1).paintJob = INVALID_PAINTJOB_ID;
  });
  return next();
});

VehicleEvent.onRespray(({ vehicle, color, next }) => {
  const [color1, color2] = color;
  g_VehicleData.get(vehicle.id - 1).color1 = color1;
  g_VehicleData.get(vehicle.id - 1).color2 = color2;
  return next();
});

VehicleEvent.onPaintjob(({ vehicle, paintjobId, next }) => {
  g_VehicleData.get(vehicle.id - 1).paintJob = paintjobId;
  return next();
});

PlayerEvent.onEnterExitModShop(({ player, enterExit, next }) => {
  if (!enterExit) {
    const veh = player.getVehicle();
    const vehicleId = veh?.id;
    if (vehicleId && g_VehicleData.get(vehicleId - 1).modTpToggle) {
      g_VehicleData.get(vehicleId - 1).modTpToggle = false;

      veh.setPos(
        g_VehicleData.get(vehicleId - 1).modTpX,
        g_VehicleData.get(vehicleId - 1).modTpY,
        g_VehicleData.get(vehicleId - 1).modTpZ
      );
      veh.setZAngle(g_VehicleData.get(vehicleId - 1).modTpA);

      g_PlayerData.get(player.id).editIdType = ID_TYPE.VEHICLE;
      g_PlayerData.get(player.id).editId = vehicleId;
      showVehicleDialog(player, DIALOG_ID.VEHICLE_MAIN);
    }
  }

  return next();
});

ObjectMpEvent.onPlayerEdit(
  ({ player, objectMp, isPlayerObject, response, fX, fY, fZ, fRotZ, next }) => {
    const vehicleId = getPlayerEditVehicle(player);

    if (
      isPlayerObject &&
      objectMp.id === g_PlayerData.get(player.id).clickDragPoId &&
      Vehicle.isValid(vehicleId)
    ) {
      switch (response) {
        case EditResponseTypesEnum.FINAL: {
          const newVehicleId = recreateVehicle(vehicleId, fRotZ);
          if (Vehicle.isValid(newVehicleId)) {
            Vehicle.getInstance(newVehicleId)!.setPos(fX, fY, fZ);
          } else {
            const veh = Vehicle.getInstance(vehicleId)!;
            veh.setPos(fX, fY, fZ);
            veh.setZAngle(fRotZ);
          }

          destroyClickDragObject(player);
          showVehicleDialog(player, DIALOG_ID.VEHICLE_MAIN);
          break;
        }
        case EditResponseTypesEnum.CANCEL: {
          const newVehicleId = recreateVehicle(
            vehicleId,
            g_VehicleData.get(vehicleId - 1).memoryRz
          );
          if (Vehicle.isValid(newVehicleId)) {
            Vehicle.getInstance(newVehicleId)!.setPos(
              g_VehicleData.get(newVehicleId - 1).memoryX,
              g_VehicleData.get(newVehicleId - 1).memoryY,
              g_VehicleData.get(newVehicleId - 1).memoryZ
            );
          } else {
            const veh = Vehicle.getInstance(vehicleId)!;
            veh.setPos(
              g_VehicleData.get(vehicleId - 1).memoryX,
              g_VehicleData.get(vehicleId - 1).memoryY,
              g_VehicleData.get(vehicleId - 1).memoryZ
            );
            veh.setZAngle(g_VehicleData.get(vehicleId - 1).memoryRz);
          }
          break;
        }
        case EditResponseTypesEnum.UPDATE: {
          const newVehicleId = recreateVehicle(vehicleId, fRotZ);
          if (Vehicle.isValid(newVehicleId)) {
            Vehicle.getInstance(newVehicleId)!.setPos(fX, fY, fZ);
          } else {
            const veh = Vehicle.getInstance(vehicleId)!;
            veh.setPos(fX, fY, fZ);
            veh.setZAngle(fRotZ);
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
    case DIALOG_ID.VEHICLE_MAIN: {
      const vehicleId = getPlayerEditVehicle(player);
      if (!Vehicle.isValid(vehicleId)) {
        g_PlayerData.get(player.id).editIdType = ID_TYPE.NONE;
        return 1;
      }

      const veh = Vehicle.getInstance(vehicleId)!;

      if (!response) {
        return 1;
      }

      switch (listItem) {
        case DIALOG_LISTITEM_VEHICLE.GOTO: {
          const { x, y, z } = veh.getPos();
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
        case DIALOG_LISTITEM_VEHICLE.GET: {
          const { x, y, z } = player.getPos();
          veh.setPos(x, y, z);
          break;
        }
        case DIALOG_LISTITEM_VEHICLE.DRIVE: {
          if (isVehicleOccupied(vehicleId, 0)) {
            player.sendClientMessage(
              RGBA_RED,
              "ERROR: Someone is already driving this vehicle!"
            );
          } else if (player.getState() === PlayerStateEnum.SPECTATING) {
            player.sendClientMessage(
              RGBA_RED,
              "ERROR: You need to spawned to do this!"
            );
          } else {
            veh.putPlayerIn(player, 0);
          }
          break;
        }
        case DIALOG_LISTITEM_VEHICLE.COORD: {
          showVehicleDialog(player, DIALOG_ID.VEHICLE_COORD);
          return 1;
        }
        case DIALOG_LISTITEM_VEHICLE.MOVE: {
          const objectId = refreshClickDragObject(player);
          if (objectId === InvalidEnum.OBJECT_ID) {
            player.sendClientMessage(
              RGBA_RED,
              "ERROR: This vehicle cannot be moved right now!"
            );
          } else {
            const { x, y, z } = veh.getPos();
            g_VehicleData.get(vehicleId - 1).memoryX = x;
            g_VehicleData.get(vehicleId - 1).memoryY = y;
            g_VehicleData.get(vehicleId - 1).memoryZ = z;
            g_VehicleData.get(vehicleId - 1).memoryRz = veh.getZAngle().angle;

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
        case DIALOG_LISTITEM_VEHICLE.ATTACH: {
          const objectId = g_PlayerData.get(player.id).editAttachObject;
          if (ObjectMp.isValid(objectId)) {
            g_ObjectData.get(objectId - 1).attachIdType = ID_TYPE.VEHICLE;
            g_ObjectData.get(objectId - 1).attachId = vehicleId;
            applyObjectAttachData(objectId);

            g_PlayerData.get(player.id).editAttachObject =
              InvalidEnum.OBJECT_ID;
            g_PlayerData.get(player.id).editIdType = ID_TYPE.OBJECT;
            g_PlayerData.get(player.id).editId = objectId;
            showObjectDialog(player, DIALOG_ID.OBJECT_MAIN);
            return 1;
          }
          break;
        }
        case DIALOG_LISTITEM_VEHICLE.DUPLICATE: {
          const a = veh.getZAngle().angle;

          const newVehicleId = copyVehicle(vehicleId, a);
          if (newVehicleId === InvalidEnum.VEHICLE_ID) {
            player.sendClientMessage(
              RGBA_RED,
              "ERROR: This vehicle could not be duplicated!"
            );
          } else {
            if (!copyVehicleAttachments(vehicleId, newVehicleId)) {
              player.sendClientMessage(
                RGBA_RED,
                "WARNING: All vehicle attachments could not be duplicated!"
              );
            }

            g_PlayerData.get(player.id).editIdType = ID_TYPE.VEHICLE;
            g_PlayerData.get(player.id).editId = newVehicleId;
          }
          break;
        }
        case DIALOG_LISTITEM_VEHICLE.RECREATE: {
          const a = veh.getZAngle().angle;

          const newVehicleId = recreateVehicle(vehicleId, a);
          if (newVehicleId === InvalidEnum.VEHICLE_ID) {
            player.sendClientMessage(
              RGBA_RED,
              "ERROR: This vehicle could not be re-created!"
            );
          }
          break;
        }
        case DIALOG_LISTITEM_VEHICLE.REMOVE: {
          veh.destroy();
          return 1;
        }
        case DIALOG_LISTITEM_VEHICLE.COMMENT: {
          showVehicleDialog(player, DIALOG_ID.VEHICLE_COMMENT);
          return 1;
        }
        case DIALOG_LISTITEM_VEHICLE.COMMENT_RESET: {
          const g_CommentString = getVehicleModelName(veh.getModel());
          g_VehicleData.get(vehicleId - 1).comment = g_CommentString || "";
          break;
        }
        case DIALOG_LISTITEM_VEHICLE.COLOR1: {
          player.selectTextDraw(SELECT_TD_COLOR);
          showPlayerTextDrawMode(player, TD_MODE.COLORLIST_VEHICLE_1);
          return 1;
        }
        case DIALOG_LISTITEM_VEHICLE.COLOR2: {
          player.selectTextDraw(SELECT_TD_COLOR);
          showPlayerTextDrawMode(player, TD_MODE.COLORLIST_VEHICLE_2);
          return 1;
        }
        case DIALOG_LISTITEM_VEHICLE.MODSHOP: {
          const modShopId = getVehicleModelModShop(veh.getModel());
          if (modShopId === INVALID_MODSHOP_ID) {
            showVehicleDialog(player, dialogId);
            return 1;
          }

          if (player.getState() === PlayerStateEnum.SPECTATING) {
            player.sendClientMessage(
              RGBA_RED,
              "ERROR: You need to spawned to do this!"
            );
            showVehicleDialog(player, dialogId);
            return 1;
          }

          if (
            player.getVehicle()?.id !== vehicleId ||
            player.getVehicleSeat() !== 0
          ) {
            if (isVehicleOccupied(vehicleId, 0)) {
              player.sendClientMessage(
                RGBA_RED,
                "ERROR: Someone else is driving this vehicle!"
              );
              showVehicleDialog(player, dialogId);
              return 1;
            } else {
              veh.putPlayerIn(player, 0);
            }
          }

          g_VehicleData.get(vehicleId - 1).modTpToggle = true;
          const { x, y, z } = veh.getPos();

          g_VehicleData.get(vehicleId - 1).modTpX = x;
          g_VehicleData.get(vehicleId - 1).modTpY = y;
          g_VehicleData.get(vehicleId - 1).modTpZ = z;

          g_VehicleData.get(vehicleId - 1).modTpA = veh.getZAngle().angle;

          const modShopPos = getModShopPosition(modShopId);
          if (modShopPos) {
            veh.setPos(modShopPos.x, modShopPos.y, modShopPos.z);
            veh.setZAngle(modShopPos.a);
          }
          player.cancelSelectTextDraw();
          return 1;
        }
        case DIALOG_LISTITEM_VEHICLE.REMOVEMODS: {
          let componentsRemoved = 0;
          for (let slot = 0; slot < MAX_COMPONENT_SLOTS; slot++) {
            const componentId = veh.getComponentInSlot(slot);
            if (componentId !== 0) {
              veh.removeComponent(componentId);
              componentsRemoved++;
            }
          }

          if (componentsRemoved === 0) {
            player.sendClientMessage(
              RGBA_RED,
              "ERROR: This vehicle does not have any modifications!"
            );
          }
          break;
        }
      }

      showVehicleDialog(player, dialogId);
      return 1;
    }
    case DIALOG_ID.VEHICLE_COORD: {
      const vehicleId = getPlayerEditVehicle(player);
      if (!Vehicle.isValid(vehicleId)) {
        g_PlayerData.get(player.id).editIdType = ID_TYPE.NONE;
        return 1;
      }

      const veh = Vehicle.getInstance(vehicleId)!;

      if (!response) {
        showVehicleDialog(player, DIALOG_ID.VEHICLE_MAIN);
        return 1;
      }

      const [cmd, value] = inputText.split(" ");
      if (
        !inputText.trim().length ||
        !cmd.trim().length ||
        typeof value === "undefined" ||
        value === "" ||
        Number.isNaN(+value)
      ) {
        showVehicleDialog(player, dialogId);
        return 1;
      }

      let { x, y, z } = veh.getPos();
      let a = veh.getZAngle().angle;

      if (cmd === "x") {
        x = +value;
      } else if (cmd === "y") {
        y = +value;
      } else if (cmd === "z") {
        z = +value;
      } else if (cmd === "a") {
        a = +value;
      } else {
        showVehicleDialog(player, dialogId);
        return 1;
      }

      veh.setPos(x, y, z);
      veh.setZAngle(a);

      showVehicleDialog(player, dialogId);
      return 1;
    }
    case DIALOG_ID.VEHICLE_COMMENT: {
      const vehicleId = getPlayerEditVehicle(player);
      if (!Vehicle.isValid(vehicleId)) {
        g_PlayerData.get(player.id).editIdType = ID_TYPE.NONE;
        return 1;
      }

      if (!response) {
        showVehicleDialog(player, DIALOG_ID.VEHICLE_MAIN);
      } else {
        g_VehicleData.get(vehicleId - 1).comment = inputText;
        showVehicleDialog(player, dialogId);
      }
      return 1;
    }
  }

  return 0;
}

export async function showVehicleDialog(player: Player, dialogId: number) {
  switch (dialogId) {
    case DIALOG_ID.VEHICLE_MAIN: {
      const vehicleId = getPlayerEditVehicle(player);
      if (!Vehicle.isValid(vehicleId)) {
        return 1;
      }

      let g_DialogInfo = "";

      for (
        let listItem = 0;
        listItem < DIALOG_LISTITEM_VEHICLE.MAX;
        listItem++
      ) {
        switch (listItem) {
          case DIALOG_LISTITEM_VEHICLE.GOTO: {
            g_DialogInfo += "Goto\t \n";
            break;
          }
          case DIALOG_LISTITEM_VEHICLE.GET: {
            g_DialogInfo += "Get\t \n";
            break;
          }
          case DIALOG_LISTITEM_VEHICLE.DRIVE: {
            g_DialogInfo += "Drive\t \n";
            break;
          }
          case DIALOG_LISTITEM_VEHICLE.COORD: {
            g_DialogInfo += "Coordinates & Rotation\t \n";
            break;
          }
          case DIALOG_LISTITEM_VEHICLE.MOVE: {
            g_DialogInfo += "Click & Drag Move\t \n";
            break;
          }
          case DIALOG_LISTITEM_VEHICLE.ATTACH: {
            const objectId = g_PlayerData.get(player.id).editAttachObject;
            if (!ObjectMp.isValid(objectId)) {
              g_DialogInfo += " \t \n";
            } else {
              const g_CommentString = g_ObjectData.get(objectId - 1).comment;
              const g_DialogInfoRow = `Attach Selected Object\t${g_CommentString}\n`;
              g_DialogInfo += g_DialogInfoRow;
            }
            break;
          }
          case DIALOG_LISTITEM_VEHICLE.DUPLICATE: {
            g_DialogInfo += "Duplicate\t \n";
            break;
          }
          case DIALOG_LISTITEM_VEHICLE.RECREATE: {
            g_DialogInfo += "Re-Create\t \n";
            break;
          }
          case DIALOG_LISTITEM_VEHICLE.REMOVE: {
            g_DialogInfo += "Remove\t \n";
            break;
          }
          case DIALOG_LISTITEM_VEHICLE.COMMENT: {
            const g_CommentString = g_VehicleData.get(vehicleId - 1).comment;
            const g_DialogInfoRow = `Comment\t${g_CommentString}\n`;
            g_DialogInfo += g_DialogInfoRow;
            break;
          }
          case DIALOG_LISTITEM_VEHICLE.COMMENT_RESET: {
            const veh = Vehicle.getInstance(vehicleId)!;
            const g_VehModelString = getVehicleModelName(veh.getModel());
            const g_DialogInfoRow = `Reset Comment To\t${g_VehModelString}\n`;
            g_DialogInfo += g_DialogInfoRow;
            break;
          }
          case DIALOG_LISTITEM_VEHICLE.COLOR1: {
            const colorId = g_VehicleData.get(vehicleId - 1).color1;
            if (colorId === INVALID_COLOR_ID) {
              g_DialogInfo += "Color 1\tUnknown\n";
            } else {
              const rgb = getVehicleColorRGB(colorId)
                .toString(16)
                .padStart(6, "0");
              const g_DialogInfoRow = `Color 1\t0x${rgb}ID ${colorId}\n`;
              g_DialogInfo += g_DialogInfoRow;
            }
            break;
          }
          case DIALOG_LISTITEM_VEHICLE.COLOR2: {
            const colorId = g_VehicleData.get(vehicleId - 1).color2;
            if (colorId === INVALID_COLOR_ID) {
              g_DialogInfo += "Color 2\tUnknown\n";
            } else {
              const rgb = getVehicleColorRGB(colorId)
                .toString(16)
                .padStart(6, "0");
              const g_DialogInfoRow = `Color 2\t${rgb}ID ${colorId}\n`;
              g_DialogInfo += g_DialogInfoRow;
            }
            break;
          }
          case DIALOG_LISTITEM_VEHICLE.MODSHOP: {
            const veh = Vehicle.getInstance(vehicleId)!;
            const modShopId = getVehicleModelModShop(veh.getModel());
            if (modShopId === INVALID_MODSHOP_ID) {
              g_DialogInfo += " \t \n";
            } else {
              const g_ModShopString = getModShopName(modShopId);
              const g_DialogInfoRow = `Teleport to Modshop\t${g_ModShopString}\n`;
              g_DialogInfo += g_DialogInfoRow;
            }
            break;
          }
          case DIALOG_LISTITEM_VEHICLE.REMOVEMODS: {
            g_DialogInfo += "Remove Modifications\t \n";
            break;
          }
          default: {
            g_DialogInfo += " \t \n";
          }
        }
      }
      const res = await new Dialog({
        style: DialogStylesEnum.TABLIST,
        caption: "Vehicle",
        info: g_DialogInfo,
        button1: "Select",
        button2: "Cancel",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    case DIALOG_ID.VEHICLE_COORD: {
      const vehicleId = getPlayerEditVehicle(player);
      if (!Vehicle.isValid(vehicleId)) {
        return 1;
      }

      const veh = Vehicle.getInstance(vehicleId)!;
      const { x, y, z } = veh.getPos();
      const { angle: a } = veh.getZAngle();

      let g_DialogInfo = "";
      g_DialogInfo += `x\t${x}\n`;
      g_DialogInfo += `y\t${y}\n`;
      g_DialogInfo += `z\t${z}\n`;
      g_DialogInfo += `a\t${a}\n`;

      const res = await new Dialog({
        style: DialogStylesEnum.INPUT,
        caption: "Vehicle Coordinates",
        info: g_DialogInfo,
        button1: "Enter",
        button2: "Cancel",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    case DIALOG_ID.VEHICLE_COMMENT: {
      const vehicleId = getPlayerEditVehicle(player);
      if (!Vehicle.isValid(vehicleId)) {
        return 1;
      }

      const g_CommentString = g_VehicleData.get(vehicleId - 1).comment;
      const g_DialogInfo = `Current Comment: ${g_CommentString}`;
      const res = await new Dialog({
        style: DialogStylesEnum.INPUT,
        caption: "Vehicle Comment",
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

export function copyVehicle(copyVehicleId: number, a: number) {
  if (!Vehicle.isValid(copyVehicleId)) {
    return InvalidEnum.VEHICLE_ID;
  }

  let pasteVehicleId = InvalidEnum.VEHICLE_ID;

  const copyVeh = Vehicle.getInstance(copyVehicleId)!;
  const { x, y, z } = copyVeh.getPos();

  try {
    const pasteVehicle = new Vehicle({
      modelId: copyVeh.getModel(),
      x,
      y,
      z,
      zAngle: a,
      color: [
        g_VehicleData.get(copyVehicleId - 1).color1,
        g_VehicleData.get(copyVehicleId - 1).color2,
      ],
      respawnDelay: -1,
    });
    pasteVehicle.create();
    pasteVehicleId = pasteVehicle.id;
    if (pasteVehicleId === InvalidEnum.VEHICLE_ID) {
      return InvalidEnum.VEHICLE_ID;
    }

    for (let slot = 0; slot < MAX_COMPONENT_SLOTS; slot++) {
      const componentId = copyVeh.getComponentInSlot(slot);

      if (componentId !== 0) {
        pasteVehicle.addComponent(componentId);
      }
    }

    const g_CommentString = g_VehicleData.get(copyVehicleId - 1).comment;
    g_VehicleData.get(pasteVehicleId - 1).comment = g_CommentString;

    g_VehicleData.get(pasteVehicleId - 1).memoryX = g_VehicleData.get(
      copyVehicleId - 1
    ).memoryX;
    g_VehicleData.get(pasteVehicleId - 1).memoryY = g_VehicleData.get(
      copyVehicleId - 1
    ).memoryY;
    g_VehicleData.get(pasteVehicleId - 1).memoryZ = g_VehicleData.get(
      copyVehicleId - 1
    ).memoryZ;
    g_VehicleData.get(pasteVehicleId - 1).memoryRz = g_VehicleData.get(
      copyVehicleId - 1
    ).memoryRz;
    return pasteVehicleId;
  } catch {
    return pasteVehicleId;
  }
}

export function recreateVehicle(copyVehicleId: number, a: number) {
  const pasteVehicleId = copyVehicle(copyVehicleId, a);

  if (pasteVehicleId !== InvalidEnum.VEHICLE_ID) {
    transferVehicleAttachments(copyVehicleId, pasteVehicleId);

    Player.getInstances().forEach((p) => {
      if (!p.isConnected()) {
        return;
      }

      if (getPlayerEditVehicle(p) === copyVehicleId) {
        g_PlayerData.get(p.id).editId = pasteVehicleId;
      }

      for (let row = 0; row < MAX_SELECT_LIST_ROWS; row++) {
        if (copyVehicleId !== g_SelectVehListData.get(p.id).rowId[row]) {
          continue;
        }

        g_SelectVehListData.get(p.id).rowId[row] = pasteVehicleId;

        if (g_PlayerData.get(p.id).tdMode === TD_MODE.SELECTLIST_VEHICLE) {
          applySelectListRowData(p, row);
        }
      }
    });

    const copyVehicle = Vehicle.getInstance(copyVehicleId)!;
    copyVehicle.destroy();
  }

  return pasteVehicleId;
}

export function copyVehicleAttachments(
  fromVehicleId: number,
  toVehicleId: number
) {
  if (!Vehicle.isValid(fromVehicleId) || !Vehicle.isValid(toVehicleId)) {
    return 0;
  }

  ObjectMp.getInstances().forEach((o) => {
    if (!o.isValid()) {
      return;
    }

    if (getObjectAttachVehicle(o.id) !== fromVehicleId) {
      return;
    }

    const pasteObjectId = copyObject(o.id, false);

    if (pasteObjectId === InvalidEnum.OBJECT_ID) {
      return 0;
    }

    if (migrateObjectAttachData(o.id, pasteObjectId, toVehicleId)) {
      applyObjectAttachData(pasteObjectId);
    }
  });

  return 1;
}

export function transferVehicleAttachments(
  fromVehicleId: number,
  toVehicleId: number
) {
  if (!Vehicle.isValid(fromVehicleId) || !Vehicle.isValid(toVehicleId)) {
    return 0;
  }
  ObjectMp.getInstances().forEach((o) => {
    if (!o.isValid()) {
      return;
    }

    if (getObjectAttachVehicle(o.id) !== fromVehicleId) {
      return;
    }

    g_ObjectData.get(o.id - 1).attachId = toVehicleId;
    applyObjectAttachData(o.id);
  });
  return 1;
}

export function isVehicleOccupied(vehicleId: number, seat: number) {
  return Player.getInstances().some(
    (p) =>
      p.isConnected() &&
      p.getVehicle()?.id === vehicleId &&
      p.getVehicleSeat() === seat
  );
}

export function findVehicles(
  result: number[],
  resultSize: number,
  search: string,
  offset: number
) {
  let rowsFound = 0;
  let rowsAdded = 0;
  let maxOffset = 0;
  const searchInt = +search || -1;

  Vehicle.getInstances().forEach((v) => {
    if (!v.isValid()) {
      return;
    }

    const modelId = v.getModel();
    const cacheIdx = getVehicleModelCacheIndex(modelId);

    if (
      !search.trim().length ||
      searchInt === v.id ||
      searchInt === modelId ||
      g_VehicleData.get(v.id - 1).comment.includes(search) ||
      (cacheIdx !== INVALID_ARRAY_INDEX &&
        g_VehModelNameCache[cacheIdx].includes(search))
    ) {
      if (rowsFound++ < offset) {
        return;
      }

      if (rowsAdded < resultSize) {
        result[rowsAdded++] = v.id;
      }
    }
  });

  maxOffset = rowsFound - 1;
  if (maxOffset < 0) {
    maxOffset = 0;
  }

  return { rowsAdded, maxOffset };
}
