import { INVALID_ROW, RGBA_RED, RGBA_WHITE } from "@/constants";
import { DIALOG_ID } from "@/dialog";
import { findFonts, g_FontCache, getFontName, INVALID_FONT_ID } from "@/font";
import { ID_TYPE } from "@/idType";
import { MATERIAL_INDEX_TYPE } from "@/matIndexType";
import {
  applyObjectMaterialIndexData,
  defaultObjectMaterialIndexData,
  g_ObjectData,
  g_ObjectFont,
  MAX_MATERIALINDEX_MODCOUNT,
  recreateObject,
  showObjectDialog,
} from "@/object";
import { g_PlayerData, getPlayerEditObject } from "@/player";
import { hidePlayerTextDrawMode, TD_MODE } from "@/tdMode";
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

export const MAX_FONTLIST_ROWS = 20;
export const MIN_FONTLIST_PAGE = 0;

export interface IFontListGtd {
  bg: TextDraw | null;
  close: TextDraw | null;
  pageF: TextDraw | null;
  pageP: TextDraw | null;
  pageN: TextDraw | null;
  pageL: TextDraw | null;
}

export interface IFontListPtd {
  caption: TextDraw | null;
  page: TextDraw | null;
  search: TextDraw | null;
  row: (TextDraw | null)[];
}

export interface IFontListData {
  page: number;
  maxPage: number;
  appliedRow: number;
  search: string;
  rowFontId: number[];
}

export const g_FontListGTD: IFontListGtd = {
  bg: null,
  close: null,
  pageF: null,
  pageP: null,
  pageN: null,
  pageL: null,
};

export const g_FontListPTD = new SafetyMap<number, IFontListPtd>(() => {
  return {
    caption: null,
    page: null,
    search: null,
    row: Array.from({ length: MAX_FONTLIST_ROWS }, () => null),
  };
});

export const g_FontListData = new SafetyMap<number, IFontListData>(() => {
  return {
    page: MIN_FONTLIST_PAGE,
    maxPage: MIN_FONTLIST_PAGE,
    appliedRow: INVALID_ROW,
    search: "",
    rowFontId: Array.from({ length: MAX_FONTLIST_ROWS }, () => INVALID_FONT_ID),
  };
});

GameMode.onInit(({ next }) => {
  createGenericFontList();
  Player.getInstances().forEach((p) => {
    if (p.isConnected()) {
      defaultFontListData(p);
    }
  });
  return next();
});

GameMode.onExit(({ next }) => {
  destroyGenericFontList();
  g_FontListPTD.clear();
  g_FontListData.clear();
  return next();
});

PlayerEvent.onConnect(({ player, next }) => {
  defaultFontListData(player);
  return next();
});

function onDialogResponse(
  player: Player,
  res: IDialogResCommon,
  dialogId: number
) {
  const { inputText, response } = res;

  switch (dialogId) {
    case DIALOG_ID.FONTLIST_PAGE: {
      if (!response) {
        return 1;
      }

      let page = +inputText;

      if (!inputText.trim().length || Number.isNaN(page)) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You did not enter a valid page number!"
        );
        showFontListDialog(player, dialogId);
        return 1;
      }

      page--;

      if (
        page < MIN_FONTLIST_PAGE ||
        page > g_FontListData.get(player.id).maxPage
      ) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You did not enter a valid page number!"
        );
        showFontListDialog(player, dialogId);
        return 1;
      }

      g_FontListData.get(player.id).page = page;
      loadFontListRowData(player);

      applyFontListPage(player);
      applyFontListRowData(player);
      return 1;
    }
    case DIALOG_ID.FONTLIST_SEARCH: {
      if (!response) {
        return 1;
      }

      g_FontListData.get(player.id).page = MIN_FONTLIST_PAGE;
      g_FontListData.get(player.id).search = inputText;
      loadFontListRowData(player);

      applyFontListPage(player);
      applyFontListSearch(player);
      applyFontListRowData(player);
      return 1;
    }
  }

  return 0;
}

