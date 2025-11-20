import { RGBA_ORANGE } from "@/constants";
import { SafetyMap } from "@/utils/safetyMap";
import {
  GameMode,
  GameText,
  InvalidEnum,
  KeysEnum,
  ObjectMp,
  Player,
  PlayerEvent,
  PlayerStateEnum,
} from "@infernus/core";

export const CAM_MODE_UPDATE_INTERVAL_MS = 100;
export const CAM_MODE_OBJECT_MODEL = 19300;
export const CAM_MODE_MULTIPLIER_ADD = 0.05;
export const CAM_MODE_MULTIPLIER_LIMIT = 1.0;
export const CAM_MODE_SPEED_FAST = 200.0;
export const CAM_MODE_SPEED_NORMAL = 50.0;
export const CAM_MODE_SPEED_SLOW = 10.0;
export const CAM_MODE_MOVE_DISTANCE = 9999.0;

export interface ICamModeData {
  toggle: boolean;
  moving: boolean;
  multiplier: number;
  poId: number;
  spawnSaved: boolean;
  spawnX: number;
  spawnY: number;
  spawnZ: number;
}

export const g_CamModeData = new SafetyMap<number, ICamModeData>(() => {
  return {
    toggle: false,
    moving: false,
    multiplier: 0.0,
    poId: InvalidEnum.OBJECT_ID,
    spawnSaved: false,
    spawnX: 0,
    spawnY: 0,
    spawnZ: 0,
  };
});

let g_CamModeTimer: NodeJS.Timeout | null = null;

GameMode.onInit(({ next }) => {
  Player.getInstances().forEach((p) => {
    if (p.isConnected()) {
      defaultCamModeData(p);
    }
  });

  if (g_CamModeTimer) {
    clearInterval(g_CamModeTimer);
  }
  g_CamModeTimer = setInterval(onCamModeUpdate, CAM_MODE_UPDATE_INTERVAL_MS);

  return next();
});

GameMode.onExit(({ next }) => {
  if (g_CamModeTimer) {
    clearInterval(g_CamModeTimer);
    g_CamModeTimer = null;
  }

  Player.getInstances().forEach((p) => {
    if (p.isConnected()) {
      if (g_CamModeData.get(p.id).toggle) {
        toggleCam(p, false);
      }
    }
  });

  g_CamModeData.clear();
  return next();
});

PlayerEvent.onConnect(({ player, next }) => {
  defaultCamModeData(player);
  return next();
});

PlayerEvent.onSpawn(({ player, next }) => {
  if (g_CamModeData.get(player.id).toggle) {
    const pObj = ObjectMp.getInstance(
      g_CamModeData.get(player.id).poId,
      player
    );
    if (pObj?.isValid()) {
      player.toggleSpectating(true);
      pObj.attachCamera();
    }
  }
  return next();
});

PlayerEvent.onStateChange(({ player, newState, next }) => {
  if (
    !g_CamModeData.get(player.id).toggle &&
    g_CamModeData.get(player.id).spawnSaved &&
    newState === PlayerStateEnum.ONFOOT
  ) {
    player.setPos(
      g_CamModeData.get(player.id).spawnX,
      g_CamModeData.get(player.id).spawnY,
      g_CamModeData.get(player.id).spawnZ
    );
    g_CamModeData.get(player.id).spawnSaved = false;
  }
  return next();
});

function onCamModeUpdate() {
  Player.getInstances().forEach((p) => {
    if (!p.isConnected()) {
      return;
    }

    if (!g_CamModeData.get(p.id).toggle) {
      return;
    }

    const { keys, upDown, leftRight } = p.getKeys();

    if (upDown === 0 && leftRight === 0) {
      if (g_CamModeData.get(p.id).moving) {
        const pObj = ObjectMp.getInstance(g_CamModeData.get(p.id).poId, p);
        pObj?.stop();
        g_CamModeData.get(p.id).moving = false;
        g_CamModeData.get(p.id).multiplier = 0.0;
      }
    } else {
      let speed = 0;

      let { x, y, z } = p.getCameraPos();
      const { x: vx, y: vy, z: vz } = p.getCameraFrontVector();

      if (upDown < 0) {
        x += vx * CAM_MODE_MOVE_DISTANCE;
        y += vy * CAM_MODE_MOVE_DISTANCE;
        z += vz * CAM_MODE_MOVE_DISTANCE;
      } else if (upDown > 0) {
        x -= vx * CAM_MODE_MOVE_DISTANCE;
        y -= vy * CAM_MODE_MOVE_DISTANCE;
        z -= vz * CAM_MODE_MOVE_DISTANCE;
      }

      if (leftRight > 0) {
        x += vy * CAM_MODE_MOVE_DISTANCE;
        y -= vx * CAM_MODE_MOVE_DISTANCE;
      } else if (leftRight < 0) {
        x -= vy * CAM_MODE_MOVE_DISTANCE;
        y += vx * CAM_MODE_MOVE_DISTANCE;
      }

      g_CamModeData.get(p.id).multiplier += CAM_MODE_MULTIPLIER_ADD;
      if (g_CamModeData.get(p.id).multiplier > CAM_MODE_MULTIPLIER_LIMIT) {
        g_CamModeData.get(p.id).multiplier = CAM_MODE_MULTIPLIER_LIMIT;
      }

      if (keys & KeysEnum.JUMP) {
        speed = g_CamModeData.get(p.id).multiplier * CAM_MODE_SPEED_FAST;
      } else if (keys & KeysEnum.WALK) {
        speed = g_CamModeData.get(p.id).multiplier * CAM_MODE_SPEED_SLOW;
      } else {
        speed = g_CamModeData.get(p.id).multiplier * CAM_MODE_SPEED_NORMAL;
      }

      const pObj = ObjectMp.getInstance(g_CamModeData.get(p.id).poId, p);
      pObj?.move(x, y, z, speed, 0.0, 0.0, 0.0);
      g_CamModeData.get(p.id).moving = true;
    }
  });
}

