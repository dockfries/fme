import { INVALID_MAP_ID, RGBA_RED, RGBA_WHITE } from "@/constants";
import { DIALOG_ID } from "@/dialog";
import { destroyMapID, findMaps, getMapName } from "@/mapDB";
import { mapLoad } from "@/mapLoad";
import { g_MapVar, refreshMapLoadedTextDraw } from "@/mapLoaded";
import { SafetyMap } from "@/utils/safetyMap";
import {
  Dialog,
  DialogStylesEnum,
  GameMode,
  IDialogResCommon,
  Player,
  PlayerEvent,
} from "@infernus/core";

export const MAX_MAPLIST_ROWS = 20;
export const MIN_MAPLIST_PAGE = 0;

export enum MAP_LIST_ITEM {
  ROW_F,
  ROW_L = ROW_F + 20 - 1, // MAX_MAPLIST_ROWS = 20
  SPACE,
  SEARCH,
  PAGE,
  PAGE_F,
  PAGE_P,
  PAGE_N,
  PAGE_L,
  MAX,
}

export interface IMapListData {
  page: number;
  maxPage: number;
  search: string;
  rowId: number[];
}

export const g_MapListData = new SafetyMap<number, IMapListData>(() => {
  return {
    page: MIN_MAPLIST_PAGE,
    maxPage: MIN_MAPLIST_PAGE,
    search: "",
    rowId: Array.from({ length: MAX_MAPLIST_ROWS }, () => INVALID_MAP_ID),
  };
});

export function defaultMapListData(player: Player) {
  g_MapListData.get(player.id).page = MIN_MAPLIST_PAGE;
  g_MapListData.get(player.id).maxPage = MIN_MAPLIST_PAGE;
  g_MapListData.get(player.id).search = "";

  for (let row = 0; row < MAX_MAPLIST_ROWS; row++) {
    g_MapListData.get(player.id).rowId[row] = INVALID_MAP_ID;
  }
}

export function loadMapListData(player: Player) {
  let rowsAdded = 0;
  let maxOffset = 0;

  const g_SearchString = g_MapListData.get(player.id).search;

  const res = findMaps(
    g_MapListData.get(player.id).rowId,
    MAX_MAPLIST_ROWS,
    g_SearchString,
    g_MapListData.get(player.id).page * MAX_MAPLIST_ROWS
  );
  rowsAdded = res.rowsAdded;
  maxOffset = res.maxOffset;

  for (let row = rowsAdded; row < MAX_MAPLIST_ROWS; row++) {
    g_MapListData.get(player.id).rowId[row] = INVALID_MAP_ID;
  }

  g_MapListData.get(player.id).maxPage = Math.floor(
    maxOffset / MAX_MAPLIST_ROWS
  );
}

GameMode.onInit(({ next }) => {
  Player.getInstances().forEach((p) => {
    if (p.isConnected()) {
      defaultMapListData(p);
    }
  });
  return next();
});

GameMode.onExit(({ next }) => {
  g_MapListData.clear();
  return next();
});

PlayerEvent.onConnect(({ player, next }) => {
  defaultMapListData(player);
  return next();
});

async function onDialogResponse(
  player: Player,
  res: IDialogResCommon,
  dialogId: number
) {
  const { inputText, response, listItem } = res;
  switch (dialogId) {
    case DIALOG_ID.MAPLIST: {
      if (!response) {
        return 1;
      }
      if (listItem >= MAP_LIST_ITEM.ROW_F && listItem <= MAP_LIST_ITEM.ROW_L) {
        const row = listItem - MAP_LIST_ITEM.ROW_F;
        const mapId = g_MapListData.get(player.id).rowId[row];

        if (mapId === INVALID_MAP_ID) {
          showMapListDialog(player, dialogId);
          return 1;
        }

        const g_MapString = getMapName(mapId).name;

        const {
          objectsLoaded,
          vehiclesLoaded,
          pickupsLoaded,
          actorsLoaded,
          attachmentsLoaded,
          buildingsLoaded,
          loadSuccess,
        } = await mapLoad(g_MapString, player);

        if (loadSuccess) {
          g_MapVar.loadedID = mapId;
          refreshMapLoadedTextDraw();

          let g_ClientMessage = `[${player.id}] ${
            player.getName().name
          } has loaded the map: ${g_MapString}`;
          Player.sendClientMessageToAll(RGBA_WHITE, g_ClientMessage);

          g_ClientMessage = `Loaded: ${objectsLoaded} Object(s), ${vehiclesLoaded} Vehicle(s), ${pickupsLoaded} Pickup(s), ${actorsLoaded} Actor(s), ${buildingsLoaded} Building(s) removed.`;
          Player.sendClientMessageToAll(RGBA_WHITE, g_ClientMessage);

          if (attachmentsLoaded > 0) {
            const g_ClientMessage = `+ ${attachmentsLoaded} of your attachment(s).`;
            player.sendClientMessage(RGBA_WHITE, g_ClientMessage);
          }
          return 1;
        } else {
          destroyMapID(mapId);
          loadMapListData(player);
        }
      } else {
        switch (listItem) {
          case MAP_LIST_ITEM.SEARCH: {
            showMapListDialog(player, DIALOG_ID.MAPLIST_SEARCH);
            return 1;
          }
          case MAP_LIST_ITEM.PAGE: {
            showMapListDialog(player, DIALOG_ID.MAPLIST_PAGE);
            return 1;
          }
          case MAP_LIST_ITEM.PAGE_F: {
            g_MapListData.get(player.id).page = MIN_MAPLIST_PAGE;
            loadMapListData(player);
            break;
          }
          case MAP_LIST_ITEM.PAGE_P: {
            if (--g_MapListData.get(player.id).page < MIN_MAPLIST_PAGE) {
              g_MapListData.get(player.id).page = MIN_MAPLIST_PAGE;
            }
            loadMapListData(player);
            break;
          }
          case MAP_LIST_ITEM.PAGE_N: {
            if (
              ++g_MapListData.get(player.id).page >
              g_MapListData.get(player.id).maxPage
            ) {
              g_MapListData.get(player.id).page = g_MapListData.get(
                player.id
              ).maxPage;
            }
            loadMapListData(player);
            break;
          }
          case MAP_LIST_ITEM.PAGE_L: {
            g_MapListData.get(player.id).page = g_MapListData.get(
              player.id
            ).maxPage;
            loadMapListData(player);
            break;
          }
        }
      }

      showMapListDialog(player, dialogId);
      break;
    }
    case DIALOG_ID.MAPLIST_PAGE: {
      if (!response) {
        showMapListDialog(player, DIALOG_ID.MAPLIST);
        return 1;
      }

      let page = +inputText;

      if (!inputText.trim().length || Number.isNaN(page)) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You did not enter a valid page number!"
        );
        showMapListDialog(player, dialogId);
        return 1;
      }

      page--;

      if (
        page < MIN_MAPLIST_PAGE ||
        page > g_MapListData.get(player.id).maxPage
      ) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You did not enter a valid page!"
        );
        showMapListDialog(player, dialogId);
        return 1;
      }

      g_MapListData.get(player.id).page = page;
      loadMapListData(player);
      showMapListDialog(player, DIALOG_ID.MAPLIST);
      return 1;
    }
    case DIALOG_ID.MAPLIST_SEARCH: {
      if (response) {
        g_MapListData.get(player.id).page = MIN_MAPLIST_PAGE;
        g_MapListData.get(player.id).search = inputText;
        loadMapListData(player);
      }
      showMapListDialog(player, DIALOG_ID.MAPLIST);
      return 1;
    }
  }

  return 0;
}

