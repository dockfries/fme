import {
  applyActorAnimationData,
  defaultActorAnimationData,
  g_ActorData,
  showActorDialog,
} from "@/actor";
import { findAnimations, INVALID_ANIM_INDEX } from "@/anim";
import { INVALID_ROW, RGBA_RED, RGBA_WHITE } from "@/constants";
import { DIALOG_ID } from "@/dialog";
import { g_PlayerData, getPlayerEditActor } from "@/player";
import { MAX_SELECT_LIST_ROWS } from "@/selectList";
import { hidePlayerTextDrawMode, TD_MODE } from "@/tdMode";
import { SafetyMap } from "@/utils/safetyMap";
import {
  Actor,
  Dialog,
  DialogStylesEnum,
  GameMode,
  IDialogResCommon,
  InvalidEnum,
  Player,
  PlayerEvent,
  TextDraw,
  TextDrawEvent,
} from "@infernus/core";

export const MAX_ANIM_LIST_ROWS = 20;
export const MIN_ANIM_LIST_PAGE = 0;

export interface IAnimListGtd {
  bg: TextDraw | null;
  caption: TextDraw | null;
  close: TextDraw | null;
  columnIndex: TextDraw | null;
  columnLibrary: TextDraw | null;
  columnName: TextDraw | null;
  pageF: TextDraw | null;
  pageP: TextDraw | null;
  pageN: TextDraw | null;
  pageL: TextDraw | null;
}

export interface IAnimListPtd {
  search: TextDraw | null;
  page: TextDraw | null;
  rowIndex: (TextDraw | null)[];
  rowLibrary: (TextDraw | null)[];
  rowName: (TextDraw | null)[];
}

export interface IAnimListData {
  page: number;
  maxPage: number;
  search: string;
  rowIndex: number[];
  coloredRow: number;
}

export const g_AnimListGTD: IAnimListGtd = {
  bg: null,
  caption: null,
  close: null,
  columnIndex: null,
  columnLibrary: null,
  columnName: null,
  pageF: null,
  pageP: null,
  pageN: null,
  pageL: null,
};

export const g_AnimListPTD = new SafetyMap<number, IAnimListPtd>(() => {
  return {
    search: null,
    page: null,
    rowIndex: Array.from({ length: MAX_ANIM_LIST_ROWS }, () => null),
    rowLibrary: Array.from({ length: MAX_ANIM_LIST_ROWS }, () => null),
    rowName: Array.from({ length: MAX_ANIM_LIST_ROWS }, () => null),
  };
});

export const g_AnimListData = new SafetyMap<number, IAnimListData>(() => {
  return {
    page: 0,
    maxPage: 0,
    search: "",
    rowIndex: Array.from(
      { length: MAX_ANIM_LIST_ROWS },
      () => INVALID_ANIM_INDEX
    ),
    coloredRow: 0,
  };
});

GameMode.onInit(({ next }) => {
  createGenericAnimationList();

  Player.getInstances().forEach((p) => {
    if (p.isConnected()) {
      defaultAnimationListData(p);
    }
  });

  return next();
});

GameMode.onExit(({ next }) => {
  destroyGenericAnimationList();
  g_AnimListPTD.clear();
  g_AnimListData.clear();
  return next();
});

PlayerEvent.onConnect(({ player, next }) => {
  defaultAnimationListData(player);
  return next();
});

function onDialogResponse(
  player: Player,
  res: IDialogResCommon,
  dialogId: number
) {
  const { inputText, response } = res;

  switch (dialogId) {
    case DIALOG_ID.ANIMLIST_PAGE: {
      if (!response) {
        return 1;
      }

      let page = +inputText;

      if (!inputText.trim().length || Number.isNaN(page)) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You did not enter a valid page number!"
        );
        showAnimationListDialog(player, dialogId);
        return 1;
      }

      page--;

      if (
        page < MIN_ANIM_LIST_PAGE ||
        page > g_AnimListData.get(player.id).maxPage
      ) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You did not enter a valid page number!"
        );
        showAnimationListDialog(player, dialogId);
        return 1;
      }

      g_AnimListData.get(player.id).page = page;
      loadAnimationListRowData(player);

      applyAnimationListPage(player);
      applyAnimationListRowData(player);
      return 1;
    }
    case DIALOG_ID.ANIMLIST_SEARCH: {
      if (!response) {
        return 1;
      }

      g_AnimListData.get(player.id).page = MIN_ANIM_LIST_PAGE;
      g_AnimListData.get(player.id).search = inputText;
      loadAnimationListRowData(player);

      applyAnimationListPage(player);
      applyAnimationListSearch(player);
      applyAnimationListRowData(player);
      return 1;
    }
  }
}

