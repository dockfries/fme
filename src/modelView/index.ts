import { INVALID_MODEL_ID, RGBA_WHITE } from "@/constants";
import { fixRot } from "@/utils/math";
import { SafetyMap } from "@/utils/safetyMap";
import { MAX_VEHCOLOR_ID, MIN_VEHCOLOR_ID } from "@/vehColor";
import { isValidVehicleModel } from "@/vehModel";
import {
  GameMode,
  Player,
  PlayerEvent,
  TextDraw,
  TextDrawEvent,
} from "@infernus/core";

export const MODELVIEW_UPDATE_INTERVAL_MS = 100;
export const MODELVIEW_ROTATE_ADD_1 = 1.0;
export const MODELVIEW_ROTATE_ADD_2 = 10.0;
export const MODELVIEW_ZOOM_ADD_1 = 0.1;
export const MODELVIEW_ZOOM_ADD_2 = 0.5;
export const MODELVIEW_SPEED_ADD_1 = 1.0;
export const MODELVIEW_SPEED_ADD_2 = 5.0;
export const MODELVIEW_VEHCOL_ADD_1 = 1;
export const MODELVIEW_VEHCOL_ADD_2 = 10;
export const MAX_MODELVIEW_SPEED = 15.0;
export const MIN_MODELVIEW_SPEED = -MAX_MODELVIEW_SPEED;
export const MAX_MODELVIEW_ZOOM = 4.0;
export const MIN_MODELVIEW_ZOOM = 0;

export interface IModelViewData {
  toggle: boolean;
  modelId: number;
  rx: number;
  ry: number;
  rz: number;
  zm: number;
  rxs: number;
  rys: number;
  rzs: number;
  vc1: number;
  vc2: number;
}

export enum MODELVIEW_MOD {
  S2,
  S1,
  R,
  A1,
  A2,
  MAX,
}

export interface IModelViewGtd {
  bg: TextDraw | null;
  close: TextDraw | null;
  caption: TextDraw | null;
  rxMod: (TextDraw | null)[];
  ryMod: (TextDraw | null)[];
  rzMod: (TextDraw | null)[];
  zmMod: (TextDraw | null)[];
  rxsMod: (TextDraw | null)[];
  rysMod: (TextDraw | null)[];
  rzsMod: (TextDraw | null)[];
  vc1Mod: (TextDraw | null)[];
  vc2Mod: (TextDraw | null)[];
}

export interface IModelViewPtd {
  model: TextDraw | null;
  rx: TextDraw | null;
  ry: TextDraw | null;
  rz: TextDraw | null;
  zm: TextDraw | null;
  rxs: TextDraw | null;
  rys: TextDraw | null;
  rzs: TextDraw | null;
  vc1: TextDraw | null;
  vc2: TextDraw | null;
}

let g_ModelViewTimer: NodeJS.Timeout | null = null;

export const g_ModelViewData = new SafetyMap<number, IModelViewData>(() => {
  return {
    toggle: false,
    modelId: INVALID_MODEL_ID,
    rx: 0,
    ry: 0,
    rz: 0,
    zm: 1.0,
    rxs: 0,
    rys: 0,
    rzs: 0,
    vc1: 0,
    vc2: 0,
  };
});

export const g_ModelViewGTD: IModelViewGtd = {
  bg: null,
  close: null,
  caption: null,
  rxMod: Array.from({ length: MODELVIEW_MOD.MAX }, () => null),
  ryMod: Array.from({ length: MODELVIEW_MOD.MAX }, () => null),
  rzMod: Array.from({ length: MODELVIEW_MOD.MAX }, () => null),
  zmMod: Array.from({ length: MODELVIEW_MOD.MAX }, () => null),
  rxsMod: Array.from({ length: MODELVIEW_MOD.MAX }, () => null),
  rysMod: Array.from({ length: MODELVIEW_MOD.MAX }, () => null),
  rzsMod: Array.from({ length: MODELVIEW_MOD.MAX }, () => null),
  vc1Mod: Array.from({ length: MODELVIEW_MOD.MAX }, () => null),
  vc2Mod: Array.from({ length: MODELVIEW_MOD.MAX }, () => null),
};

export const g_ModelViewPTD = new SafetyMap<number, IModelViewPtd>(() => {
  return {
    model: null,
    rx: null,
    ry: null,
    rz: null,
    zm: null,
    rxs: null,
    rys: null,
    rzs: null,
    vc1: null,
    vc2: null,
  };
});

GameMode.onInit(({ next }) => {
  createGenericModelView();
  Player.getInstances().forEach((p) => {
    if (p.isConnected()) {
      defaultModelViewData(p);
    }
  });

  if (g_ModelViewTimer) {
    clearInterval(g_ModelViewTimer);
  }
  g_ModelViewTimer = setInterval(
    onModelViewUpdate,
    MODELVIEW_UPDATE_INTERVAL_MS
  );
  return next();
});

GameMode.onExit(({ next }) => {
  destroyGenericModelView();
  if (g_ModelViewTimer) {
    clearInterval(g_ModelViewTimer);
    g_ModelViewTimer = null;
  }
  g_ModelViewData.clear();
  g_ModelViewPTD.clear();
  return next();
});

PlayerEvent.onConnect(({ player, next }) => {
  defaultModelViewData(player);
  return next();
});

