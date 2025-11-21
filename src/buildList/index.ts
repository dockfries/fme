import {
  BUILDING_INC_MODE,
  findBuildings,
  g_BuildingData,
  INVALID_BUILDING_ID,
  removeBuildingIDForAll,
} from "@/building";
import { g_CamModeData } from "@/camMode";
import {
  INVALID_MODEL_ID,
  INVALID_ROW,
  RGBA_GREEN,
  RGBA_RED,
  RGBA_WHITE,
} from "@/constants";
import { DIALOG_ID } from "@/dialog";
import { ID_TYPE } from "@/idType";
import { getModelSphere, getModelName } from "@/model";
import {
  g_ModelViewData,
  applyModelViewModel,
  showModelView,
  hideModelView,
} from "@/modelView";
import { g_PlayerData, getPlayerEditBuilding } from "@/player";
import { hidePlayerTextDrawMode, TD_MODE } from "@/tdMode";
import { positionFromOffset, toRadians } from "@/utils/math";
import { SafetyMap } from "@/utils/safetyMap";
import {
  Dialog,
  DialogStylesEnum,
  GameMode,
  IDialogResCommon,
  InvalidEnum,
  ObjectMp,
  Player,
  PlayerEvent,
  TextDraw,
  TextDrawEvent,
} from "@infernus/core";

export interface IBuildListGtd {
  bg: TextDraw | null;
  close: TextDraw | null;
  pageF: TextDraw | null;
  pageP: TextDraw | null;
  pageN: TextDraw | null;
  pageL: TextDraw | null;
}

export interface IBuildListPtd {
  caption: TextDraw | null;
  page: TextDraw | null;
  incMode: TextDraw | null;
  buildIdCol: TextDraw | null;
  modelIdCol: TextDraw | null;
  modelNameCol: TextDraw | null;
  buildIdRow: (TextDraw | null)[];
  modelIdRow: (TextDraw | null)[];
  modelNameRow: (TextDraw | null)[];
}

export interface IBuildListData {
  page: number;
  incMode: number;
  rowId: number[];
  editRow: number;
  editViewed: boolean;
}

export const MAX_BUILDLIST_ROWS = 20;
export const MIN_BUILDLIST_PAGE = 0;
export const MAX_BUILDLIST_PAGE = 3;

export const g_BuildListData = new SafetyMap<number, IBuildListData>(() => {
  return {
    page: MIN_BUILDLIST_PAGE,
    incMode: 0,
    rowId: Array.from(
      { length: MAX_BUILDLIST_ROWS },
      () => INVALID_BUILDING_ID
    ),
    editRow: INVALID_ROW,
    editViewed: false,
  };
});

export const g_BuildListGTD: IBuildListGtd = {
  bg: null,
  close: null,
  pageF: null,
  pageP: null,
  pageN: null,
  pageL: null,
};

export const g_BuildListPTD = new SafetyMap<number, IBuildListPtd>(() => {
  return {
    caption: null,
    page: null,
    incMode: null,
    buildIdCol: null,
    modelIdCol: null,
    modelNameCol: null,
    buildIdRow: Array.from({ length: MAX_BUILDLIST_ROWS }, () => null),
    modelIdRow: Array.from({ length: MAX_BUILDLIST_ROWS }, () => null),
    modelNameRow: Array.from({ length: MAX_BUILDLIST_ROWS }, () => null),
  };
});

GameMode.onInit(({ next }) => {
  createGenericBuildList();
  Player.getInstances().forEach((p) => {
    if (p.isConnected()) {
      defaultBuildListData(p);
    }
  });
  return next();
});

GameMode.onExit(({ next }) => {
  destroyGenericBuildList();
  g_BuildListPTD.clear();
  g_BuildListData.clear();
  return next();
});

PlayerEvent.onConnect(({ player, next }) => {
  defaultBuildListData(player);
  return next();
});