TextDrawEvent.onPlayerClickGlobal(({ player, textDraw, next }) => {
  if (
    textDraw === InvalidEnum.TEXT_DRAW &&
    g_PlayerData.get(player.id).tdMode === TD_MODE.FONTLIST
  ) {
    hidePlayerTextDrawMode(player);
  }
  if (textDraw === g_FontListGTD.close) {
    showObjectDialog(player, DIALOG_ID.OBJECT_INDEX);
    hidePlayerTextDrawMode(player);
    return 1;
  }
  if (textDraw === g_FontListGTD.pageF) {
    if (g_FontListData.get(player.id).page === MIN_FONTLIST_PAGE) {
      return 1;
    }

    g_FontListData.get(player.id).page = MIN_FONTLIST_PAGE;
    loadFontListRowData(player);

    applyFontListPage(player);
    applyFontListRowData(player);
    return 1;
  }
  if (textDraw === g_FontListGTD.pageP) {
    if (g_FontListData.get(player.id).page === MIN_FONTLIST_PAGE) {
      return 1;
    }

    if (--g_FontListData.get(player.id).page < MIN_FONTLIST_PAGE) {
      g_FontListData.get(player.id).page = MIN_FONTLIST_PAGE;
    }
    loadFontListRowData(player);

    applyFontListPage(player);
    applyFontListRowData(player);
    return 1;
  }
  if (textDraw === g_FontListGTD.pageN) {
    if (
      g_FontListData.get(player.id).page ==
      g_FontListData.get(player.id).maxPage
    ) {
      return 1;
    }

    if (
      ++g_FontListData.get(player.id).page >
      g_FontListData.get(player.id).maxPage
    ) {
      g_FontListData.get(player.id).page = g_FontListData.get(
        player.id
      ).maxPage;
    }
    loadFontListRowData(player);

    applyFontListPage(player);
    applyFontListRowData(player);
    return 1;
  }
  if (textDraw === g_FontListGTD.pageL) {
    if (
      g_FontListData.get(player.id).page ==
      g_FontListData.get(player.id).maxPage
    ) {
      return 1;
    }

    g_FontListData.get(player.id).page = g_FontListData.get(player.id).maxPage;
    loadFontListRowData(player);

    applyFontListPage(player);
    applyFontListRowData(player);
    return 1;
  }
  return next();
});

TextDrawEvent.onPlayerClickPlayer(({ player, textDraw, next }) => {
  if (textDraw === g_FontListPTD.get(player.id).page) {
    showFontListDialog(player, DIALOG_ID.FONTLIST_PAGE);
    return 1;
  }
  if (textDraw === g_FontListPTD.get(player.id).search) {
    showFontListDialog(player, DIALOG_ID.FONTLIST_SEARCH);
    return 1;
  }
  for (let row = 0; row < MAX_FONTLIST_ROWS; row++) {
    if (textDraw === g_FontListPTD.get(player.id).row[row]) {
      const rowFontId = g_FontListData.get(player.id).rowFontId[row];

      if (rowFontId === INVALID_FONT_ID) {
        return 1;
      }

      const objectId = getPlayerEditObject(player);
      if (!ObjectMp.isValid(objectId)) {
        return 1;
      }

      const materialIndex = g_PlayerData.get(player.id).editObjMatIdx;
      if (
        g_ObjectData.get(objectId - 1).matIndexType[materialIndex] !=
        MATERIAL_INDEX_TYPE.TEXT
      ) {
        g_ObjectData.get(objectId - 1).matIndexType[materialIndex] =
          MATERIAL_INDEX_TYPE.TEXT;
        defaultObjectMaterialIndexData(objectId, materialIndex);
      }

      const g_FontString = getFontName(rowFontId);
      g_ObjectFont.get(objectId - 1)[materialIndex] = g_FontString || "";

      if (
        g_ObjectData.get(objectId - 1).matIndexModCount >=
        MAX_MATERIALINDEX_MODCOUNT
      ) {
        const newObjectId = recreateObject(objectId);
        if (newObjectId === InvalidEnum.OBJECT_ID) {
          player.sendClientMessage(
            RGBA_RED,
            "ERROR: This object could not be font set / re-created!"
          );
        } else {
          g_PlayerData.get(player.id).editIdType = ID_TYPE.OBJECT;
          g_PlayerData.get(player.id).editId = newObjectId;
        }
      } else {
        applyObjectMaterialIndexData(objectId, materialIndex);
      }

      const prevRow = g_FontListData.get(player.id).appliedRow;
      if (row !== prevRow) {
        g_FontListData.get(player.id).appliedRow = row;

        if (prevRow !== INVALID_ROW) {
          applyFontListRowApplied(player, prevRow);
        }

        applyFontListRowApplied(player, row);
      }
      return 1;
    }
  }
  return next();
});