TextDrawEvent.onPlayerClickGlobal(({ player, textDraw, next }) => {
  if (textDraw === g_ModelViewGTD.close) {
    hideModelView(player);
    return 1;
  }
  if (textDraw === g_ModelViewGTD.rxMod[MODELVIEW_MOD.S2]) {
    g_ModelViewData.get(player.id).rx = fixRot(
      g_ModelViewData.get(player.id).rx - MODELVIEW_ROTATE_ADD_2
    );
    applyModelViewRX(player);
    if (g_ModelViewData.get(player.id).modelId !== INVALID_MODEL_ID) {
      applyModelViewRot(player, true);
    }
    return 1;
  }
  if (textDraw === g_ModelViewGTD.rxMod[MODELVIEW_MOD.S1]) {
    g_ModelViewData.get(player.id).rx = fixRot(
      g_ModelViewData.get(player.id).rx - MODELVIEW_ROTATE_ADD_1
    );
    applyModelViewRX(player);
    if (g_ModelViewData.get(player.id).modelId !== INVALID_MODEL_ID) {
      applyModelViewRot(player, true);
    }
    return 1;
  }
  if (textDraw === g_ModelViewGTD.rxMod[MODELVIEW_MOD.R]) {
    g_ModelViewData.get(player.id).rx = 0.0;
    applyModelViewRX(player);
    if (g_ModelViewData.get(player.id).modelId !== INVALID_MODEL_ID) {
      applyModelViewRot(player, true);
    }
    return 1;
  }
  if (textDraw === g_ModelViewGTD.rxMod[MODELVIEW_MOD.A1]) {
    g_ModelViewData.get(player.id).rx = fixRot(
      g_ModelViewData.get(player.id).rx + MODELVIEW_ROTATE_ADD_1
    );
    applyModelViewRX(player);
    if (g_ModelViewData.get(player.id).modelId !== INVALID_MODEL_ID) {
      applyModelViewRot(player, true);
    }
    return 1;
  }
  if (textDraw === g_ModelViewGTD.rxMod[MODELVIEW_MOD.A2]) {
    g_ModelViewData.get(player.id).rx = fixRot(
      g_ModelViewData.get(player.id).rx + MODELVIEW_ROTATE_ADD_2
    );
    applyModelViewRX(player);
    if (g_ModelViewData.get(player.id).modelId !== INVALID_MODEL_ID) {
      applyModelViewRot(player, true);
    }
    return 1;
  }
  if (textDraw === g_ModelViewGTD.ryMod[MODELVIEW_MOD.S2]) {
    g_ModelViewData.get(player.id).ry = fixRot(
      g_ModelViewData.get(player.id).ry - MODELVIEW_ROTATE_ADD_2
    );
    applyModelViewRY(player);
    if (g_ModelViewData.get(player.id).modelId !== INVALID_MODEL_ID) {
      applyModelViewRot(player, true);
    }
    return 1;
  }
  if (textDraw === g_ModelViewGTD.ryMod[MODELVIEW_MOD.S1]) {
    g_ModelViewData.get(player.id).ry = fixRot(
      g_ModelViewData.get(player.id).ry - MODELVIEW_ROTATE_ADD_1
    );
    applyModelViewRY(player);
    if (g_ModelViewData.get(player.id).modelId !== INVALID_MODEL_ID) {
      applyModelViewRot(player, true);
    }
    return 1;
  }
  if (textDraw === g_ModelViewGTD.ryMod[MODELVIEW_MOD.R]) {
    g_ModelViewData.get(player.id).ry = 0.0;
    applyModelViewRY(player);
    if (g_ModelViewData.get(player.id).modelId !== INVALID_MODEL_ID) {
      applyModelViewRot(player, true);
    }
    return 1;
  }
  if (textDraw === g_ModelViewGTD.ryMod[MODELVIEW_MOD.A1]) {
    g_ModelViewData.get(player.id).ry = fixRot(
      g_ModelViewData.get(player.id).ry + MODELVIEW_ROTATE_ADD_1
    );
    applyModelViewRY(player);
    if (g_ModelViewData.get(player.id).modelId !== INVALID_MODEL_ID) {
      applyModelViewRot(player, true);
    }
    return 1;
  }
  if (textDraw === g_ModelViewGTD.ryMod[MODELVIEW_MOD.A2]) {
    g_ModelViewData.get(player.id).ry = fixRot(
      g_ModelViewData.get(player.id).ry + MODELVIEW_ROTATE_ADD_2
    );
    applyModelViewRY(player);
    if (g_ModelViewData.get(player.id).modelId !== INVALID_MODEL_ID) {
      applyModelViewRot(player, true);
    }
    return 1;
  }
  if (textDraw === g_ModelViewGTD.rzMod[MODELVIEW_MOD.S2]) {
    g_ModelViewData.get(player.id).rz = fixRot(
      g_ModelViewData.get(player.id).rz - MODELVIEW_ROTATE_ADD_2
    );
    applyModelViewRZ(player);
    if (g_ModelViewData.get(player.id).modelId !== INVALID_MODEL_ID) {
      applyModelViewRot(player, true);
    }
    return 1;
  }
  if (textDraw === g_ModelViewGTD.rzMod[MODELVIEW_MOD.S1]) {
    g_ModelViewData.get(player.id).rz = fixRot(
      g_ModelViewData.get(player.id).rz - MODELVIEW_ROTATE_ADD_1
    );
    applyModelViewRZ(player);
    if (g_ModelViewData.get(player.id).modelId !== INVALID_MODEL_ID) {
      applyModelViewRot(player, true);
    }
    return 1;
  }
  if (textDraw === g_ModelViewGTD.rzMod[MODELVIEW_MOD.R]) {
    g_ModelViewData.get(player.id).rz = 0.0;
    applyModelViewRZ(player);
    if (g_ModelViewData.get(player.id).modelId !== INVALID_MODEL_ID) {
      applyModelViewRot(player, true);
    }
    return 1;
  }
  if (textDraw === g_ModelViewGTD.rzMod[MODELVIEW_MOD.A1]) {
    g_ModelViewData.get(player.id).rz = fixRot(
      g_ModelViewData.get(player.id).rz + MODELVIEW_ROTATE_ADD_1
    );
    applyModelViewRZ(player);
    if (g_ModelViewData.get(player.id).modelId !== INVALID_MODEL_ID) {
      applyModelViewRot(player, true);
    }
    return 1;
  }
  if (textDraw === g_ModelViewGTD.rzMod[MODELVIEW_MOD.A2]) {
    g_ModelViewData.get(player.id).rz = fixRot(
      g_ModelViewData.get(player.id).rz + MODELVIEW_ROTATE_ADD_2
    );
    applyModelViewRZ(player);
    if (g_ModelViewData.get(player.id).modelId !== INVALID_MODEL_ID) {
      applyModelViewRot(player, true);
    }
    return 1;
  }
  if (textDraw === g_ModelViewGTD.zmMod[MODELVIEW_MOD.S2]) {
    if (g_ModelViewData.get(player.id).zm === MIN_MODELVIEW_ZOOM) {
      return 1;
    }

    g_ModelViewData.get(player.id).zm -= MODELVIEW_ZOOM_ADD_2;
    if (g_ModelViewData.get(player.id).zm < MIN_MODELVIEW_ZOOM) {
      g_ModelViewData.get(player.id).zm = MIN_MODELVIEW_ZOOM;
    }
    applyModelViewZoom(player);
    if (g_ModelViewData.get(player.id).modelId !== INVALID_MODEL_ID) {
      applyModelViewRot(player, true);
    }
    return 1;
  }
  if (textDraw === g_ModelViewGTD.zmMod[MODELVIEW_MOD.S1]) {
    if (g_ModelViewData.get(player.id).zm === MIN_MODELVIEW_ZOOM) {
      return 1;
    }

    g_ModelViewData.get(player.id).zm -= MODELVIEW_ZOOM_ADD_1;
    if (g_ModelViewData.get(player.id).zm < MIN_MODELVIEW_ZOOM) {
      g_ModelViewData.get(player.id).zm = MIN_MODELVIEW_ZOOM;
    }
    applyModelViewZoom(player);
    if (g_ModelViewData.get(player.id).modelId !== INVALID_MODEL_ID) {
      applyModelViewRot(player, true);
    }
    return 1;
  }
  if (textDraw === g_ModelViewGTD.zmMod[MODELVIEW_MOD.R]) {
    if (g_ModelViewData.get(player.id).zm === 1.0) {
      return 1;
    }

    g_ModelViewData.get(player.id).zm = 1.0;
    applyModelViewZoom(player);
    if (g_ModelViewData.get(player.id).modelId !== INVALID_MODEL_ID) {
      applyModelViewRot(player, true);
    }
    return 1;
  }
  if (textDraw === g_ModelViewGTD.zmMod[MODELVIEW_MOD.A1]) {
    if (g_ModelViewData.get(player.id).zm === MAX_MODELVIEW_ZOOM) {
      return 1;
    }

    g_ModelViewData.get(player.id).zm += MODELVIEW_ZOOM_ADD_1;
    if (g_ModelViewData.get(player.id).zm > MAX_MODELVIEW_ZOOM) {
      g_ModelViewData.get(player.id).zm = MAX_MODELVIEW_ZOOM;
    }
    applyModelViewZoom(player);
    if (g_ModelViewData.get(player.id).modelId !== INVALID_MODEL_ID) {
      applyModelViewRot(player, true);
    }
    return 1;
  }
  if (textDraw === g_ModelViewGTD.zmMod[MODELVIEW_MOD.A2]) {
    if (g_ModelViewData.get(player.id).zm === MAX_MODELVIEW_ZOOM) {
      return 1;
    }

    g_ModelViewData.get(player.id).zm += MODELVIEW_ZOOM_ADD_2;
    if (g_ModelViewData.get(player.id).zm > MAX_MODELVIEW_ZOOM) {
      g_ModelViewData.get(player.id).zm = MAX_MODELVIEW_ZOOM;
    }
    applyModelViewZoom(player);
    if (g_ModelViewData.get(player.id).modelId !== INVALID_MODEL_ID) {
      applyModelViewRot(player, true);
    }
    return 1;
  }
  if (textDraw === g_ModelViewGTD.rxsMod[MODELVIEW_MOD.S2]) {
    if (g_ModelViewData.get(player.id).rxs === MIN_MODELVIEW_SPEED) {
      return 1;
    }

    g_ModelViewData.get(player.id).rxs -= MODELVIEW_SPEED_ADD_2;
    if (g_ModelViewData.get(player.id).rxs < MIN_MODELVIEW_SPEED) {
      g_ModelViewData.get(player.id).rxs = MIN_MODELVIEW_SPEED;
    }
    applyModelViewRXSpeed(player);
    return 1;
  }
  if (textDraw === g_ModelViewGTD.rxsMod[MODELVIEW_MOD.S1]) {
    if (g_ModelViewData.get(player.id).rxs === MIN_MODELVIEW_SPEED) {
      return 1;
    }

    g_ModelViewData.get(player.id).rxs -= MODELVIEW_SPEED_ADD_1;
    if (g_ModelViewData.get(player.id).rxs < MIN_MODELVIEW_SPEED) {
      g_ModelViewData.get(player.id).rxs = MIN_MODELVIEW_SPEED;
    }
    applyModelViewRXSpeed(player);
    return 1;
  }
  if (textDraw === g_ModelViewGTD.rxsMod[MODELVIEW_MOD.R]) {
    if (g_ModelViewData.get(player.id).rxs === 0.0) {
      return 1;
    }

    g_ModelViewData.get(player.id).rxs = 0.0;
    applyModelViewRXSpeed(player);
    return 1;
  }
  if (textDraw === g_ModelViewGTD.rxsMod[MODELVIEW_MOD.A1]) {
    if (g_ModelViewData.get(player.id).rxs === MAX_MODELVIEW_SPEED) {
      return 1;
    }

    g_ModelViewData.get(player.id).rxs += MODELVIEW_SPEED_ADD_1;
    if (g_ModelViewData.get(player.id).rxs > MAX_MODELVIEW_SPEED) {
      g_ModelViewData.get(player.id).rxs = MAX_MODELVIEW_SPEED;
    }
    applyModelViewRXSpeed(player);
    return 1;
  }
  if (textDraw === g_ModelViewGTD.rxsMod[MODELVIEW_MOD.A2]) {
    if (g_ModelViewData.get(player.id).rxs === MAX_MODELVIEW_SPEED) {
      return 1;
    }

    g_ModelViewData.get(player.id).rxs += MODELVIEW_SPEED_ADD_2;
    if (g_ModelViewData.get(player.id).rxs > MAX_MODELVIEW_SPEED) {
      g_ModelViewData.get(player.id).rxs = MAX_MODELVIEW_SPEED;
    }
    applyModelViewRXSpeed(player);
    return 1;
  }
  if (textDraw === g_ModelViewGTD.rysMod[MODELVIEW_MOD.S2]) {
    if (g_ModelViewData.get(player.id).rys === MIN_MODELVIEW_SPEED) {
      return 1;
    }

    g_ModelViewData.get(player.id).rys -= MODELVIEW_SPEED_ADD_2;
    if (g_ModelViewData.get(player.id).rys < MIN_MODELVIEW_SPEED) {
      g_ModelViewData.get(player.id).rys = MIN_MODELVIEW_SPEED;
    }
    applyModelViewRYSpeed(player);
    return 1;
  }
  if (textDraw === g_ModelViewGTD.rysMod[MODELVIEW_MOD.S1]) {
    if (g_ModelViewData.get(player.id).rys === MIN_MODELVIEW_SPEED) {
      return 1;
    }

    g_ModelViewData.get(player.id).rys -= MODELVIEW_SPEED_ADD_1;
    if (g_ModelViewData.get(player.id).rys < MIN_MODELVIEW_SPEED) {
      g_ModelViewData.get(player.id).rys = MIN_MODELVIEW_SPEED;
    }
    applyModelViewRYSpeed(player);
    return 1;
  }
  if (textDraw === g_ModelViewGTD.rysMod[MODELVIEW_MOD.R]) {
    if (g_ModelViewData.get(player.id).rys === 0.0) {
      return 1;
    }

    g_ModelViewData.get(player.id).rys = 0.0;
    applyModelViewRYSpeed(player);
    return 1;
  }
  if (textDraw === g_ModelViewGTD.rysMod[MODELVIEW_MOD.A1]) {
    if (g_ModelViewData.get(player.id).rys === MAX_MODELVIEW_SPEED) {
      return 1;
    }

    g_ModelViewData.get(player.id).rys += MODELVIEW_SPEED_ADD_1;
    if (g_ModelViewData.get(player.id).rys > MAX_MODELVIEW_SPEED) {
      g_ModelViewData.get(player.id).rys = MAX_MODELVIEW_SPEED;
    }
    applyModelViewRYSpeed(player);
    return 1;
  }
  if (textDraw === g_ModelViewGTD.rysMod[MODELVIEW_MOD.A2]) {
    if (g_ModelViewData.get(player.id).rys === MAX_MODELVIEW_SPEED) {
      return 1;
    }

    g_ModelViewData.get(player.id).rys += MODELVIEW_SPEED_ADD_2;
    if (g_ModelViewData.get(player.id).rys > MAX_MODELVIEW_SPEED) {
      g_ModelViewData.get(player.id).rys = MAX_MODELVIEW_SPEED;
    }
    applyModelViewRYSpeed(player);
    return 1;
  }
  if (textDraw === g_ModelViewGTD.rzsMod[MODELVIEW_MOD.S2]) {
    if (g_ModelViewData.get(player.id).rzs === MIN_MODELVIEW_SPEED) {
      return 1;
    }

    g_ModelViewData.get(player.id).rzs -= MODELVIEW_SPEED_ADD_2;
    if (g_ModelViewData.get(player.id).rzs < MIN_MODELVIEW_SPEED) {
      g_ModelViewData.get(player.id).rzs = MIN_MODELVIEW_SPEED;
    }
    applyModelViewRZSpeed(player);
    return 1;
  }
  if (textDraw === g_ModelViewGTD.rzsMod[MODELVIEW_MOD.S1]) {
    if (g_ModelViewData.get(player.id).rzs === MIN_MODELVIEW_SPEED) {
      return 1;
    }

    g_ModelViewData.get(player.id).rzs -= MODELVIEW_SPEED_ADD_1;
    if (g_ModelViewData.get(player.id).rzs < MIN_MODELVIEW_SPEED) {
      g_ModelViewData.get(player.id).rzs = MIN_MODELVIEW_SPEED;
    }
    applyModelViewRZSpeed(player);
    return 1;
  }
  if (textDraw === g_ModelViewGTD.rzsMod[MODELVIEW_MOD.R]) {
    if (g_ModelViewData.get(player.id).rzs === 0.0) {
      return 1;
    }

    g_ModelViewData.get(player.id).rzs = 0.0;
    applyModelViewRZSpeed(player);
    return 1;
  }
  if (textDraw === g_ModelViewGTD.rzsMod[MODELVIEW_MOD.A1]) {
    if (g_ModelViewData.get(player.id).rzs === MAX_MODELVIEW_SPEED) {
      return 1;
    }

    g_ModelViewData.get(player.id).rzs += MODELVIEW_SPEED_ADD_1;
    if (g_ModelViewData.get(player.id).rzs > MAX_MODELVIEW_SPEED) {
      g_ModelViewData.get(player.id).rzs = MAX_MODELVIEW_SPEED;
    }
    applyModelViewRZSpeed(player);
    return 1;
  }
  if (textDraw === g_ModelViewGTD.rzsMod[MODELVIEW_MOD.A2]) {
    if (g_ModelViewData.get(player.id).rzs === MAX_MODELVIEW_SPEED) {
      return 1;
    }

    g_ModelViewData.get(player.id).rzs += MODELVIEW_SPEED_ADD_2;
    if (g_ModelViewData.get(player.id).rzs > MAX_MODELVIEW_SPEED) {
      g_ModelViewData.get(player.id).rzs = MAX_MODELVIEW_SPEED;
    }
    applyModelViewRZSpeed(player);
    return 1;
  }
  if (textDraw === g_ModelViewGTD.vc1Mod[MODELVIEW_MOD.S2]) {
    if (!isValidVehicleModel(g_ModelViewData.get(player.id).modelId)) {
      return 1;
    }

    if (g_ModelViewData.get(player.id).vc1 === MIN_VEHCOLOR_ID) {
      return 1;
    }

    g_ModelViewData.get(player.id).vc1 -= MODELVIEW_VEHCOL_ADD_2;
    if (g_ModelViewData.get(player.id).vc1 < MIN_VEHCOLOR_ID) {
      g_ModelViewData.get(player.id).vc1 = MIN_VEHCOLOR_ID;
    }

    applyModelViewVehCol1(player);
    applyModelViewVehCol(player, true);
    return 1;
  }
  if (textDraw === g_ModelViewGTD.vc1Mod[MODELVIEW_MOD.S1]) {
    if (!isValidVehicleModel(g_ModelViewData.get(player.id).modelId)) {
      return 1;
    }

    if (g_ModelViewData.get(player.id).vc1 === MIN_VEHCOLOR_ID) {
      return 1;
    }

    g_ModelViewData.get(player.id).vc1 -= MODELVIEW_VEHCOL_ADD_1;
    if (g_ModelViewData.get(player.id).vc1 < MIN_VEHCOLOR_ID) {
      g_ModelViewData.get(player.id).vc1 = MIN_VEHCOLOR_ID;
    }

    applyModelViewVehCol1(player);
    applyModelViewVehCol(player, true);
    return 1;
  }
  if (textDraw === g_ModelViewGTD.vc1Mod[MODELVIEW_MOD.R]) {
    if (!isValidVehicleModel(g_ModelViewData.get(player.id).modelId)) {
      return 1;
    }

    if (g_ModelViewData.get(player.id).vc1 === 0) {
      return 1;
    }

    g_ModelViewData.get(player.id).vc1 = 0;

    applyModelViewVehCol1(player);
    applyModelViewVehCol(player, true);
    return 1;
  }
  if (textDraw === g_ModelViewGTD.vc1Mod[MODELVIEW_MOD.A1]) {
    if (!isValidVehicleModel(g_ModelViewData.get(player.id).modelId)) {
      return 1;
    }

    if (g_ModelViewData.get(player.id).vc1 === MAX_VEHCOLOR_ID) {
      return 1;
    }

    g_ModelViewData.get(player.id).vc1 += MODELVIEW_VEHCOL_ADD_1;
    if (g_ModelViewData.get(player.id).vc1 > MAX_VEHCOLOR_ID) {
      g_ModelViewData.get(player.id).vc1 = MAX_VEHCOLOR_ID;
    }

    applyModelViewVehCol1(player);
    applyModelViewVehCol(player, true);
    return 1;
  }
  if (textDraw === g_ModelViewGTD.vc1Mod[MODELVIEW_MOD.A2]) {
    if (!isValidVehicleModel(g_ModelViewData.get(player.id).modelId)) {
      return 1;
    }

    if (g_ModelViewData.get(player.id).vc1 === MAX_VEHCOLOR_ID) {
      return 1;
    }

    g_ModelViewData.get(player.id).vc1 += MODELVIEW_VEHCOL_ADD_2;
    if (g_ModelViewData.get(player.id).vc1 > MAX_VEHCOLOR_ID) {
      g_ModelViewData.get(player.id).vc1 = MAX_VEHCOLOR_ID;
    }

    applyModelViewVehCol1(player);
    applyModelViewVehCol(player, true);
    return 1;
  }
  if (textDraw === g_ModelViewGTD.vc2Mod[MODELVIEW_MOD.S2]) {
    if (!isValidVehicleModel(g_ModelViewData.get(player.id).modelId)) {
      return 1;
    }

    if (g_ModelViewData.get(player.id).vc2 === MIN_VEHCOLOR_ID) {
      return 1;
    }

    g_ModelViewData.get(player.id).vc2 -= MODELVIEW_VEHCOL_ADD_2;
    if (g_ModelViewData.get(player.id).vc2 < MIN_VEHCOLOR_ID) {
      g_ModelViewData.get(player.id).vc2 = MIN_VEHCOLOR_ID;
    }

    applyModelViewVehCol2(player);
    applyModelViewVehCol(player, true);
    return 1;
  }
  if (textDraw === g_ModelViewGTD.vc2Mod[MODELVIEW_MOD.S1]) {
    if (!isValidVehicleModel(g_ModelViewData.get(player.id).modelId)) {
      return 1;
    }

    if (g_ModelViewData.get(player.id).vc2 === MIN_VEHCOLOR_ID) {
      return 1;
    }

    g_ModelViewData.get(player.id).vc2 -= MODELVIEW_VEHCOL_ADD_1;
    if (g_ModelViewData.get(player.id).vc2 < MIN_VEHCOLOR_ID) {
      g_ModelViewData.get(player.id).vc2 = MIN_VEHCOLOR_ID;
    }

    applyModelViewVehCol2(player);
    applyModelViewVehCol(player, true);
    return 1;
  }
  if (textDraw === g_ModelViewGTD.vc2Mod[MODELVIEW_MOD.R]) {
    if (!isValidVehicleModel(g_ModelViewData.get(player.id).modelId)) {
      return 1;
    }

    if (g_ModelViewData.get(player.id).vc2 === 0) {
      return 1;
    }

    g_ModelViewData.get(player.id).vc2 = 0;

    applyModelViewVehCol2(player);
    applyModelViewVehCol(player, true);
    return 1;
  }
  if (textDraw === g_ModelViewGTD.vc2Mod[MODELVIEW_MOD.A1]) {
    if (!isValidVehicleModel(g_ModelViewData.get(player.id).modelId)) {
      return 1;
    }

    if (g_ModelViewData.get(player.id).vc2 === MAX_VEHCOLOR_ID) {
      return 1;
    }

    g_ModelViewData.get(player.id).vc2 += MODELVIEW_VEHCOL_ADD_1;
    if (g_ModelViewData.get(player.id).vc2 > MAX_VEHCOLOR_ID) {
      g_ModelViewData.get(player.id).vc2 = MAX_VEHCOLOR_ID;
    }

    applyModelViewVehCol2(player);
    applyModelViewVehCol(player, true);
    return 1;
  }
  if (textDraw === g_ModelViewGTD.vc2Mod[MODELVIEW_MOD.A2]) {
    if (!isValidVehicleModel(g_ModelViewData.get(player.id).modelId)) {
      return 1;
    }

    if (g_ModelViewData.get(player.id).vc2 === MAX_VEHCOLOR_ID) {
      return 1;
    }

    g_ModelViewData.get(player.id).vc2 += MODELVIEW_VEHCOL_ADD_2;
    if (g_ModelViewData.get(player.id).vc2 > MAX_VEHCOLOR_ID) {
      g_ModelViewData.get(player.id).vc2 = MAX_VEHCOLOR_ID;
    }

    applyModelViewVehCol2(player);
    applyModelViewVehCol(player, true);
    return 1;
  }

  return next();
});

