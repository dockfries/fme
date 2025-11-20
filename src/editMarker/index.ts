import { g_ActorData } from "@/actor";
import {
  g_BuildingData,
  INVALID_BUILDING_ID,
  isValidBuildingID,
} from "@/building";
import { INVALID_MODEL_ID, RGBA_YELLOW } from "@/constants";
import { ID_TYPE } from "@/idType";
import { getModelMaxZ } from "@/model";
import {
  getObjectAttachObject,
  getObjectAttachVehicle,
  g_ObjectData,
} from "@/object";
import { g_PickupData } from "@/pickup";
import { g_PlayerData } from "@/player";
import { positionFromOffset } from "@/utils/math";
import { SafetyMap } from "@/utils/safetyMap";
import {
  Actor,
  GameMode,
  InvalidEnum,
  MapIconStyles,
  ObjectMp,
  Pickup,
  Player,
  PlayerEvent,
  Vehicle,
  VehicleModelInfoEnum,
} from "@infernus/core";

export const EDITMARKER_MAPICONID = 99;
export const EDITMARKER_MODELID = 19198;

export interface IEditMarkerData {
  on: boolean;
  attach: boolean;
  poId: number;
  model: number;
  z: number;
  tick: number;
}

export const g_EditMarkerData = new SafetyMap<number, IEditMarkerData>(() => {
  return {
    on: false,
    attach: false,
    poId: 0,
    model: 0,
    z: 0,
    tick: 0,
  };
});

GameMode.onInit(({ next }) => {
  Player.getInstances().forEach((p) => {
    if (p.isConnected()) {
      defaultEditMarkerData(p);
    }
  });
  return next();
});

GameMode.onExit(({ next }) => {
  Player.getInstances().forEach((p) => {
    if (p.isConnected() && g_EditMarkerData.get(p.id).on) {
      const pObj = ObjectMp.getInstance(g_EditMarkerData.get(p.id).poId, p);
      if (pObj) {
        pObj.destroy();
      }
      p.removeMapIcon(EDITMARKER_MAPICONID);
    }
  });

  return next();
});

PlayerEvent.onConnect(({ player, next }) => {
  defaultEditMarkerData(player);
  return next();
});

PlayerEvent.onUpdate(({ player, next }) => {
  if (Date.now() > g_EditMarkerData.get(player.id).tick) {
    refreshPlayerEditMarker(player);

    if (g_EditMarkerData.get(player.id).on) {
      g_EditMarkerData.get(player.id).tick = Date.now() + 200;
    } else {
      g_EditMarkerData.get(player.id).tick = Date.now() + 1000;
    }
  }

  return next();
});

