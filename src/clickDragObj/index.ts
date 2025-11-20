import { ID_TYPE } from "@/idType";
import { g_PickupData } from "@/pickup";
import { g_PlayerData } from "@/player";
import {
  Actor,
  GameMode,
  InvalidEnum,
  ObjectMp,
  Player,
  PlayerEvent,
  Vehicle,
} from "@infernus/core";

GameMode.onInit(({ next }) => {
  Player.getInstances().forEach((p) => {
    if (p.isConnected()) {
      defaultClickDragObjectData(p);
    }
  });
  return next();
});

GameMode.onExit(({ next }) => {
  Player.getInstances().forEach((p) => {
    if (p.isConnected()) {
      defaultClickDragObjectData(p);
    }
  });
  return next();
});

PlayerEvent.onConnect(({ player, next }) => {
  defaultClickDragObjectData(player);
  return next();
});

export function defaultClickDragObjectData(player: Player) {
  g_PlayerData.get(player.id).clickDragPoId = InvalidEnum.OBJECT_ID;
}

export function refreshClickDragObject(player: Player) {
  let x = 0,
    y = 0,
    z = 0,
    a = 0;

  switch (g_PlayerData.get(player.id).editIdType) {
    case ID_TYPE.VEHICLE: {
      const vehicleId = g_PlayerData.get(player.id).editId;
      const vehicle = Vehicle.getInstance(vehicleId);
      if (vehicle) {
        const pos = vehicle.getPos();
        const angle = vehicle.getZAngle().angle;
        x = pos.x;
        z = pos.y;
        z = pos.z;
        a = angle;
      }
      break;
    }
    case ID_TYPE.PICKUP: {
      const pickupId = g_PlayerData.get(player.id).editId;
      x = g_PickupData.get(pickupId).x;
      y = g_PickupData.get(pickupId).y;
      z = g_PickupData.get(pickupId).z;
      break;
    }
    case ID_TYPE.ACTOR: {
      const actorId = g_PlayerData.get(player.id).editId;
      const actor = Actor.getInstance(actorId);
      if (actor) {
        const pos = actor.getPos();
        const angle = actor.getFacingAngle().angle;
        x = pos.x;
        z = pos.y;
        z = pos.z;
        a = angle;
      }
      break;
    }
    default: {
      return InvalidEnum.OBJECT_ID;
    }
  }

  if (g_PlayerData.get(player.id).clickDragPoId === InvalidEnum.OBJECT_ID) {
    g_PlayerData.get(player.id).clickDragPoId = new ObjectMp({
      player,
      modelId: 19300,
      x,
      y,
      z,
      rx: 0.0,
      ry: 0.0,
      rz: a,
    }).create().id;
  } else {
    const pObj = ObjectMp.getInstance(
      g_PlayerData.get(player.id).clickDragPoId,
      player
    );
    pObj?.setPos(x, y, z);
    pObj?.setRot(0.0, 0.0, a);
  }
  return g_PlayerData.get(player.id).clickDragPoId;
}

export function destroyClickDragObject(player: Player) {
  if (g_PlayerData.get(player.id).clickDragPoId !== InvalidEnum.OBJECT_ID) {
    const pObj = ObjectMp.getInstance(
      g_PlayerData.get(player.id).clickDragPoId,
      player
    );
    pObj?.destroy();
    g_PlayerData.get(player.id).clickDragPoId = InvalidEnum.OBJECT_ID;
  }
}
