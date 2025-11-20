import { g_ObjectData, MAX_MATERIALINDEX_MODCOUNT } from "@/object";
import { getTextureData } from "@/texture";
import { SafetyMap } from "@/utils/safetyMap";
import {
  GameMode,
  InvalidEnum,
  ObjectMp,
  Player,
  PlayerEvent,
} from "@infernus/core";

export interface ITextureViewData {
  poId: number;
}

export const TEXTUREVIEW_DISTANCE = 10.0;
export const TEXTUREVIEW_MODELID = 18764;
export const TEXTUREVIEW_MATINDEX = 0;

export const g_TextureViewData = new SafetyMap<number, ITextureViewData>(() => {
  return {
    poId: InvalidEnum.OBJECT_ID,
  };
});

GameMode.onInit(({ next }) => {
  Player.getInstances().forEach((p) => {
    if (p.isConnected()) {
      defaultTextureViewData(p);
    }
  });
  return next();
});

PlayerEvent.onConnect(({ player, next }) => {
  defaultTextureViewData(player);
  return next();
});

GameMode.onExit(({ next }) => {
  g_TextureViewData.clear();
  return next();
});

export function defaultTextureViewData(player: Player) {
  g_TextureViewData.get(player.id).poId = InvalidEnum.OBJECT_ID;
}

export function getTextureViewNextPos(player: Player) {
  let { x, y, z } = player.getCameraPos();
  const { x: vec_x, y: vec_y, z: vec_z } = player.getCameraFrontVector();

  x += TEXTUREVIEW_DISTANCE * vec_x;
  y += TEXTUREVIEW_DISTANCE * vec_y;
  z += TEXTUREVIEW_DISTANCE * vec_z;

  return { x, y, z };
}

export function createTextureView(player: Player) {
  if (!ObjectMp.isValid(g_TextureViewData.get(player.id).poId, player.id)) {
    const { x, y, z } = getTextureViewNextPos(player);
    try {
      const pObj = new ObjectMp({
        player,
        modelId: TEXTUREVIEW_MODELID,
        x,
        y,
        z,
        rx: 0.0,
        ry: 0.0,
        rz: 0.0,
      });
      pObj.create();
      g_TextureViewData.get(player.id).poId = pObj.id;
    } catch {
      return g_TextureViewData.get(player.id).poId;
    }
  }
  return g_TextureViewData.get(player.id).poId;
}

export function destroyTextureView(player: Player) {
  if (!ObjectMp.isValid(g_TextureViewData.get(player.id).poId, player.id)) {
    const pObj = ObjectMp.getInstance(
      g_TextureViewData.get(player.id).poId,
      player
    );
    pObj?.destroy();
    g_TextureViewData.get(player.id).poId = InvalidEnum.OBJECT_ID;
  }
}

export function refreshTextureView(player: Player, textureId: number) {
  if (!ObjectMp.isValid(g_TextureViewData.get(player.id).poId, player.id)) {
    createTextureView(player);
  }

  if (!ObjectMp.isValid(g_TextureViewData.get(player.id).poId, player.id)) {
    return 0;
  }

  if (
    g_ObjectData.get(g_TextureViewData.get(player.id).poId - 1)
      .matIndexModCount >= MAX_MATERIALINDEX_MODCOUNT
  ) {
    destroyTextureView(player);
    createTextureView(player);
  }

  const {
    modelId,
    txd: g_TextureTXDString,
    name: g_TextureNameString,
  } = getTextureData(textureId);

  const { x, y, z } = getTextureViewNextPos(player);

  const pObj = ObjectMp.getInstance(
    g_TextureViewData.get(player.id).poId,
    player
  );

  pObj?.setMaterial(
    TEXTUREVIEW_MATINDEX,
    modelId,
    g_TextureTXDString,
    g_TextureNameString,
    0
  );
  pObj?.setPos(x, y, z);
  return 1;
}
