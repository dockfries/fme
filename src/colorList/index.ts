import {
  INVALID_COLOR_ID,
  INVALID_ROW,
  RGBA_RED,
  RGBA_WHITE,
} from "@/constants";
import { DIALOG_ID } from "@/dialog";
import { MATERIAL_INDEX_TYPE } from "@/matIndexType";
import {
  findModelColors,
  getModelColorName,
  getModelColorRGB,
} from "@/modelColor";
import {
  applyObjectMaterialIndexData,
  defaultObjectMaterialIndexData,
  g_ObjectData,
  MAX_MATERIALINDEX_MODCOUNT,
  recreateObject,
  showObjectDialog,
} from "@/object";
import {
  applyPlayerAttachData,
  g_PlayerAttachData,
  INVALID_PLAYERATTACH_INDEX,
  showAttachedDialog,
} from "@/pAttach";
import {
  g_PlayerData,
  getPlayerEditAttached,
  getPlayerEditObject,
  getPlayerEditVehicle,
} from "@/player";
import { hidePlayerTextDrawMode, TD_MODE } from "@/tdMode";
import { aRGBtoRGB, rgbToARGB, rgbToRGBA } from "@/utils/color";
import { SafetyMap } from "@/utils/safetyMap";
import {
  findVehicleColors,
  getVehicleColorRGB,
  getVehicleColorName,
} from "@/vehColor";
import { g_VehicleData, showVehicleDialog } from "@/vehicle";
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
  Vehicle,
} from "@infernus/core";

export const MAX_COLORLIST_ROWS = 20;
export const MIN_COLORLIST_PAGE = 0;

export interface IColorListGtd {
  bg: TextDraw | null;
  close: TextDraw | null;
  pageF: TextDraw | null;
  pageP: TextDraw | null;
  pageN: TextDraw | null;
  pageL: TextDraw | null;
}

export interface IColorListPtd {
  caption: TextDraw | null;
  page: TextDraw | null;
  search: TextDraw | null;
  col1: TextDraw | null;
  col2: TextDraw | null;
  row1: (TextDraw | null)[];
  row2: (TextDraw | null)[];
  colorApplied: TextDraw | null;
}

export interface IColorListData {
  page: number;
  maxPage: number;
  search: string;
  appliedRow: number;
  rowId: number[];
}

export const g_VehColorListData = new SafetyMap<number, IColorListData>(() => {
  return {
    page: 0,
    maxPage: 0,
    search: "",
    appliedRow: 0,
    rowId: Array.from({ length: MAX_COLORLIST_ROWS }, () => INVALID_ROW),
  };
});

export const g_ModelColorListData = new SafetyMap<number, IColorListData>(
  () => {
    return {
      page: 0,
      maxPage: 0,
      search: "",
      appliedRow: 0,
      rowId: Array.from({ length: MAX_COLORLIST_ROWS }, () => INVALID_ROW),
    };
  }
);

export const g_ColorListGTD: IColorListGtd = {
  bg: null,
  close: null,
  pageF: null,
  pageP: null,
  pageN: null,
  pageL: null,
};

export const g_ColorListPTD = new SafetyMap<number, IColorListPtd>(() => {
  return {
    caption: null,
    page: null,
    search: null,
    col1: null,
    col2: null,
    row1: Array.from({ length: MAX_COLORLIST_ROWS }, () => null),
    row2: Array.from({ length: MAX_COLORLIST_ROWS }, () => null),
    colorApplied: null,
  };
});

GameMode.onInit(({ next }) => {
  createGenericColorList();
  Player.getInstances().forEach((p) => {
    if (p.isConnected()) {
      defaultColorListData(p);
    }
  });
  return next();
});

GameMode.onExit(({ next }) => {
  destroyGenericColorList();
  g_VehColorListData.clear();
  g_ModelColorListData.clear();
  g_ColorListPTD.clear();
  return next();
});

PlayerEvent.onConnect(({ player, next }) => {
  defaultColorListData(player);
  return next();
});

