import {
  findModelCategories,
  findSkinCategories,
  findTextureCategories,
  findVehicleCategories,
  getModelCategoryName,
  getSkinCategoryName,
  getTextureCategoryName,
  getVehicleCategoryName,
  INVALID_CATEGORY_ID,
  isModelCategoryIDCreated,
  isSkinCategoryIDCreated,
  isTextureCategoryIDCreated,
  isVehicleCategoryIDCreated,
} from "@/category";
import {
  applyCategoryManagerCatName,
  applyCategoryManagerPage,
  applyCategoryManagerRowData,
  CAT_MANAGER_WINDOW_CAT,
  g_CatManagerData,
  loadCategoryManagerRowData,
  MIN_CAT_MANAGER_PAGE,
  setCategoryManagerPage,
} from "@/catManager";
import { RGBA_RED } from "@/constants";
import {
  applyCreateListCategory,
  applyCreateListPage,
  applyCreateListRowData,
  loadCreateListRowData,
  MIN_CREATELIST_PAGE,
  setCreateListCategory,
  setCreateListPage,
} from "@/createList";
import { DIALOG_ID } from "@/dialog";
import { g_PlayerData } from "@/player";
import { TD_MODE } from "@/tdMode";
import {
  g_TextureListData,
  MIN_TEXTURELIST_PAGE,
  loadTextureListRowData,
  applyTextureListPage,
  applyTextureListCategory,
  applyTextureListRowData,
} from "@/textureList";
import { SafetyMap } from "@/utils/safetyMap";
import {
  Dialog,
  DialogStylesEnum,
  GameMode,
  IDialogResCommon,
  Player,
  PlayerEvent,
} from "@infernus/core";

export const MAX_CATEGORYSELECT_ROWS = 20;
export const MIN_CATEGORYSELECT_PAGE = 0;

export enum LITEM_CATEGORYSELECT {
  ROW_F,
  ROW_L = ROW_F + MAX_CATEGORYSELECT_ROWS - 1,
  SPACE,
  SEARCH,
  PAGE,
  PAGE_F,
  PAGE_P,
  PAGE_N,
  PAGE_L,
  MAX,
}

export enum CATEGORYSELECT_ID {
  NONE,
  MODEL,
  VEHICLE,
  SKIN,
  TEXTURE,
  MAX,
}

export interface ICategorySelectData {
  page: number;
  maxPage: number;
  search: string;
  rowId: number[];
}

export const g_CategorySelectData = new SafetyMap<number, ICategorySelectData>(
  () => {
    return {
      page: MIN_CATEGORYSELECT_PAGE,
      maxPage: MIN_CATEGORYSELECT_PAGE,
      search: "",
      rowId: Array.from(
        { length: MAX_CATEGORYSELECT_ROWS },
        () => INVALID_CATEGORY_ID
      ),
    };
  }
);

GameMode.onInit(({ next }) => {
  Player.getInstances().forEach((p) => {
    if (p.isConnected()) {
      defaultCategorySelectData(p);
    }
  });
  return next();
});

GameMode.onExit(({ next }) => {
  g_CategorySelectData.clear();
  return next();
});

PlayerEvent.onConnect(({ player, next }) => {
  defaultCategorySelectData(player);
  return next();
});