function onDialogResponse(
  player: Player,
  res: IDialogResCommon,
  dialogId: number
) {
  const { inputText, response } = res;

  switch (dialogId) {
    case DIALOG_ID.BUILDLIST_PAGE: {
      if (!response) {
        return 1;
      }

      let page = +inputText;

      if (!inputText.trim().length || Number.isNaN(page)) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You did not enter a valid page number!"
        );
        showBuildListDialog(player, dialogId);
        return 1;
      }

      page--;

      if (page < MIN_BUILDLIST_PAGE || page > MAX_BUILDLIST_PAGE) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You did not enter a valid page number!"
        );
        showBuildListDialog(player, dialogId);
        return 1;
      }

      g_BuildListData.get(player.id).page = page;
      loadBuildListRowData(player);

      applyBuildListPage(player);
      for (let row = 0; row < MAX_BUILDLIST_ROWS; row++) {
        applyBuildListRowData(player, row);
      }
      return 1;
    }
    case DIALOG_ID.BUILDLIST_RECREATE: {
      if (!response) {
        return 1;
      }

      const buildingId = getPlayerEditBuilding(player);
      if (buildingId === INVALID_BUILDING_ID) {
        return 1;
      }

      g_BuildingData.get(buildingId).isRemoved = false;

      player.sendClientMessage(
        RGBA_GREEN,
        "Building recreated successfully. You need to reconnect in order to see recreated building(s)."
      );
      return 1;
    }
    case DIALOG_ID.BUILDLIST_REMOVE: {
      if (!response) {
        return 1;
      }

      const buildingId = getPlayerEditBuilding(player);
      if (buildingId === INVALID_BUILDING_ID) {
        return 1;
      }

      removeBuildingIDForAll(buildingId);

      g_BuildingData.get(buildingId).isRemoved = true;
      return 1;
    }
  }

  return 0;
}

TextDrawEvent.onPlayerClickGlobal(({ player, textDraw, next }) => {
  if (
    g_PlayerData.get(player.id).tdMode === TD_MODE.BUILDLIST &&
    (textDraw === g_BuildListGTD.close || textDraw === InvalidEnum.TEXT_DRAW)
  ) {
    if (g_PlayerData.get(player.id).posSaved) {
      if (g_CamModeData.get(player.id).toggle) {
        const pObj = ObjectMp.getInstance(
          g_CamModeData.get(player.id).poId,
          player
        );
        pObj?.setPos(
          g_PlayerData.get(player.id).posX,
          g_PlayerData.get(player.id).posY,
          g_PlayerData.get(player.id).posZ
        );
      } else {
        player.setPos(
          g_PlayerData.get(player.id).posX,
          g_PlayerData.get(player.id).posY,
          g_PlayerData.get(player.id).posZ
        );
      }
      g_PlayerData.get(player.id).posSaved = false;
    }

    g_BuildListData.get(player.id).editViewed = false;

    hidePlayerTextDrawMode(player);

    if (textDraw === g_BuildListGTD.close) {
      return 1;
    }
  }

  if (textDraw === g_BuildListGTD.pageF) {
    if (g_BuildListData.get(player.id).page === MIN_BUILDLIST_PAGE) {
      return 1;
    }

    g_BuildListData.get(player.id).page = MIN_BUILDLIST_PAGE;
    loadBuildListRowData(player);

    applyBuildListPage(player);
    for (let row = 0; row < MAX_BUILDLIST_ROWS; row++) {
      applyBuildListRowData(player, row);
    }
    return 1;
  }
  if (textDraw === g_BuildListGTD.pageP) {
    if (g_BuildListData.get(player.id).page === MIN_BUILDLIST_PAGE) {
      return 1;
    }

    if (--g_BuildListData.get(player.id).page < MIN_BUILDLIST_PAGE) {
      g_BuildListData.get(player.id).page = MIN_BUILDLIST_PAGE;
    }

    loadBuildListRowData(player);

    applyBuildListPage(player);
    for (let row = 0; row < MAX_BUILDLIST_ROWS; row++) {
      applyBuildListRowData(player, row);
    }
    return 1;
  }
  if (textDraw === g_BuildListGTD.pageN) {
    if (g_BuildListData.get(player.id).page === MAX_BUILDLIST_PAGE) {
      return 1;
    }

    if (++g_BuildListData.get(player.id).page > MAX_BUILDLIST_PAGE) {
      g_BuildListData.get(player.id).page = MAX_BUILDLIST_PAGE;
    }

    loadBuildListRowData(player);

    applyBuildListPage(player);
    for (let row = 0; row < MAX_BUILDLIST_ROWS; row++) {
      applyBuildListRowData(player, row);
    }
    return 1;
  }
  if (textDraw === g_BuildListGTD.pageL) {
    if (g_BuildListData.get(player.id).page === MAX_BUILDLIST_PAGE) {
      return 1;
    }

    g_BuildListData.get(player.id).page = MAX_BUILDLIST_PAGE;
    loadBuildListRowData(player);

    applyBuildListPage(player);
    for (let row = 0; row < MAX_BUILDLIST_ROWS; row++) {
      applyBuildListRowData(player, row);
    }
    return 1;
  }

  return next();
});