export function defaultFontListData(player: Player) {
  g_FontListData.get(player.id).page = MIN_FONTLIST_PAGE;
  g_FontListData.get(player.id).maxPage = MIN_FONTLIST_PAGE;
  g_FontListData.get(player.id).appliedRow = INVALID_ROW;
  g_FontListData.get(player.id).search = "";

  for (let row = 0; row < MAX_FONTLIST_ROWS; row++) {
    g_FontListData.get(player.id).rowFontId[row] = INVALID_FONT_ID;
  }
}

export function createGenericFontList() {
  g_FontListGTD.bg = new TextDraw({
    x: 94.0,
    y: 151.0,
    text: "_",
  })
    .create()
    .setAlignment(2)
    .setLetterSize(0.0, 32.8)
    .useBox(true)
    .setBoxColors(100)
    .setTextSize(0.0, 190.0);

  g_FontListGTD.close = new TextDraw({
    x: 179.0,
    y: 151.0,
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

  g_FontListGTD.pageF = new TextDraw({
    x: 11.0,
    y: 164.0,
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

  g_FontListGTD.pageP = new TextDraw({
    x: 34.0,
    y: 164.0,
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

  g_FontListGTD.pageN = new TextDraw({
    x: 156.0,
    y: 164.0,
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

  g_FontListGTD.pageL = new TextDraw({
    x: 179.0,
    y: 164.0,
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

export function destroyGenericFontList() {
  Object.entries(g_FontListGTD).forEach((item) => {
    const [key, gtd] = item as unknown as [
      keyof IFontListGtd,
      (typeof g_FontListGTD)[keyof IFontListGtd]
    ];
    if (gtd && gtd.isValid()) {
      gtd.destroy();
    }
    g_FontListGTD[key] = null;
  });
}

export function createPlayerFontList(player: Player) {
  g_FontListPTD.get(player.id).caption = new TextDraw({
    x: 2.0,
    y: 139.0,
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

  g_FontListPTD.get(player.id).page = new TextDraw({
    x: 95.0,
    y: 164.0,
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
    .setTextSize(10.0, 96.0)
    .setSelectable(true);

  g_FontListPTD.get(player.id).search = new TextDraw({
    x: 95.0,
    y: 177.0,
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
    .setTextSize(10.0, 188.0)
    .setSelectable(true);

  for (let row = 0, y = 190.0; row < MAX_FONTLIST_ROWS; row++, y += 13.0) {
    g_FontListPTD.get(player.id).row[row] = new TextDraw({
      x: 1.0,
      y,
      text: "Row",
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
      .setTextSize(189.0, 10.0)
      .setSelectable(true);
  }
}

export function destroyPlayerFontList(player: Player) {
  Object.entries(g_FontListPTD.get(player.id)).forEach((item) => {
    const [key, ptd] = item as unknown as [
      keyof IFontListPtd,
      IFontListPtd[keyof IFontListPtd]
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
      g_FontListPTD.get(player.id)[key] = null!;
    }
  });
}

export function showFontList(player: Player) {
  createPlayerFontList(player);

  Object.values(g_FontListGTD).forEach(
    (gtd: IFontListGtd[keyof IFontListGtd]) => {
      if (gtd && gtd.isValid()) {
        gtd.show(player);
      }
    }
  );

  loadFontListRowData(player);

  applyFontListCaption(player);
  g_FontListPTD.get(player.id).caption?.show();

  applyFontListPage(player);
  g_FontListPTD.get(player.id).page?.show();

  applyFontListSearch(player);
  g_FontListPTD.get(player.id).search?.show();

  applyFontListRowData(player);
}

export function hideFontList(player: Player) {
  destroyPlayerFontList(player);

  Object.values(g_FontListGTD).forEach(
    (gtd: IFontListGtd[keyof IFontListGtd]) => {
      if (gtd && gtd.isValid()) {
        gtd.hide(player);
      }
    }
  );
}

export function loadFontListRowData(player: Player) {
  let rowsAdded = 0;
  let maxOffset = 0;

  const g_SearchString = g_FontListData.get(player.id).search;

  const res = findFonts(
    g_FontListData.get(player.id).rowFontId,
    MAX_FONTLIST_ROWS,
    g_SearchString,
    g_FontListData.get(player.id).page * MAX_FONTLIST_ROWS
  );
  rowsAdded = res.rowsAdded;
  maxOffset = res.maxOffset;

  for (let row = rowsAdded; row < MAX_FONTLIST_ROWS; row++) {
    g_FontListData.get(player.id).rowFontId[row] = INVALID_FONT_ID;
  }

  g_FontListData.get(player.id).maxPage = Math.floor(
    maxOffset / MAX_FONTLIST_ROWS
  );

  g_FontListData.get(player.id).appliedRow = getFontListNewColoredRow(player);
}

export function getFontListNewColoredRow(player: Player) {
  const objectId = getPlayerEditObject(player);
  if (!ObjectMp.isValid(objectId)) {
    return INVALID_ROW;
  }

  const materialIndex = g_PlayerData.get(player.id).editObjMatIdx;
  if (
    g_ObjectData.get(objectId - 1).matIndexType[materialIndex] !=
    MATERIAL_INDEX_TYPE.TEXT
  ) {
    return INVALID_ROW;
  }

  for (let row = 0; row < MAX_FONTLIST_ROWS; row++) {
    const rowFontId = g_FontListData.get(player.id).rowFontId[row];

    if (rowFontId === INVALID_FONT_ID) {
      continue;
    }

    if (
      g_FontCache[rowFontId] === g_ObjectFont.get(objectId - 1)[materialIndex]
    ) {
      return row;
    }
  }
  return INVALID_ROW;
}

export function applyFontListCaption(player: Player) {
  const materialIndex = g_PlayerData.get(player.id).editObjMatIdx;
  const g_TextDrawString = `Font Index ${materialIndex}`;
  g_FontListPTD.get(player.id).caption?.setString(g_TextDrawString);
}

export function applyFontListPage(player: Player) {
  const _page = g_FontListData.get(player.id).page + 1;
  const _pageMax = g_FontListData.get(player.id).maxPage + 1;
  const g_TextDrawString = `Page: ${_page} / ${_pageMax}`;
  g_FontListPTD.get(player.id).page?.setString(g_TextDrawString);
}

export function applyFontListSearch(player: Player) {
  const g_SearchString = g_FontListData.get(player.id).search;
  if (!g_SearchString.trim().length) {
    g_FontListPTD.get(player.id).search?.setString("Search");
  } else {
    const g_TextDrawString = `Search: ${g_SearchString}`;
    g_FontListPTD.get(player.id).search?.setString(g_TextDrawString);
  }
}

export function applyFontListRowApplied(player: Player, row: number) {
  const appliedRow = g_FontListData.get(player.id).appliedRow;
  const boxColorRgba = row === appliedRow ? 0xffffff64 : 0x00000000;
  g_FontListPTD.get(player.id).row[row]?.setBoxColors(boxColorRgba).show();
}

export function applyFontListRowData(player: Player) {
  for (let row = 0; row < MAX_FONTLIST_ROWS; row++) {
    const rowFontId = g_FontListData.get(player.id).rowFontId[row];

    if (rowFontId === INVALID_FONT_ID) {
      g_FontListPTD.get(player.id).row[row]?.hide();
      continue;
    }

    const g_FontString = getFontName(rowFontId);

    g_FontListPTD.get(player.id).row[row]?.setString(g_FontString || "");

    applyFontListRowApplied(player, row);
  }
}

export async function showFontListDialog(player: Player, dialogId: number) {
  let g_DialogInfo = "";
  switch (dialogId) {
    case DIALOG_ID.FONTLIST_PAGE: {
      const _page = g_FontListData.get(player.id).page + 1;
      const _pageMax = g_FontListData.get(player.id).maxPage + 1;
      g_DialogInfo = `Page: ${_page} / ${_pageMax}`;
      const res = await new Dialog({
        style: DialogStylesEnum.INPUT,
        caption: "Font List: Page",
        info: g_DialogInfo,
        button1: "Enter",
        button2: "Back",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    case DIALOG_ID.FONTLIST_SEARCH: {
      const g_SearchString = g_FontListData.get(player.id).search;
      if (!g_SearchString.trim().length) {
        g_DialogInfo = "You are not searching for anything.";
      } else {
        g_DialogInfo = `Searching for: ${g_SearchString}`;
      }
      const res = await new Dialog({
        style: DialogStylesEnum.INPUT,
        caption: "Font List: Search",
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