function onDialogResponse(
  player: Player,
  res: IDialogResCommon,
  dialogId: number
) {
  const { inputText, response, listItem } = res;

  switch (dialogId) {
    case DIALOG_ID.CATEGORYSELECT: {
      if (!response) {
        return 1;
      }

      if (
        listItem >= LITEM_CATEGORYSELECT.ROW_F &&
        listItem <= LITEM_CATEGORYSELECT.ROW_L
      ) {
        const row = listItem - LITEM_CATEGORYSELECT.ROW_F;
        const categoryId = g_CategorySelectData.get(player.id).rowId[row];

        if (categoryId === INVALID_CATEGORY_ID) {
          showCategorySelect(player);
          return 1;
        }

        let isValidCategory = false;

        switch (g_PlayerData.get(player.id).tdMode) {
          case TD_MODE.CREATELIST_OBJECT:
          case TD_MODE.CREATELIST_PICKUP:
          case TD_MODE.CREATELIST_ATTACH:
          case TD_MODE.CATMANAGER_MODELS: {
            isValidCategory = isModelCategoryIDCreated(categoryId);
            break;
          }
          case TD_MODE.CREATELIST_VEHICLE:
          case TD_MODE.CATMANAGER_VEHICLES: {
            isValidCategory = isVehicleCategoryIDCreated(categoryId);
            break;
          }
          case TD_MODE.CREATELIST_ACTOR:
          case TD_MODE.CATMANAGER_SKINS: {
            isValidCategory = isSkinCategoryIDCreated(categoryId);
            break;
          }
          case TD_MODE.TEXTURELIST:
          case TD_MODE.CATMANAGER_TEXTURES: {
            isValidCategory = isTextureCategoryIDCreated(categoryId);
            break;
          }
        }

        if (!isValidCategory) {
          loadCategorySelectData(player);
          showCategorySelect(player);
          return 1;
        }

        switch (g_PlayerData.get(player.id).tdMode) {
          case TD_MODE.CREATELIST_OBJECT:
          case TD_MODE.CREATELIST_VEHICLE:
          case TD_MODE.CREATELIST_PICKUP:
          case TD_MODE.CREATELIST_ACTOR:
          case TD_MODE.CREATELIST_ATTACH: {
            setCreateListPage(player, MIN_CREATELIST_PAGE);
            setCreateListCategory(player, categoryId);
            loadCreateListRowData(player);

            applyCreateListPage(player);
            applyCreateListCategory(player);
            applyCreateListRowData(player);
            return 1;
          }
          case TD_MODE.CATMANAGER_MODELS:
          case TD_MODE.CATMANAGER_VEHICLES:
          case TD_MODE.CATMANAGER_SKINS:
          case TD_MODE.CATMANAGER_TEXTURES: {
            setCategoryManagerPage(
              player,
              CAT_MANAGER_WINDOW_CAT,
              MIN_CAT_MANAGER_PAGE
            );
            g_CatManagerData.get(player.id).category = categoryId;
            loadCategoryManagerRowData(player, CAT_MANAGER_WINDOW_CAT);

            applyCategoryManagerPage(player, CAT_MANAGER_WINDOW_CAT);
            applyCategoryManagerCatName(player);
            applyCategoryManagerRowData(player, CAT_MANAGER_WINDOW_CAT);
            return 1;
          }
          case TD_MODE.TEXTURELIST: {
            g_TextureListData.get(player.id).page = MIN_TEXTURELIST_PAGE;
            g_TextureListData.get(player.id).category = categoryId;
            loadTextureListRowData(player);

            applyTextureListPage(player);
            applyTextureListCategory(player);
            applyTextureListRowData(player);
            return 1;
          }
        }
      } else {
        switch (listItem) {
          case LITEM_CATEGORYSELECT.PAGE: {
            showCategorySelectDialog(player, DIALOG_ID.CATEGORYSELECT_PAGE);
            return 1;
          }
          case LITEM_CATEGORYSELECT.PAGE_F: {
            g_CategorySelectData.get(player.id).page = MIN_CATEGORYSELECT_PAGE;
            loadCategorySelectData(player);
            break;
          }
          case LITEM_CATEGORYSELECT.PAGE_P: {
            if (
              --g_CategorySelectData.get(player.id).page <
              MIN_CATEGORYSELECT_PAGE
            ) {
              g_CategorySelectData.get(player.id).page =
                MIN_CATEGORYSELECT_PAGE;
            }
            loadCategorySelectData(player);
            break;
          }
          case LITEM_CATEGORYSELECT.PAGE_N: {
            if (
              ++g_CategorySelectData.get(player.id).page >
              g_CategorySelectData.get(player.id).maxPage
            ) {
              g_CategorySelectData.get(player.id).page =
                g_CategorySelectData.get(player.id).maxPage;
            }
            loadCategorySelectData(player);
            break;
          }
          case LITEM_CATEGORYSELECT.PAGE_L: {
            g_CategorySelectData.get(player.id).page = g_CategorySelectData.get(
              player.id
            ).maxPage;
            loadCategorySelectData(player);
            break;
          }

          case LITEM_CATEGORYSELECT.SEARCH: {
            showCategorySelectDialog(player, DIALOG_ID.CATEGORYSELECT_SEARCH);
            return 1;
          }
        }
      }

      showCategorySelect(player);
      return 1;
    }
    case DIALOG_ID.CATEGORYSELECT_PAGE: {
      if (!response) {
        showCategorySelect(player);
        return 1;
      }

      let page = +inputText;

      if (!inputText.trim().length || Number.isNaN(page)) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You did not enter a valid page number!"
        );
        showCategorySelectDialog(player, dialogId);
        return 1;
      }

      page--;

      if (
        page < MIN_CATEGORYSELECT_PAGE ||
        page > g_CategorySelectData.get(player.id).maxPage
      ) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You did not enter a valid page number!"
        );
        showCategorySelectDialog(player, dialogId);
        return 1;
      }

      g_CategorySelectData.get(player.id).page = page;
      loadCategorySelectData(player);
      showCategorySelect(player);
      return 1;
    }
    case DIALOG_ID.CATEGORYSELECT_SEARCH: {
      if (response) {
        g_CategorySelectData.get(player.id).search = inputText;
        g_CategorySelectData.get(player.id).page = MIN_CATEGORYSELECT_PAGE;
        loadCategorySelectData(player);
      }
      showCategorySelect(player);
      return 1;
    }
  }

  return 0;
}