TextDrawEvent.onPlayerClickGlobal(({ player, textDraw, next }) => {
  if (textDraw === InvalidEnum.TEXT_DRAW) {
    switch (g_PlayerData.get(player.id).tdMode) {
      case TD_MODE.COLORLIST_TEXTURE:
      case TD_MODE.COLORLIST_FONTFACE:
      case TD_MODE.COLORLIST_FONTBACK:
      case TD_MODE.COLORLIST_ATTACH_1:
      case TD_MODE.COLORLIST_ATTACH_2:
      case TD_MODE.COLORLIST_VEHICLE_1:
      case TD_MODE.COLORLIST_VEHICLE_2: {
        hidePlayerTextDrawMode(player);
        break;
      }
    }
  }

  if (textDraw === g_ColorListGTD.close) {
    switch (g_PlayerData.get(player.id).tdMode) {
      case TD_MODE.COLORLIST_TEXTURE:
      case TD_MODE.COLORLIST_FONTFACE:
      case TD_MODE.COLORLIST_FONTBACK: {
        showObjectDialog(player, DIALOG_ID.OBJECT_INDEX);
        break;
      }
      case TD_MODE.COLORLIST_ATTACH_1:
      case TD_MODE.COLORLIST_ATTACH_2: {
        showAttachedDialog(player, DIALOG_ID.ATTACH_MAIN);
        break;
      }
      case TD_MODE.COLORLIST_VEHICLE_1:
      case TD_MODE.COLORLIST_VEHICLE_2: {
        showVehicleDialog(player, DIALOG_ID.VEHICLE_MAIN);
        break;
      }
    }
    hidePlayerTextDrawMode(player);
    return 1;
  }

  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.COLORLIST_TEXTURE:
    case TD_MODE.COLORLIST_FONTFACE:
    case TD_MODE.COLORLIST_FONTBACK:
    case TD_MODE.COLORLIST_ATTACH_1:
    case TD_MODE.COLORLIST_ATTACH_2:
    case TD_MODE.COLORLIST_VEHICLE_1:
    case TD_MODE.COLORLIST_VEHICLE_2: {
      if (textDraw === InvalidEnum.TEXT_DRAW) {
        hidePlayerTextDrawMode(player);
      } else if (textDraw === g_ColorListGTD.close) {
        switch (g_PlayerData.get(player.id).tdMode) {
          case TD_MODE.COLORLIST_TEXTURE:
          case TD_MODE.COLORLIST_FONTFACE:
          case TD_MODE.COLORLIST_FONTBACK: {
            showObjectDialog(player, DIALOG_ID.OBJECT_INDEX);
            break;
          }
          case TD_MODE.COLORLIST_ATTACH_1:
          case TD_MODE.COLORLIST_ATTACH_2: {
            showAttachedDialog(player, DIALOG_ID.ATTACH_MAIN);
            break;
          }
          case TD_MODE.COLORLIST_VEHICLE_1:
          case TD_MODE.COLORLIST_VEHICLE_2: {
            showVehicleDialog(player, DIALOG_ID.VEHICLE_MAIN);
            break;
          }
        }
        hidePlayerTextDrawMode(player);
        return 1;
      }
      break;
    }
  }

  if (textDraw === g_ColorListGTD.pageF) {
    if (getColorListPage(player) === MIN_COLORLIST_PAGE) {
      return 1;
    }

    setColorListPage(player, MIN_COLORLIST_PAGE);
    loadColorListRowData(player);

    applyColorListPage(player);
    applyColorListRowData(player);
    return 1;
  }
  if (textDraw === g_ColorListGTD.pageP) {
    let page = getColorListPage(player);
    if (page === MIN_COLORLIST_PAGE) {
      return 1;
    }

    if (--page < MIN_COLORLIST_PAGE) {
      page = MIN_COLORLIST_PAGE;
    }

    setColorListPage(player, page);
    loadColorListRowData(player);

    applyColorListPage(player);
    applyColorListRowData(player);
    return 1;
  }
  if (textDraw === g_ColorListGTD.pageN) {
    let page = getColorListPage(player);
    const maxPage = getColorListMaxPage(player);

    if (page === maxPage) {
      return 1;
    }

    if (++page > maxPage) {
      page = maxPage;
    }

    setColorListPage(player, page);
    loadColorListRowData(player);

    applyColorListPage(player);
    applyColorListRowData(player);
    return 1;
  }
  if (textDraw === g_ColorListGTD.pageL) {
    const maxPage = getColorListMaxPage(player);

    if (getColorListPage(player) === maxPage) {
      return 1;
    }

    setColorListPage(player, maxPage);
    loadColorListRowData(player);

    applyColorListPage(player);
    applyColorListRowData(player);
    return 1;
  }

  return next();
});

