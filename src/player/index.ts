import { INVALID_BUILDING_ID } from "@/building";
import { ID_TYPE } from "@/idType";
import { INVALID_PLAYERATTACH_INDEX } from "@/pAttach";
import { g_PickupData } from "@/pickup";
import { TD_MODE } from "@/tdMode";
import { SafetyMap } from "@/utils/safetyMap";
import {
  Actor,
  GameMode,
  InvalidEnum,
  ObjectMp,
  Pickup,
  Player,
  Vehicle,
} from "@infernus/core";

export interface IPlayerData {
  editIdType: number;
  editId: number;
  editAttachObject: number;
  editMaterialObj: number;
  editObjMatIdx: number;
  clickDragPoId: number;
  selectTd: boolean;
  tdMode: number;
  posSaved: boolean;
  posX: number;
  posY: number;
  posZ: number;
}

export const g_PlayerData = new SafetyMap<number, IPlayerData>(() => {
  return {
    editIdType: 0,
    editId: 0,
    editAttachObject: 0,
    editMaterialObj: 0,
    editObjMatIdx: 0,
    clickDragPoId: 0,
    selectTd: false,
    tdMode: 0,
    posSaved: false,
    posX: 0,
    posY: 0,
    posZ: 0,
  };
});

GameMode.onExit(({ next }) => {
  g_PlayerData.clear();
  return next();
});

export function defaultPlayerData(player: Player) {
  g_PlayerData.get(player.id).editIdType = ID_TYPE.NONE;
  g_PlayerData.get(player.id).editAttachObject = InvalidEnum.OBJECT_ID;
  g_PlayerData.get(player.id).editMaterialObj = InvalidEnum.OBJECT_ID;
  g_PlayerData.get(player.id).clickDragPoId = InvalidEnum.OBJECT_ID;
  g_PlayerData.get(player.id).selectTd = false;
  g_PlayerData.get(player.id).tdMode = TD_MODE.NONE;
  g_PlayerData.get(player.id).posSaved = false;
}

export function getPlayerEditVehicle(player: Player) {
  if (g_PlayerData.get(player.id).editIdType === ID_TYPE.VEHICLE) {
    return g_PlayerData.get(player.id).editId;
  }
  return InvalidEnum.VEHICLE_ID;
}

export function getPlayerEditPickup(player: Player) {
  if (g_PlayerData.get(player.id).editIdType === ID_TYPE.PICKUP) {
    return g_PlayerData.get(player.id).editId;
  }
  return InvalidEnum.PICKUP_ID;
}

export function getPlayerEditActor(player: Player) {
  if (g_PlayerData.get(player.id).editIdType === ID_TYPE.ACTOR) {
    return g_PlayerData.get(player.id).editId;
  }
  return InvalidEnum.ACTOR_ID;
}

export function getPlayerEditObject(player: Player) {
  if (g_PlayerData.get(player.id).editIdType === ID_TYPE.OBJECT) {
    return g_PlayerData.get(player.id).editId;
  }
  return InvalidEnum.OBJECT_ID;
}

export function getPlayerEditAttached(player: Player) {
  if (g_PlayerData.get(player.id).editIdType === ID_TYPE.ATTACH) {
    return g_PlayerData.get(player.id).editId;
  }
  return INVALID_PLAYERATTACH_INDEX;
}

export function getPlayerEditBuilding(player: Player) {
  if (g_PlayerData.get(player.id).editIdType === ID_TYPE.BUILDING) {
    return g_PlayerData.get(player.id).editId;
  }
  return INVALID_BUILDING_ID;
}

export function getPlayerNearestObject(player: Player, maxDistance: number) {
  let nearObjectId: number = InvalidEnum.OBJECT_ID;
  let nearDistance = maxDistance;

  ObjectMp.getInstances().forEach((o) => {
    if (!o.isValid()) {
      return;
    }

    const { x, y, z } = o.getPos();
    const distance = player.getDistanceFromPoint(x, y, z);

    if (distance < nearDistance) {
      nearObjectId = o.id;
      nearDistance = distance;
    }
  });
  return nearObjectId;
}

export function getPlayerNearestVehicle(player: Player, maxDistance: number) {
  let nearVehicleId: number = InvalidEnum.VEHICLE_ID;
  let nearDistance = maxDistance;

  Vehicle.getInstances().forEach((v) => {
    if (!v.isValid()) {
      return;
    }

    const { x, y, z } = v.getPos();
    const distance = player.getDistanceFromPoint(x, y, z);

    if (distance < nearDistance) {
      nearVehicleId = v.id;
      nearDistance = distance;
    }
  });

  return nearVehicleId;
}

export function getPlayerNearestPickup(player: Player, maxDistance: number) {
  let nearPickupId: number = InvalidEnum.PICKUP_ID;
  let nearDistance = maxDistance;

  Pickup.getInstances().forEach((p) => {
    if (!g_PickupData.get(p.id).isValid) {
      return;
    }

    const x = g_PickupData.get(p.id).x;
    const y = g_PickupData.get(p.id).y;
    const z = g_PickupData.get(p.id).z;
    const distance = player.getDistanceFromPoint(x, y, z);

    if (distance < nearDistance) {
      nearPickupId = p.id;
      nearDistance = distance;
    }
  });

  return nearPickupId;
}

export function getPlayerNearestActor(player: Player, maxDistance: number) {
  let nearActorId: number = InvalidEnum.ACTOR_ID;
  let nearDistance = maxDistance;

  Actor.getInstances().forEach((a) => {
    if (!a.isValid()) {
      return;
    }

    const { x, y, z } = a.getPos();
    const distance = player.getDistanceFromPoint(x, y, z);

    if (distance < nearDistance) {
      nearActorId = a.id;
      nearDistance = distance;
    }
  });

  return nearActorId;
}