TextDrawEvent.onPlayerClickGlobal(({ player, textDraw, next }) => {
  if (
    g_PlayerData.get(player.id).tdMode === TD_MODE.ANIMLIST &&
    textDraw === InvalidEnum.TEXT_DRAW
  ) {
    hidePlayerTextDrawMode(player);
  }

  if (textDraw === g_AnimListGTD.close) {
    showActorDialog(player, DIALOG_ID.ACTOR_MAIN);
    hidePlayerTextDrawMode(player);
    return 1;
  }

  if (textDraw === g_AnimListGTD.pageF) {
    if (g_AnimListData.get(player.id).page === MIN_ANIM_LIST_PAGE) {
      return 1;
    }

    g_AnimListData.get(player.id).page = MIN_ANIM_LIST_PAGE;
    loadAnimationListRowData(player);

    applyAnimationListPage(player);
    applyAnimationListRowData(player);
    return 1;
  }
  if (textDraw === g_AnimListGTD.pageP) {
    if (g_AnimListData.get(player.id).page === MIN_ANIM_LIST_PAGE) {
      return 1;
    }

    if (--g_AnimListData.get(player.id).page < MIN_ANIM_LIST_PAGE) {
      g_AnimListData.get(player.id).page = MIN_ANIM_LIST_PAGE;
    }
    loadAnimationListRowData(player);

    applyAnimationListPage(player);
    applyAnimationListRowData(player);
    return 1;
  }
  if (textDraw === g_AnimListGTD.pageN) {
    if (
      g_AnimListData.get(player.id).page ===
      g_AnimListData.get(player.id).maxPage
    ) {
      return 1;
    }

    if (
      ++g_AnimListData.get(player.id).page >
      g_AnimListData.get(player.id).maxPage
    ) {
      g_AnimListData.get(player.id).page = g_AnimListData.get(
        player.id
      ).maxPage;
    }
    loadAnimationListRowData(player);

    applyAnimationListPage(player);
    applyAnimationListRowData(player);
    return 1;
  }
  if (textDraw === g_AnimListGTD.pageL) {
    if (
      g_AnimListData.get(player.id).page ===
      g_AnimListData.get(player.id).maxPage
    ) {
      return 1;
    }

    g_AnimListData.get(player.id).page = g_AnimListData.get(player.id).maxPage;
    loadAnimationListRowData(player);

    applyAnimationListPage(player);
    applyAnimationListRowData(player);
    return 1;
  }

  return next();
});

TextDrawEvent.onPlayerClickPlayer(({ player, textDraw, next }) => {
  if (textDraw === g_AnimListPTD.get(player.id).page) {
    showAnimationListDialog(player, DIALOG_ID.ANIMLIST_PAGE);
    return 1;
  }
  if (textDraw === g_AnimListPTD.get(player.id).search) {
    showAnimationListDialog(player, DIALOG_ID.ANIMLIST_SEARCH);
    return 1;
  }
  for (let row = 0; row < MAX_SELECT_LIST_ROWS; row++) {
    if (
      textDraw === g_AnimListPTD.get(player.id).rowIndex[row] ||
      textDraw === g_AnimListPTD.get(player.id).rowLibrary[row] ||
      textDraw === g_AnimListPTD.get(player.id).rowName[row]
    ) {
      const rowAnimIdx = g_AnimListData.get(player.id).rowIndex[row];
      if (rowAnimIdx === INVALID_ANIM_INDEX) {
        return 1;
      }

      const actorId = getPlayerEditActor(player);
      const actor = Actor.getInstance(actorId);
      if (!actor || !actor.isValid()) {
        return 1;
      }

      if (g_ActorData.get(actor.id).animIndex === INVALID_ANIM_INDEX) {
        defaultActorAnimationData(actor.id);
      }

      g_ActorData.get(actor.id).animIndex = rowAnimIdx;
      applyActorAnimationData(actor);

      const prevRow = g_AnimListData.get(player.id).coloredRow;
      if (row !== prevRow) {
        g_AnimListData.get(player.id).coloredRow = row;

        if (prevRow !== INVALID_ROW) {
          applyAnimationListRowColor(player, prevRow);
        }

        applyAnimationListRowColor(player, row);
      }
      return 1;
    }
  }

  return next();
});

export function defaultAnimationListData(player: Player) {
  g_AnimListData.get(player.id).page = MIN_ANIM_LIST_PAGE;
  g_AnimListData.get(player.id).maxPage = MIN_ANIM_LIST_PAGE;

  for (let row = 0; row < MAX_ANIM_LIST_ROWS; row++) {
    g_AnimListData.get(player.id).rowIndex[row] = INVALID_ANIM_INDEX;
  }

  g_AnimListData.get(player.id).coloredRow = INVALID_ROW;
}

