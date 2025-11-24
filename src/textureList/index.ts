import { getTextureCategoryName, INVALID_CATEGORY_ID } from "@/category";
import {
  defaultCategorySelectData,
  loadCategorySelectData,
  showCategorySelect,
} from "@/catSelect";
import {
  INVALID_MODEL_ID,
  INVALID_ROW,
  RGBA_RED,
  RGBA_WHITE,
} from "@/constants";
import { DIALOG_ID } from "@/dialog";
import { MATERIAL_INDEX_TYPE } from "@/matIndexType";
import {
  applyObjectMaterialIndexData,
  defaultObjectMaterialIndexData,
  g_ObjectData,
  MAX_MATERIALINDEX_MODCOUNT,
  recreateObject,
  showObjectDialog,
} from "@/object";
import { g_PlayerData, getPlayerEditObject } from "@/player";
import { hidePlayerTextDrawMode, TD_MODE } from "@/tdMode";
import { findTextures, getTextureData, INVALID_TEXTURE_ID } from "@/texture";
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

export const MAX_TEXTURELIST_ROWS = 20;
export const MIN_TEXTURELIST_PAGE = 0;

export interface ITextureListGtd {
  bg: TextDraw | null;
  close: TextDraw | null;
  pageF: TextDraw | null;
  pageP: TextDraw | null;
  pageN: TextDraw | null;
  pageL: TextDraw | null;
  categoryR: TextDraw | null;
  colMid: TextDraw | null;
  colTxd: TextDraw | null;
  colName: TextDraw | null;
}

export interface ITextureListPtd {
  caption: TextDraw | null;
  page: TextDraw | null;
  category: TextDraw | null;
  search: TextDraw | null;
  rowMid: (TextDraw | null)[];
  rowTxd: (TextDraw | null)[];
  rowName: (TextDraw | null)[];
}

export interface ITextureListData {
  page: number;
  maxPage: number;
  category: number;
  search: string;
  rowTid: number[];
  coloredRow: number;
}

export const g_TextureListData = new SafetyMap<number, ITextureListData>(() => {
  return {
    page: MIN_TEXTURELIST_PAGE,
    maxPage: MIN_TEXTURELIST_PAGE,
    category: INVALID_CATEGORY_ID,
    search: "",
    rowTid: Array.from(
      { length: MAX_TEXTURELIST_ROWS },
      () => INVALID_MODEL_ID
    ),
    coloredRow: INVALID_ROW,
  };
});

export const g_TextureListGTD: ITextureListGtd = {
  bg: null,
  close: null,
  pageF: null,
  pageP: null,
  pageN: null,
  pageL: null,
  categoryR: null,
  colMid: null,
  colTxd: null,
  colName: null,
};

export const g_TextureListPTD = new SafetyMap<number, ITextureListPtd>(() => {
  return {
    caption: null,
    page: null,
    category: null,
    search: null,
    rowMid: Array.from({ length: MAX_TEXTURELIST_ROWS }, () => null),
    rowTxd: Array.from({ length: MAX_TEXTURELIST_ROWS }, () => null),
    rowName: Array.from({ length: MAX_TEXTURELIST_ROWS }, () => null),
  };
});

GameMode.onInit(({ next }) => {
  createGenericTextureList();
  Player.getInstances().forEach((p) => {
    if (p.isConnected()) {
      defaultTextureListData(p);
    }
  });
  return next();
});

GameMode.onExit(({ next }) => {
  destroyGenericTextureList();
  g_TextureListData.clear();
  g_TextureListPTD.clear();
  return next();
});

PlayerEvent.onConnect(({ player, next }) => {
  defaultTextureListData(player);
  return next();
});