TextDrawEvent.onPlayerClickPlayer(({ player, textDraw, next }) => {
  if (textDraw === g_ColorListPTD.get(player.id).page) {
    showColorListDialog(player, DIALOG_ID.COLORLIST_PAGE);
    return 1;
  }
  if (textDraw === g_ColorListPTD.get(player.id).search) {
    showColorListDialog(player, DIALOG_ID.COLORLIST_SEARCH);
    return 1;
  }
  for (let row = 0; row < MAX_COLORLIST_ROWS; row++) {
    if (
      textDraw === g_ColorListPTD.get(player.id).row1[row] ||
      textDraw === g_ColorListPTD.get(player.id).row2[row]
    ) {
      const rowColorId = getColorListRowColorID(player, row);

      if (rowColorId === INVALID_COLOR_ID) {
        return 1;
      }

      switch (g_PlayerData.get(player.id).tdMode) {
        case TD_MODE.COLORLIST_TEXTURE: {
          const objectId = getPlayerEditObject(player);
          if (!ObjectMp.isValid(objectId)) {
            return 1;
          }

          const materialIndex = g_PlayerData.get(player.id).editObjMatIdx;
          const colorRgb = getModelColorRGB(rowColorId);
          const colorArgb = rgbToARGB(colorRgb, 0xff);

          if (
            g_ObjectData.get(objectId - 1).matIndexType[materialIndex] !==
            MATERIAL_INDEX_TYPE.TEXTURE
          ) {
            g_ObjectData.get(objectId - 1).matIndexType[materialIndex] =
              MATERIAL_INDEX_TYPE.TEXTURE;
            defaultObjectMaterialIndexData(objectId, materialIndex);
          }

          g_ObjectData.get(objectId - 1).matIndexColor[materialIndex] =
            colorArgb;

          if (
            g_ObjectData.get(objectId - 1).matIndexModCount >=
            MAX_MATERIALINDEX_MODCOUNT
          ) {
            const newObjectId = recreateObject(objectId);
            if (newObjectId === InvalidEnum.OBJECT_ID) {
              player.sendClientMessage(
                RGBA_RED,
                "ERROR: This object could not be colored / re-created!"
              );
            }
          } else {
            applyObjectMaterialIndexData(objectId, materialIndex);
          }
          break;
        }
        case TD_MODE.COLORLIST_FONTFACE: {
          const objectId = getPlayerEditObject(player);
          if (!ObjectMp.isValid(objectId)) {
            return 1;
          }

          const materialIndex = g_PlayerData.get(player.id).editObjMatIdx;
          const colorRgb = getModelColorRGB(rowColorId);
          const colorArgb = rgbToARGB(colorRgb, 0xff);

          if (
            g_ObjectData.get(objectId - 1).matIndexType[materialIndex] !==
            MATERIAL_INDEX_TYPE.TEXT
          ) {
            g_ObjectData.get(objectId - 1).matIndexType[materialIndex] =
              MATERIAL_INDEX_TYPE.TEXT;
            defaultObjectMaterialIndexData(objectId, materialIndex);
          }

          g_ObjectData.get(objectId - 1).matIndexFontColor[materialIndex] =
            colorArgb;

          if (
            g_ObjectData.get(objectId - 1).matIndexModCount >=
            MAX_MATERIALINDEX_MODCOUNT
          ) {
            const newObjectId = recreateObject(objectId);
            if (newObjectId === InvalidEnum.OBJECT_ID) {
              player.sendClientMessage(
                RGBA_RED,
                "ERROR: This object could not be colored / re-created!"
              );
            }
          } else {
            applyObjectMaterialIndexData(objectId, materialIndex);
          }
          break;
        }
        case TD_MODE.COLORLIST_FONTBACK: {
          const objectId = getPlayerEditObject(player);
          if (!ObjectMp.isValid(objectId)) {
            return 1;
          }

          const materialIndex = g_PlayerData.get(player.id).editObjMatIdx;
          const colorRgb = getModelColorRGB(rowColorId);
          const colorArgb = rgbToARGB(colorRgb, 0xff);

          if (
            g_ObjectData.get(objectId - 1).matIndexType[materialIndex] !==
            MATERIAL_INDEX_TYPE.TEXT
          ) {
            g_ObjectData.get(objectId - 1).matIndexType[materialIndex] =
              MATERIAL_INDEX_TYPE.TEXT;
            defaultObjectMaterialIndexData(objectId, materialIndex);
          }

          g_ObjectData.get(objectId - 1).matIndexColor[materialIndex] =
            colorArgb;

          if (
            g_ObjectData.get(objectId - 1).matIndexModCount >=
            MAX_MATERIALINDEX_MODCOUNT
          ) {
            const newObjectId = recreateObject(objectId);
            if (newObjectId === InvalidEnum.OBJECT_ID) {
              player.sendClientMessage(
                RGBA_RED,
                "ERROR: This object could not be colored / re-created!"
              );
            }
          } else {
            applyObjectMaterialIndexData(objectId, materialIndex);
          }
          break;
        }
        case TD_MODE.COLORLIST_ATTACH_1: {
          const attachIndex = getPlayerEditAttached(player);
          if (
            attachIndex === INVALID_PLAYERATTACH_INDEX ||
            !g_PlayerAttachData.get(player.id)[attachIndex].toggle
          ) {
            return 1;
          }

          const colorRgb = getModelColorRGB(rowColorId);
          const colorArgb = rgbToARGB(colorRgb, 0xff);

          g_PlayerAttachData.get(player.id)[attachIndex].color1 = colorArgb;
          applyPlayerAttachData(player, attachIndex);
          break;
        }
        case TD_MODE.COLORLIST_ATTACH_2: {
          const attachIndex = getPlayerEditAttached(player);
          if (
            attachIndex === INVALID_PLAYERATTACH_INDEX ||
            !g_PlayerAttachData.get(player.id)[attachIndex].toggle
          ) {
            return 1;
          }

          const colorRgb = getModelColorRGB(rowColorId);
          const colorArgb = rgbToARGB(colorRgb, 0xff);

          g_PlayerAttachData.get(player.id)[attachIndex].color2 = colorArgb;
          applyPlayerAttachData(player, attachIndex);
          break;
        }
        case TD_MODE.COLORLIST_VEHICLE_1: {
          const vehicleId = getPlayerEditVehicle(player);
          if (!Vehicle.isValid(vehicleId)) {
            return 1;
          }
          g_VehicleData.get(vehicleId - 1).color1 = rowColorId;

          const veh = Vehicle.getInstance(vehicleId);

          veh?.changeColors(
            g_VehicleData.get(vehicleId - 1).color1,
            g_VehicleData.get(vehicleId - 1).color2
          );
          break;
        }
        case TD_MODE.COLORLIST_VEHICLE_2: {
          const vehicleId = getPlayerEditVehicle(player);
          if (!Vehicle.isValid(vehicleId)) {
            return 1;
          }
          g_VehicleData.get(vehicleId - 1).color2 = rowColorId;

          const veh = Vehicle.getInstance(vehicleId);
          veh?.changeColors(
            g_VehicleData.get(vehicleId - 1).color1,
            g_VehicleData.get(vehicleId - 1).color2
          );
          break;
        }
      }

      if (row !== getColorListAppliedRow(player)) {
        setColorListAppliedRow(player, row);
        applyColorListAppliedRow(player);
      }
      return 1;
    }
  }

  return next();
});