export function defaultCamModeData(player: Player) {
  g_CamModeData.get(player.id).toggle = false;
  g_CamModeData.get(player.id).moving = false;
  g_CamModeData.get(player.id).multiplier = 0.0;
  g_CamModeData.get(player.id).poId = InvalidEnum.OBJECT_ID;
  g_CamModeData.get(player.id).spawnSaved = false;
  g_CamModeData.get(player.id).spawnX = 0.0;
  g_CamModeData.get(player.id).spawnY = 0.0;
  g_CamModeData.get(player.id).spawnZ = 0.0;
}

export function toggleCam(player: Player, toggle: boolean) {
  if (toggle === g_CamModeData.get(player.id).toggle) {
    return 0;
  }

  g_CamModeData.get(player.id).toggle = toggle;

  if (toggle) {
    let x = 0.0,
      y = 0.0,
      z = 0.0;

    switch (player.getState()) {
      case PlayerStateEnum.DRIVER:
      case PlayerStateEnum.PASSENGER: {
        const pos = player.getVehicle()!.getPos();
        x = pos.x;
        y = pos.y;
        z = pos.z;
        player.setPos(x, y, z);
        break;
      }
      case PlayerStateEnum.ONFOOT: {
        const pos = player.getPos();
        x = pos.x;
        y = pos.y;
        z = pos.z;
        break;
      }
      default: {
        return 0;
      }
    }

    g_CamModeData.get(player.id).moving = false;
    const pObj = new ObjectMp({
      player,
      modelId: CAM_MODE_OBJECT_MODEL,
      x,
      y,
      z,
      rx: 0.0,
      ry: 0.0,
      rz: 0.0,
    });
    pObj.create();
    g_CamModeData.get(player.id).poId = pObj.id;
    g_CamModeData.get(player.id).multiplier = 0.0;

    player.toggleSpectating(true);
    pObj.attachCamera(player);
    new GameText("~w~camera mode ~g~toggled", 2000, 4).forPlayer(player);

    player.sendClientMessage(RGBA_ORANGE, "Camera Mode Keys: ");
    player.sendClientMessage(
      RGBA_ORANGE,
      "Direction: {FFFFFF}~k~~GO_FORWARD~ / ~k~~GO_BACK~ / ~k~~GO_LEFT~ / ~k~~GO_RIGHT~"
    );
    player.sendClientMessage(
      RGBA_ORANGE,
      "Faster: {FFFFFF}~k~~PED_JUMPING~ + Direction Key"
    );
    player.sendClientMessage(
      RGBA_ORANGE,
      "Slower: {FFFFFF}~k~~SNEAK_ABOUT~ + Direction Key"
    );
    player.sendClientMessage(RGBA_ORANGE, " ");
  } else {
    const { x, y, z } = player.getPos();
    g_CamModeData.get(player.id).spawnX = x;
    g_CamModeData.get(player.id).spawnY = y;
    g_CamModeData.get(player.id).spawnZ = z;
    g_CamModeData.get(player.id).spawnSaved = true;

    const pObj = ObjectMp.getInstance(
      g_CamModeData.get(player.id).poId,
      player
    );
    if (pObj && pObj.isValid()) {
      pObj.destroy();
    }

    g_CamModeData.get(player.id).poId = InvalidEnum.OBJECT_ID;

    player.toggleSpectating(false);
    new GameText("~w~camera mode ~r~unToggled", 2000, 4).forPlayer(player);
  }
  return 1;
}