function onModelViewUpdate() {
  Player.getInstances().forEach((p) => {
    if (!p.isConnected()) {
      return;
    }

    if (!g_ModelViewData.get(p.id).toggle) {
      return;
    }

    const modelId = g_ModelViewData.get(p.id).modelId;
    if (modelId === INVALID_MODEL_ID) {
      return;
    }

    const speedRx = g_ModelViewData.get(p.id).rxs;
    const speedRy = g_ModelViewData.get(p.id).rys;
    const speedRz = g_ModelViewData.get(p.id).rzs;

    if (speedRx === 0 && speedRy === 0 && speedRz === 0) {
      return;
    }

    g_ModelViewData.get(p.id).rx = fixRot(
      g_ModelViewData.get(p.id).rx + speedRx
    );
    g_ModelViewData.get(p.id).ry = fixRot(
      g_ModelViewData.get(p.id).ry + speedRy
    );
    g_ModelViewData.get(p.id).rz = fixRot(
      g_ModelViewData.get(p.id).rz + speedRz
    );

    applyModelViewRot(p, true);

    if (speedRx !== 0.0) {
      applyModelViewRX(p);
    }

    if (speedRy !== 0.0) {
      applyModelViewRY(p);
    }

    if (speedRz !== 0.0) {
      applyModelViewRZ(p);
    }
  });
}