function onDialogResponse(
  player: Player,
  res: IDialogResCommon,
  dialogId: number
) {
  const { inputText, response } = res;

  switch (dialogId) {
    case DIALOG_ID.COLORLIST_PAGE: {
      if (!response) {
        return 1;
      }

      let page = +inputText;

      if (!inputText.trim().length || Number.isNaN(page)) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You did not enter a valid page number!"
        );
        showColorListDialog(player, dialogId);
        return 1;
      }

      page--;

      if (page < MIN_COLORLIST_PAGE || page > getColorListMaxPage(player)) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You did not enter a valid page number!"
        );
        showColorListDialog(player, dialogId);
        return 1;
      }

      setColorListPage(player, page);
      loadColorListRowData(player);

      applyColorListPage(player);
      applyColorListRowData(player);
      return 1;
    }
    case DIALOG_ID.COLORLIST_SEARCH: {
      if (!response) {
        return 1;
      }

      setColorListPage(player, MIN_COLORLIST_PAGE);
      setColorListSearch(player, inputText);
      loadColorListRowData(player);

      applyColorListPage(player);
      applyColorListSearch(player);
      applyColorListRowData(player);
      return 1;
    }
  }
  return 0;
}

export function defaultColorListData(player: Player) {
  g_VehColorListData.get(player.id).page = MIN_COLORLIST_PAGE;
  g_ModelColorListData.get(player.id).page = MIN_COLORLIST_PAGE;

  g_VehColorListData.get(player.id).maxPage = MIN_COLORLIST_PAGE;
  g_ModelColorListData.get(player.id).maxPage = MIN_COLORLIST_PAGE;

  g_VehColorListData.get(player.id).search = "";
  g_ModelColorListData.get(player.id).search = "";

  g_VehColorListData.get(player.id).appliedRow = INVALID_ROW;
  g_ModelColorListData.get(player.id).appliedRow = INVALID_ROW;

  for (let row = 0; row < MAX_COLORLIST_ROWS; row++) {
    g_VehColorListData.get(player.id).rowId[row] = INVALID_COLOR_ID;
    g_ModelColorListData.get(player.id).rowId[row] = INVALID_COLOR_ID;
  }
}