function onDialogResponse(
  player: Player,
  res: IDialogResCommon,
  dialogId: number
) {
  const { inputText, response } = res;

  switch (dialogId) {
    case DIALOG_ID.TEXTURELIST_PAGE: {
      if (!response) {
        return 1;
      }

      let page = +inputText;

      if (!inputText.trim().length || Number.isNaN(page)) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You did not enter a valid page number!"
        );
        showTextureListDialog(player, dialogId);
        return 1;
      }

      page--;

      if (
        page < MIN_TEXTURELIST_PAGE ||
        page > g_TextureListData.get(player.id).maxPage
      ) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You did not enter a valid page number!"
        );
        showTextureListDialog(player, dialogId);
        return 1;
      }

      g_TextureListData.get(player.id).page = page;
      loadTextureListRowData(player);

      applyTextureListPage(player);
      applyTextureListRowData(player);
      return 1;
    }
    case DIALOG_ID.TEXTURELIST_SEARCH: {
      if (!response) {
        return 1;
      }

      g_TextureListData.get(player.id).page = MIN_TEXTURELIST_PAGE;
      g_TextureListData.get(player.id).search = inputText;
      loadTextureListRowData(player);

      applyTextureListPage(player);
      applyTextureListSearch(player);
      applyTextureListRowData(player);
      return 1;
    }
  }

  return 0;
}

TextDrawEvent.onPlayerClickGlobal(({ player, textDraw, next }) => {
  if (
    textDraw === InvalidEnum.TEXT_DRAW &&
    g_PlayerData.get(player.id).tdMode === TD_MODE.TEXTURELIST
  ) {
    hidePlayerTextDrawMode(player);
  }
  if (textDraw === g_TextureListGTD.close) {
    showObjectDialog(player, DIALOG_ID.OBJECT_INDEX);
    hidePlayerTextDrawMode(player);
    return 1;
  }
  if (textDraw === g_TextureListGTD.categoryR) {
    if (g_TextureListData.get(player.id).category === INVALID_CATEGORY_ID) {
      return 1;
    }

    g_TextureListData.get(player.id).page = MIN_TEXTURELIST_PAGE;
    g_TextureListData.get(player.id).category = INVALID_CATEGORY_ID;
    loadTextureListRowData(player);

    applyTextureListPage(player);
    applyTextureListCategory(player);
    applyTextureListRowData(player);
    return 1;
  }
  if (textDraw === g_TextureListGTD.pageF) {
    if (g_TextureListData.get(player.id).page === MIN_TEXTURELIST_PAGE) {
      return 1;
    }

    g_TextureListData.get(player.id).page = MIN_TEXTURELIST_PAGE;
    loadTextureListRowData(player);

    applyTextureListPage(player);
    applyTextureListRowData(player);
    return 1;
  }
  if (textDraw === g_TextureListGTD.pageP) {
    if (g_TextureListData.get(player.id).page === MIN_TEXTURELIST_PAGE) {
      return 1;
    }

    if (--g_TextureListData.get(player.id).page < MIN_TEXTURELIST_PAGE) {
      g_TextureListData.get(player.id).page = MIN_TEXTURELIST_PAGE;
    }

    loadTextureListRowData(player);

    applyTextureListPage(player);
    applyTextureListRowData(player);
    return 1;
  }
  if (textDraw === g_TextureListGTD.pageN) {
    if (
      g_TextureListData.get(player.id).page ==
      g_TextureListData.get(player.id).maxPage
    ) {
      return 1;
    }

    if (
      ++g_TextureListData.get(player.id).page >
      g_TextureListData.get(player.id).maxPage
    ) {
      g_TextureListData.get(player.id).page = g_TextureListData.get(
        player.id
      ).maxPage;
    }

    loadTextureListRowData(player);

    applyTextureListPage(player);
    applyTextureListRowData(player);
    return 1;
  }
  if (textDraw === g_TextureListGTD.pageL) {
    if (
      g_TextureListData.get(player.id).page ==
      g_TextureListData.get(player.id).maxPage
    ) {
      return 1;
    }

    g_TextureListData.get(player.id).page = g_TextureListData.get(
      player.id
    ).maxPage;
    loadTextureListRowData(player);

    applyTextureListPage(player);
    applyTextureListRowData(player);
    return 1;
  }
  if (textDraw === g_TextureListGTD.categoryR) {
    if (g_TextureListData.get(player.id).category === INVALID_CATEGORY_ID) {
      return 1;
    }

    g_TextureListData.get(player.id).category = INVALID_CATEGORY_ID;
    g_TextureListData.get(player.id).page = MIN_TEXTURELIST_PAGE;
    loadTextureListRowData(player);

    applyTextureListCategory(player);
    applyTextureListPage(player);
    applyTextureListRowData(player);
  }

  return next();
});