export function defaultModelViewData(player: Player) {
  g_ModelViewData.get(player.id).toggle = false;
  g_ModelViewData.get(player.id).modelId = INVALID_MODEL_ID;
  g_ModelViewData.get(player.id).rx = 0.0;
  g_ModelViewData.get(player.id).ry = 0.0;
  g_ModelViewData.get(player.id).rz = 0.0;
  g_ModelViewData.get(player.id).zm = 1.0;
  g_ModelViewData.get(player.id).rxs = 0.0;
  g_ModelViewData.get(player.id).rys = 0.0;
  g_ModelViewData.get(player.id).rzs = 0.0;
  g_ModelViewData.get(player.id).vc1 = 0;
  g_ModelViewData.get(player.id).vc2 = 0;
}

export function createGenericModelView() {
  g_ModelViewGTD.bg = new TextDraw({
    x: 236.0,
    y: 21.0,
    text: "_",
  })
    .create()
    .setLetterSize(0.0, 20.9)
    .useBox(true)
    .setBoxColors(100)
    .setTextSize(639.0, 0.0);

  g_ModelViewGTD.close = new TextDraw({
    x: 629.0,
    y: 21.0,
    text: "X",
  })
    .create()
    .setAlignment(2)
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.3, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true)
    .useBox(true)
    .setBoxColors(0xff000064)
    .setTextSize(10.0, 20.0)
    .setSelectable(true);

  g_ModelViewGTD.caption = new TextDraw({
    x: 240.0,
    y: 9.0,
    text: "Model View",
  })
    .create()
    .setBackgroundColors(255)
    .setFont(0)
    .setLetterSize(0.5, 2.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true);

  for (let mod = 0; mod < MODELVIEW_MOD.MAX; mod++) {
    let x = 0;
    let str = "";
    switch (mod) {
      case MODELVIEW_MOD.S2: {
        x = 319.0;
        str = "<<";
        break;
      }
      case MODELVIEW_MOD.S1: {
        x = 342.0;
        str = "<";
        break;
      }
      case MODELVIEW_MOD.R: {
        x = 365.0;
        str = "R";
        break;
      }
      case MODELVIEW_MOD.A1: {
        x = 388.0;
        str = ">";
        break;
      }
      case MODELVIEW_MOD.A2: {
        x = 411.0;
        str = ">>";
        break;
      }
      default: {
        continue;
      }
    }

    g_ModelViewGTD.rxMod[mod] = new TextDraw({
      x,
      y: 40.0,
      text: str,
    })
      .create()
      .setAlignment(2)
      .setBackgroundColors(255)
      .setFont(1)
      .setLetterSize(0.2, 1.0)
      .setColor(RGBA_WHITE)
      .setOutline(1)
      .setProportional(true)
      .setTextSize(10.0, 20.0)
      .setSelectable(true);

    g_ModelViewGTD.ryMod[mod] = new TextDraw({
      x,
      y: 60.0,
      text: str,
    })
      .create()
      .setAlignment(2)
      .setBackgroundColors(255)
      .setFont(1)
      .setLetterSize(0.2, 1.0)
      .setColor(RGBA_WHITE)
      .setOutline(1)
      .setProportional(true)
      .setTextSize(10.0, 20.0)
      .setSelectable(true);

    g_ModelViewGTD.rzMod[mod] = new TextDraw({
      x,
      y: 80.0,
      text: str,
    })
      .create()
      .setAlignment(2)
      .setBackgroundColors(255)
      .setFont(1)
      .setLetterSize(0.2, 1.0)
      .setColor(RGBA_WHITE)
      .setOutline(1)
      .setProportional(true)
      .setTextSize(10.0, 20.0)
      .setSelectable(true);

    g_ModelViewGTD.zmMod[mod] = new TextDraw({
      x,
      y: 100.0,
      text: str,
    })
      .create()
      .setAlignment(2)
      .setBackgroundColors(255)
      .setFont(1)
      .setLetterSize(0.2, 1.0)
      .setColor(RGBA_WHITE)
      .setOutline(1)
      .setProportional(true)
      .setTextSize(10.0, 20.0)
      .setSelectable(true);

    g_ModelViewGTD.rxsMod[mod] = new TextDraw({
      x,
      y: 120.0,
      text: str,
    })
      .create()
      .setAlignment(2)
      .setBackgroundColors(255)
      .setFont(1)
      .setLetterSize(0.2, 1.0)
      .setColor(RGBA_WHITE)
      .setOutline(1)
      .setProportional(true)
      .setTextSize(10.0, 20.0)
      .setSelectable(true);

    g_ModelViewGTD.rysMod[mod] = new TextDraw({
      x,
      y: 140.0,
      text: str,
    })
      .create()
      .setAlignment(2)
      .setBackgroundColors(255)
      .setFont(1)
      .setLetterSize(0.2, 1.0)
      .setColor(RGBA_WHITE)
      .setOutline(1)
      .setProportional(true)
      .setTextSize(10.0, 20.0)
      .setSelectable(true);

    g_ModelViewGTD.rzsMod[mod] = new TextDraw({
      x,
      y: 160.0,
      text: str,
    })
      .create()
      .setAlignment(2)
      .setBackgroundColors(255)
      .setFont(1)
      .setLetterSize(0.2, 1.0)
      .setColor(RGBA_WHITE)
      .setOutline(1)
      .setProportional(true)
      .setTextSize(10.0, 20.0)
      .setSelectable(true);

    g_ModelViewGTD.vc1Mod[mod] = new TextDraw({
      x,
      y: 180.0,
      text: str,
    })
      .create()
      .setAlignment(2)
      .setBackgroundColors(255)
      .setFont(1)
      .setLetterSize(0.2, 1.0)
      .setColor(RGBA_WHITE)
      .setOutline(1)
      .setProportional(true)
      .setTextSize(10.0, 20.0)
      .setSelectable(true);

    g_ModelViewGTD.vc2Mod[mod] = new TextDraw({
      x,
      y: 200.0,
      text: str,
    })
      .create()
      .setAlignment(2)
      .setBackgroundColors(255)
      .setFont(1)
      .setLetterSize(0.2, 1.0)
      .setColor(RGBA_WHITE)
      .setOutline(1)
      .setProportional(true)
      .setTextSize(10.0, 20.0)
      .setSelectable(true);
  }
}