export function createGenericColorList() {
  g_ColorListGTD.bg = new TextDraw({
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

  g_ColorListGTD.close = new TextDraw({
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

  g_ColorListGTD.pageF = new TextDraw({
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

  g_ColorListGTD.pageP = new TextDraw({
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

  g_ColorListGTD.pageN = new TextDraw({
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

  g_ColorListGTD.pageL = new TextDraw({
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

export function destroyGenericColorList() {
  Object.entries(g_ColorListGTD).forEach((item) => {
    const [key, gtd] = item as unknown as [
      keyof IColorListGtd,
      (typeof g_ColorListGTD)[keyof IColorListGtd]
    ];
    if (gtd && gtd.isValid()) {
      gtd.destroy();
    }
    g_ColorListGTD[key] = null;
  });
}

export function createPlayerColorList(player: Player) {
  g_ColorListPTD.get(player.id).colorApplied = null;

  g_ColorListPTD.get(player.id).caption = new TextDraw({
    x: 2.0,
    y: 127.0,
    text: "Caption",
    player,
  })
    .create()
    .setBackgroundColors(255)
    .setFont(0)
    .setLetterSize(0.5, 2.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true);

  g_ColorListPTD.get(player.id).page = new TextDraw({
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

  g_ColorListPTD.get(player.id).search = new TextDraw({
    x: 116.0,
    y: 164.0,
    text: "Search",
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

  g_ColorListPTD.get(player.id).col1 = new TextDraw({
    x: 1.0,
    y: 177.0,
    text: "COL 1",
    player,
  })
    .create()
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true)
    .setTextSize(50.0, 10.0);

  g_ColorListPTD.get(player.id).col2 = new TextDraw({
    x: 53.0,
    y: 177.0,
    text: "COL 2",
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

  for (let row = 0, y = 190.0; row < MAX_COLORLIST_ROWS; row++, y += 13.0) {
    g_ColorListPTD.get(player.id).row1[row] = new TextDraw({
      x: 1.0,
      y: y,
      text: "ROW 1",
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
      .setTextSize(50.0, 10.0)
      .setSelectable(true);

    g_ColorListPTD.get(player.id).row2[row] = new TextDraw({
      x: 53.0,
      y: y,
      text: "ROW 2",
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

export function destroyPlayerColorList(player: Player) {
  Object.entries(g_ColorListPTD.get(player.id)).forEach((item) => {
    const [key, ptd] = item as unknown as [
      keyof IColorListPtd,
      IColorListPtd[keyof IColorListPtd]
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
      g_ColorListPTD.get(player.id)[key] = null!;
    }
  });
}

export function showColorList(player: Player) {
  createPlayerColorList(player);

  Object.values(g_ColorListGTD).forEach(
    (gtd: IColorListGtd[keyof IColorListGtd]) => {
      if (gtd && gtd.isValid()) {
        gtd.show(player);
      }
    }
  );

  loadColorListRowData(player);

  applyColorListCaption(player);
  g_ColorListPTD.get(player.id).caption?.show();

  applyColorListPage(player);
  g_ColorListPTD.get(player.id).page?.show();

  applyColorListSearch(player);
  g_ColorListPTD.get(player.id).search?.show();

  applyColorListColumns(player);
  g_ColorListPTD.get(player.id).col1?.show();
  g_ColorListPTD.get(player.id).col2?.show();

  applyColorListRowData(player);
}

export function hideColorList(player: Player) {
  destroyPlayerColorList(player);

  Object.values(g_ColorListGTD).forEach(
    (gtd: IColorListGtd[keyof IColorListGtd]) => {
      if (gtd && gtd.isValid()) {
        gtd.hide(player);
      }
    }
  );
}

export function getColorListPage(player: Player) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.COLORLIST_TEXTURE:
    case TD_MODE.COLORLIST_FONTFACE:
    case TD_MODE.COLORLIST_FONTBACK:
    case TD_MODE.COLORLIST_ATTACH_1:
    case TD_MODE.COLORLIST_ATTACH_2: {
      return g_ModelColorListData.get(player.id).page;
    }
    case TD_MODE.COLORLIST_VEHICLE_1:
    case TD_MODE.COLORLIST_VEHICLE_2: {
      return g_VehColorListData.get(player.id).page;
    }
  }
  return 0;
}

export function setColorListPage(player: Player, page: number) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.COLORLIST_TEXTURE:
    case TD_MODE.COLORLIST_FONTFACE:
    case TD_MODE.COLORLIST_FONTBACK:
    case TD_MODE.COLORLIST_ATTACH_1:
    case TD_MODE.COLORLIST_ATTACH_2: {
      g_ModelColorListData.get(player.id).page = page;
      break;
    }
    case TD_MODE.COLORLIST_VEHICLE_1:
    case TD_MODE.COLORLIST_VEHICLE_2: {
      g_VehColorListData.get(player.id).page = page;
      break;
    }
    default: {
      return 0;
    }
  }
  return 1;
}

export function getColorListMaxPage(player: Player) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.COLORLIST_TEXTURE:
    case TD_MODE.COLORLIST_FONTFACE:
    case TD_MODE.COLORLIST_FONTBACK:
    case TD_MODE.COLORLIST_ATTACH_1:
    case TD_MODE.COLORLIST_ATTACH_2: {
      return g_ModelColorListData.get(player.id).maxPage;
    }
    case TD_MODE.COLORLIST_VEHICLE_1:
    case TD_MODE.COLORLIST_VEHICLE_2: {
      return g_VehColorListData.get(player.id).maxPage;
    }
  }
  return 0;
}

export function getColorListSearch(player: Player) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.COLORLIST_TEXTURE:
    case TD_MODE.COLORLIST_FONTFACE:
    case TD_MODE.COLORLIST_FONTBACK:
    case TD_MODE.COLORLIST_ATTACH_1:
    case TD_MODE.COLORLIST_ATTACH_2: {
      return g_ModelColorListData.get(player.id).search;
    }
    case TD_MODE.COLORLIST_VEHICLE_1:
    case TD_MODE.COLORLIST_VEHICLE_2: {
      return g_VehColorListData.get(player.id).search;
    }
    default: {
      return "";
    }
  }
}

export function setColorListSearch(player: Player, search: string) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.COLORLIST_TEXTURE:
    case TD_MODE.COLORLIST_FONTFACE:
    case TD_MODE.COLORLIST_FONTBACK:
    case TD_MODE.COLORLIST_ATTACH_1:
    case TD_MODE.COLORLIST_ATTACH_2: {
      g_ModelColorListData.get(player.id).search = search;
      break;
    }
    case TD_MODE.COLORLIST_VEHICLE_1:
    case TD_MODE.COLORLIST_VEHICLE_2: {
      g_VehColorListData.get(player.id).search = search;
      break;
    }
    default: {
      return 0;
    }
  }
  return 1;
}

export function getColorListNewAppliedRow(player: Player) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.COLORLIST_TEXTURE: {
      const objectId = getPlayerEditObject(player);

      if (!ObjectMp.isValid(objectId)) {
        return INVALID_ROW;
      }

      const materialIndex = g_PlayerData.get(player.id).editObjMatIdx;
      if (
        g_ObjectData.get(objectId - 1).matIndexType[materialIndex] !==
        MATERIAL_INDEX_TYPE.TEXTURE
      ) {
        return INVALID_ROW;
      }

      const objColorArgb = g_ObjectData.get(objectId - 1).matIndexColor[
        materialIndex
      ];
      const objColorRgb = aRGBtoRGB(objColorArgb);

      for (let row = 0; row < MAX_COLORLIST_ROWS; row++) {
        const rowColorId = g_ModelColorListData.get(player.id).rowId[row];

        if (rowColorId === INVALID_COLOR_ID) {
          continue;
        }

        if (objColorRgb === getModelColorRGB(rowColorId)) {
          return row;
        }
      }
      break;
    }
    case TD_MODE.COLORLIST_FONTFACE: {
      const objectId = getPlayerEditObject(player);

      if (!ObjectMp.isValid(objectId)) {
        return INVALID_ROW;
      }

      const materialIndex = g_PlayerData.get(player.id).editObjMatIdx;
      if (
        g_ObjectData.get(objectId - 1).matIndexType[materialIndex] !==
        MATERIAL_INDEX_TYPE.TEXT
      ) {
        return INVALID_ROW;
      }

      const objColorArgb = g_ObjectData.get(objectId - 1).matIndexFontColor[
        materialIndex
      ];
      const objColorRgb = aRGBtoRGB(objColorArgb);

      for (let row = 0; row < MAX_COLORLIST_ROWS; row++) {
        const rowColorId = g_ModelColorListData.get(player.id).rowId[row];

        if (rowColorId === INVALID_COLOR_ID) {
          continue;
        }

        if (objColorRgb === getModelColorRGB(rowColorId)) {
          return row;
        }
      }
      break;
    }
    case TD_MODE.COLORLIST_FONTBACK: {
      const objectId = getPlayerEditObject(player);

      if (!ObjectMp.isValid(objectId)) {
        return INVALID_ROW;
      }

      const materialIndex = g_PlayerData.get(player.id).editObjMatIdx;
      if (
        g_ObjectData.get(objectId - 1).matIndexType[materialIndex] !==
        MATERIAL_INDEX_TYPE.TEXT
      ) {
        return INVALID_ROW;
      }

      const objColorArgb = g_ObjectData.get(objectId - 1).matIndexColor[
        materialIndex
      ];
      const objColorRgb = aRGBtoRGB(objColorArgb);

      for (let row = 0; row < MAX_COLORLIST_ROWS; row++) {
        const rowColorId = g_ModelColorListData.get(player.id).rowId[row];

        if (rowColorId === INVALID_COLOR_ID) {
          continue;
        }

        if (objColorRgb === getModelColorRGB(rowColorId)) {
          return row;
        }
      }
      break;
    }
    case TD_MODE.COLORLIST_ATTACH_1: {
      const attachIndex = getPlayerEditAttached(player);
      if (
        attachIndex === INVALID_PLAYERATTACH_INDEX ||
        !g_PlayerAttachData.get(player.id)[attachIndex].toggle
      ) {
        return INVALID_ROW;
      }

      const attachColorArgb = g_PlayerAttachData.get(player.id)[attachIndex]
        .color1;
      const attachColorRgb = aRGBtoRGB(attachColorArgb);

      for (let row = 0; row < MAX_COLORLIST_ROWS; row++) {
        const rowColorId = g_ModelColorListData.get(player.id).rowId[row];

        if (rowColorId === INVALID_COLOR_ID) {
          continue;
        }

        if (attachColorRgb === getModelColorRGB(rowColorId)) {
          return row;
        }
      }
      break;
    }
    case TD_MODE.COLORLIST_ATTACH_2: {
      const attachIndex = getPlayerEditAttached(player);
      if (
        attachIndex === INVALID_PLAYERATTACH_INDEX ||
        !g_PlayerAttachData.get(player.id)[attachIndex].toggle
      ) {
        return INVALID_ROW;
      }

      const attachColorArgb = g_PlayerAttachData.get(player.id)[attachIndex]
        .color2;
      const attachColorRgb = aRGBtoRGB(attachColorArgb);

      for (let row = 0; row < MAX_COLORLIST_ROWS; row++) {
        const rowColorId = g_ModelColorListData.get(player.id).rowId[row];

        if (rowColorId === INVALID_COLOR_ID) {
          continue;
        }

        if (attachColorRgb === getModelColorRGB(rowColorId)) {
          return row;
        }
      }
      break;
    }
    case TD_MODE.COLORLIST_VEHICLE_1: {
      const vehicleId = getPlayerEditVehicle(player);

      if (!Vehicle.isValid(vehicleId)) {
        return INVALID_ROW;
      }

      const vehicleColorId = g_VehicleData.get(vehicleId - 1).color1;
      if (vehicleColorId === INVALID_COLOR_ID) {
        return INVALID_ROW;
      }

      for (let row = 0; row < MAX_COLORLIST_ROWS; row++) {
        const rowColorId = g_VehColorListData.get(player.id).rowId[row];

        if (vehicleColorId === rowColorId) {
          return row;
        }
      }
      break;
    }
    case TD_MODE.COLORLIST_VEHICLE_2: {
      const vehicleId = getPlayerEditVehicle(player);

      if (!Vehicle.isValid(vehicleId)) {
        return INVALID_ROW;
      }

      const vehicleColorId = g_VehicleData.get(vehicleId - 1).color2;
      if (vehicleColorId === INVALID_COLOR_ID) {
        return INVALID_ROW;
      }

      for (let row = 0; row < MAX_COLORLIST_ROWS; row++) {
        const rowColorId = g_VehColorListData.get(player.id).rowId[row];

        if (vehicleColorId === rowColorId) {
          return row;
        }
      }
      break;
    }
    default: {
      return 0;
    }
  }
  return INVALID_ROW;
}

export function getColorListAppliedRow(player: Player) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.COLORLIST_TEXTURE:
    case TD_MODE.COLORLIST_FONTFACE:
    case TD_MODE.COLORLIST_FONTBACK:
    case TD_MODE.COLORLIST_ATTACH_1:
    case TD_MODE.COLORLIST_ATTACH_2: {
      return g_ModelColorListData.get(player.id).appliedRow;
    }
    case TD_MODE.COLORLIST_VEHICLE_1:
    case TD_MODE.COLORLIST_VEHICLE_2: {
      return g_VehColorListData.get(player.id).appliedRow;
    }
  }
  return INVALID_ROW;
}

export function setColorListAppliedRow(player: Player, row: number) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.COLORLIST_TEXTURE:
    case TD_MODE.COLORLIST_FONTFACE:
    case TD_MODE.COLORLIST_FONTBACK:
    case TD_MODE.COLORLIST_ATTACH_1:
    case TD_MODE.COLORLIST_ATTACH_2: {
      g_ModelColorListData.get(player.id).appliedRow = row;
      break;
    }
    case TD_MODE.COLORLIST_VEHICLE_1:
    case TD_MODE.COLORLIST_VEHICLE_2: {
      g_VehColorListData.get(player.id).appliedRow = row;
      break;
    }
    default: {
      return 0;
    }
  }
  return 1;
}

export function getColorListRowColorID(player: Player, row: number) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.COLORLIST_TEXTURE:
    case TD_MODE.COLORLIST_FONTFACE:
    case TD_MODE.COLORLIST_FONTBACK:
    case TD_MODE.COLORLIST_ATTACH_1:
    case TD_MODE.COLORLIST_ATTACH_2: {
      return g_ModelColorListData.get(player.id).rowId[row];
    }
    case TD_MODE.COLORLIST_VEHICLE_1:
    case TD_MODE.COLORLIST_VEHICLE_2: {
      return g_VehColorListData.get(player.id).rowId[row];
    }
  }
  return INVALID_COLOR_ID;
}

export function loadColorListRowData(player: Player) {
  let rowsAdded = 0;
  let maxOffset = 0;

  const g_SearchString = getColorListSearch(player);

  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.COLORLIST_TEXTURE:
    case TD_MODE.COLORLIST_FONTFACE:
    case TD_MODE.COLORLIST_FONTBACK:
    case TD_MODE.COLORLIST_ATTACH_1:
    case TD_MODE.COLORLIST_ATTACH_2: {
      const res = findModelColors(
        g_ModelColorListData.get(player.id).rowId,
        MAX_COLORLIST_ROWS,
        g_SearchString,
        g_ModelColorListData.get(player.id).page * MAX_COLORLIST_ROWS
      );
      rowsAdded = res.rowsAdded;
      maxOffset = res.maxOffset;

      for (let row = rowsAdded; row < MAX_COLORLIST_ROWS; row++) {
        g_ModelColorListData.get(player.id).rowId[row] = INVALID_COLOR_ID;
      }

      g_ModelColorListData.get(player.id).maxPage = Math.floor(
        maxOffset / MAX_COLORLIST_ROWS
      );

      g_ModelColorListData.get(player.id).appliedRow =
        getColorListNewAppliedRow(player);
      break;
    }
    case TD_MODE.COLORLIST_VEHICLE_1:
    case TD_MODE.COLORLIST_VEHICLE_2: {
      const res = findVehicleColors(
        g_VehColorListData.get(player.id).rowId,
        MAX_COLORLIST_ROWS,
        g_SearchString,
        g_VehColorListData.get(player.id).page * MAX_COLORLIST_ROWS
      );
      rowsAdded = res.rowsAdded;
      maxOffset = res.maxOffset;

      for (let row = rowsAdded; row < MAX_COLORLIST_ROWS; row++) {
        g_VehColorListData.get(player.id).rowId[row] = INVALID_COLOR_ID;
      }

      g_VehColorListData.get(player.id).maxPage = Math.floor(
        maxOffset / MAX_COLORLIST_ROWS
      );

      g_VehColorListData.get(player.id).appliedRow =
        getColorListNewAppliedRow(player);
      break;
    }
    default: {
      return 0;
    }
  }
  return 1;
}

export function applyColorListCaption(player: Player) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.COLORLIST_TEXTURE: {
      const materialIndex = g_PlayerData.get(player.id).editObjMatIdx;
      const g_TextDrawString = `Texture Color ${materialIndex}`;
      g_ColorListPTD.get(player.id).caption?.setString(g_TextDrawString);
      break;
    }
    case TD_MODE.COLORLIST_FONTFACE: {
      const materialIndex = g_PlayerData.get(player.id).editObjMatIdx;
      const g_TextDrawString = `Text Color ${materialIndex}`;
      g_ColorListPTD.get(player.id).caption?.setString(g_TextDrawString);
      break;
    }
    case TD_MODE.COLORLIST_FONTBACK: {
      const materialIndex = g_PlayerData.get(player.id).editObjMatIdx;
      const g_TextDrawString = `Back Color ${materialIndex}`;
      g_ColorListPTD.get(player.id).caption?.setString(g_TextDrawString);
      break;
    }
    case TD_MODE.COLORLIST_ATTACH_1: {
      g_ColorListPTD.get(player.id).caption?.setString("Attachment Color 1");
      break;
    }
    case TD_MODE.COLORLIST_ATTACH_2: {
      g_ColorListPTD.get(player.id).caption?.setString("Attachment Color 2");
      break;
    }
    case TD_MODE.COLORLIST_VEHICLE_1: {
      g_ColorListPTD.get(player.id).caption?.setString("Vehicle Color 1");
      break;
    }
    case TD_MODE.COLORLIST_VEHICLE_2: {
      g_ColorListPTD.get(player.id).caption?.setString("Vehicle Color 2");
      break;
    }
    default: {
      return 0;
    }
  }
  return 1;
}

export function applyColorListPage(player: Player) {
  const _page = getColorListPage(player) + 1;
  const _pageMax = getColorListMaxPage(player) + 1;
  const g_TextDrawString = `Page: ${_page} / ${_pageMax}`;
  g_ColorListPTD.get(player.id).page?.setString(g_TextDrawString);
}

export function applyColorListSearch(player: Player) {
  const g_SearchString = getColorListSearch(player);
  if (!g_SearchString.trim().length) {
    g_ColorListPTD.get(player.id).search?.setString("Search");
  } else {
    const g_TextDrawString = `Search: ${g_SearchString}`;
    g_ColorListPTD.get(player.id).search?.setString(g_TextDrawString);
  }
}

export function applyColorListAppliedRow(player: Player) {
  const row = getColorListAppliedRow(player);

  if (g_ColorListPTD.get(player.id).colorApplied) {
    g_ColorListPTD.get(player.id).colorApplied?.destroy();
    g_ColorListPTD.get(player.id).colorApplied = null;
  }

  if (row === INVALID_ROW) {
    return 0;
  }

  const y = 190.0 + row * 13.0;

  g_ColorListPTD.get(player.id).colorApplied = new TextDraw({
    x: 184.0,
    y,
    text: "Color Applied",
    player,
  })
    .create()
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true)
    .show();
  return 1;
}

export function applyColorListColumns(player: Player) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.COLORLIST_TEXTURE:
    case TD_MODE.COLORLIST_FONTFACE:
    case TD_MODE.COLORLIST_FONTBACK:
    case TD_MODE.COLORLIST_ATTACH_1:
    case TD_MODE.COLORLIST_ATTACH_2: {
      g_ColorListPTD.get(player.id).col1?.setString("RGB");
      g_ColorListPTD.get(player.id).col2?.setString("Name");
      break;
    }
    case TD_MODE.COLORLIST_VEHICLE_1:
    case TD_MODE.COLORLIST_VEHICLE_2: {
      g_ColorListPTD.get(player.id).col1?.setString("ID");
      g_ColorListPTD.get(player.id).col2?.setString("Name");
      break;
    }
    default: {
      return 0;
    }
  }
  return 1;
}