TextDrawEvent.onPlayerClickPlayer(({ player, textDraw, next }) => {
  if (textDraw === g_TextureListPTD.get(player.id).page) {
    showTextureListDialog(player, DIALOG_ID.TEXTURELIST_PAGE);
    return 1;
  }
  if (textDraw === g_TextureListPTD.get(player.id).search) {
    showTextureListDialog(player, DIALOG_ID.TEXTURELIST_SEARCH);
    return 1;
  }
  if (textDraw === g_TextureListPTD.get(player.id).category) {
    defaultCategorySelectData(player);
    loadCategorySelectData(player);
    showCategorySelect(player);
    return 1;
  }

  for (let row = 0; row < MAX_TEXTURELIST_ROWS; row++) {
    if (
      textDraw === g_TextureListPTD.get(player.id).rowMid[row] ||
      textDraw === g_TextureListPTD.get(player.id).rowTxd[row] ||
      textDraw === g_TextureListPTD.get(player.id).rowName[row]
    ) {
      const rowTextureId = g_TextureListData.get(player.id).rowTid[row];

      if (rowTextureId === INVALID_TEXTURE_ID) {
        return 1;
      }

      const objectId = getPlayerEditObject(player);
      if (!ObjectMp.isValid(objectId)) {
        return 1;
      }

      const materialIndex = g_PlayerData.get(player.id).editObjMatIdx;
      if (
        g_ObjectData.get(objectId - 1).matIndexType[materialIndex] !=
        MATERIAL_INDEX_TYPE.TEXTURE
      ) {
        g_ObjectData.get(objectId - 1).matIndexType[materialIndex] =
          MATERIAL_INDEX_TYPE.TEXTURE;
        defaultObjectMaterialIndexData(objectId, materialIndex);
      }

      g_ObjectData.get(objectId - 1).matIndexTexture[materialIndex] =
        rowTextureId;

      if (
        g_ObjectData.get(objectId - 1).matIndexModCount >=
        MAX_MATERIALINDEX_MODCOUNT
      ) {
        const newObjectId = recreateObject(objectId);
        if (newObjectId === InvalidEnum.OBJECT_ID) {
          player.sendClientMessage(
            RGBA_RED,
            "ERROR: This object could not be color reset / re-created!"
          );
        }
      } else {
        applyObjectMaterialIndexData(objectId, materialIndex);
      }

      const prevRow = g_TextureListData.get(player.id).coloredRow;
      if (row !== prevRow) {
        g_TextureListData.get(player.id).coloredRow = row;

        if (prevRow !== INVALID_ROW) {
          applyTextureListRowColor(player, prevRow);
        }

        applyTextureListRowColor(player, row);
      }
      return 1;
    }
  }

  return next();
});

export function defaultTextureListData(player: Player) {
  g_TextureListData.get(player.id).page = MIN_TEXTURELIST_PAGE;
  g_TextureListData.get(player.id).maxPage = MIN_TEXTURELIST_PAGE;
  g_TextureListData.get(player.id).category = INVALID_CATEGORY_ID;
  g_TextureListData.get(player.id).search = "";
  g_TextureListData.get(player.id).coloredRow = INVALID_ROW;

  for (let row = 0; row < MAX_TEXTURELIST_ROWS; row++) {
    g_TextureListData.get(player.id).rowTid[row] = INVALID_MODEL_ID;
  }
}

