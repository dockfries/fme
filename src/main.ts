import fs from "node:fs";
import {
  GameMode,
  isPressed,
  KeysEnum,
  ObjectMp,
  Player,
  PlayerEvent,
  PlayerStateEnum,
} from "@infernus/core";

import { logger } from "./logger";

import "./object/hook";
import "./vehicle/hook";
import "./actor/hook";
import "./pickup/hook";
import "./selectTd/hook";

import "./sqlite";

import { GLOBAL_CHARSET, SELECT_TD_COLOR } from "./constants";

import "./actor";
import "./object";
import "./pickup";
import { defaultPlayerData } from "./player";
import "./pAttach";
import { g_CamModeData } from "./camMode";
import "./idType";
import "./matIndexType";
import "./mapNew";
import "./mapSave";
import "./offsetEdit";
import "./vehicle";
import "./dialog";
import "./matAlign";
import "./anim";
import "./modShop";
import "./bone";
import { loadTextureCache } from "./texture";
import { loadFontCache } from "./font";
import { loadModelCache } from "./model";
import { loadSkinCache } from "./skin";
import "./matSize";
import { loadVehicleModelCache } from "./vehModel";
import { loadVehicleColorCache } from "./vehColor";
import "./editMarker";
import { loadModelColorCache } from "./modelColor";
import "./tdMode";
import "./createList";
import "./catSelect";
import "./category";
import "./selectList";
import "./colorList";
import "./textureList";
import "./fontList";
import "./help";
import "./animList";
import "./modelView";
import "./catManager";
import "./textureView";
import "./mapList";
import "./moneyRefill";
import "./building";
import "./buildList";

GameMode.onInit(({ next }) => {
  loadModelCache();
  loadVehicleModelCache();
  loadTextureCache();
  loadFontCache();
  loadSkinCache();
  loadVehicleColorCache();
  loadModelColorCache();

  if (!fs.existsSync("scriptfiles/maps")) {
    logger.error("ERROR: The file path .../scriptfiles/maps does not exist!");
  }

  Player.getInstances().forEach((p) => {
    if (p.isConnected()) {
      defaultPlayerData(p);
      p.enableCameraTarget(true);
    }
  });

  logger.info("Fusez's Map Editor has been loaded successfully.");
  return next();
});

GameMode.onExit(({ next }) => {
  logger.info("Fusez's Map Editor has been un-loaded successfully.");
  return next();
});

PlayerEvent.onConnect(({ player, next }) => {
  player.charset = GLOBAL_CHARSET;

  defaultPlayerData(player);
  player.enableCameraTarget(true);
  return next();
});

PlayerEvent.onKeyStateChange(({ player, newKeys, oldKeys, next }) => {
  if (
    isPressed(newKeys, oldKeys, KeysEnum.YES) ||
    (isPressed(newKeys, oldKeys, KeysEnum.CROUCH) &&
      player.getState() === PlayerStateEnum.SPECTATING)
  ) {
    player.selectTextDraw(SELECT_TD_COLOR);
  }

  return next();
});

PlayerEvent.onClickMap(({ player, fX, fY, fZ, next }) => {
  if (g_CamModeData.get(player.id).toggle) {
    const pObj = ObjectMp.getInstance(
      g_CamModeData.get(player.id).poId,
      player
    );
    pObj?.stop();
    pObj?.setPos(fX, fY, fZ);
  } else {
    player.setPosFindZ(fX, fY, fZ);
  }
  return next();
});