export function destroyGenericModelView() {
  Object.entries(g_ModelViewGTD).forEach((item) => {
    const [key, gtd] = item as unknown as [
      keyof IModelViewGtd,
      (typeof g_ModelViewGTD)[keyof IModelViewGtd]
    ];
    if (Array.isArray(gtd)) {
      gtd.forEach((_gtd, index) => {
        if (_gtd && _gtd.isValid()) {
          _gtd.destroy();
        }
        gtd[index] = null;
      });
    } else {
      if (gtd && gtd.isValid()) {
        gtd.destroy();
      }
      g_ModelViewGTD[key] = null!;
    }
  });
}

export function createPlayerModelView(player: Player) {
  g_ModelViewPTD.get(player.id).model = new TextDraw({
    x: 424.0,
    y: 20.0,
    text: "model",
    player,
  })
    .create()
    .setBackgroundColors(0)
    .setFont(5)
    .setLetterSize(0.5, 1.0)
    .setColor(-1)
    .setOutline(0)
    .setProportional(true)
    .useBox(true)
    .setBoxColors(0)
    .setTextSize(190.0, 190.0);

  g_ModelViewPTD.get(player.id).rx = new TextDraw({
    x: 271.0,
    y: 40.0,
    text: "RX",
    player,
  })
    .create()
    .setAlignment(2)
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true)
    .setTextSize(10.0, 70.0);

  g_ModelViewPTD.get(player.id).ry = new TextDraw({
    x: 271.0,
    y: 60.0,
    text: "RY",
    player,
  })
    .create()
    .setAlignment(2)
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true)
    .setTextSize(10.0, 70.0);

  g_ModelViewPTD.get(player.id).rz = new TextDraw({
    x: 271.0,
    y: 80.0,
    text: "RZ",
    player,
  })
    .create()
    .setAlignment(2)
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true)
    .setTextSize(10.0, 70.0);

  g_ModelViewPTD.get(player.id).zm = new TextDraw({
    x: 271.0,
    y: 100.0,
    text: "Zoom",
    player,
  })
    .create()
    .setAlignment(2)
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true)
    .setTextSize(10.0, 70.0);

  g_ModelViewPTD.get(player.id).rxs = new TextDraw({
    x: 271.0,
    y: 120.0,
    text: "RX S",
    player,
  })
    .create()
    .setAlignment(2)
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true)
    .setTextSize(10.0, 70.0);

  g_ModelViewPTD.get(player.id).rys = new TextDraw({
    x: 271.0,
    y: 140.0,
    text: "RY S",
    player,
  })
    .create()
    .setAlignment(2)
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true)
    .setTextSize(10.0, 70.0);

  g_ModelViewPTD.get(player.id).rzs = new TextDraw({
    x: 271.0,
    y: 160.0,
    text: "RZ S",
    player,
  })
    .create()
    .setAlignment(2)
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true)
    .setTextSize(10.0, 70.0);

  g_ModelViewPTD.get(player.id).vc1 = new TextDraw({
    x: 271.0,
    y: 180.0,
    text: "VC1",
    player,
  })
    .create()
    .setAlignment(2)
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true)
    .setTextSize(10.0, 70.0);

  g_ModelViewPTD.get(player.id).vc2 = new TextDraw({
    x: 271.0,
    y: 200.0,
    text: "VC2",
    player,
  })
    .create()
    .setAlignment(2)
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true)
    .setTextSize(10.0, 70.0);
}

