import { showAnimationList, hideAnimationList } from "@/animList";
import { showBuildList, hideBuildList } from "@/buildList";
import { showCategoryManager, hideCategoryManager } from "@/catManager";
import { showColorList, hideColorList } from "@/colorList";
import { showCreateList, hideCreateList } from "@/createList";
import { showFontList, hideFontList } from "@/fontList";
import { showHelpWindow, hideHelpWindow } from "@/help";
import { g_PlayerData } from "@/player";
import { showSelectList, hideSelectList } from "@/selectList";
import { showTextureList, hideTextureList } from "@/textureList";
import { GameMode, Player, PlayerEvent } from "@infernus/core";

export enum TD_MODE {
  NONE,
  SELECTLIST_OBJECT,
  SELECTLIST_VEHICLE,
  SELECTLIST_PICKUP,
  SELECTLIST_ACTOR,
  CREATELIST_OBJECT,
  CREATELIST_VEHICLE,
  CREATELIST_PICKUP,
  CREATELIST_ACTOR,
  CREATELIST_ATTACH,
  COLORLIST_TEXTURE,
  COLORLIST_FONTFACE,
  COLORLIST_FONTBACK,
  COLORLIST_ATTACH_1,
  COLORLIST_ATTACH_2,
  COLORLIST_VEHICLE_1,
  COLORLIST_VEHICLE_2,
  HELP_INFO,
  HELP_KEYBIND,
  HELP_CREDIT,
  TEXTURELIST,
  FONTLIST,
  ANIMLIST,
  CATMANAGER_MODELS,
  CATMANAGER_VEHICLES,
  CATMANAGER_SKINS,
  CATMANAGER_TEXTURES,
  BUILDLIST,
}

GameMode.onInit(({ next }) => {
  Player.getInstances().forEach((p) => {
    if (p.isConnected()) {
      g_PlayerData.get(p.id).tdMode = TD_MODE.NONE;
    }
  });
  return next();
});

GameMode.onExit(({ next }) => {
  Player.getInstances().forEach((p) => {
    if (p.isConnected()) {
      hidePlayerTextDrawMode(p);
    }
  });
  return next();
});

PlayerEvent.onConnect(({ player, next }) => {
  g_PlayerData.get(player.id).tdMode = TD_MODE.NONE;
  return next();
});

export function showPlayerTextDrawMode(player: Player, tdMode: TD_MODE) {
  if (g_PlayerData.get(player.id).tdMode === tdMode) {
    return 0;
  }

  if (g_PlayerData.get(player.id).tdMode !== TD_MODE.NONE) {
    hidePlayerTextDrawMode(player);
  }

  g_PlayerData.get(player.id).tdMode = tdMode;

  switch (tdMode) {
    case TD_MODE.SELECTLIST_OBJECT:
    case TD_MODE.SELECTLIST_VEHICLE:
    case TD_MODE.SELECTLIST_PICKUP:
    case TD_MODE.SELECTLIST_ACTOR: {
      showSelectList(player);
      break;
    }
    case TD_MODE.CREATELIST_OBJECT:
    case TD_MODE.CREATELIST_VEHICLE:
    case TD_MODE.CREATELIST_PICKUP:
    case TD_MODE.CREATELIST_ACTOR:
    case TD_MODE.CREATELIST_ATTACH: {
      showCreateList(player);
      break;
    }
    case TD_MODE.COLORLIST_TEXTURE:
    case TD_MODE.COLORLIST_FONTFACE:
    case TD_MODE.COLORLIST_FONTBACK:
    case TD_MODE.COLORLIST_ATTACH_1:
    case TD_MODE.COLORLIST_ATTACH_2:
    case TD_MODE.COLORLIST_VEHICLE_1:
    case TD_MODE.COLORLIST_VEHICLE_2: {
      showColorList(player);
      break;
    }
    case TD_MODE.TEXTURELIST: {
      showTextureList(player);
      break;
    }
    case TD_MODE.HELP_INFO:
    case TD_MODE.HELP_KEYBIND:
    case TD_MODE.HELP_CREDIT: {
      showHelpWindow(player);
      break;
    }
    case TD_MODE.FONTLIST: {
      showFontList(player);
      break;
    }
    case TD_MODE.ANIMLIST: {
      showAnimationList(player);
      break;
    }
    case TD_MODE.CATMANAGER_MODELS:
    case TD_MODE.CATMANAGER_VEHICLES:
    case TD_MODE.CATMANAGER_SKINS:
    case TD_MODE.CATMANAGER_TEXTURES: {
      showCategoryManager(player);
      break;
    }
    case TD_MODE.BUILDLIST: {
      showBuildList(player);
      break;
    }
    default: {
      return 0;
    }
  }
  return 1;
}

export function hidePlayerTextDrawMode(player: Player) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.SELECTLIST_OBJECT:
    case TD_MODE.SELECTLIST_VEHICLE:
    case TD_MODE.SELECTLIST_PICKUP:
    case TD_MODE.SELECTLIST_ACTOR: {
      hideSelectList(player);
      break;
    }
    case TD_MODE.CREATELIST_OBJECT:
    case TD_MODE.CREATELIST_VEHICLE:
    case TD_MODE.CREATELIST_PICKUP:
    case TD_MODE.CREATELIST_ACTOR:
    case TD_MODE.CREATELIST_ATTACH: {
      hideCreateList(player);
      break;
    }
    case TD_MODE.COLORLIST_TEXTURE:
    case TD_MODE.COLORLIST_FONTFACE:
    case TD_MODE.COLORLIST_FONTBACK:
    case TD_MODE.COLORLIST_ATTACH_1:
    case TD_MODE.COLORLIST_ATTACH_2:
    case TD_MODE.COLORLIST_VEHICLE_1:
    case TD_MODE.COLORLIST_VEHICLE_2: {
      hideColorList(player);
      break;
    }
    case TD_MODE.TEXTURELIST: {
      hideTextureList(player);
      break;
    }
    case TD_MODE.HELP_INFO:
    case TD_MODE.HELP_KEYBIND:
    case TD_MODE.HELP_CREDIT: {
      hideHelpWindow(player);
      break;
    }
    case TD_MODE.FONTLIST: {
      hideFontList(player);
      break;
    }
    case TD_MODE.ANIMLIST: {
      hideAnimationList(player);
      break;
    }
    case TD_MODE.CATMANAGER_MODELS:
    case TD_MODE.CATMANAGER_VEHICLES:
    case TD_MODE.CATMANAGER_SKINS:
    case TD_MODE.CATMANAGER_TEXTURES: {
      hideCategoryManager(player);
      break;
    }
    case TD_MODE.BUILDLIST: {
      hideBuildList(player);
      break;
    }
    default: {
      return 0;
    }
  }

  g_PlayerData.get(player.id).tdMode = TD_MODE.NONE;
  return 1;
}