export function createGenericAnimationList() {
  g_AnimListGTD.bg = new TextDraw({
    x: 96.0,
    y: 138.0,
    text: "_",
  })
    .create()
    .setAlignment(2)
    .setLetterSize(0.5, 34.3)
    .useBox(true)
    .setBoxColors(100)
    .setTextSize(0.0, 190.0);

  g_AnimListGTD.caption = new TextDraw({
    x: 2.0,
    y: 125.0,
    text: "Animations",
  })
    .create()
    .setBackgroundColors(255)
    .setFont(0)
    .setLetterSize(0.5, 2.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true);

  g_AnimListGTD.close = new TextDraw({
    x: 181.0,
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

  g_AnimListGTD.pageF = new TextDraw({
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

  g_AnimListGTD.pageP = new TextDraw({
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

  g_AnimListGTD.pageN = new TextDraw({
    x: 158.0,
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

  g_AnimListGTD.pageL = new TextDraw({
    x: 181.0,
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

  g_AnimListGTD.columnIndex = new TextDraw({
    x: 1.0,
    y: 177.0,
    text: "Index",
  })
    .create()
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true)
    .setTextSize(30.0, 10.0);

  g_AnimListGTD.columnLibrary = new TextDraw({
    x: 33.0,
    y: 177.0,
    text: "Library",
  })
    .create()
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true)
    .setTextSize(90.0, 10.0);

  g_AnimListGTD.columnName = new TextDraw({
    x: 140.0,
    y: 177.0,
    text: "Name",
  })
    .create()
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true)
    .setTextSize(191.0, 10.0);
}

export function destroyGenericAnimationList() {
  Object.entries(g_AnimListGTD).forEach((item) => {
    const [key, gtd] = item as unknown as [
      keyof IAnimListGtd,
      (typeof g_AnimListGTD)[keyof IAnimListGtd]
    ];
    if (gtd && gtd.isValid()) {
      gtd.destroy();
    }
    g_AnimListGTD[key] = null;
  });
}

export function createPlayerAnimationList(player: Player) {
  g_AnimListPTD.get(player.id).page = new TextDraw({
    x: 96.0,
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
    .setTextSize(10.0, 97.0)
    .setSelectable(true);

  g_AnimListPTD.get(player.id).search = new TextDraw({
    x: 96.0,
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
    .setTextSize(10.0, 190.0)
    .setSelectable(true);

  for (let row = 0, y = 190.0; row < MAX_ANIM_LIST_ROWS; row++, y += 13.0) {
    g_AnimListPTD.get(player.id).rowIndex[row] = new TextDraw({
      x: 1.0,
      y,
      text: "INDEX",
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
      .setTextSize(30.0, 10.0)
      .setSelectable(true);

    g_AnimListPTD.get(player.id).rowLibrary[row] = new TextDraw({
      x: 33.0,
      y,
      text: "LIB",
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
      .setTextSize(90.0, 10.0)
      .setSelectable(true);

    g_AnimListPTD.get(player.id).rowName[row] = new TextDraw({
      x: 93.0,
      y,
      text: "NAME",
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
      .setTextSize(191.0, 10.0)
      .setSelectable(true);
  }
}

export function destroyPlayerAnimationList(player: Player) {
  Object.entries(g_AnimListPTD.get(player.id)).forEach((item) => {
    const [key, ptd] = item as unknown as [
      keyof IAnimListPtd,
      IAnimListPtd[keyof IAnimListPtd]
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
      g_AnimListPTD.get(player.id)[key] = null!;
    }
  });
}

export function showAnimationList(player: Player) {
  createPlayerAnimationList(player);

  Object.values(g_AnimListGTD).forEach(
    (gtd: IAnimListGtd[keyof IAnimListGtd]) => {
      if (gtd && gtd.isValid()) {
        gtd.show(player);
      }
    }
  );

  loadAnimationListRowData(player);
  applyAnimationListPage(player);
  g_AnimListPTD.get(player.id).page?.show();

  applyAnimationListSearch(player);
  g_AnimListPTD.get(player.id).search?.show();

  applyAnimationListRowData(player);
}

export function hideAnimationList(player: Player) {
  destroyPlayerAnimationList(player);

  Object.values(g_AnimListGTD).forEach(
    (gtd: IAnimListGtd[keyof IAnimListGtd]) => {
      if (gtd && gtd.isValid()) {
        gtd.hide(player);
      }
    }
  );
}

export function getAnimationListNewColoredRow(player: Player) {
  const actorId = getPlayerEditActor(player);
  const actor = Actor.getInstance(actorId);
  if (!actor || !actor.isValid()) {
    return INVALID_ROW;
  }

  const actorAnimIdx = g_ActorData.get(actor.id).animIndex;
  if (actorAnimIdx === INVALID_ANIM_INDEX) {
    return INVALID_ROW;
  }

  for (let row = 0, rowAnimIdx = 0; row < MAX_ANIM_LIST_ROWS; row++) {
    rowAnimIdx = g_AnimListData.get(player.id).rowIndex[row];

    if (actorAnimIdx === rowAnimIdx) {
      return row;
    }
  }
  return INVALID_ROW;
}

export function applyAnimationListRowColor(player: Player, row: number) {
  const coloredRow = g_AnimListData.get(player.id).coloredRow;
  const rgbaBoxColor = row === coloredRow ? 0xffffff64 : 0x00000000;

  g_AnimListPTD.get(player.id).rowIndex[row]?.setBoxColors(rgbaBoxColor).show();
  g_AnimListPTD
    .get(player.id)
    .rowLibrary[row]?.setBoxColors(rgbaBoxColor)
    .show();
  g_AnimListPTD.get(player.id).rowName[row]?.setBoxColors(rgbaBoxColor).show();
}

export function applyAnimationListRowData(player: Player) {
  for (let row = 0, rowAnimIdx = 0; row < MAX_ANIM_LIST_ROWS; row++) {
    rowAnimIdx = g_AnimListData.get(player.id).rowIndex[row];

    if (rowAnimIdx === INVALID_ANIM_INDEX) {
      g_AnimListPTD.get(player.id).rowIndex[row]?.hide();
      g_AnimListPTD.get(player.id).rowLibrary[row]?.hide();
      g_AnimListPTD.get(player.id).rowName[row]?.hide();
      continue;
    }

    const { animLib: g_AnimLibString, animName: g_AnimNameString } =
      GameMode.getAnimationName(rowAnimIdx);

    const g_IntegerString = rowAnimIdx.toString();

    g_AnimListPTD.get(player.id).rowIndex[row]?.setString(g_IntegerString);
    g_AnimListPTD.get(player.id).rowLibrary[row]?.setString(g_AnimLibString);
    g_AnimListPTD.get(player.id).rowName[row]?.setString(g_AnimNameString);

    applyAnimationListRowColor(player, row);
  }
}

export function applyAnimationListPage(player: Player) {
  const _page = g_AnimListData.get(player.id).page + 1;
  const _pageMax = g_AnimListData.get(player.id).maxPage + 1;
  const g_TextDrawString = `Page: ${_page} / ${_pageMax}`;
  g_AnimListPTD.get(player.id).page?.setString(g_TextDrawString);
}

export function applyAnimationListSearch(player: Player) {
  const g_SearchString = g_AnimListData.get(player.id).search;
  if (!g_SearchString.trim().length) {
    g_AnimListPTD.get(player.id).search?.setString("Search");
  } else {
    const g_TextDrawString = `Search: ${g_SearchString}`;
    g_AnimListPTD.get(player.id).search?.setString(g_TextDrawString);
  }
}

export function loadAnimationListRowData(player: Player) {
  const g_SearchString = g_AnimListData.get(player.id).search;

  const { rowsAdded, maxOffset } = findAnimations(
    g_AnimListData.get(player.id).rowIndex,
    MAX_ANIM_LIST_ROWS,
    g_SearchString,
    g_AnimListData.get(player.id).page * MAX_ANIM_LIST_ROWS
  );

  for (let row = rowsAdded; row < MAX_ANIM_LIST_ROWS; row++) {
    g_AnimListData.get(player.id).rowIndex[row] = INVALID_ANIM_INDEX;
  }

  g_AnimListData.get(player.id).maxPage = Math.ceil(
    maxOffset / MAX_ANIM_LIST_ROWS
  );

  g_AnimListData.get(player.id).coloredRow =
    getAnimationListNewColoredRow(player);
}

export async function showAnimationListDialog(
  player: Player,
  dialogId: number
) {
  let g_DialogInfo = "";
  switch (dialogId) {
    case DIALOG_ID.ANIMLIST_PAGE: {
      const _page = g_AnimListData.get(player.id).page + 1;
      const _pageMax = g_AnimListData.get(player.id).maxPage + 1;
      g_DialogInfo = `Page: ${_page} / ${_pageMax}`;
      const res = await new Dialog({
        style: DialogStylesEnum.INPUT,
        caption: "Animation List: Page",
        info: g_DialogInfo,
        button1: "Enter",
        button2: "Cancel",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    case DIALOG_ID.ANIMLIST_SEARCH: {
      const g_SearchString = g_AnimListData.get(player.id).search;
      if (!g_SearchString.trim().length) {
        g_DialogInfo = "You are not searching for anything.";
      } else {
        g_DialogInfo = `Searching for: ${g_SearchString}`;
      }
      const res = await new Dialog({
        style: DialogStylesEnum.INPUT,
        caption: "Animation List: Search",
        info: g_DialogInfo,
        button1: "Enter",
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