TextDrawEvent.onPlayerClickPlayer(({ player, textDraw, next }) => {
  if (textDraw === g_BuildListPTD.get(player.id).page) {
    showBuildListDialog(player, DIALOG_ID.BUILDLIST_PAGE);
    return 1;
  }
  if (textDraw === g_BuildListPTD.get(player.id).incMode) {
    switch (g_BuildListData.get(player.id).incMode) {
      case BUILDING_INC_MODE.ALL: {
        g_BuildListData.get(player.id).incMode = BUILDING_INC_MODE.REMOVED;
        break;
      }
      case BUILDING_INC_MODE.REMOVED: {
        g_BuildListData.get(player.id).incMode = BUILDING_INC_MODE.EXISTING;
        break;
      }
      default: {
        g_BuildListData.get(player.id).incMode = BUILDING_INC_MODE.ALL;
      }
    }

    g_BuildListData.get(player.id).page = MIN_BUILDLIST_PAGE;
    loadBuildListRowData(player);

    applyBuildListPage(player);
    applyBuildListIncludeMode(player);
    for (let row = 0; row < MAX_BUILDLIST_ROWS; row++) {
      applyBuildListRowData(player, row);
    }
    return 1;
  }
  for (let row = 0; row < MAX_BUILDLIST_ROWS; row++) {
    if (
      textDraw === g_BuildListPTD.get(player.id).buildIdRow[row] ||
      textDraw === g_BuildListPTD.get(player.id).modelIdRow[row] ||
      textDraw === g_BuildListPTD.get(player.id).modelNameRow[row]
    ) {
      const buildingId = g_BuildListData.get(player.id).rowId[row];

      if (buildingId === INVALID_BUILDING_ID) {
        return 1;
      }

      const prevRow = g_BuildListData.get(player.id).editRow;
      if (row !== prevRow) {
        g_PlayerData.get(player.id).editId = buildingId;
        g_PlayerData.get(player.id).editIdType = ID_TYPE.BUILDING;

        g_ModelViewData.get(player.id).modelId = g_BuildingData.get(
          player.id
        ).model;
        if (g_ModelViewData.get(player.id).modelId) {
          applyModelViewModel(player, true);
        } else {
          showModelView(player);
        }
      }

      const prevIsViewed = g_BuildListData.get(player.id).editViewed;
      if (row === prevRow && prevIsViewed) {
        showBuildListDialog(
          player,
          g_BuildingData.get(player.id).isRemoved
            ? DIALOG_ID.BUILDLIST_RECREATE
            : DIALOG_ID.BUILDLIST_REMOVE
        );
        return 1;
      }

      const buildModelId = g_BuildingData.get(player.id).model;
      const buildX = g_BuildingData.get(player.id).x;
      const buildY = g_BuildingData.get(player.id).y;
      const buildZ = g_BuildingData.get(player.id).z;
      const buildRx = g_BuildingData.get(player.id).rx;
      const buildRy = g_BuildingData.get(player.id).ry;
      const buildRz = g_BuildingData.get(player.id).rz;

      const {
        radius: sphereRadius,
        offX: sphereOffX,
        offY: sphereOffY,
        offZ: sphereOffZ,
      } = getModelSphere(buildModelId);

      let { x, y, z } = positionFromOffset(
        buildX,
        buildY,
        buildZ,
        buildRx,
        buildRy,
        buildRz,
        sphereOffX,
        sphereOffY,
        sphereOffZ
      );

      const distance = sphereRadius + 10.0;

      if (g_CamModeData.get(player.id).toggle) {
        const { x: vecX, y: vecY, z: vecZ } = player.getCameraFrontVector();

        x -= vecX * distance;
        y -= vecY * distance;
        z -= vecZ * distance;

        const pObj = ObjectMp.getInstance(
          g_CamModeData.get(player.id).poId,
          player
        );
        pObj?.setPos(x, y, z);
      } else {
        const { angle } = player.getFacingAngle();
        const a = toRadians(angle);

        x -= distance * Math.sin(-a);
        y -= distance * Math.cos(-a);

        player.setPos(x, y, z);
        player.setCameraBehind();
      }

      if (!prevIsViewed || row !== prevRow) {
        g_BuildListData.get(player.id).editViewed = true;
        g_BuildListData.get(player.id).editRow = row;

        applyBuildListRowColor(player, row);

        if (prevRow !== INVALID_ROW) {
          applyBuildListRowColor(player, prevRow);
        }
      }

      if (!g_PlayerData.get(player.id).posSaved) {
        const { x, y, z } = player.getPos();
        g_PlayerData.get(player.id).posX = x;
        g_PlayerData.get(player.id).posY = y;
        g_PlayerData.get(player.id).posZ = z;
        g_PlayerData.get(player.id).posSaved = true;
      }
      return 1;
    }
  }

  return next();
});

