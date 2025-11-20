import {
  createModelCategory,
  createModelCategoryBind,
  createSkinCategory,
  createSkinCategoryBind,
  createTextureCategory,
  createTextureCategoryBind,
  createVehicleCategory,
  createVehicleCategoryBind,
  destroyModelCategory,
  destroyModelCategoryBind,
  destroySkinCategory,
  destroySkinCategoryBind,
  destroyTextureCategory,
  destroyTextureCategoryBind,
  destroyVehicleCategory,
  destroyVehicleCategoryBind,
  getModelCategoryName,
  getSkinCategoryName,
  getTextureCategoryName,
  getVehicleCategoryName,
  INVALID_CATEGORY_ID,
  renameModelCategory,
  renameSkinCategory,
  renameTextureCategory,
  renameVehicleCategory,
} from "@/category";
import {
  defaultCategorySelectData,
  loadCategorySelectData,
  showCategorySelect,
} from "@/catSelect";
import {
  INVALID_MODEL_ID,
  INVALID_ROW,
  RGBA_GREEN,
  RGBA_RED,
  RGBA_WHITE,
} from "@/constants";
import { DIALOG_ID } from "@/dialog";
import { getModelName, findModels } from "@/model";
import {
  g_ModelViewData,
  applyModelViewModel,
  showModelView,
  hideModelView,
} from "@/modelView";
import { g_PlayerData } from "@/player";
import { findSkins, getSkinName } from "@/skin";
import {
  hidePlayerTextDrawMode,
  showPlayerTextDrawMode,
  TD_MODE,
} from "@/tdMode";
import { INVALID_TEXTURE_ID, getTextureData, findTextures } from "@/texture";
import { destroyTextureView, refreshTextureView } from "@/textureView";
import { SafetyMap } from "@/utils/safetyMap";
import { getVehicleModelName, findVehicleModels } from "@/vehModel";
import {
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

export const MAX_CAT_MANAGER_ROWS = 10;
export const MIN_CAT_MANAGER_PAGE = 0;
export const CAT_MANAGER_WINDOW_ALL = false;
export const CAT_MANAGER_WINDOW_CAT = true;
export const CAT_MANAGER_DELETE_CODE = "delete";

export interface ICatManagerGtd {
  bg: TextDraw | null;
  caption: TextDraw | null;
  close: TextDraw | null;
  categoryCreate: TextDraw | null;
  categoryDestroy: TextDraw | null;
  categoryRename: TextDraw | null;
  categoryBelow: TextDraw | null;
  pageFAll: TextDraw | null;
  pageFCat: TextDraw | null;
  pagePAll: TextDraw | null;
  pagePCat: TextDraw | null;
  pageNAll: TextDraw | null;
  pageNCat: TextDraw | null;
  pageLAll: TextDraw | null;
  pageLCat: TextDraw | null;
}

export interface ICatManagerPtd {
  typeModels: TextDraw | null;
  typeVehicles: TextDraw | null;
  typeSkins: TextDraw | null;
  typeTextures: TextDraw | null;
  categoryName: TextDraw | null;
  pageAll: TextDraw | null;
  pageCat: TextDraw | null;
  searchAll: TextDraw | null;
  searchCat: TextDraw | null;
  col1All: TextDraw | null;
  col1Cat: TextDraw | null;
  col2All: TextDraw | null;
  col2Cat: TextDraw | null;
  col3All: TextDraw | null;
  col3Cat: TextDraw | null;
  row1All: (TextDraw | null)[];
  row1Cat: (TextDraw | null)[];
  row2All: (TextDraw | null)[];
  row2Cat: (TextDraw | null)[];
  row3All: (TextDraw | null)[];
  row3Cat: (TextDraw | null)[];
}

export interface ICatManagerData {
  category: number;
  selectId: number;
  selectRow: number;
  selectWindow: boolean;
  pageAll: number;
  pageCat: number;
  maxPageAll: number;
  maxPageCat: number;
  searchAll: string;
  searchCat: string;
  rowIdAll: number[];
  rowIdCat: number[];
}

export const g_CatManagerData = new SafetyMap<number, ICatManagerData>(() => {
  return {
    category: 0,
    selectId: 0,
    selectRow: 0,
    selectWindow: CAT_MANAGER_WINDOW_ALL,
    pageAll: MIN_CAT_MANAGER_PAGE,
    pageCat: MIN_CAT_MANAGER_PAGE,
    maxPageAll: 0,
    maxPageCat: 0,
    searchAll: "",
    searchCat: "",
    rowIdAll: Array.from(
      { length: MAX_CAT_MANAGER_ROWS },
      () => INVALID_MODEL_ID
    ),
    rowIdCat: Array.from(
      { length: MAX_CAT_MANAGER_ROWS },
      () => INVALID_MODEL_ID
    ),
  };
});

export const g_CatManagerGTD: ICatManagerGtd = {
  bg: null,
  caption: null,
  close: null,
  categoryCreate: null,
  categoryDestroy: null,
  categoryRename: null,
  categoryBelow: null,
  pageFAll: null,
  pageFCat: null,
  pagePAll: null,
  pagePCat: null,
  pageNAll: null,
  pageNCat: null,
  pageLAll: null,
  pageLCat: null,
};

export const g_CatManagerPTD = new SafetyMap<number, ICatManagerPtd>(() => {
  return {
    typeModels: null,
    typeVehicles: null,
    typeSkins: null,
    typeTextures: null,
    categoryName: null,
    pageAll: null,
    pageCat: null,
    searchAll: null,
    searchCat: null,
    col1All: null,
    col1Cat: null,
    col2All: null,
    col2Cat: null,
    col3All: null,
    col3Cat: null,
    row1All: Array.from({ length: MAX_CAT_MANAGER_ROWS }, () => null),
    row1Cat: Array.from({ length: MAX_CAT_MANAGER_ROWS }, () => null),
    row2All: Array.from({ length: MAX_CAT_MANAGER_ROWS }, () => null),
    row2Cat: Array.from({ length: MAX_CAT_MANAGER_ROWS }, () => null),
    row3All: Array.from({ length: MAX_CAT_MANAGER_ROWS }, () => null),
    row3Cat: Array.from({ length: MAX_CAT_MANAGER_ROWS }, () => null),
  };
});

GameMode.onInit(({ next }) => {
  createGenericCategoryManager();
  Player.getInstances().forEach((p) => {
    if (p.isConnected()) {
      defaultCategoryManagerData(p);
    }
  });
  return next();
});

GameMode.onExit(({ next }) => {
  destroyGenericCategoryManager();
  g_CatManagerData.clear();
  g_CatManagerPTD.clear();
  return next();
});

PlayerEvent.onConnect(({ player, next }) => {
  defaultCategoryManagerData(player);
  return next();
});

function onDialogResponse(
  player: Player,
  res: IDialogResCommon,
  dialogId: number
) {
  const { inputText, response } = res;

  switch (dialogId) {
    case DIALOG_ID.CATMANAGER_CAT_CREATE: {
      if (!response) {
        return 1;
      }

      if (!inputText.trim().length) {
        showCategoryManagerDialog(player, dialogId);
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You did not enter anything into the textfield!"
        );
        return 1;
      }

      let createSuccess = false;

      switch (g_PlayerData.get(player.id).tdMode) {
        case TD_MODE.CATMANAGER_MODELS: {
          createSuccess = createModelCategory(inputText);
          break;
        }
        case TD_MODE.CATMANAGER_VEHICLES: {
          createSuccess = createVehicleCategory(inputText);
          break;
        }
        case TD_MODE.CATMANAGER_SKINS: {
          createSuccess = createSkinCategory(inputText);
          break;
        }
        case TD_MODE.CATMANAGER_TEXTURES: {
          createSuccess = createTextureCategory(inputText);
          break;
        }
        default: {
          return 1;
        }
      }

      if (createSuccess) {
        player.sendClientMessage(RGBA_GREEN, "Category created successfully.");
      } else {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: Category could not be created!"
        );
        showCategoryManagerDialog(player, dialogId);
      }
      return 1;
    }
    case DIALOG_ID.CATMANAGER_CAT_DESTROY: {
      if (!response) {
        return 1;
      }

      if (inputText !== CAT_MANAGER_DELETE_CODE) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You did not enter the correct delete code!"
        );
        showCategoryManagerDialog(player, dialogId);
        return 1;
      }

      const categoryId = g_CatManagerData.get(player.id).category;
      if (categoryId === INVALID_CATEGORY_ID) {
        return 1;
      }

      let success = false;

      switch (g_PlayerData.get(player.id).tdMode) {
        case TD_MODE.CATMANAGER_MODELS: {
          success = destroyModelCategory(categoryId);
          break;
        }
        case TD_MODE.CATMANAGER_VEHICLES: {
          success = destroyVehicleCategory(categoryId);
          break;
        }
        case TD_MODE.CATMANAGER_SKINS: {
          success = destroySkinCategory(categoryId);
          break;
        }
        case TD_MODE.CATMANAGER_TEXTURES: {
          success = destroyTextureCategory(categoryId);
          break;
        }
        default: {
          return 1;
        }
      }

      if (success) {
        player.sendClientMessage(
          RGBA_GREEN,
          "Category destroyed successfully."
        );

        setCategoryManagerPage(
          player,
          CAT_MANAGER_WINDOW_CAT,
          MIN_CAT_MANAGER_PAGE
        );
        g_CatManagerData.get(player.id).category = INVALID_CATEGORY_ID;
        loadCategoryManagerRowData(player, CAT_MANAGER_WINDOW_CAT);

        applyCategoryManagerPage(player, CAT_MANAGER_WINDOW_CAT);
        applyCategoryManagerCatName(player);
        applyCategoryManagerRowData(player, CAT_MANAGER_WINDOW_CAT);
      } else {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: This category could not be removed!"
        );
        showCategoryManagerDialog(player, dialogId);
      }
      return 1;
    }
    case DIALOG_ID.CATMANAGER_CAT_RENAME: {
      if (!response) {
        return 1;
      }

      if (!inputText.trim().length) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You did not enter anything into the textfield!"
        );
        showCategoryManagerDialog(player, dialogId);
        return 1;
      }

      const categoryId = g_CatManagerData.get(player.id).category;
      if (categoryId === INVALID_CATEGORY_ID) {
        return 1;
      }

      let success = false;

      switch (g_PlayerData.get(player.id).tdMode) {
        case TD_MODE.CATMANAGER_MODELS: {
          success = renameModelCategory(categoryId, inputText);
          break;
        }
        case TD_MODE.CATMANAGER_VEHICLES: {
          success = renameVehicleCategory(categoryId, inputText);
          break;
        }
        case TD_MODE.CATMANAGER_SKINS: {
          success = renameSkinCategory(categoryId, inputText);
          break;
        }
        case TD_MODE.CATMANAGER_TEXTURES: {
          success = renameTextureCategory(categoryId, inputText);
          break;
        }
        default: {
          return 1;
        }
      }

      if (success) {
        player.sendClientMessage(RGBA_GREEN, "Category renamed successfully.");

        applyCategoryManagerCatName(player);
      } else {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: This category could not be renamed!"
        );
        showCategoryManagerDialog(player, dialogId);
      }
      return 1;
    }
    case DIALOG_ID.CATMANAGER_PAGE_ALL:
    case DIALOG_ID.CATMANAGER_PAGE_CAT: {
      if (!response) {
        return 1;
      }

      const window =
        dialogId === DIALOG_ID.CATMANAGER_PAGE_ALL
          ? CAT_MANAGER_WINDOW_ALL
          : CAT_MANAGER_WINDOW_CAT;
      const maxPage = getCategoryManagerMaxPage(player, window);
      const page = +inputText;

      if (
        !inputText.trim().length ||
        Number.isNaN(page) ||
        page - 1 < MIN_CAT_MANAGER_PAGE ||
        page - 1 > maxPage
      ) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You did not enter a valid page number!"
        );
        showCategoryManagerDialog(player, dialogId);
        return 1;
      }

      setCategoryManagerPage(player, window, page - 1);
      loadCategoryManagerRowData(player, window);

      applyCategoryManagerPage(player, window);
      applyCategoryManagerRowData(player, window);
      return 1;
    }
    case DIALOG_ID.CATMANAGER_SEARCH_ALL:
    case DIALOG_ID.CATMANAGER_SEARCH_CAT: {
      if (!response) {
        return 1;
      }

      const window =
        dialogId === DIALOG_ID.CATMANAGER_SEARCH_ALL
          ? CAT_MANAGER_WINDOW_ALL
          : CAT_MANAGER_WINDOW_CAT;

      setCategoryManagerSearch(player, window, inputText);
      setCategoryManagerPage(player, window, MIN_CAT_MANAGER_PAGE);
      loadCategoryManagerRowData(player, window);

      applyCategoryManagerSearch(player, window);
      applyCategoryManagerPage(player, window);
      applyCategoryManagerRowData(player, window);
      return 1;
    }
  }

  return 0;
}