export function createGenericTextureList() {
  g_TextureListGTD.bg = new TextDraw({
    x: 116.0,
    y: 112.0,
    text: "_",
  })
    .create()
    .setAlignment(2)
    .setLetterSize(0.0, 37.2)
    .useBox(true)
    .setBoxColors(100)
    .setTextSize(0.0, 230.0);

  g_TextureListGTD.close = new TextDraw({
    x: 221.0,
    y: 112.0,
    text: "X",
  })
    .create()
    .setAlignment(2)
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.3, 1.0)
    .setColor(RGBA_WHITE)
    .setProportional(true)
    .setOutline(1)
    .useBox(true)
    .setBoxColors(0xff000064)
    .setTextSize(10.0, 20.0)
    .setSelectable(true);

  g_TextureListGTD.pageF = new TextDraw({
    x: 11.0,
    y: 125.0,
    text: "<<",
  })
    .create()
    .setAlignment(2)
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setProportional(true)
    .setOutline(1)
    .setTextSize(10.0, 20.0)
    .setSelectable(true);

  g_TextureListGTD.pageP = new TextDraw({
    x: 34.0,
    y: 125.0,
    text: "<",
  })
    .create()
    .setAlignment(2)
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setProportional(true)
    .setOutline(1)
    .setTextSize(10.0, 20.0)
    .setSelectable(true);

  g_TextureListGTD.pageN = new TextDraw({
    x: 198.0,
    y: 125.0,
    text: ">",
  })
    .create()
    .setAlignment(2)
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setProportional(true)
    .setOutline(1)
    .setTextSize(10.0, 20.0)
    .setSelectable(true);

  g_TextureListGTD.pageL = new TextDraw({
    x: 221.0,
    y: 125.0,
    text: ">>",
  })
    .create()
    .setAlignment(2)
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setProportional(true)
    .setOutline(1)
    .setTextSize(10.0, 20.0)
    .setSelectable(true);

  g_TextureListGTD.categoryR = new TextDraw({
    x: 116.0,
    y: 138.0,
    text: "Reset Category",
  })
    .create()
    .setAlignment(2)
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setProportional(true)
    .setOutline(1)
    .setTextSize(10.0, 230.0)
    .setSelectable(true);

  g_TextureListGTD.colMid = new TextDraw({
    x: 1.0,
    y: 177.0,
    text: "Model ID",
  })
    .create()
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true);

  g_TextureListGTD.colTxd = new TextDraw({
    x: 43.0,
    y: 177.0,
    text: "TXD",
  })
    .create()
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true);

  g_TextureListGTD.colName = new TextDraw({
    x: 113.0,
    y: 177.0,
    text: "Name",
  })
    .create()
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true);
}

export function destroyGenericTextureList() {
  Object.entries(g_TextureListGTD).forEach((item) => {
    const [key, gtd] = item as unknown as [
      keyof ITextureListGtd,
      (typeof g_TextureListGTD)[keyof ITextureListGtd]
    ];
    if (gtd && gtd.isValid()) {
      gtd.destroy();
    }
    g_TextureListGTD[key] = null;
  });
}