export function applyColorListRowData(player: Player) {
  for (let row = 0; row < MAX_COLORLIST_ROWS; row++) {
    let rowColorRgb = 0;
    let rowColorRgba = 0;
    const rowColorId = getColorListRowColorID(player, row);

    if (rowColorId === INVALID_COLOR_ID) {
      g_ColorListPTD.get(player.id).row1[row]?.hide();
      g_ColorListPTD.get(player.id).row2[row]?.hide();
      continue;
    }

    switch (g_PlayerData.get(player.id).tdMode) {
      case TD_MODE.COLORLIST_TEXTURE:
      case TD_MODE.COLORLIST_FONTFACE:
      case TD_MODE.COLORLIST_FONTBACK:
      case TD_MODE.COLORLIST_ATTACH_1:
      case TD_MODE.COLORLIST_ATTACH_2: {
        rowColorRgb = getModelColorRGB(rowColorId);
        rowColorRgba = rgbToRGBA(rowColorRgb, 0xff);

        g_ColorListPTD.get(player.id).row1[row]?.setBoxColors(rowColorRgba);
        g_ColorListPTD.get(player.id).row2[row]?.setBoxColors(rowColorRgba);

        const _rgb = rowColorRgb.toString(16).padStart(6, "0");
        const g_TextDrawString = `0x${_rgb}`;
        g_ColorListPTD.get(player.id).row1[row]?.setString(g_TextDrawString);

        const g_ModelColorString = getModelColorName(rowColorId).name;
        g_ColorListPTD.get(player.id).row2[row]?.setString(g_ModelColorString);
        break;
      }
      case TD_MODE.COLORLIST_VEHICLE_1:
      case TD_MODE.COLORLIST_VEHICLE_2: {
        rowColorRgb = getVehicleColorRGB(rowColorId);
        rowColorRgba = rgbToRGBA(rowColorRgb, 0xff);

        g_ColorListPTD.get(player.id).row1[row]?.setBoxColors(rowColorRgba);
        g_ColorListPTD.get(player.id).row2[row]?.setBoxColors(rowColorRgba);

        const g_TextDrawString = `${rowColorId.toString().padStart(3, "0")}`;
        g_ColorListPTD.get(player.id).row1[row]?.setString(g_TextDrawString);

        const g_VehColorString = getVehicleColorName(rowColorId);
        g_ColorListPTD.get(player.id).row2[row]?.setString(g_VehColorString);
        break;
      }
      default: {
        continue;
      }
    }

    g_ColorListPTD.get(player.id).row1[row]?.show();
    g_ColorListPTD.get(player.id).row2[row]?.show();
  }

  applyColorListAppliedRow(player);
}

export async function showColorListDialog(player: Player, dialogId: number) {
  let g_DialogInfo = "";
  switch (dialogId) {
    case DIALOG_ID.COLORLIST_PAGE: {
      const _page = getColorListPage(player) + 1;
      const _pageMax = getColorListMaxPage(player) + 1;
      g_DialogInfo = `Page: ${_page} / ${_pageMax}`;
      const res = await new Dialog({
        style: DialogStylesEnum.INPUT,
        caption: "Color List: Page",
        info: g_DialogInfo,
        button1: "Enter",
        button2: "Back",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    case DIALOG_ID.COLORLIST_SEARCH: {
      const g_SearchString = getColorListSearch(player);
      if (!g_SearchString.trim().length) {
        g_DialogInfo = "You are not searching for anything.";
      } else {
        g_DialogInfo = `Searching for: ${g_SearchString}`;
      }
      const res = await new Dialog({
        style: DialogStylesEnum.INPUT,
        caption: "Color List: Search",
        info: g_DialogInfo,
        button1: "Enter",
        button2: "Back",
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