TextDrawEvent.onPlayerClickGlobal(({ player, textDraw, next }) => {
  if (textDraw === InvalidEnum.TEXT_DRAW) {
    switch (g_PlayerData.get(player.id).tdMode) {
      case TD_MODE.CATMANAGER_MODELS:
      case TD_MODE.CATMANAGER_VEHICLES:
      case TD_MODE.CATMANAGER_SKINS:
      case TD_MODE.CATMANAGER_TEXTURES: {
        hidePlayerTextDrawMode(player);
        break;
      }
    }
  }
  if (textDraw === g_CatManagerGTD.close) {
    hidePlayerTextDrawMode(player);
    return 1;
  }
  if (textDraw === g_CatManagerGTD.categoryCreate) {
    showCategoryManagerDialog(player, DIALOG_ID.CATMANAGER_CAT_CREATE);
    return 1;
  }
  if (textDraw === g_CatManagerGTD.categoryDestroy) {
    showCategoryManagerDialog(player, DIALOG_ID.CATMANAGER_CAT_DESTROY);
    return 1;
  }
  if (textDraw === g_CatManagerGTD.categoryRename) {
    showCategoryManagerDialog(player, DIALOG_ID.CATMANAGER_CAT_RENAME);
    return 1;
  }
  if (
    textDraw === g_CatManagerGTD.pageFAll ||
    textDraw === g_CatManagerGTD.pageFCat
  ) {
    const window =
      textDraw === g_CatManagerGTD.pageFAll
        ? CAT_MANAGER_WINDOW_ALL
        : CAT_MANAGER_WINDOW_CAT;

    if (getCategoryManagerPage(player, window) === MIN_CAT_MANAGER_PAGE) {
      return 1;
    }

    setCategoryManagerPage(player, window, MIN_CAT_MANAGER_PAGE);
    loadCategoryManagerRowData(player, window);

    applyCategoryManagerPage(player, window);
    applyCategoryManagerRowData(player, window);
    return 1;
  }
  if (
    textDraw === g_CatManagerGTD.pagePAll ||
    textDraw === g_CatManagerGTD.pagePCat
  ) {
    const window =
      textDraw === g_CatManagerGTD.pagePAll
        ? CAT_MANAGER_WINDOW_ALL
        : CAT_MANAGER_WINDOW_CAT;
    let page = getCategoryManagerPage(player, window);

    if (page === MIN_CAT_MANAGER_PAGE) {
      return 1;
    }

    if (--page < MIN_CAT_MANAGER_PAGE) {
      page = MIN_CAT_MANAGER_PAGE;
    }

    setCategoryManagerPage(player, window, page);
    loadCategoryManagerRowData(player, window);

    applyCategoryManagerPage(player, window);
    applyCategoryManagerRowData(player, window);
    return 1;
  }
  if (
    textDraw === g_CatManagerGTD.pageNAll ||
    textDraw === g_CatManagerGTD.pageNCat
  ) {
    const window =
      textDraw === g_CatManagerGTD.pageNAll
        ? CAT_MANAGER_WINDOW_ALL
        : CAT_MANAGER_WINDOW_CAT;
    let page = getCategoryManagerPage(player, window);
    const maxPage = getCategoryManagerMaxPage(player, window);

    if (page === maxPage) {
      return 1;
    }

    if (++page > maxPage) {
      page = maxPage;
    }

    setCategoryManagerPage(player, window, page);
    loadCategoryManagerRowData(player, window);

    applyCategoryManagerPage(player, window);
    applyCategoryManagerRowData(player, window);
    return 1;
  }
  if (
    textDraw === g_CatManagerGTD.pageLAll ||
    textDraw === g_CatManagerGTD.pageLCat
  ) {
    const window =
      textDraw === g_CatManagerGTD.pageLAll
        ? CAT_MANAGER_WINDOW_ALL
        : CAT_MANAGER_WINDOW_CAT;
    const maxPage = getCategoryManagerMaxPage(player, window);

    if (getCategoryManagerPage(player, window) === maxPage) {
      return 1;
    }

    setCategoryManagerPage(player, window, maxPage);
    loadCategoryManagerRowData(player, window);

    applyCategoryManagerPage(player, window);
    applyCategoryManagerRowData(player, window);
    return 1;
  }

  return next();
});