export function destroyPlayerModelView(player: Player) {
  Object.entries(g_ModelViewPTD.get(player.id)).forEach((item) => {
    const [key, ptd] = item as unknown as [
      keyof IModelViewPtd,
      IModelViewPtd[keyof IModelViewPtd]
    ];
    if (Array.isArray(ptd)) {
      for (let i = 0; i < ptd.length; i++) {
        if (ptd[i] && ptd[i]!.isValid()) {
          ptd[i]!.destroy();
        }
        ptd[i] = null;
      }
    } else {
      if (ptd && ptd.isValid()) {
        ptd.destroy();
      }
      g_ModelViewPTD.get(player.id)[key] = null!;
    }
  });
}

export function showModelView(player: Player) {
  if (g_ModelViewData.get(player.id).toggle) {
    return 0;
  }

  createPlayerModelView(player);

  Object.values(g_ModelViewGTD).forEach(
    (gtd: IModelViewGtd[keyof IModelViewGtd]) => {
      if (Array.isArray(gtd)) {
        gtd.forEach((_gtd) => {
          if (_gtd && _gtd.isValid()) {
            _gtd.show(player);
          }
        });
      } else {
        if (gtd && gtd.isValid()) {
          gtd.show(player);
        }
      }
    }
  );

  const viewModelId = g_ModelViewData.get(player.id).modelId;

  if (viewModelId !== INVALID_MODEL_ID) {
    applyModelViewModel(player, false);
    applyModelViewRot(player, true);
  }

  applyModelViewRX(player);
  g_ModelViewPTD.get(player.id).rx?.show();

  applyModelViewRY(player);
  g_ModelViewPTD.get(player.id).ry?.show();

  applyModelViewRZ(player);
  g_ModelViewPTD.get(player.id).rz?.show();

  applyModelViewZoom(player);
  g_ModelViewPTD.get(player.id).zm?.show();

  applyModelViewRXSpeed(player);
  g_ModelViewPTD.get(player.id).rxs?.show();

  applyModelViewRYSpeed(player);
  g_ModelViewPTD.get(player.id).rys?.show();

  applyModelViewRZSpeed(player);
  g_ModelViewPTD.get(player.id).rzs?.show();

  applyModelViewVehCol1(player);
  g_ModelViewPTD.get(player.id).vc1?.show();

  applyModelViewVehCol2(player);
  g_ModelViewPTD.get(player.id).vc2?.show();

  g_ModelViewData.get(player.id).toggle = true;

  return 1;
}