export function defaultCategorySelectData(player: Player) {
  g_CategorySelectData.get(player.id).page = MIN_CATEGORYSELECT_PAGE;

  g_CategorySelectData.get(player.id).maxPage = MIN_CATEGORYSELECT_PAGE;

  g_CategorySelectData.get(player.id).search = "";

  for (let row = 0; row < MAX_CATEGORYSELECT_ROWS; row++) {
    g_CategorySelectData.get(player.id).rowId[row] = INVALID_CATEGORY_ID;
  }
}

export function loadCategorySelectData(player: Player) {
  let rowsAdded = 0,
    maxOffset = 0;

  const g_SearchString = g_CategorySelectData.get(player.id).search;

  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.CREATELIST_OBJECT:
    case TD_MODE.CREATELIST_PICKUP:
    case TD_MODE.CREATELIST_ATTACH:
    case TD_MODE.CATMANAGER_MODELS: {
      const res = findModelCategories(
        g_CategorySelectData.get(player.id).rowId,
        MAX_CATEGORYSELECT_ROWS,
        g_SearchString,
        g_CategorySelectData.get(player.id).page * MAX_CATEGORYSELECT_ROWS
      );
      rowsAdded = res.rowsAdded;
      maxOffset = res.maxOffset;
      break;
    }
    case TD_MODE.CREATELIST_VEHICLE:
    case TD_MODE.CATMANAGER_VEHICLES: {
      const res = findVehicleCategories(
        g_CategorySelectData.get(player.id).rowId,
        MAX_CATEGORYSELECT_ROWS,
        g_SearchString,
        g_CategorySelectData.get(player.id).page * MAX_CATEGORYSELECT_ROWS
      );
      rowsAdded = res.rowsAdded;
      maxOffset = res.maxOffset;
      break;
    }
    case TD_MODE.CREATELIST_ACTOR:
    case TD_MODE.CATMANAGER_SKINS: {
      const res = findSkinCategories(
        g_CategorySelectData.get(player.id).rowId,
        MAX_CATEGORYSELECT_ROWS,
        g_SearchString,
        g_CategorySelectData.get(player.id).page * MAX_CATEGORYSELECT_ROWS
      );
      rowsAdded = res.rowsAdded;
      maxOffset = res.maxOffset;
      break;
    }
    case TD_MODE.TEXTURELIST:
    case TD_MODE.CATMANAGER_TEXTURES: {
      const res = findTextureCategories(
        g_CategorySelectData.get(player.id).rowId,
        MAX_CATEGORYSELECT_ROWS,
        g_SearchString,
        g_CategorySelectData.get(player.id).page * MAX_CATEGORYSELECT_ROWS
      );
      rowsAdded = res.rowsAdded;
      maxOffset = res.maxOffset;
      break;
    }
    default: {
      return 0;
    }
  }

  for (let row = rowsAdded; row < MAX_CATEGORYSELECT_ROWS; row++) {
    g_CategorySelectData.get(player.id).rowId[row] = INVALID_CATEGORY_ID;
  }

  g_CategorySelectData.get(player.id).maxPage = Math.ceil(
    maxOffset / MAX_CATEGORYSELECT_ROWS
  );
  return 1;
}