TextDrawEvent.onPlayerClickPlayer(({ player, textDraw, next }) => {
  if (textDraw === g_CatManagerPTD.get(player.id).typeModels) {
    showPlayerTextDrawMode(player, TD_MODE.CATMANAGER_MODELS);
    return 1;
  }
  if (textDraw === g_CatManagerPTD.get(player.id).typeVehicles) {
    showPlayerTextDrawMode(player, TD_MODE.CATMANAGER_VEHICLES);
    return 1;
  }
  if (textDraw === g_CatManagerPTD.get(player.id).typeSkins) {
    showPlayerTextDrawMode(player, TD_MODE.CATMANAGER_SKINS);
    return 1;
  }
  if (textDraw === g_CatManagerPTD.get(player.id).typeTextures) {
    showPlayerTextDrawMode(player, TD_MODE.CATMANAGER_TEXTURES);
    return 1;
  }
  if (textDraw === g_CatManagerPTD.get(player.id).categoryName) {
    defaultCategorySelectData(player);
    loadCategorySelectData(player);
    showCategorySelect(player);
    return 1;
  }
  if (textDraw === g_CatManagerPTD.get(player.id).pageAll) {
    showCategoryManagerDialog(player, DIALOG_ID.CATMANAGER_PAGE_ALL);
    return 1;
  }
  if (textDraw === g_CatManagerPTD.get(player.id).pageCat) {
    showCategoryManagerDialog(player, DIALOG_ID.CATMANAGER_PAGE_CAT);
    return 1;
  }
  if (textDraw === g_CatManagerPTD.get(player.id).searchAll) {
    showCategoryManagerDialog(player, DIALOG_ID.CATMANAGER_SEARCH_ALL);
    return 1;
  }
  if (textDraw === g_CatManagerPTD.get(player.id).searchCat) {
    showCategoryManagerDialog(player, DIALOG_ID.CATMANAGER_SEARCH_CAT);
    return 1;
  }

  for (let row = 0; row < MAX_CAT_MANAGER_ROWS; row++) {
    if (
      textDraw === g_CatManagerPTD.get(player.id).row1All[row] ||
      textDraw === g_CatManagerPTD.get(player.id).row2All[row] ||
      textDraw === g_CatManagerPTD.get(player.id).row3All[row] ||
      textDraw === g_CatManagerPTD.get(player.id).row1Cat[row] ||
      textDraw === g_CatManagerPTD.get(player.id).row2Cat[row] ||
      textDraw === g_CatManagerPTD.get(player.id).row3Cat[row]
    ) {
      let window = false;

      if (
        textDraw === g_CatManagerPTD.get(player.id).row1All[row] ||
        textDraw === g_CatManagerPTD.get(player.id).row2All[row] ||
        textDraw === g_CatManagerPTD.get(player.id).row3All[row]
      ) {
        window = CAT_MANAGER_WINDOW_ALL;
      } else {
        window = CAT_MANAGER_WINDOW_CAT;
      }

      const prevWindow = g_CatManagerData.get(player.id).selectWindow;
      const prevRow = g_CatManagerData.get(player.id).selectRow;
      const rowId = getCategoryManagerRowID(player, window, row);
      let isModel = false;

      switch (g_PlayerData.get(player.id).tdMode) {
        case TD_MODE.CATMANAGER_MODELS:
        case TD_MODE.CATMANAGER_VEHICLES:
        case TD_MODE.CATMANAGER_SKINS: {
          isModel = true;
          break;
        }
        default: {
          isModel = false;
        }
      }

      if (isModel && rowId === INVALID_MODEL_ID) {
        return 1;
      }

      if (!isModel && rowId === INVALID_TEXTURE_ID) {
        return 1;
      }

      if (prevWindow !== window || prevRow !== row) {
        g_CatManagerData.get(player.id).selectWindow = window;
        g_CatManagerData.get(player.id).selectRow = row;
        g_CatManagerData.get(player.id).selectId = rowId;

        if (prevRow !== INVALID_ROW) {
          applyCategoryManagerRowColor(player, prevWindow, prevRow);
        }

        applyCategoryManagerRowColor(player, window, row);

        if (isModel) {
          destroyTextureView(player);

          g_ModelViewData.get(player.id).modelId = rowId;
          if (g_ModelViewData.get(player.id).toggle) {
            applyModelViewModel(player, true);
          } else {
            showModelView(player);
          }
        } else {
          hideModelView(player);
          refreshTextureView(player, rowId);
        }
        return 1;
      }

      const categoryId = g_CatManagerData.get(player.id).category;
      if (categoryId === INVALID_CATEGORY_ID) {
        return 1;
      }

      const createBind = window === CAT_MANAGER_WINDOW_ALL;
      let bindSuccess = false;

      switch (g_PlayerData.get(player.id).tdMode) {
        case TD_MODE.CATMANAGER_MODELS: {
          if (createBind) {
            bindSuccess = createModelCategoryBind(categoryId, rowId);
          } else {
            bindSuccess = destroyModelCategoryBind(categoryId, rowId);
          }
          break;
        }
        case TD_MODE.CATMANAGER_VEHICLES: {
          if (createBind) {
            bindSuccess = createVehicleCategoryBind(categoryId, rowId);
          } else {
            bindSuccess = destroyVehicleCategoryBind(categoryId, rowId);
          }
          break;
        }
        case TD_MODE.CATMANAGER_SKINS: {
          if (createBind) {
            bindSuccess = createSkinCategoryBind(categoryId, rowId);
          } else {
            bindSuccess = destroySkinCategoryBind(categoryId, rowId);
          }
          break;
        }
        case TD_MODE.CATMANAGER_TEXTURES: {
          if (createBind) {
            bindSuccess = createTextureCategoryBind(categoryId, rowId);
          } else {
            bindSuccess = destroyTextureCategoryBind(categoryId, rowId);
          }
          break;
        }
      }

      if (bindSuccess) {
        loadCategoryManagerRowData(player, CAT_MANAGER_WINDOW_CAT);
        applyCategoryManagerRowData(player, CAT_MANAGER_WINDOW_CAT);
      } else {
        const g_ClientMessage = `ERROR: This item could not be ${
          createBind ? "added to" : "removed from"
        } the category!`;
        player.sendClientMessage(RGBA_RED, g_ClientMessage);
      }

      return 1;
    }
  }

  return next();
});

