import { INVALID_MAP_ID } from "@/constants";
import { getMapName } from "@/mapDB";
import { GameMode, PlayerEvent, TextDraw } from "@infernus/core";

export interface IGMapLoadedVar {
  loadedID: number;
  loadedTD: TextDraw | null;
}

export const g_MapVar: IGMapLoadedVar = {
  loadedID: INVALID_MAP_ID,
  loadedTD: null,
};

export function createMapLoadedTextDraw() {
  try {
    if (!g_MapVar.loadedTD) {
      g_MapVar.loadedTD = new TextDraw({
        x: 633.0,
        y: 5.0,
        text: "Map Loaded",
      })
        .create()
        .setAlignment(3)
        .setBackgroundColors(255)
        .setFont(1)
        .setLetterSize(0.3, 1.3)
        .setColor(-1)
        .setOutline(1)
        .setProportional(true);
    }
  } catch {
    /* empty */
  }
  return g_MapVar.loadedTD !== null;
}

export function destroyMapLoadedTextDraw() {
  if (g_MapVar.loadedTD) {
    g_MapVar.loadedTD.destroy();
  }
  g_MapVar.loadedID = INVALID_MAP_ID;
  g_MapVar.loadedTD = null;
}

export function refreshMapLoadedTextDraw() {
  if (g_MapVar.loadedID === INVALID_MAP_ID) {
    destroyMapLoadedTextDraw();
  } else {
    createMapLoadedTextDraw();
    const g_MapString = getMapName(g_MapVar.loadedID);
    const g_TextDrawString = `~w~Last Map Loaded: ~r~${g_MapString}`;
    g_MapVar.loadedTD?.setString(g_TextDrawString).showAll();
  }
}

GameMode.onExit(({ next }) => {
  destroyMapLoadedTextDraw();
  return next();
});

PlayerEvent.onConnect(({ player, next }) => {
  if (g_MapVar.loadedTD) {
    g_MapVar.loadedTD.show(player);
  }
  return next();
});