export function defaultBuildListData(player: Player) {
  g_BuildListData.get(player.id).page = MIN_BUILDLIST_PAGE;
  for (let r = 0; r < MAX_BUILDLIST_ROWS; r++) {
    g_BuildListData.get(player.id).rowId[r] = INVALID_BUILDING_ID;
  }
  g_BuildListData.get(player.id).editRow = INVALID_ROW;
  g_BuildListData.get(player.id).editViewed = false;
}

export function createGenericBuildList() {
  g_BuildListGTD.bg = new TextDraw({
    x: 116.0,
    y: 138.0,
    text: "_",
  })
    .create()
    .setAlignment(2)
    .setLetterSize(0.0, 34.3)
    .useBox(true)
    .setBoxColors(100)
    .setTextSize(0.0, 230.0);

  g_BuildListGTD.close = new TextDraw({
    x: 221.0,
    y: 138.0,
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

  g_BuildListGTD.pageF = new TextDraw({
    x: 11.0,
    y: 151.0,
    text: "<<",
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

  g_BuildListGTD.pageP = new TextDraw({
    x: 34.0,
    y: 151.0,
    text: "<",
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

  g_BuildListGTD.pageN = new TextDraw({
    x: 198.0,
    y: 151.0,
    text: ">",
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

  g_BuildListGTD.pageL = new TextDraw({
    x: 221.0,
    y: 151.0,
    text: ">>",
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

export function destroyGenericBuildList() {
  Object.entries(g_BuildListGTD).forEach((item) => {
    const [key, gtd] = item as unknown as [
      keyof IBuildListGtd,
      (typeof g_BuildListGTD)[keyof IBuildListGtd]
    ];
    if (gtd && gtd.isValid()) {
      gtd.destroy();
    }
    g_BuildListGTD[key] = null;
  });
}

export function createPlayerBuildList(player: Player) {
  g_BuildListPTD.get(player.id).caption = new TextDraw({
    x: 4.0,
    y: 127.0,
    text: "Buildings",
    player,
  })
    .create()
    .setBackgroundColors(255)
    .setFont(0)
    .setLetterSize(0.5, 2.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true);

  g_BuildListPTD.get(player.id).page = new TextDraw({
    x: 116.0,
    y: 151.0,
    text: "Page",
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
    .setTextSize(10.0, 138.0)
    .setSelectable(true);

  g_BuildListPTD.get(player.id).incMode = new TextDraw({
    x: 116.0,
    y: 164.0,
    text: "Including Buildings:",
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
    .setTextSize(10.0, 230.0)
    .setSelectable(true);

  g_BuildListPTD.get(player.id).buildIdCol = new TextDraw({
    x: 1.0,
    y: 177.0,
    text: "Building ID",
    player,
  })
    .create()
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true)
    .setTextSize(40.0, 10.0);

  g_BuildListPTD.get(player.id).modelIdCol = new TextDraw({
    x: 43.0,
    y: 177.0,
    text: "Model ID",
    player,
  })
    .create()
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true)
    .setTextSize(82.0, 10.0);

  g_BuildListPTD.get(player.id).modelNameCol = new TextDraw({
    x: 85.0,
    y: 177.0,
    text: "Model Name",
    player,
  })
    .create()
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true)
    .setTextSize(231.0, 10.0);

  for (let row = 0, y = 190.0; row < MAX_BUILDLIST_ROWS; row++, y += 13.0) {
    g_BuildListPTD.get(player.id).buildIdRow[row] = new TextDraw({
      x: 1.0,
      y,
      text: "Building ID",
      player,
    })
      .create()
      .setBackgroundColors(255)
      .setFont(1)
      .setLetterSize(0.2, 1.0)
      .setColor(RGBA_WHITE)
      .setOutline(1)
      .setProportional(true)
      .useBox(true)
      .setBoxColors(100)
      .setTextSize(40.0, 10.0)
      .setSelectable(true);

    g_BuildListPTD.get(player.id).modelIdRow[row] = new TextDraw({
      x: 43.0,
      y,
      text: "Model ID",
      player,
    })
      .create()
      .setBackgroundColors(255)
      .setFont(1)
      .setLetterSize(0.2, 1.0)
      .setColor(RGBA_WHITE)
      .setOutline(1)
      .setProportional(true)
      .useBox(true)
      .setBoxColors(100)
      .setTextSize(82.0, 10.0)
      .setSelectable(true);

    g_BuildListPTD.get(player.id).modelNameRow[row] = new TextDraw({
      x: 85.0,
      y,
      text: "Model Name",
      player,
    })
      .create()
      .setBackgroundColors(255)
      .setFont(1)
      .setLetterSize(0.2, 1.0)
      .setColor(RGBA_WHITE)
      .setOutline(1)
      .setProportional(true)
      .useBox(true)
      .setBoxColors(100)
      .setTextSize(231.0, 10.0)
      .setSelectable(true);
  }
}

export function destroyPlayerBuildList(player: Player) {
  Object.entries(g_BuildListPTD.get(player.id)).forEach((item) => {
    const [key, ptd] = item as unknown as [
      keyof IBuildListPtd,
      IBuildListPtd[keyof IBuildListPtd]
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
      g_BuildListPTD.get(player.id)[key] = null!;
    }
  });
}

export function showBuildList(player: Player) {
  createPlayerBuildList(player);

  Object.values(g_BuildListGTD).forEach(
    (gtd: IBuildListGtd[keyof IBuildListGtd]) => {
      if (gtd && gtd.isValid()) {
        gtd.show(player);
      }
    }
  );

  g_BuildListData.get(player.id).page = MIN_BUILDLIST_PAGE;
  loadBuildListRowData(player);

  g_BuildListPTD.get(player.id).buildIdCol?.show();
  g_BuildListPTD.get(player.id).modelIdCol?.show();
  g_BuildListPTD.get(player.id).modelNameCol?.show();
  g_BuildListPTD.get(player.id).caption?.show();

  applyBuildListPage(player);
  g_BuildListPTD.get(player.id).page?.show();

  applyBuildListIncludeMode(player);
  g_BuildListPTD.get(player.id).incMode?.show();

  for (let row = 0; row < MAX_BUILDLIST_ROWS; row++) {
    applyBuildListRowData(player, row);
  }

  const buildingId = getPlayerEditBuilding(player);
  g_ModelViewData.get(player.id).modelId =
    buildingId === INVALID_BUILDING_ID
      ? INVALID_MODEL_ID
      : g_BuildingData.get(buildingId).model;

  if (g_ModelViewData.get(player.id).modelId !== INVALID_MODEL_ID) {
    if (g_ModelViewData.get(player.id).toggle) {
      applyModelViewModel(player, true);
    } else {
      showModelView(player);
    }
  }
}

export function hideBuildList(player: Player) {
  hideModelView(player);

  Object.values(g_BuildListGTD).forEach(
    (gtd: IBuildListGtd[keyof IBuildListGtd]) => {
      if (gtd && gtd.isValid()) {
        gtd.hide(player);
      }
    }
  );

  destroyPlayerBuildList(player);
}

export function getBuildListNewEditRow(player: Player) {
  const editBuildingId = getPlayerEditBuilding(player);
  if (editBuildingId === INVALID_BUILDING_ID) {
    return INVALID_ROW;
  }

  for (let row = 0, rowBuildingId = 0; row < MAX_BUILDLIST_ROWS; row++) {
    rowBuildingId = g_BuildListData.get(player.id).rowId[row];
    if (editBuildingId === rowBuildingId) {
      return row;
    }
  }

  return INVALID_ROW;
}

export function applyBuildListIncludeMode(player: Player) {
  switch (g_BuildListData.get(player.id).incMode) {
    case BUILDING_INC_MODE.ALL: {
      g_BuildListPTD
        .get(player.id)
        .incMode?.setString("Including Buildings: All");
      break;
    }
    case BUILDING_INC_MODE.REMOVED: {
      g_BuildListPTD
        .get(player.id)
        .incMode?.setString("Including Buildings: Removed Only");
      break;
    }
    case BUILDING_INC_MODE.EXISTING: {
      g_BuildListPTD
        .get(player.id)
        .incMode?.setString("Including Buildings: Existing Only");
      break;
    }
    default: {
      g_BuildListPTD
        .get(player.id)
        .incMode?.setString("Including Buildings: Unknown Mode");
      return 0;
    }
  }
  return 1;
}

export function applyBuildListPage(player: Player) {
  const g_TextDrawString = `Page ${g_BuildListData.get(player.id).page + 1} / ${
    MAX_BUILDLIST_PAGE + 1
  }`;
  g_BuildListPTD.get(player.id).page?.setString(g_TextDrawString);
}

export function applyBuildListRowColor(player: Player, row: number) {
  let rgbaBoxColor = 0;

  if (row === g_BuildListData.get(player.id).editRow) {
    rgbaBoxColor = g_BuildListData.get(player.id).editViewed
      ? 0xffff0064
      : 0xffff0032;
  } else {
    rgbaBoxColor = 0x00000000;
  }

  g_BuildListPTD
    .get(player.id)
    .buildIdRow[row]?.setBoxColors(rgbaBoxColor)
    .show();
  g_BuildListPTD
    .get(player.id)
    .modelIdRow[row]?.setBoxColors(rgbaBoxColor)
    .show();
  g_BuildListPTD
    .get(player.id)
    .modelNameRow[row]?.setBoxColors(rgbaBoxColor)
    .show();
  return 1;
}

export function applyBuildListRowData(player: Player, row: number) {
  const buildingId = g_BuildListData.get(player.id).rowId[row];

  if (buildingId === INVALID_BUILDING_ID) {
    g_BuildListPTD.get(player.id).buildIdRow[row]?.hide();
    g_BuildListPTD.get(player.id).modelIdRow[row]?.hide();
    g_BuildListPTD.get(player.id).modelNameRow[row]?.hide();
    return 0;
  }

  const modelId = g_BuildingData.get(buildingId).model;
  const buildingIdStr = buildingId.toString();
  const modelIdStr = modelId.toString();
  const g_ModelString = getModelName(modelId).name;

  g_BuildListPTD.get(player.id).buildIdRow[row]?.setString(buildingIdStr);
  g_BuildListPTD.get(player.id).modelIdRow[row]?.setString(modelIdStr);
  g_BuildListPTD.get(player.id).modelNameRow[row]?.setString(g_ModelString);

  applyBuildListRowColor(player, row);
  return 1;
}

export function loadBuildListRowData(player: Player) {
  let rowsAdded = 0;

  const { x, y, z } = player.getPos();

  rowsAdded = findBuildings(
    g_BuildListData.get(player.id).rowId,
    MAX_BUILDLIST_ROWS,
    g_BuildListData.get(player.id).page * MAX_BUILDLIST_ROWS,
    g_BuildListData.get(player.id).incMode,
    x,
    y,
    z
  );

  for (let row = rowsAdded; row < MAX_BUILDLIST_ROWS; row++) {
    g_BuildListData.get(player.id).rowId[row] = INVALID_BUILDING_ID;
  }

  g_BuildListData.get(player.id).editRow = getBuildListNewEditRow(player);
  return 1;
}

export async function showBuildListDialog(player: Player, dialogId: number) {
  let g_DialogCaption = "";
  switch (dialogId) {
    case DIALOG_ID.BUILDLIST_PAGE: {
      g_DialogCaption = "Buildings: Page";
      const _page = g_BuildListData.get(player.id).page + 1;
      const g_DialogInfo = `Page: ${_page} / ${MAX_BUILDLIST_PAGE + 1}`;
      const res = await new Dialog({
        style: DialogStylesEnum.INPUT,
        caption: g_DialogCaption,
        info: g_DialogInfo,
        button1: "Enter",
        button2: "Cancel",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    case DIALOG_ID.BUILDLIST_REMOVE: {
      const buildingId = getPlayerEditBuilding(player);
      if (buildingId === INVALID_BUILDING_ID) {
        return 1;
      }

      const modelId = g_BuildingData.get(buildingId).model;
      const g_ModelString = getModelName(modelId).name;

      g_DialogCaption = "Buildings: Remove Building";
      const g_DialogInfo = [
        `Building ID:\t${buildingId}`,
        `Model ID:   \t${modelId}\n`,
        `Model Name: \t${g_ModelString}`,
      ].join("\n");
      const res = await new Dialog({
        style: DialogStylesEnum.MSGBOX,
        caption: g_DialogCaption,
        info: g_DialogInfo,
        button1: "Remove",
        button2: "Cancel",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    case DIALOG_ID.BUILDLIST_RECREATE: {
      const buildingId = getPlayerEditBuilding(player);
      if (buildingId === INVALID_BUILDING_ID) {
        return 1;
      }

      const modelId = g_BuildingData.get(buildingId).model;
      const g_ModelString = getModelName(modelId).name;

      g_DialogCaption = "Buildings: Recreate Building";
      const g_DialogInfo = [
        `Building ID:\t${buildingId}`,
        `Model ID:   \t${modelId}`,
        `Model Name: \t${g_ModelString}`,
      ].join("\n");

      const res = await new Dialog({
        style: DialogStylesEnum.MSGBOX,
        caption: g_DialogCaption,
        info: g_DialogInfo,
        button1: "Recreate",
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