export function hideModelView(player: Player) {
  if (!g_ModelViewData.get(player.id).toggle) {
    return 0;
  }

  destroyPlayerModelView(player);

  Object.values(g_ModelViewGTD).forEach(
    (gtd: IModelViewGtd[keyof IModelViewGtd]) => {
      if (Array.isArray(gtd)) {
        gtd.forEach((_gtd) => {
          if (_gtd && _gtd.isValid()) {
            _gtd.hide(player);
          }
        });
      } else {
        if (gtd && gtd.isValid()) {
          gtd.hide(player);
        }
      }
    }
  );

  g_ModelViewData.get(player.id).toggle = false;

  return 1;
}

export function applyModelViewModel(player: Player, showTd: boolean) {
  g_ModelViewPTD
    .get(player.id)
    .model?.setPreviewModel(g_ModelViewData.get(player.id).modelId);

  if (isValidVehicleModel(g_ModelViewData.get(player.id).modelId)) {
    applyModelViewVehCol(player, false);
  }

  if (showTd) {
    g_ModelViewPTD.get(player.id).model?.show();
  }
}

export function applyModelViewRot(player: Player, showTd: boolean) {
  g_ModelViewPTD
    .get(player.id)
    .model?.setPreviewRot(
      g_ModelViewData.get(player.id).rx,
      g_ModelViewData.get(player.id).ry,
      g_ModelViewData.get(player.id).rz,
      g_ModelViewData.get(player.id).zm
    );

  if (showTd) {
    g_ModelViewPTD.get(player.id).model?.show();
  }
}