export function createPlayerTextureList(player: Player) {
  g_TextureListPTD.get(player.id).caption = new TextDraw({
    x: 2.0,
    y: 99.0,
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

  g_TextureListPTD.get(player.id).page = new TextDraw({
    x: 116.0,
    y: 125.0,
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

  g_TextureListPTD.get(player.id).category = new TextDraw({
    x: 116.0,
    y: 151.0,
    text: "Category",
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

  g_TextureListPTD.get(player.id).search = new TextDraw({
    x: 116.0,
    y: 164.0,
    text: "Search:",
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

  for (let row = 0, y = 190.0; row < MAX_TEXTURELIST_ROWS; row++, y += 13.0) {
    g_TextureListPTD.get(player.id).rowMid[row] = new TextDraw({
      x: 1.0,
      y,
      text: "ROW",
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
      .setBoxColors(0)
      .setTextSize(40.0, 10.0)
      .setSelectable(true);

    g_TextureListPTD.get(player.id).rowTxd[row] = new TextDraw({
      x: 43.0,
      y,
      text: "ROW",
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
      .setBoxColors(0)
      .setTextSize(110.0, 10.0)
      .setSelectable(true);

    g_TextureListPTD.get(player.id).rowName[row] = new TextDraw({
      x: 113.0,
      y,
      text: "ROW",
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
      .setBoxColors(0)
      .setTextSize(231.0, 10.0)
      .setSelectable(true);
  }
}

export function destroyPlayerTextureList(player: Player) {
  Object.entries(g_TextureListPTD.get(player.id)).forEach((item) => {
    const [key, ptd] = item as unknown as [
      keyof ITextureListPtd,
      ITextureListPtd[keyof ITextureListPtd]
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
      g_TextureListPTD.get(player.id)[key] = null!;
    }
  });
}

export function showTextureList(player: Player) {
  createPlayerTextureList(player);

  Object.values(g_TextureListGTD).forEach(
    (gtd: ITextureListGtd[keyof ITextureListGtd]) => {
      if (gtd && gtd.isValid()) {
        gtd.show(player);
      }
    }
  );

  loadTextureListRowData(player);

  applyTextureListCaption(player);
  g_TextureListPTD.get(player.id).caption?.show();

  applyTextureListPage(player);
  g_TextureListPTD.get(player.id).page?.show();

  applyTextureListCategory(player);
  g_TextureListPTD.get(player.id).category?.show();

  applyTextureListSearch(player);
  g_TextureListPTD.get(player.id).search?.show();

  applyTextureListRowData(player);
}

export function hideTextureList(player: Player) {
  destroyPlayerTextureList(player);

  Object.values(g_TextureListGTD).forEach(
    (gtd: ITextureListGtd[keyof ITextureListGtd]) => {
      if (gtd && gtd.isValid()) {
        gtd.hide(player);
      }
    }
  );
}

export function getTextureListNewColoredRow(player: Player) {
  const objectId = getPlayerEditObject(player);
  if (!ObjectMp.isValid(objectId)) {
    return INVALID_ROW;
  }

  const materialIndex = g_PlayerData.get(player.id).editObjMatIdx;
  if (
    g_ObjectData.get(objectId - 1).matIndexType[materialIndex] !=
    MATERIAL_INDEX_TYPE.TEXTURE
  ) {
    return INVALID_ROW;
  }

  const objTextureId = g_ObjectData.get(objectId - 1).matIndexTexture[
    materialIndex
  ];
  if (objTextureId === INVALID_TEXTURE_ID) {
    return INVALID_ROW;
  }

  for (let row = 0; row < MAX_TEXTURELIST_ROWS; row++) {
    const rowTextureId = g_TextureListData.get(player.id).rowTid[row];

    if (rowTextureId === objTextureId) {
      return row;
    }
  }
  return INVALID_ROW;
}

export function applyTextureListCaption(player: Player) {
  const g_TextDrawString = `Texture Index ${
    g_PlayerData.get(player.id).editObjMatIdx
  }`;
  g_TextureListPTD.get(player.id).caption?.setString(g_TextDrawString);
}

export function applyTextureListPage(player: Player) {
  const _page = g_TextureListData.get(player.id).page + 1;
  const _pageMax = g_TextureListData.get(player.id).maxPage + 1;
  const g_TextDrawString = `Page ${_page} / ${_pageMax}`;
  g_TextureListPTD.get(player.id).page?.setString(g_TextDrawString);
}

export function applyTextureListCategory(player: Player) {
  const categoryId = g_TextureListData.get(player.id).category;
  if (categoryId === INVALID_CATEGORY_ID) {
    g_TextureListPTD.get(player.id).category?.setString("Category");
  } else {
    const g_CategoryNameString = getTextureCategoryName(categoryId);
    const g_TextDrawString = `Category: ${g_CategoryNameString}`;
    g_TextureListPTD.get(player.id).category?.setString(g_TextDrawString);
  }
  return 1;
}

export function applyTextureListSearch(player: Player) {
  const g_SearchString = g_TextureListData.get(player.id).search;
  if (!g_SearchString.trim().length) {
    g_TextureListPTD.get(player.id).search?.setString("Search");
  } else {
    const g_TextDrawString = `Search: ${g_SearchString}`;
    g_TextureListPTD.get(player.id).search?.setString(g_TextDrawString);
  }
}

export function applyTextureListRowColor(player: Player, row: number) {
  const coloredRow = g_TextureListData.get(player.id).coloredRow;
  const rgbaBoxColor = row === coloredRow ? 0xffffff64 : 0x00000000;

  g_TextureListPTD
    .get(player.id)
    .rowMid[row]?.setBoxColors(rgbaBoxColor)
    .show();
  g_TextureListPTD
    .get(player.id)
    .rowTxd[row]?.setBoxColors(rgbaBoxColor)
    .show();
  g_TextureListPTD
    .get(player.id)
    .rowName[row]?.setBoxColors(rgbaBoxColor)
    .show();
  return 1;
}

export function applyTextureListRowData(player: Player) {
  for (let row = 0; row < MAX_TEXTURELIST_ROWS; row++) {
    const rowTextureId = g_TextureListData.get(player.id).rowTid[row];

    if (rowTextureId === INVALID_TEXTURE_ID) {
      g_TextureListPTD.get(player.id).rowMid[row]?.hide();
      g_TextureListPTD.get(player.id).rowTxd[row]?.hide();
      g_TextureListPTD.get(player.id).rowName[row]?.hide();
      continue;
    }

    const {
      modelId,
      txd: g_TextureTXDString,
      name: g_TextureNameString,
    } = getTextureData(rowTextureId);

    const g_IntegerString = modelId.toString();

    g_TextureListPTD.get(player.id).rowMid[row]?.setString(g_IntegerString);
    g_TextureListPTD.get(player.id).rowTxd[row]?.setString(g_TextureTXDString);
    g_TextureListPTD
      .get(player.id)
      .rowName[row]?.setString(g_TextureNameString);

    applyTextureListRowColor(player, row);
  }
}

export function loadTextureListRowData(player: Player) {
  let rowsAdded = 0;
  let maxOffset = 0;

  const g_SearchString = g_TextureListData.get(player.id).search;

  const res = findTextures(
    g_TextureListData.get(player.id).rowTid,
    MAX_TEXTURELIST_ROWS,
    g_SearchString,
    g_TextureListData.get(player.id).category,
    g_TextureListData.get(player.id).page * MAX_TEXTURELIST_ROWS
  );
  rowsAdded = res.rowsAdded;
  maxOffset = res.maxOffset;

  for (let row = rowsAdded; row < MAX_TEXTURELIST_ROWS; row++) {
    g_TextureListData.get(player.id).rowTid[row] = INVALID_TEXTURE_ID;
  }

  g_TextureListData.get(player.id).maxPage = Math.floor(
    maxOffset / MAX_TEXTURELIST_ROWS
  );

  g_TextureListData.get(player.id).coloredRow =
    getTextureListNewColoredRow(player);

  return { rowsAdded, maxOffset };
}

export async function showTextureListDialog(player: Player, dialogId: number) {
  switch (dialogId) {
    case DIALOG_ID.TEXTURELIST_PAGE: {
      const _page = g_TextureListData.get(player.id).page + 1;
      const _pageMax = g_TextureListData.get(player.id).maxPage + 1;
      const g_DialogInfo = `Page: ${_page} / ${_pageMax}`;
      const res = await new Dialog({
        style: DialogStylesEnum.INPUT,
        caption: "Texture List: Page",
        info: g_DialogInfo,
        button1: "Enter",
        button2: "Back",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    case DIALOG_ID.TEXTURELIST_SEARCH: {
      const g_SearchString = g_TextureListData.get(player.id).search;
      let g_DialogInfo = "";
      if (!g_SearchString.trim().length) {
        g_DialogInfo = "You are not searching for anything.";
      } else {
        g_DialogInfo = `Searching for: ${g_SearchString}`;
      }

      const res = await new Dialog({
        style: DialogStylesEnum.INPUT,
        caption: "Texture List: Search",
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