export function refreshPlayerEditMarker(player: Player) {
  let objectId = InvalidEnum.OBJECT_ID;
  let vehicleId = InvalidEnum.VEHICLE_ID;
  let pickupId = InvalidEnum.PICKUP_ID;
  let actorId = InvalidEnum.ACTOR_ID;
  let modelId = INVALID_MODEL_ID;
  let buildingId = INVALID_BUILDING_ID;
  let unToggle = true;

  switch (g_PlayerData.get(player.id).editIdType) {
    case ID_TYPE.OBJECT: {
      objectId = g_PlayerData.get(player.id).editId;
      if (ObjectMp.isValid(objectId)) {
        modelId = ObjectMp.getInstance(objectId, player)!.getModel();
        unToggle = false;
      }
      break;
    }
    case ID_TYPE.VEHICLE: {
      vehicleId = g_PlayerData.get(player.id).editId;
      if (Vehicle.isValid(vehicleId)) {
        modelId = Vehicle.getInstance(vehicleId)!.getModel();
        unToggle = false;
      }
      break;
    }
    case ID_TYPE.PICKUP: {
      pickupId = g_PlayerData.get(player.id).editId;
      if (Pickup.isValid(pickupId)) {
        modelId = g_PickupData.get(pickupId).model;
        unToggle = false;
      }
      break;
    }
    case ID_TYPE.ACTOR: {
      actorId = g_PlayerData.get(player.id).editId;
      if (Actor.isValid(actorId)) {
        modelId = g_ActorData.get(actorId).skin;
        unToggle = false;
      }
      break;
    }
    case ID_TYPE.BUILDING: {
      buildingId = g_PlayerData.get(player.id).editId;
      if (isValidBuildingID(buildingId)) {
        modelId = g_BuildingData.get(buildingId).model;
        unToggle = false;
      }
      break;
    }
  }

  if (unToggle) {
    if (g_EditMarkerData.get(player.id).on) {
      player.removeMapIcon(EDITMARKER_MAPICONID);

      if (ObjectMp.isValid(g_EditMarkerData.get(player.id).poId, player.id)) {
        ObjectMp.getInstance(
          g_EditMarkerData.get(player.id).poId,
          player
        )!.destroy();
      }

      defaultEditMarkerData(player);
    }
    return 1;
  }

  if (!g_EditMarkerData.get(player.id).on) {
    g_EditMarkerData.get(player.id).on = true;
  }

  if (modelId !== g_EditMarkerData.get(player.id).model) {
    switch (g_PlayerData.get(player.id).editIdType) {
      case ID_TYPE.OBJECT:
      case ID_TYPE.PICKUP:
      case ID_TYPE.BUILDING: {
        g_EditMarkerData.get(player.id).z = getModelMaxZ(modelId).max;
        g_EditMarkerData.get(player.id).z += 1.5;
        break;
      }
      case ID_TYPE.VEHICLE: {
        const { z } = Vehicle.getModelInfo(modelId, VehicleModelInfoEnum.SIZE);
        g_EditMarkerData.get(player.id).z = z;
        g_EditMarkerData.get(player.id).z += 1.5;
        break;
      }
      default: {
        g_EditMarkerData.get(player.id).z = 2.0;
      }
    }
    g_EditMarkerData.get(player.id).model = modelId;
  }

  let attachToObjectId = InvalidEnum.OBJECT_ID;
  let attachToVehicleId = InvalidEnum.VEHICLE_ID;
  let x = 0;
  let y = 0;
  let z = 0;
  let attachOffX = 0;
  let attachOffY = 0;
  let attachOffZ = 0;

  switch (g_PlayerData.get(player.id).editIdType) {
    case ID_TYPE.OBJECT: {
      attachToObjectId = getObjectAttachObject(objectId);
      attachToVehicleId = getObjectAttachVehicle(objectId);

      if (ObjectMp.isValid(attachToObjectId)) {
        const attachToObject = ObjectMp.getInstance(attachToObjectId);
        const attachToPos = attachToObject?.getPos();
        const attachToRot = attachToObject?.getRot();
        let objX = 0;
        let objY = 0;
        let objZ = 0;
        let objRx = 0;
        let objRy = 0;
        let objRz = 0;
        if (attachToPos) {
          objX = attachToPos.x;
          objY = attachToPos.y;
          objZ = attachToPos.z;
        }
        if (attachToRot) {
          objRx = attachToRot.x;
          objRy = attachToRot.y;
          objRz = attachToRot.z;
        }
        attachOffX = g_ObjectData.get(objectId - 1).attachX;
        attachOffY = g_ObjectData.get(objectId - 1).attachY;
        attachOffZ = g_ObjectData.get(objectId - 1).attachZ;
        const pos = positionFromOffset(
          objX,
          objY,
          objZ,
          objRx,
          objRy,
          objRz,
          attachOffX,
          attachOffY,
          attachOffZ
        );
        x = pos.x;
        y = pos.y;
        z = pos.z;
      } else if (Vehicle.isValid(attachToVehicleId)) {
        const veh = Vehicle.getInstance(attachToVehicleId);
        const pos = veh?.getPos();
        if (pos) {
          x = pos.x;
          y = pos.y;
          z = pos.z;
        }

        attachOffX = g_ObjectData.get(objectId - 1).attachX;
        attachOffY = g_ObjectData.get(objectId - 1).attachY;
        attachOffZ = g_ObjectData.get(objectId - 1).attachZ;
      } else {
        const obj = ObjectMp.getInstance(objectId);
        const pos = obj?.getPos();
        if (pos) {
          x = pos.x;
          y = pos.y;
          z = pos.z;
        }
      }
      break;
    }
    case ID_TYPE.VEHICLE: {
      const pos = Vehicle.getInstance(vehicleId)?.getPos();
      if (pos) {
        x = pos.x;
        y = pos.y;
        z = pos.z;
      }
      break;
    }
    case ID_TYPE.PICKUP: {
      x = g_PickupData.get(pickupId).x;
      y = g_PickupData.get(pickupId).y;
      z = g_PickupData.get(pickupId).z;
      break;
    }
    case ID_TYPE.ACTOR: {
      const pos = Actor.getInstance(actorId)?.getPos();
      if (pos) {
        x = pos.x;
        y = pos.y;
        z = pos.z;
      }
      break;
    }
    case ID_TYPE.BUILDING: {
      x = g_BuildingData.get(buildingId).x;
      y = g_BuildingData.get(buildingId).y;
      z = g_BuildingData.get(buildingId).z;
      break;
    }
    default: {
      const pos = player.getPos();
      x = pos.x;
      y = pos.y;
      z = pos.z;
    }
  }

  z += g_EditMarkerData.get(player.id).z;
  attachOffZ += g_EditMarkerData.get(player.id).z;

  if (
    g_EditMarkerData.get(player.id).attach &&
    !Vehicle.isValid(attachToVehicleId)
  ) {
    if (ObjectMp.isValid(g_EditMarkerData.get(player.id).poId, player.id)) {
      ObjectMp.getInstance(
        g_EditMarkerData.get(player.id).poId,
        player
      )!.destroy();
    }

    g_EditMarkerData.get(player.id).poId = InvalidEnum.OBJECT_ID;
    g_EditMarkerData.get(player.id).attach = false;
  }

  if (!ObjectMp.isValid(g_EditMarkerData.get(player.id).poId, player.id)) {
    const pObj = new ObjectMp({
      player,
      modelId: EDITMARKER_MODELID,
      x,
      y,
      z,
      rx: 0.0,
      ry: 0.0,
      rz: 0.0,
    });
    pObj.create();
    g_EditMarkerData.get(player.id).poId = pObj.id;
  }

  if (ObjectMp.isValid(g_EditMarkerData.get(player.id).poId, player.id)) {
    if (Vehicle.isValid(attachToVehicleId)) {
      const pObj = ObjectMp.getInstance(
        g_EditMarkerData.get(player.id).poId,
        player
      );
      if (pObj) {
        pObj.attachToVehicle(
          Vehicle.getInstance(attachToVehicleId)!,
          attachOffX,
          attachOffY,
          attachOffZ,
          0.0,
          0.0,
          0.0
        );
        g_EditMarkerData.get(player.id).attach = true;
      }
    } else {
      const pObj = ObjectMp.getInstance(
        g_EditMarkerData.get(player.id).poId,
        player
      );
      if (pObj) {
        pObj.setPos(x, y, z);
      }
    }
  }

  player.setMapIcon(
    EDITMARKER_MAPICONID,
    x,
    y,
    z,
    0,
    RGBA_YELLOW,
    MapIconStyles.GLOBAL
  );
  return 1;
}

export function defaultEditMarkerData(player: Player) {
  g_EditMarkerData.get(player.id).on = false;
  g_EditMarkerData.get(player.id).attach = false;
  g_EditMarkerData.get(player.id).poId = InvalidEnum.OBJECT_ID;
  g_EditMarkerData.get(player.id).z = 0.0;
  g_EditMarkerData.get(player.id).tick = 0;
  g_EditMarkerData.get(player.id).model = INVALID_MODEL_ID;
}