export function applyModelViewVehCol(player: Player, showTd: boolean) {
  g_ModelViewPTD
    .get(player.id)
    .model?.setPreviewVehColors(
      g_ModelViewData.get(player.id).vc1,
      g_ModelViewData.get(player.id).vc2
    );

  if (showTd) {
    g_ModelViewPTD.get(player.id).model?.show();
  }
}

export function applyModelViewRX(player: Player) {
  const g_TextDrawString = `RX: ${g_ModelViewData
    .get(player.id)
    .rx.toFixed(2)}`;
  g_ModelViewPTD.get(player.id).rx?.setString(g_TextDrawString);
}

export function applyModelViewRY(player: Player) {
  const g_TextDrawString = `RY: ${g_ModelViewData
    .get(player.id)
    .ry.toFixed(2)}`;
  g_ModelViewPTD.get(player.id).ry?.setString(g_TextDrawString);
}

export function applyModelViewRZ(player: Player) {
  const g_TextDrawString = `RZ: ${g_ModelViewData
    .get(player.id)
    .rz.toFixed(2)}`;
  g_ModelViewPTD.get(player.id).rz?.setString(g_TextDrawString);
}

export function applyModelViewZoom(player: Player) {
  const g_TextDrawString = `Zoom: ${g_ModelViewData
    .get(player.id)
    .zm.toFixed(2)}`;
  g_ModelViewPTD.get(player.id).zm?.setString(g_TextDrawString);
}

export function applyModelViewRXSpeed(player: Player) {
  const g_TextDrawString = `RX Speed: ${g_ModelViewData
    .get(player.id)
    .rxs.toFixed(2)}`;
  g_ModelViewPTD.get(player.id).rxs?.setString(g_TextDrawString);
}

export function applyModelViewRYSpeed(player: Player) {
  const g_TextDrawString = `RY Speed: ${g_ModelViewData
    .get(player.id)
    .rys.toFixed(2)}`;
  g_ModelViewPTD.get(player.id).rys?.setString(g_TextDrawString);
}

export function applyModelViewRZSpeed(player: Player) {
  const g_TextDrawString = `RZ Speed: ${g_ModelViewData
    .get(player.id)
    .rzs.toFixed(2)}`;
  g_ModelViewPTD.get(player.id).rzs?.setString(g_TextDrawString);
}

export function applyModelViewVehCol1(player: Player) {
  const g_TextDrawString = `Veh Col 1: ${g_ModelViewData.get(player.id).vc1}`;
  g_ModelViewPTD.get(player.id).vc1?.setString(g_TextDrawString);
}

export function applyModelViewVehCol2(player: Player) {
  const g_TextDrawString = `Veh Col 2: ${g_ModelViewData.get(player.id).vc1}`;
  g_ModelViewPTD.get(player.id).vc2?.setString(g_TextDrawString);
}