export async function showMapListDialog(player: Player, dialogId: number) {
  switch (dialogId) {
    case DIALOG_ID.MAPLIST: {
      const g_DialogCaption = "Map List";
      let g_DialogInfo = "";

      for (let listItem = 0; listItem < MAP_LIST_ITEM.MAX; listItem++) {
        if (
          listItem >= MAP_LIST_ITEM.ROW_F &&
          listItem <= MAP_LIST_ITEM.ROW_L
        ) {
          const row = listItem - MAP_LIST_ITEM.ROW_F;
          const mapId = g_MapListData.get(player.id).rowId[row];

          if (mapId === INVALID_MAP_ID) {
            g_DialogInfo += "-\t-\n";
          } else {
            const g_MapString = getMapName(mapId).name;
            const g_DialogInfoRow = `${mapId}\t${g_MapString}\n`;
            g_DialogInfo += g_DialogInfoRow;
          }
        } else {
          switch (listItem) {
            case MAP_LIST_ITEM.SEARCH: {
              const g_SearchString = g_MapListData.get(player.id).search;
              if (!g_SearchString.trim().length) {
                g_DialogInfo += "Search\t \n";
              } else {
                const g_DialogInfoRow = `Search: ${g_SearchString}\t \n`;
                g_DialogInfo += g_DialogInfoRow;
              }
              break;
            }
            case MAP_LIST_ITEM.PAGE: {
              const _page = g_MapListData.get(player.id).page + 1;
              const _pageMax = g_MapListData.get(player.id).maxPage + 1;
              const g_DialogInfoRow = `Page: ${_page} / ${_pageMax}\t \n`;
              g_DialogInfo += g_DialogInfoRow;
              break;
            }
            case MAP_LIST_ITEM.PAGE_F: {
              g_DialogInfo += "<< First Page <<\t \n";
              break;
            }
            case MAP_LIST_ITEM.PAGE_P: {
              g_DialogInfo += "< Previous Page <\t \n";
              break;
            }
            case MAP_LIST_ITEM.PAGE_N: {
              g_DialogInfo += "> Next Page >\t \n";
              break;
            }
            case MAP_LIST_ITEM.PAGE_L: {
              g_DialogInfo += ">> Last Page >>\t \n";
              break;
            }
            default: {
              g_DialogInfo += " \t \n";
            }
          }
        }
      }
      const res = await new Dialog({
        style: DialogStylesEnum.TABLIST,
        caption: g_DialogCaption,
        info: g_DialogInfo,
        button1: "Load",
        button2: "Cancel",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    case DIALOG_ID.MAPLIST_PAGE: {
      const g_DialogCaption = "Map List: Page";
      const g_DialogInfo = `Current Page: ${
        g_MapListData.get(player.id).page + 1
      }`;
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
    case DIALOG_ID.MAPLIST_SEARCH: {
      const g_DialogCaption = "Map List: Search";
      const g_SearchString = g_MapListData.get(player.id).search;
      let g_DialogInfo = "";
      if (!g_SearchString.trim().length) {
        g_DialogInfo = "You are not searching for anything.";
      } else {
        g_DialogInfo = `Searching for: ${g_SearchString}`;
      }
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