export function defaultCategoryManagerData(player: Player) {
  g_CatManagerData.get(player.id).category = INVALID_CATEGORY_ID;

  g_CatManagerData.get(player.id).selectId = INVALID_MODEL_ID;

  g_CatManagerData.get(player.id).selectRow = INVALID_ROW;

  g_CatManagerData.get(player.id).selectWindow = CAT_MANAGER_WINDOW_ALL;

  g_CatManagerData.get(player.id).pageAll = MIN_CAT_MANAGER_PAGE;
  g_CatManagerData.get(player.id).pageCat = MIN_CAT_MANAGER_PAGE;

  g_CatManagerData.get(player.id).maxPageAll = MIN_CAT_MANAGER_PAGE;
  g_CatManagerData.get(player.id).maxPageCat = MIN_CAT_MANAGER_PAGE;

  g_CatManagerData.get(player.id).searchAll = "";
  g_CatManagerData.get(player.id).searchCat = "";

  for (let row = 0; row < MAX_CAT_MANAGER_ROWS; row++) {
    g_CatManagerData.get(player.id).rowIdAll[row] = INVALID_MODEL_ID;
    g_CatManagerData.get(player.id).rowIdCat[row] = INVALID_MODEL_ID;
  }
}

export function createGenericCategoryManager() {
  g_CatManagerGTD.bg = new TextDraw({
    x: 116.0,
    y: 47.0,
    text: "_",
  })
    .create()
    .setAlignment(2)
    .setLetterSize(0.0, 44.4)
    .useBox(true)
    .setBoxColors(100)
    .setTextSize(0.0, 230.0);

  g_CatManagerGTD.caption = new TextDraw({
    x: 2.0,
    y: 35.0,
    text: "Category Manager",
  })
    .create()
    .setBackgroundColors(255)
    .setFont(0)
    .setLetterSize(0.5, 2.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true)
    .setSelectable(false);

  g_CatManagerGTD.close = new TextDraw({
    x: 221.0,
    y: 47.0,
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

  g_CatManagerGTD.categoryCreate = new TextDraw({
    x: 38.0,
    y: 60.0,
    text: "Create Category",
  })
    .create()
    .setAlignment(2)
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true)
    .setTextSize(10.0, 74.0)
    .setSelectable(true);

  g_CatManagerGTD.categoryDestroy = new TextDraw({
    x: 116.0,
    y: 60.0,
    text: "Destroy Category",
  })
    .create()
    .setAlignment(2)
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true)
    .setTextSize(10.0, 74.0)
    .setSelectable(true);

  g_CatManagerGTD.categoryRename = new TextDraw({
    x: 194.0,
    y: 60.0,
    text: "Rename Category",
  })
    .create()
    .setAlignment(2)
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true)
    .setTextSize(10.0, 74.0)
    .setSelectable(true);

  g_CatManagerGTD.pageFAll = new TextDraw({
    x: 11.0,
    y: 99.0,
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

  g_CatManagerGTD.pageFCat = new TextDraw({
    x: 11.0,
    y: 281.0,
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

  g_CatManagerGTD.pagePAll = new TextDraw({
    x: 34.0,
    y: 99.0,
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

  g_CatManagerGTD.pagePCat = new TextDraw({
    x: 34.0,
    y: 281.0,
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

  g_CatManagerGTD.pageNAll = new TextDraw({
    x: 198.0,
    y: 99.0,
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

  g_CatManagerGTD.pageNCat = new TextDraw({
    x: 198.0,
    y: 281.0,
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

  g_CatManagerGTD.pageLAll = new TextDraw({
    x: 221.0,
    y: 99.0,
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

  g_CatManagerGTD.pageLCat = new TextDraw({
    x: 221.0,
    y: 281.0,
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

  g_CatManagerGTD.categoryBelow = new TextDraw({
    x: 116.0,
    y: 268.0,
    text: "Category Models Below",
  })
    .create()
    .setAlignment(2)
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true)
    .useBox(true)
    .setBoxColors(0xffffff64)
    .setTextSize(0.0, 230.0)
    .setSelectable(false);
}

export function destroyGenericCategoryManager() {
  Object.entries(g_CatManagerGTD).forEach((item) => {
    const [key, gtd] = item as unknown as [
      keyof ICatManagerGtd,
      (typeof g_CatManagerGTD)[keyof ICatManagerGtd]
    ];
    if (gtd && gtd.isValid()) {
      gtd.destroy();
    }
    g_CatManagerGTD[key] = null;
  });
}

export function createPlayerCategoryManager(player: Player) {
  g_CatManagerPTD.get(player.id).typeModels = new TextDraw({
    x: 29.0,
    y: 73.0,
    text: "Models",
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
    .useBox(true)
    .setBoxColors(0x0)
    .setTextSize(10.0, 55.0)
    .setSelectable(true);

  g_CatManagerPTD.get(player.id).typeVehicles = new TextDraw({
    x: 87.0,
    y: 73.0,
    text: "Vehicles",
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
    .useBox(true)
    .setBoxColors(0x0)
    .setTextSize(10.0, 55.0)
    .setSelectable(true);

  g_CatManagerPTD.get(player.id).typeSkins = new TextDraw({
    x: 145.0,
    y: 73.0,
    text: "Skins",
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
    .useBox(true)
    .setBoxColors(0x0)
    .setTextSize(10.0, 55.0)
    .setSelectable(true);

  g_CatManagerPTD.get(player.id).typeTextures = new TextDraw({
    x: 203.0,
    y: 73.0,
    text: "Textures",
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
    .useBox(true)
    .setBoxColors(0x0)
    .setTextSize(10.0, 55.0)
    .setSelectable(true);

  g_CatManagerPTD.get(player.id).categoryName = new TextDraw({
    x: 116.0,
    y: 86.0,
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

  g_CatManagerPTD.get(player.id).pageAll = new TextDraw({
    x: 116.0,
    y: 99.0,
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

  g_CatManagerPTD.get(player.id).pageCat = new TextDraw({
    x: 116.0,
    y: 281.0,
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

  g_CatManagerPTD.get(player.id).searchAll = new TextDraw({
    x: 116.0,
    y: 112.0,
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

  g_CatManagerPTD.get(player.id).searchCat = new TextDraw({
    x: 116.0,
    y: 294.0,
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

  if (g_PlayerData.get(player.id).tdMode === TD_MODE.CATMANAGER_TEXTURES) {
    g_CatManagerPTD.get(player.id).col1All = new TextDraw({
      x: 1.0,
      y: 125.0,
      text: "Model ID",
      player,
    })
      .create()
      .setBackgroundColors(255)
      .setFont(1)
      .setLetterSize(0.2, 1.0)
      .setColor(RGBA_WHITE)
      .setOutline(1)
      .setProportional(true);

    g_CatManagerPTD.get(player.id).col1Cat = new TextDraw({
      x: 1.0,
      y: 307.0,
      text: "Model ID",
      player,
    })
      .create()
      .setBackgroundColors(255)
      .setFont(1)
      .setLetterSize(0.2, 1.0)
      .setColor(RGBA_WHITE)
      .setOutline(1)
      .setProportional(true);

    g_CatManagerPTD.get(player.id).col2All = new TextDraw({
      x: 43.0,
      y: 125.0,
      text: "Txd",
      player,
    })
      .create()
      .setBackgroundColors(255)
      .setFont(1)
      .setLetterSize(0.2, 1.0)
      .setColor(RGBA_WHITE)
      .setOutline(1)
      .setProportional(true);

    g_CatManagerPTD.get(player.id).col2Cat = new TextDraw({
      x: 43.0,
      y: 307.0,
      text: "Txd",
      player,
    })
      .create()
      .setBackgroundColors(255)
      .setFont(1)
      .setLetterSize(0.2, 1.0)
      .setColor(RGBA_WHITE)
      .setOutline(1)
      .setProportional(true);

    g_CatManagerPTD.get(player.id).col3All = new TextDraw({
      x: 114.0,
      y: 125.0,
      text: "Name",
    })
      .create()
      .setBackgroundColors(255)
      .setFont(1)
      .setLetterSize(0.2, 1.0)
      .setColor(RGBA_WHITE)
      .setOutline(1)
      .setProportional(true);

    g_CatManagerPTD.get(player.id).col3Cat = new TextDraw({
      x: 114.0,
      y: 307.0,
      text: "Name",
    })
      .create()
      .setBackgroundColors(255)
      .setFont(1)
      .setLetterSize(0.2, 1.0)
      .setColor(RGBA_WHITE)
      .setOutline(1)
      .setProportional(true);

    for (let row = 0; row < MAX_CAT_MANAGER_ROWS; row++) {
      g_CatManagerPTD.get(player.id).row1All[row] = new TextDraw({
        x: 1.0,
        y: 138.0 + row * 13.0,
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
        .setBoxColors(0x00000000)
        .setTextSize(40.0, 10.0)
        .setSelectable(true);

      g_CatManagerPTD.get(player.id).row1Cat[row] = new TextDraw({
        x: 1.0,
        y: 320.0 + row * 13.0,
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
        .setBoxColors(0x00000000)
        .setTextSize(40.0, 10.0)
        .setSelectable(true);

      g_CatManagerPTD.get(player.id).row2All[row] = new TextDraw({
        x: 43.0,
        y: 138.0 + row * 13.0,
        text: "Txd",
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
        .setBoxColors(0x00000000)
        .setTextSize(111.0, 10.0)
        .setSelectable(true);

      g_CatManagerPTD.get(player.id).row2Cat[row] = new TextDraw({
        x: 43.0,
        y: 320.0 + row * 13.0,
        text: "Txd",
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
        .setBoxColors(0x00000000)
        .setTextSize(111.0, 10.0)
        .setSelectable(true);

      g_CatManagerPTD.get(player.id).row3All[row] = new TextDraw({
        x: 114.0,
        y: 138.0 + row * 13.0,
        text: "Name",
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
        .setBoxColors(0x00000000)
        .setTextSize(231.0, 10.0)
        .setSelectable(true);

      g_CatManagerPTD.get(player.id).row3Cat[row] = new TextDraw({
        x: 114.0,
        y: 320.0 + row * 13.0,
        text: "Name",
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
        .setBoxColors(0x00000000)
        .setTextSize(231.0, 10.0)
        .setSelectable(true);
    }
  } else {
    g_CatManagerPTD.get(player.id).col1All = new TextDraw({
      x: 1.0,
      y: 125.0,
      text: "ID",
      player,
    })
      .create()
      .setBackgroundColors(255)
      .setFont(1)
      .setLetterSize(0.2, 1.0)
      .setColor(RGBA_WHITE)
      .setOutline(1)
      .setProportional(true);

    g_CatManagerPTD.get(player.id).col1Cat = new TextDraw({
      x: 1.0,
      y: 307.0,
      text: "ID",
      player,
    })
      .create()
      .setBackgroundColors(255)
      .setFont(1)
      .setLetterSize(0.2, 1.0)
      .setColor(RGBA_WHITE)
      .setOutline(1)
      .setProportional(true);

    g_CatManagerPTD.get(player.id).col2All = new TextDraw({
      x: 33.0,
      y: 125.0,
      text: "Name",
      player,
    })
      .create()
      .setBackgroundColors(255)
      .setFont(1)
      .setLetterSize(0.2, 1.0)
      .setColor(RGBA_WHITE)
      .setOutline(1)
      .setProportional(true);

    g_CatManagerPTD.get(player.id).col2Cat = new TextDraw({
      x: 33.0,
      y: 307.0,
      text: "Name",
      player,
    })
      .create()
      .setBackgroundColors(255)
      .setFont(1)
      .setLetterSize(0.2, 1.0)
      .setColor(RGBA_WHITE)
      .setOutline(1)
      .setProportional(true);

    g_CatManagerPTD.get(player.id).col3All = null;
    g_CatManagerPTD.get(player.id).col3Cat = null;

    for (let row = 0; row < MAX_CAT_MANAGER_ROWS; row++) {
      g_CatManagerPTD.get(player.id).row1All[row] = new TextDraw({
        x: 1.0,
        y: 138.0 + row * 13.0,
        text: "ID",
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
        .setBoxColors(0x00000000)
        .setTextSize(30.0, 10.0)
        .setSelectable(true);

      g_CatManagerPTD.get(player.id).row1Cat[row] = new TextDraw({
        x: 1.0,
        y: 320.0 + row * 13.0,
        text: "ID",
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
        .setBoxColors(0x00000000)
        .setTextSize(30.0, 10.0)
        .setSelectable(true);

      g_CatManagerPTD.get(player.id).row2All[row] = new TextDraw({
        x: 33.0,
        y: 138.0 + row * 13.0,
        text: "Name",
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
        .setBoxColors(0x00000000)
        .setTextSize(231.0, 10.0)
        .setSelectable(true);

      g_CatManagerPTD.get(player.id).row2Cat[row] = new TextDraw({
        x: 33.0,
        y: 320.0 + row * 13.0,
        text: "Name",
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
        .setBoxColors(0x00000000)
        .setTextSize(231.0, 10.0)
        .setSelectable(true);

      g_CatManagerPTD.get(player.id).row3All[row] = null;
      g_CatManagerPTD.get(player.id).row3Cat[row] = null;
    }
  }
}

export function destroyPlayerCategoryManager(player: Player) {
  Object.entries(g_CatManagerPTD.get(player.id)).forEach((item) => {
    const [key, ptd] = item as unknown as [
      keyof ICatManagerPtd,
      ICatManagerPtd[keyof ICatManagerPtd]
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
      g_CatManagerPTD.get(player.id)[key] = null!;
    }
  });
}

export function showCategoryManager(player: Player) {
  createPlayerCategoryManager(player);

  Object.values(g_CatManagerGTD).forEach(
    (gtd: ICatManagerGtd[keyof ICatManagerGtd]) => {
      if (gtd && gtd.isValid()) {
        gtd.show(player);
      }
    }
  );

  defaultCategoryManagerData(player);
  loadCategoryManagerRowData(player, CAT_MANAGER_WINDOW_ALL);
  loadCategoryManagerRowData(player, CAT_MANAGER_WINDOW_CAT);

  applyCategoryManagerCatName(player);
  g_CatManagerPTD.get(player.id).categoryName?.show();

  applyCategoryManagerCatType(player);
  g_CatManagerPTD.get(player.id).typeModels?.show();
  g_CatManagerPTD.get(player.id).typeVehicles?.show();
  g_CatManagerPTD.get(player.id).typeSkins?.show();
  g_CatManagerPTD.get(player.id).typeTextures?.show();

  applyCategoryManagerPage(player, CAT_MANAGER_WINDOW_ALL);
  applyCategoryManagerPage(player, CAT_MANAGER_WINDOW_CAT);
  g_CatManagerPTD.get(player.id).pageAll?.show();
  g_CatManagerPTD.get(player.id).pageCat?.show();

  applyCategoryManagerSearch(player, CAT_MANAGER_WINDOW_ALL);
  applyCategoryManagerSearch(player, CAT_MANAGER_WINDOW_CAT);
  g_CatManagerPTD.get(player.id).searchAll?.show();
  g_CatManagerPTD.get(player.id).searchCat?.show();

  g_CatManagerPTD.get(player.id).col1All?.show();
  g_CatManagerPTD.get(player.id).col1Cat?.show();

  g_CatManagerPTD.get(player.id).col2All?.show();
  g_CatManagerPTD.get(player.id).col2Cat?.show();

  if (g_CatManagerPTD.get(player.id).col3All) {
    g_CatManagerPTD.get(player.id).col3All?.show();
  }

  if (g_CatManagerPTD.get(player.id).col3Cat) {
    g_CatManagerPTD.get(player.id).col3Cat?.show();
  }

  applyCategoryManagerRowData(player, CAT_MANAGER_WINDOW_ALL);
  applyCategoryManagerRowData(player, CAT_MANAGER_WINDOW_CAT);
}

export function hideCategoryManager(player: Player) {
  destroyPlayerCategoryManager(player);

  Object.values(g_CatManagerGTD).forEach(
    (gtd: ICatManagerGtd[keyof ICatManagerGtd]) => {
      if (gtd && gtd.isValid()) {
        gtd.hide(player);
      }
    }
  );

  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.CATMANAGER_TEXTURES: {
      destroyTextureView(player);
      break;
    }
    case TD_MODE.CATMANAGER_MODELS:
    case TD_MODE.CATMANAGER_VEHICLES:
    case TD_MODE.CATMANAGER_SKINS: {
      hideModelView(player);
      break;
    }
  }
}

export function applyCategoryManagerCatType(player: Player) {
  g_CatManagerPTD.get(player.id).typeModels?.setBoxColors(0x00000000);
  g_CatManagerPTD.get(player.id).typeVehicles?.setBoxColors(0x00000000);
  g_CatManagerPTD.get(player.id).typeSkins?.setBoxColors(0x00000000);
  g_CatManagerPTD.get(player.id).typeTextures?.setBoxColors(0x00000000);

  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.CATMANAGER_MODELS: {
      g_CatManagerPTD.get(player.id).typeModels?.setBoxColors(0xffffff64);
      break;
    }
    case TD_MODE.CATMANAGER_VEHICLES: {
      g_CatManagerPTD.get(player.id).typeVehicles?.setBoxColors(0xffffff64);
      break;
    }
    case TD_MODE.CATMANAGER_SKINS: {
      g_CatManagerPTD.get(player.id).typeSkins?.setBoxColors(0xffffff64);
      break;
    }
    case TD_MODE.CATMANAGER_TEXTURES: {
      g_CatManagerPTD.get(player.id).typeTextures?.setBoxColors(0xffffff64);
      break;
    }
    default: {
      return 0;
    }
  }
  return 1;
}

export function applyCategoryManagerCatName(player: Player) {
  const categoryId = g_CatManagerData.get(player.id).category;
  if (categoryId === INVALID_CATEGORY_ID) {
    g_CatManagerPTD.get(player.id).categoryName?.setString("Category");
    return 0;
  }

  let g_CategoryNameString = "";

  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.CATMANAGER_MODELS: {
      g_CategoryNameString = getModelCategoryName(categoryId).name;
      break;
    }
    case TD_MODE.CATMANAGER_VEHICLES: {
      g_CategoryNameString = getVehicleCategoryName(categoryId).name;
      break;
    }
    case TD_MODE.CATMANAGER_SKINS: {
      g_CategoryNameString = getSkinCategoryName(categoryId).name;
      break;
    }
    case TD_MODE.CATMANAGER_TEXTURES: {
      g_CategoryNameString = getTextureCategoryName(categoryId).name;
      break;
    }
    default: {
      return 0;
    }
  }

  const g_TextDrawString = `Category: ${g_CategoryNameString}`;
  g_CatManagerPTD.get(player.id).categoryName?.setString(g_TextDrawString);
  return 1;
}

export function applyCategoryManagerPage(player: Player, window: boolean) {
  const _page = getCategoryManagerPage(player, window) + 1;
  const _pageMax = getCategoryManagerMaxPage(player, window) + 1;
  const g_TextDrawString = `Page: ${_page} / ${_pageMax}`;
  if (window === CAT_MANAGER_WINDOW_ALL) {
    g_CatManagerPTD.get(player.id).pageAll?.setString(g_TextDrawString);
  } else {
    g_CatManagerPTD.get(player.id).pageCat?.setString(g_TextDrawString);
  }
}

export function applyCategoryManagerSearch(player: Player, window: boolean) {
  const g_SearchString = getCategoryManagerSearch(player, window);
  if (!g_SearchString.trim().length) {
    if (window === CAT_MANAGER_WINDOW_ALL) {
      g_CatManagerPTD.get(player.id).searchAll?.setString("Search");
    } else {
      g_CatManagerPTD.get(player.id).searchCat?.setString("Search");
    }
  } else {
    const g_TextDrawString = `Search: ${g_SearchString}`;
    if (window === CAT_MANAGER_WINDOW_ALL) {
      g_CatManagerPTD.get(player.id).searchAll?.setString(g_TextDrawString);
    } else {
      g_CatManagerPTD.get(player.id).searchCat?.setString(g_TextDrawString);
    }
  }
}

export function applyCategoryManagerRowColor(
  player: Player,
  window: boolean,
  row: number
) {
  const selectWindow = g_CatManagerData.get(player.id).selectWindow;
  const selectRow = g_CatManagerData.get(player.id).selectRow;
  const rgbaBoxColor =
    selectWindow === window && row === selectRow ? 0xffffff64 : 0x00000000;

  if (window === CAT_MANAGER_WINDOW_ALL) {
    g_CatManagerPTD
      .get(player.id)
      .row1All[row]?.setBoxColors(rgbaBoxColor)
      ?.show();
    g_CatManagerPTD
      .get(player.id)
      .row2All[row]?.setBoxColors(rgbaBoxColor)
      ?.show();

    if (g_CatManagerPTD.get(player.id).row3All[row]) {
      g_CatManagerPTD
        .get(player.id)
        .row3All[row]?.setBoxColors(rgbaBoxColor)
        ?.show();
    }
  } else if (window === CAT_MANAGER_WINDOW_CAT) {
    g_CatManagerPTD
      .get(player.id)
      .row1Cat[row]?.setBoxColors(rgbaBoxColor)
      ?.show();
    g_CatManagerPTD
      .get(player.id)
      .row2Cat[row]?.setBoxColors(rgbaBoxColor)
      ?.show();

    if (g_CatManagerPTD.get(player.id).row3Cat[row]) {
      g_CatManagerPTD
        .get(player.id)
        .row3Cat[row]?.setBoxColors(rgbaBoxColor)
        ?.show();
    }
  }
}

export function applyCategoryManagerRowData(player: Player, window: boolean) {
  let invalidId = 0;
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.CATMANAGER_MODELS:
    case TD_MODE.CATMANAGER_VEHICLES:
    case TD_MODE.CATMANAGER_SKINS: {
      invalidId = INVALID_MODEL_ID;
      break;
    }
    default: {
      invalidId = INVALID_TEXTURE_ID;
    }
  }

  for (let row = 0; row < MAX_CAT_MANAGER_ROWS; row++) {
    const rowId = getCategoryManagerRowID(player, window, row);

    if (rowId === invalidId) {
      if (window === CAT_MANAGER_WINDOW_ALL) {
        g_CatManagerPTD.get(player.id).row1All[row]?.hide();
        g_CatManagerPTD.get(player.id).row2All[row]?.hide();
        if (g_CatManagerPTD.get(player.id).row3All[row]) {
          g_CatManagerPTD.get(player.id).row3All[row]?.hide();
        }
      } else {
        g_CatManagerPTD.get(player.id).row1Cat[row]?.hide();
        g_CatManagerPTD.get(player.id).row2Cat[row]?.hide();
        if (g_CatManagerPTD.get(player.id).row3Cat[row]) {
          g_CatManagerPTD.get(player.id).row3Cat[row]?.hide();
        }
      }
      continue;
    }

    switch (g_PlayerData.get(player.id).tdMode) {
      case TD_MODE.CATMANAGER_MODELS: {
        const g_IntegerString = rowId.toString();
        const g_ModelString = getModelName(rowId).name;

        if (window === CAT_MANAGER_WINDOW_ALL) {
          g_CatManagerPTD
            .get(player.id)
            .row1All[row]?.setString(g_IntegerString);
          g_CatManagerPTD.get(player.id).row2All[row]?.setString(g_ModelString);
        } else {
          g_CatManagerPTD
            .get(player.id)
            .row1Cat[row]?.setString(g_IntegerString);
          g_CatManagerPTD.get(player.id).row2Cat[row]?.setString(g_ModelString);
        }
        break;
      }
      case TD_MODE.CATMANAGER_VEHICLES: {
        const g_IntegerString = rowId.toString();
        const g_VehModelString = getVehicleModelName(rowId) || "null";

        if (window === CAT_MANAGER_WINDOW_ALL) {
          g_CatManagerPTD
            .get(player.id)
            .row1All[row]?.setString(g_IntegerString);
          g_CatManagerPTD
            .get(player.id)
            .row2All[row]?.setString(g_VehModelString);
        } else {
          g_CatManagerPTD
            .get(player.id)
            .row1Cat[row]?.setString(g_IntegerString);
          g_CatManagerPTD
            .get(player.id)
            .row2Cat[row]?.setString(g_VehModelString);
        }
        break;
      }
      case TD_MODE.CATMANAGER_SKINS: {
        const g_IntegerString = rowId.toString();
        const g_SkinString = String(getSkinName(rowId));

        if (window === CAT_MANAGER_WINDOW_ALL) {
          g_CatManagerPTD
            .get(player.id)
            .row1All[row]?.setString(g_IntegerString);
          g_CatManagerPTD.get(player.id).row2All[row]?.setString(g_SkinString);
        } else {
          g_CatManagerPTD
            .get(player.id)
            .row1Cat[row]?.setString(g_IntegerString);
          g_CatManagerPTD.get(player.id).row2Cat[row]?.setString(g_SkinString);
        }
        break;
      }
      case TD_MODE.CATMANAGER_TEXTURES: {
        const {
          modelId: textureModelId,
          txd: g_TextureTXDString,
          name: g_TextureNameString,
        } = getTextureData(rowId);
        const g_IntegerString = textureModelId.toString();

        if (window === CAT_MANAGER_WINDOW_ALL) {
          g_CatManagerPTD
            .get(player.id)
            .row1All[row]?.setString(g_IntegerString);
          g_CatManagerPTD
            .get(player.id)
            .row2All[row]?.setString(g_TextureTXDString);
          g_CatManagerPTD
            .get(player.id)
            .row3All[row]?.setString(g_TextureNameString);
        } else {
          g_CatManagerPTD
            .get(player.id)
            .row1Cat[row]?.setString(g_IntegerString);
          g_CatManagerPTD
            .get(player.id)
            .row2Cat[row]?.setString(g_TextureTXDString);
          g_CatManagerPTD
            .get(player.id)
            .row3Cat[row]?.setString(g_TextureNameString);
        }
        break;
      }
    }
    applyCategoryManagerRowColor(player, window, row);
  }
  return 1;
}

export function loadCategoryManagerRowData(player: Player, window: boolean) {
  let invalidId = 0;
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.CATMANAGER_MODELS:
    case TD_MODE.CATMANAGER_VEHICLES:
    case TD_MODE.CATMANAGER_SKINS: {
      invalidId = INVALID_MODEL_ID;
      break;
    }
    case TD_MODE.CATMANAGER_TEXTURES: {
      invalidId = INVALID_TEXTURE_ID;
      break;
    }
  }

  let categoryId = INVALID_CATEGORY_ID;

  if (window === CAT_MANAGER_WINDOW_CAT) {
    categoryId = g_CatManagerData.get(player.id).category;

    if (categoryId === INVALID_CATEGORY_ID) {
      for (let row = 0; row < MAX_CAT_MANAGER_ROWS; row++) {
        setCategoryManagerRowID(player, window, row, invalidId);
      }

      g_CatManagerData.get(player.id).selectId = invalidId;
      g_CatManagerData.get(player.id).selectRow = INVALID_ROW;

      return 1;
    }
  }

  const page = getCategoryManagerPage(player, window);
  const result: number[] = [];
  let rowsAdded = 0;
  let maxOffset = 0;

  const g_SearchString = getCategoryManagerSearch(player, window);

  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.CATMANAGER_MODELS: {
      const res = findModels(
        result,
        MAX_CAT_MANAGER_ROWS,
        g_SearchString,
        categoryId,
        page * MAX_CAT_MANAGER_ROWS
      );
      rowsAdded = res.rowsAdded;
      maxOffset = res.maxOffset;
      break;
    }
    case TD_MODE.CATMANAGER_VEHICLES: {
      const res = findVehicleModels(
        result,
        MAX_CAT_MANAGER_ROWS,
        g_SearchString,
        categoryId,
        page * MAX_CAT_MANAGER_ROWS
      );
      rowsAdded = res.rowsAdded;
      maxOffset = res.maxOffset;
      break;
    }
    case TD_MODE.CATMANAGER_SKINS: {
      const res = findSkins(
        result,
        MAX_CAT_MANAGER_ROWS,
        g_SearchString,
        categoryId,
        page * MAX_CAT_MANAGER_ROWS
      );
      rowsAdded = res.rowsAdded;
      maxOffset = res.maxOffset;
      break;
    }
    case TD_MODE.CATMANAGER_TEXTURES: {
      const res = findTextures(
        result,
        MAX_CAT_MANAGER_ROWS,
        g_SearchString,
        categoryId,
        page * MAX_CAT_MANAGER_ROWS
      );
      rowsAdded = res.rowsAdded;
      maxOffset = res.maxOffset;
      break;
    }
    default: {
      return 0;
    }
  }

  for (let row = 0; row < rowsAdded; row++) {
    setCategoryManagerRowID(player, window, row, result[row]);
  }

  for (let row = rowsAdded; row < MAX_CAT_MANAGER_ROWS; row++) {
    setCategoryManagerRowID(player, window, row, invalidId);
  }

  if (window === CAT_MANAGER_WINDOW_ALL) {
    g_CatManagerData.get(player.id).maxPageAll = Math.ceil(
      maxOffset / MAX_CAT_MANAGER_ROWS
    );
  } else {
    g_CatManagerData.get(player.id).maxPageCat = Math.ceil(
      maxOffset / MAX_CAT_MANAGER_ROWS
    );
  }

  g_CatManagerData.get(player.id).selectRow =
    getCategoryManagerNewSelectRow(player);
  return 1;
}

export function getCategoryManagerNewSelectRow(player: Player) {
  const selectWindow = g_CatManagerData.get(player.id).selectWindow;
  const selectId = g_CatManagerData.get(player.id).selectId;

  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.CATMANAGER_MODELS:
    case TD_MODE.CATMANAGER_VEHICLES:
    case TD_MODE.CATMANAGER_SKINS: {
      if (selectId === INVALID_MODEL_ID) {
        return INVALID_ROW;
      }
      break;
    }
    case TD_MODE.CATMANAGER_TEXTURES: {
      if (selectId === INVALID_TEXTURE_ID) {
        return INVALID_ROW;
      }
      break;
    }
  }

  for (let row = 0; row < MAX_CAT_MANAGER_ROWS; row++) {
    const rowId =
      selectWindow === CAT_MANAGER_WINDOW_CAT
        ? g_CatManagerData.get(player.id).rowIdCat[row]
        : g_CatManagerData.get(player.id).rowIdAll[row];

    if (selectId === rowId) {
      return row;
    }
  }

  return INVALID_ROW;
}

export function getCategoryManagerMaxPage(player: Player, window: boolean) {
  if (window === CAT_MANAGER_WINDOW_ALL) {
    return g_CatManagerData.get(player.id).maxPageAll;
  } else {
    return g_CatManagerData.get(player.id).maxPageCat;
  }
}

export async function showCategoryManagerDialog(
  player: Player,
  dialogId: number
) {
  switch (dialogId) {
    case DIALOG_ID.CATMANAGER_CAT_CREATE: {
      const g_DialogCaption = "Category Manager: Create Category";
      const g_DialogInfo = "Enter the name for the new category.";
      const res = await new Dialog({
        style: DialogStylesEnum.INPUT,
        caption: g_DialogCaption,
        info: g_DialogInfo,
        button1: "Create",
        button2: "Cancel",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    case DIALOG_ID.CATMANAGER_CAT_DESTROY: {
      const categoryId = g_CatManagerData.get(player.id).category;
      if (categoryId === INVALID_CATEGORY_ID) {
        return 1;
      }
      const g_DialogCaption = "Category Manager: Destroy Category";
      const g_DialogInfo = `Type & enter '${CAT_MANAGER_DELETE_CODE}' to delete this category.`;
      const res = await new Dialog({
        style: DialogStylesEnum.INPUT,
        caption: g_DialogCaption,
        info: g_DialogInfo,
        button1: "Destroy",
        button2: "Cancel",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    case DIALOG_ID.CATMANAGER_CAT_RENAME: {
      const categoryId = g_CatManagerData.get(player.id).category;
      if (categoryId === INVALID_CATEGORY_ID) {
        return 1;
      }
      const g_DialogCaption = "Category Manager: Rename Category";
      const g_DialogInfo = "Please enter a new name for the category.";
      const res = await new Dialog({
        style: DialogStylesEnum.INPUT,
        caption: g_DialogCaption,
        info: g_DialogInfo,
        button1: "Rename",
        button2: "Cancel",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    case DIALOG_ID.CATMANAGER_PAGE_ALL:
    case DIALOG_ID.CATMANAGER_PAGE_CAT: {
      const window =
        dialogId === DIALOG_ID.CATMANAGER_PAGE_ALL
          ? CAT_MANAGER_WINDOW_ALL
          : CAT_MANAGER_WINDOW_CAT;
      const _page = getCategoryManagerPage(player, window) + 1;
      const _pageMax = getCategoryManagerMaxPage(player, window) + 1;
      const g_DialogCaption = "Category Manager: Page";
      const g_DialogInfo = `Page: ${_page} / ${_pageMax}`;

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
    case DIALOG_ID.CATMANAGER_SEARCH_ALL:
    case DIALOG_ID.CATMANAGER_SEARCH_CAT: {
      const window =
        dialogId === DIALOG_ID.CATMANAGER_SEARCH_ALL
          ? CAT_MANAGER_WINDOW_ALL
          : CAT_MANAGER_WINDOW_CAT;
      const g_SearchString = getCategoryManagerSearch(player, window);
      let g_DialogInfo = "";
      if (!g_SearchString.trim().length) {
        g_DialogInfo = "You are not searching for anything.";
      } else {
        g_DialogInfo = `Searching for: ${g_SearchString}`;
      }
      const g_DialogCaption = "Category Manager: Search";
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
    default: {
      return 0;
    }
  }
  return 1;
}

export function getCategoryManagerPage(player: Player, window: boolean) {
  let page = 0;
  switch (window) {
    case CAT_MANAGER_WINDOW_ALL: {
      page = g_CatManagerData.get(player.id).pageAll;
      break;
    }
    case CAT_MANAGER_WINDOW_CAT: {
      page = g_CatManagerData.get(player.id).pageCat;
      break;
    }
  }
  return page;
}

export function setCategoryManagerPage(
  player: Player,
  window: boolean,
  page: number
) {
  switch (window) {
    case CAT_MANAGER_WINDOW_ALL: {
      g_CatManagerData.get(player.id).pageAll = page;
      break;
    }
    case CAT_MANAGER_WINDOW_CAT: {
      g_CatManagerData.get(player.id).pageCat = page;
      break;
    }
    default: {
      return 0;
    }
  }
  return 1;
}

export function getCategoryManagerSearch(player: Player, window: boolean) {
  switch (window) {
    case CAT_MANAGER_WINDOW_ALL: {
      return g_CatManagerData.get(player.id).searchAll;
    }
    case CAT_MANAGER_WINDOW_CAT: {
      return g_CatManagerData.get(player.id).searchCat;
    }
    default: {
      return "";
    }
  }
}

export function setCategoryManagerSearch(
  player: Player,
  window: boolean,
  search: string
) {
  switch (window) {
    case CAT_MANAGER_WINDOW_ALL: {
      g_CatManagerData.get(player.id).searchAll = search;
      break;
    }
    case CAT_MANAGER_WINDOW_CAT: {
      g_CatManagerData.get(player.id).searchCat = search;
      break;
    }
    default: {
      return 0;
    }
  }
  return 1;
}

export function getCategoryManagerRowID(
  player: Player,
  window: boolean,
  row: number
) {
  let id = 0;
  switch (window) {
    case CAT_MANAGER_WINDOW_ALL: {
      id = g_CatManagerData.get(player.id).rowIdAll[row];
      break;
    }
    case CAT_MANAGER_WINDOW_CAT: {
      id = g_CatManagerData.get(player.id).rowIdCat[row];
      break;
    }
  }
  return id;
}

export function setCategoryManagerRowID(
  player: Player,
  window: boolean,
  row: number,
  id: number
) {
  switch (window) {
    case CAT_MANAGER_WINDOW_ALL: {
      g_CatManagerData.get(player.id).rowIdAll[row] = id;
      break;
    }
    case CAT_MANAGER_WINDOW_CAT: {
      g_CatManagerData.get(player.id).rowIdCat[row] = id;
      break;
    }
    default: {
      return 0;
    }
  }
  return 1;
}