export async function showCategorySelect(player: Player) {
  const g_DialogCaption = "Category Select";
  let g_DialogInfo = "Category ID\tCategory Name\n";
  let g_CategoryNameString = "";
  for (let listItem = 0; listItem < LITEM_CATEGORYSELECT.MAX; listItem++) {
    if (
      listItem >= LITEM_CATEGORYSELECT.ROW_F &&
      listItem <= LITEM_CATEGORYSELECT.ROW_L
    ) {
      const row = listItem - LITEM_CATEGORYSELECT.ROW_F;
      let categoryId = INVALID_CATEGORY_ID;

      categoryId = g_CategorySelectData.get(player.id).rowId[row];

      switch (g_PlayerData.get(player.id).tdMode) {
        case TD_MODE.CREATELIST_OBJECT:
        case TD_MODE.CREATELIST_PICKUP:
        case TD_MODE.CREATELIST_ATTACH:
        case TD_MODE.CATMANAGER_MODELS: {
          g_CategoryNameString = getModelCategoryName(categoryId).name;
          break;
        }
        case TD_MODE.CREATELIST_VEHICLE:
        case TD_MODE.CATMANAGER_VEHICLES: {
          g_CategoryNameString = getVehicleCategoryName(categoryId).name;
          break;
        }
        case TD_MODE.CREATELIST_ACTOR:
        case TD_MODE.CATMANAGER_SKINS: {
          g_CategoryNameString = getSkinCategoryName(categoryId).name;
          break;
        }
        case TD_MODE.TEXTURELIST:
        case TD_MODE.CATMANAGER_TEXTURES: {
          g_CategoryNameString = getTextureCategoryName(categoryId).name;
          break;
        }
        default: {
          return 1;
        }
      }

      if (categoryId === INVALID_CATEGORY_ID) {
        g_DialogInfo += "-\t-\n";
      } else {
        const g_DialogInfoRow = `${categoryId}\t${g_CategoryNameString}\n`;
        g_DialogInfo += g_DialogInfoRow;
      }
    } else {
      switch (listItem) {
        case LITEM_CATEGORYSELECT.PAGE: {
          const _page = g_CategorySelectData.get(player.id).page + 1;
          const _pageMax = g_CategorySelectData.get(player.id).maxPage + 1;
          const g_DialogInfoRow = `Page: ${_page} / ${_pageMax}\n`;
          g_DialogInfo += g_DialogInfoRow;
          break;
        }
        case LITEM_CATEGORYSELECT.PAGE_F: {
          g_DialogInfo += "<< First Page <<\t \n";
          break;
        }
        case LITEM_CATEGORYSELECT.PAGE_P: {
          g_DialogInfo += "< Previous Page <\t \n";
          break;
        }
        case LITEM_CATEGORYSELECT.PAGE_N: {
          g_DialogInfo += "> Next Page >\t \n";
          break;
        }
        case LITEM_CATEGORYSELECT.PAGE_L: {
          g_DialogInfo += ">> Last Page >>\t \n";
          break;
        }
        case LITEM_CATEGORYSELECT.SEARCH: {
          const g_SearchString = g_CategorySelectData.get(player.id).search;
          if (!g_SearchString.trim().length) {
            g_DialogInfo += "Search\n";
          } else {
            const g_DialogInfoRow = `Search: ${g_SearchString}\n`;
            g_DialogInfo += g_DialogInfoRow;
          }
          break;
        }
        default: {
          g_DialogInfo += " \t \n";
          break;
        }
      }
    }
  }

  const res = await new Dialog({
    style: DialogStylesEnum.TABLIST_HEADERS,
    caption: g_DialogCaption,
    info: g_DialogInfo,
    button1: "Select",
    button2: "Cancel",
  }).show(player);
  onDialogResponse(player, res, DIALOG_ID.CATEGORYSELECT);
  return 1;
}

export async function showCategorySelectDialog(
  player: Player,
  dialogId: number
) {
  switch (dialogId) {
    case DIALOG_ID.CATEGORYSELECT: {
      showCategorySelect(player);
      break;
    }
    case DIALOG_ID.CATEGORYSELECT_PAGE: {
      const _page = g_CategorySelectData.get(player.id).page + 1;
      const _pageMax = g_CategorySelectData.get(player.id).maxPage + 1;
      const g_DialogInfo = `Current Page: ${_page} / ${_pageMax}`;

      const res = await new Dialog({
        caption: `Category Select: Page`,
        info: g_DialogInfo,
        style: DialogStylesEnum.INPUT,
        button1: "Enter",
        button2: "Cancel",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    case DIALOG_ID.CATEGORYSELECT_SEARCH: {
      const g_SearchString = g_CategorySelectData.get(player.id).search;
      let g_DialogInfo = "";
      if (!g_SearchString.trim().length) {
        g_DialogInfo = "You are not searching for anything.";
      } else {
        g_DialogInfo = `Current Search: ${g_SearchString}`;
      }
      const res = await new Dialog({
        caption: `Category Select: Search`,
        info: g_DialogInfo,
        style: DialogStylesEnum.INPUT,
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
