import { showActorDialog } from "@/actor";
import { g_CamModeData } from "@/camMode";
import {
  getModelCategoryName,
  getSkinCategoryName,
  getVehicleCategoryName,
  INVALID_CATEGORY_ID,
} from "@/category";
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
import { ID_TYPE } from "@/idType";
import { getModelSphere, getModelName, findModels } from "@/model";
import {
  g_ModelViewData,
  applyModelViewModel,
  showModelView,
  hideModelView,
} from "@/modelView";
import { showObjectDialog } from "@/object";
import {
  applyPlayerAttachData,
  g_PlayerAttachData,
  INVALID_PLAYERATTACH_INDEX,
  showAttachedDialog,
} from "@/pAttach";
import { showPickupDialog } from "@/pickup";
import { g_PlayerData, getPlayerEditAttached } from "@/player";
import { findSkins, getSkinName, isValidSkin } from "@/skin";
import { hidePlayerTextDrawMode, TD_MODE } from "@/tdMode";
import { toRadians } from "@/utils/math";
import { SafetyMap } from "@/utils/safetyMap";
import { showVehicleDialog } from "@/vehicle";
import {
  findVehicleModels,
  getVehicleModelName,
  isValidVehicleModel,
} from "@/vehModel";
import {
  Actor,
  Dialog,
  DialogStylesEnum,
  GameMode,
  IDialogResCommon,
  InvalidEnum,
  ObjectMp,
  Pickup,
  Player,
  PlayerEvent,
  TextDraw,
  TextDrawEvent,
  Vehicle,
  VehicleModelInfoEnum,
} from "@infernus/core";

export const MAX_CREATELIST_ROWS = 20;
export const MIN_CREATELIST_PAGE = 0;

export interface ICreateListGtd {
  bg: TextDraw | null;
  close: TextDraw | null;
  pageF: TextDraw | null;
  pageP: TextDraw | null;
  pageN: TextDraw | null;
  pageL: TextDraw | null;
  categoryR: TextDraw | null;
  idCol: TextDraw | null;
  nameCol: TextDraw | null;
}

export interface ICreateListPtd {
  caption: TextDraw | null;
  page: TextDraw | null;
  category: TextDraw | null;
  search: TextDraw | null;
  idRow: (TextDraw | null)[];
  nameRow: (TextDraw | null)[];
}

export interface ICreateListData {
  page: number;
  maxPage: number;
  category: number;
  search: string;
  rowId: number[];
  selectId: number;
  selectRow: number;
}

export const g_CreateObjListData = new SafetyMap<number, ICreateListData>(
  () => {
    return {
      page: MIN_CREATELIST_PAGE,
      maxPage: 0,
      category: INVALID_CATEGORY_ID,
      search: "",
      rowId: Array.from(
        { length: MAX_CREATELIST_ROWS },
        () => INVALID_MODEL_ID
      ),
      selectId: INVALID_MODEL_ID,
      selectRow: INVALID_ROW,
    };
  }
);

export const g_CreateVehListData = new SafetyMap<number, ICreateListData>(
  () => {
    return {
      page: MIN_CREATELIST_PAGE,
      maxPage: 0,
      category: INVALID_CATEGORY_ID,
      search: "",
      rowId: Array.from(
        { length: MAX_CREATELIST_ROWS },
        () => INVALID_MODEL_ID
      ),
      selectId: INVALID_MODEL_ID,
      selectRow: INVALID_ROW,
    };
  }
);

export const g_CreatePickListData = new SafetyMap<number, ICreateListData>(
  () => {
    return {
      page: MIN_CREATELIST_PAGE,
      maxPage: 0,
      category: INVALID_CATEGORY_ID,
      search: "",
      rowId: Array.from(
        { length: MAX_CREATELIST_ROWS },
        () => INVALID_MODEL_ID
      ),
      selectId: INVALID_MODEL_ID,
      selectRow: INVALID_ROW,
    };
  }
);

export const g_CreateActListData = new SafetyMap<number, ICreateListData>(
  () => {
    return {
      page: MIN_CREATELIST_PAGE,
      maxPage: 0,
      category: INVALID_CATEGORY_ID,
      search: "",
      rowId: Array.from(
        { length: MAX_CREATELIST_ROWS },
        () => INVALID_MODEL_ID
      ),
      selectId: INVALID_MODEL_ID,
      selectRow: INVALID_ROW,
    };
  }
);

export const g_CreateAttachListData = new SafetyMap<number, ICreateListData>(
  () => {
    return {
      page: MIN_CREATELIST_PAGE,
      maxPage: 0,
      category: INVALID_CATEGORY_ID,
      search: "",
      rowId: Array.from(
        { length: MAX_CREATELIST_ROWS },
        () => INVALID_MODEL_ID
      ),
      selectId: INVALID_MODEL_ID,
      selectRow: INVALID_ROW,
    };
  }
);

export const g_CreateListGTD: ICreateListGtd = {
  bg: null,
  close: null,
  pageF: null,
  pageP: null,
  pageN: null,
  pageL: null,
  categoryR: null,
  idCol: null,
  nameCol: null,
};

export const g_CreateListPTD = new SafetyMap<number, ICreateListPtd>(() => {
  return {
    caption: null,
    page: null,
    category: null,
    search: null,
    idRow: Array.from({ length: MAX_CREATELIST_ROWS }, () => null),
    nameRow: Array.from({ length: MAX_CREATELIST_ROWS }, () => null),
  };
});

GameMode.onInit(({ next }) => {
  createGenericCreateList();
  Player.getInstances().forEach((p) => {
    if (p.isConnected()) {
      defaultCreateListData(p);
    }
  });
  return next();
});

GameMode.onExit(({ next }) => {
  destroyGenericCreateList();
  g_CreateObjListData.clear();
  g_CreateVehListData.clear();
  g_CreatePickListData.clear();
  g_CreateActListData.clear();
  g_CreateAttachListData.clear();
  g_CreateListPTD.clear();
  return next();
});

PlayerEvent.onConnect(({ player, next }) => {
  defaultCreateListData(player);
  return next();
});

function onDialogResponse(
  player: Player,
  res: IDialogResCommon,
  dialogId: number
) {
  const { inputText, response } = res;
  switch (dialogId) {
    case DIALOG_ID.CREATELIST_PAGE: {
      if (!response) {
        return 1;
      }

      let page = +inputText;

      if (!inputText.trim().length || Number.isNaN(page)) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You did not enter a valid page number!"
        );
        showCreateListDialog(player, dialogId);
        return 1;
      }

      page--;

      if (page < MIN_CREATELIST_PAGE || page > getCreateListMaxPage(player)) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You did not enter a valid page number!"
        );
        showCreateListDialog(player, dialogId);
        return 1;
      }

      setCreateListPage(player, page);
      loadCreateListRowData(player);

      applyCreateListPage(player);
      applyCreateListRowData(player);
      return 1;
    }
    case DIALOG_ID.CREATELIST_SEARCH: {
      if (!response) {
        return 1;
      }

      setCreateListPage(player, MIN_CREATELIST_PAGE);
      setCreateListSearch(player, inputText);
      loadCreateListRowData(player);

      applyCreateListPage(player);
      applyCreateListSearch(player);
      applyCreateListRowData(player);
      return 1;
    }
  }

  return 0;
}

TextDrawEvent.onPlayerClickGlobal(({ player, textDraw, next }) => {
  if (textDraw === InvalidEnum.TEXT_DRAW) {
    switch (g_PlayerData.get(player.id).tdMode) {
      case TD_MODE.CREATELIST_OBJECT:
      case TD_MODE.CREATELIST_VEHICLE:
      case TD_MODE.CREATELIST_PICKUP:
      case TD_MODE.CREATELIST_ACTOR:
      case TD_MODE.CREATELIST_ATTACH: {
        hidePlayerTextDrawMode(player);
        break;
      }
    }
  }

  if (textDraw === g_CreateListGTD.close) {
    hidePlayerTextDrawMode(player);
    return 1;
  }
  if (textDraw === g_CreateListGTD.pageF) {
    if (getCreateListPage(player) === MIN_CREATELIST_PAGE) {
      return 1;
    }

    setCreateListPage(player, MIN_CREATELIST_PAGE);
    loadCreateListRowData(player);

    applyCreateListPage(player);
    applyCreateListRowData(player);
    return 1;
  }
  if (textDraw === g_CreateListGTD.pageP) {
    let page = getCreateListPage(player);
    if (page === MIN_CREATELIST_PAGE) {
      return 1;
    }

    if (--page < MIN_CREATELIST_PAGE) {
      page = MIN_CREATELIST_PAGE;
    }

    setCreateListPage(player, page);
    loadCreateListRowData(player);

    applyCreateListPage(player);
    applyCreateListRowData(player);
    return 1;
  }
  if (textDraw === g_CreateListGTD.pageN) {
    let page = getCreateListPage(player);
    const maxPage = getCreateListMaxPage(player);

    if (page === maxPage) {
      return 1;
    }

    if (++page > maxPage) {
      page = maxPage;
    }

    setCreateListPage(player, page);
    loadCreateListRowData(player);

    applyCreateListPage(player);
    applyCreateListRowData(player);
    return 1;
  }
  if (textDraw === g_CreateListGTD.pageL) {
    const maxPage = getCreateListMaxPage(player);

    if (getCreateListPage(player) === maxPage) {
      return 1;
    }

    setCreateListPage(player, maxPage);
    loadCreateListRowData(player);

    applyCreateListPage(player);
    applyCreateListRowData(player);
    return 1;
  }
  if (textDraw === g_CreateListGTD.categoryR) {
    if (getCreateListCategory(player) === INVALID_CATEGORY_ID) {
      return 1;
    }

    setCreateListCategory(player, INVALID_CATEGORY_ID);
    applyCreateListCategory(player);

    setCreateListPage(player, MIN_CREATELIST_PAGE);
    loadCreateListRowData(player);

    applyCreateListPage(player);
    applyCreateListRowData(player);
  }

  return next();
});

TextDrawEvent.onPlayerClickPlayer(({ player, textDraw, next }) => {
  if (textDraw === g_CreateListPTD.get(player.id).page) {
    showCreateListDialog(player, DIALOG_ID.CREATELIST_PAGE);
    return 1;
  }
  if (textDraw === g_CreateListPTD.get(player.id).search) {
    showCreateListDialog(player, DIALOG_ID.CREATELIST_SEARCH);
    return 1;
  }
  if (textDraw === g_CreateListPTD.get(player.id).category) {
    defaultCategorySelectData(player);
    loadCategorySelectData(player);
    showCategorySelect(player);
    return 1;
  }

  for (let row = 0; row < MAX_CREATELIST_ROWS; row++) {
    if (
      textDraw === g_CreateListPTD.get(player.id).idRow[row] ||
      textDraw === g_CreateListPTD.get(player.id).nameRow[row]
    ) {
      const rowModelId = getCreateListRowModelID(player, row);

      if (rowModelId === INVALID_MODEL_ID) {
        return 1;
      }

      const prevRow = getCreateListSelectRow(player);

      if (row !== prevRow) {
        setCreateListSelectRow(player, row);
        setCreateListSelectModelID(player, rowModelId);

        applyCreateListRowColor(player, row);

        if (prevRow !== INVALID_ROW) {
          applyCreateListRowColor(player, prevRow);
        }

        g_ModelViewData.get(player.id).modelId = rowModelId;
        if (g_ModelViewData.get(player.id).toggle) {
          applyModelViewModel(player, true);
        } else {
          showModelView(player);
        }
        return 1;
      }

      if (g_PlayerData.get(player.id).tdMode === TD_MODE.CREATELIST_ATTACH) {
        const attachIndex = getPlayerEditAttached(player);

        if (attachIndex === INVALID_PLAYERATTACH_INDEX) {
          return 1;
        }

        g_PlayerAttachData.get(player.id)[attachIndex].toggle = true;
        g_PlayerAttachData.get(player.id)[attachIndex].model = rowModelId;
        applyPlayerAttachData(player, attachIndex);

        hidePlayerTextDrawMode(player);
        showAttachedDialog(player, DIALOG_ID.ATTACH_MAIN);
        return 1;
      }

      let { x, y, z } = player.getPos();
      let distance = 0;

      switch (g_PlayerData.get(player.id).tdMode) {
        case TD_MODE.CREATELIST_OBJECT:
        case TD_MODE.CREATELIST_PICKUP: {
          const {
            radius: sphereRadius,
            offX: sphereOffX,
            offY: sphereOffY,
            offZ: sphereOffZ,
          } = getModelSphere(rowModelId);

          x -= sphereOffX;
          y -= sphereOffY;
          z -= sphereOffZ;

          distance = sphereRadius + 1.0;
          break;
        }
        case TD_MODE.CREATELIST_VEHICLE: {
          const {
            x: sizeX,
            y: sizeY,
            z: sizeZ,
          } = Vehicle.getModelInfo(rowModelId, VehicleModelInfoEnum.SIZE);
          let sizeMax = 0;
          if (sizeX > sizeMax) sizeMax = sizeX;
          if (sizeY > sizeMax) sizeMax = sizeY;
          if (sizeZ > sizeMax) sizeMax = sizeZ;

          distance = sizeMax + 1.0;
          break;
        }
        case TD_MODE.CREATELIST_ACTOR: {
          distance = 2.0;
          break;
        }
        default: {
          return 1;
        }
      }

      if (g_CamModeData.get(player.id).toggle) {
        const { x: vec_x, y: vec_y, z: vec_z } = player.getCameraFrontVector();
        x += vec_x * distance;
        y += vec_y * distance;
        z += vec_z * distance;
      } else {
        const a = toRadians(player.getFacingAngle().angle);

        x += distance * Math.sin(-a);
        y += distance * Math.cos(-a);

        player.setCameraBehind();
      }

      switch (g_PlayerData.get(player.id).tdMode) {
        case TD_MODE.CREATELIST_OBJECT: {
          g_PlayerData.get(player.id).editIdType = ID_TYPE.OBJECT;
          const obj = new ObjectMp({
            modelId: rowModelId,
            x,
            y,
            z,
            rx: 0,
            ry: 0,
            rz: 0,
          });
          obj.create();
          g_PlayerData.get(player.id).editId = obj.id;

          if (g_PlayerData.get(player.id).editId !== InvalidEnum.OBJECT_ID) {
            hidePlayerTextDrawMode(player);
            showObjectDialog(player, DIALOG_ID.OBJECT_MAIN);
          }
          break;
        }
        case TD_MODE.CREATELIST_VEHICLE: {
          const vehCol1 = g_ModelViewData.get(player.id).vc1;
          const vehCol2 = g_ModelViewData.get(player.id).vc2;

          g_PlayerData.get(player.id).editIdType = ID_TYPE.VEHICLE;
          const veh = new Vehicle({
            modelId: rowModelId,
            x,
            y,
            z,
            zAngle: 0.0,
            color: [vehCol1, vehCol2],
            respawnDelay: -1,
          });
          g_PlayerData.get(player.id).editId = veh.id;

          if (g_PlayerData.get(player.id).editId !== InvalidEnum.VEHICLE_ID) {
            hidePlayerTextDrawMode(player);
            showVehicleDialog(player, DIALOG_ID.VEHICLE_MAIN);
          }
          break;
        }
        case TD_MODE.CREATELIST_PICKUP: {
          g_PlayerData.get(player.id).editIdType = ID_TYPE.PICKUP;
          const pickup = new Pickup({
            model: rowModelId,
            type: 1,
            x,
            y,
            z,
            virtualWorld: -1,
          });
          pickup.create();
          g_PlayerData.get(player.id).editId = pickup.id;

          if (g_PlayerData.get(player.id).editId !== InvalidEnum.PICKUP_ID) {
            hidePlayerTextDrawMode(player);
            showPickupDialog(player, DIALOG_ID.PICKUP_MAIN);
          }
          break;
        }
        case TD_MODE.CREATELIST_ACTOR: {
          g_PlayerData.get(player.id).editIdType = ID_TYPE.ACTOR;
          const actor = new Actor({
            skin: rowModelId,
            x,
            y,
            z,
            rotation: 0.0,
          });
          actor.create();
          g_PlayerData.get(player.id).editId = actor.id;

          if (g_PlayerData.get(player.id).editId !== InvalidEnum.ACTOR_ID) {
            hidePlayerTextDrawMode(player);
            showActorDialog(player, DIALOG_ID.ACTOR_MAIN);
          }
          break;
        }
        default: {
          return 1;
        }
      }
      return 1;
    }
  }

  return next();
});

export function defaultCreateListData(player: Player) {
  g_CreateObjListData.get(player.id).page = MIN_CREATELIST_PAGE;
  g_CreateVehListData.get(player.id).page = MIN_CREATELIST_PAGE;
  g_CreatePickListData.get(player.id).page = MIN_CREATELIST_PAGE;
  g_CreateActListData.get(player.id).page = MIN_CREATELIST_PAGE;
  g_CreateAttachListData.get(player.id).page = MIN_CREATELIST_PAGE;

  g_CreateObjListData.get(player.id).maxPage = MIN_CREATELIST_PAGE;
  g_CreateVehListData.get(player.id).maxPage = MIN_CREATELIST_PAGE;
  g_CreatePickListData.get(player.id).maxPage = MIN_CREATELIST_PAGE;
  g_CreateActListData.get(player.id).maxPage = MIN_CREATELIST_PAGE;
  g_CreateAttachListData.get(player.id).maxPage = MIN_CREATELIST_PAGE;

  g_CreateObjListData.get(player.id).category = INVALID_CATEGORY_ID;
  g_CreateVehListData.get(player.id).category = INVALID_CATEGORY_ID;
  g_CreatePickListData.get(player.id).category = INVALID_CATEGORY_ID;
  g_CreateActListData.get(player.id).category = INVALID_CATEGORY_ID;
  g_CreateAttachListData.get(player.id).category = INVALID_CATEGORY_ID;

  g_CreateObjListData.get(player.id).search = "";
  g_CreateVehListData.get(player.id).search = "";
  g_CreatePickListData.get(player.id).search = "";
  g_CreateActListData.get(player.id).search = "";
  g_CreateAttachListData.get(player.id).search = "";

  g_CreateObjListData.get(player.id).selectId = INVALID_MODEL_ID;
  g_CreateVehListData.get(player.id).selectId = INVALID_MODEL_ID;
  g_CreatePickListData.get(player.id).selectId = INVALID_MODEL_ID;
  g_CreateActListData.get(player.id).selectId = INVALID_MODEL_ID;
  g_CreateAttachListData.get(player.id).selectId = INVALID_MODEL_ID;

  g_CreateObjListData.get(player.id).selectRow = INVALID_ROW;
  g_CreateVehListData.get(player.id).selectRow = INVALID_ROW;
  g_CreatePickListData.get(player.id).selectRow = INVALID_ROW;
  g_CreateActListData.get(player.id).selectRow = INVALID_ROW;
  g_CreateAttachListData.get(player.id).selectRow = INVALID_ROW;

  for (let row = 0; row < MAX_CREATELIST_ROWS; row++) {
    g_CreateObjListData.get(player.id).rowId[row] = INVALID_MODEL_ID;
    g_CreateVehListData.get(player.id).rowId[row] = INVALID_MODEL_ID;
    g_CreatePickListData.get(player.id).rowId[row] = INVALID_MODEL_ID;
    g_CreateActListData.get(player.id).rowId[row] = INVALID_MODEL_ID;
    g_CreateAttachListData.get(player.id).rowId[row] = INVALID_MODEL_ID;
  }
}

export function createGenericCreateList() {
  g_CreateListGTD.bg = new TextDraw({
    x: 116.0,
    y: 112.0,
    text: "_",
  })
    .create()
    .setAlignment(2)
    .setLetterSize(0.0, 37.1)
    .useBox(true)
    .setBoxColors(100)
    .setTextSize(0.0, 230.0);

  g_CreateListGTD.close = new TextDraw({
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
    .setOutline(1)
    .setProportional(true)
    .useBox(true)
    .setBoxColors(0xff000064)
    .setTextSize(10.0, 20.0)
    .setSelectable(true);

  g_CreateListGTD.pageF = new TextDraw({
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
    .setOutline(1)
    .setProportional(true)
    .setTextSize(10.0, 20.0)
    .setSelectable(true);

  g_CreateListGTD.pageP = new TextDraw({
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
    .setOutline(1)
    .setProportional(true)
    .setTextSize(10.0, 20.0)
    .setSelectable(true);

  g_CreateListGTD.pageN = new TextDraw({
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
    .setOutline(1)
    .setProportional(true)
    .setTextSize(10.0, 20.0)
    .setSelectable(true);

  g_CreateListGTD.pageL = new TextDraw({
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
    .setOutline(1)
    .setProportional(true)
    .setTextSize(10.0, 20.0)
    .setSelectable(true);

  g_CreateListGTD.categoryR = new TextDraw({
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
    .setOutline(1)
    .setProportional(true)
    .setTextSize(10.0, 230.0)
    .setSelectable(true);

  g_CreateListGTD.idCol = new TextDraw({
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
    .setProportional(true)
    .setTextSize(40.0, 10.0);

  g_CreateListGTD.nameCol = new TextDraw({
    x: 43.0,
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
    .setTextSize(231.0, 10.0);
}

export function destroyGenericCreateList() {
  Object.entries(g_CreateListGTD).forEach((item) => {
    const [key, gtd] = item as unknown as [
      keyof ICreateListGtd,
      (typeof g_CreateListGTD)[keyof ICreateListGtd]
    ];
    if (gtd && gtd.isValid()) {
      gtd.destroy();
    }
    g_CreateListGTD[key] = null;
  });
}

export function createPlayerCreateList(player: Player) {
  g_CreateListPTD.get(player.id).caption = new TextDraw({
    x: 3.0,
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

  g_CreateListPTD.get(player.id).page = new TextDraw({
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

  g_CreateListPTD.get(player.id).category = new TextDraw({
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

  g_CreateListPTD.get(player.id).search = new TextDraw({
    x: 116.0,
    y: 164.0,
    text: "Search",
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

  for (let row = 0, y = 190.0; row < MAX_CREATELIST_ROWS; row++, y += 13.0) {
    g_CreateListPTD.get(player.id).idRow[row] = new TextDraw({
      x: 1.0,
      y,
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
      .setBoxColors(100)
      .setTextSize(40.0, 10.0)
      .setSelectable(true);

    g_CreateListPTD.get(player.id).nameRow[row] = new TextDraw({
      x: 43.0,
      y,
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
      .setBoxColors(100)
      .setTextSize(231.0, 10.0)
      .setSelectable(true);
  }
}

export function destroyPlayerCreateList(player: Player) {
  Object.entries(g_CreateListPTD.get(player.id)).forEach((item) => {
    const [key, ptd] = item as unknown as [
      keyof ICreateListPtd,
      ICreateListPtd[keyof ICreateListPtd]
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
      g_CreateListPTD.get(player.id)[key] = null!;
    }
  });
}

export function showCreateList(player: Player) {
  createPlayerCreateList(player);

  Object.values(g_CreateListPTD).forEach(
    (gtd: ICreateListGtd[keyof ICreateListGtd]) => {
      if (gtd && gtd.isValid()) {
        gtd.show(player);
      }
    }
  );

  loadCreateListRowData(player);

  applyCreateListCaption(player);
  g_CreateListPTD.get(player.id).caption?.show();

  applyCreateListPage(player);
  g_CreateListPTD.get(player.id).page?.show();

  applyCreateListCategory(player);
  g_CreateListPTD.get(player.id).category?.show();

  applyCreateListSearch(player);
  g_CreateListPTD.get(player.id).search?.show();

  applyCreateListRowData(player);

  g_ModelViewData.get(player.id).modelId = getCreateListSelectModelID(player);

  if (
    !g_ModelViewData.get(player.id).toggle &&
    g_ModelViewData.get(player.id).modelId !== INVALID_MODEL_ID
  ) {
    showModelView(player);
  }
}

export function hideCreateList(player: Player) {
  hideModelView(player);

  Object.values(g_CreateListPTD).forEach(
    (gtd: ICreateListGtd[keyof ICreateListGtd]) => {
      if (gtd && gtd.isValid()) {
        gtd.hide(player);
      }
    }
  );

  destroyPlayerCreateList(player);
}

export function getCreateListPage(player: Player) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.CREATELIST_OBJECT: {
      return g_CreateObjListData.get(player.id).page;
    }
    case TD_MODE.CREATELIST_VEHICLE: {
      return g_CreateVehListData.get(player.id).page;
    }
    case TD_MODE.CREATELIST_PICKUP: {
      return g_CreatePickListData.get(player.id).page;
    }
    case TD_MODE.CREATELIST_ACTOR: {
      return g_CreateActListData.get(player.id).page;
    }
    case TD_MODE.CREATELIST_ATTACH: {
      return g_CreateAttachListData.get(player.id).page;
    }
  }
  return MIN_CREATELIST_PAGE;
}

export function setCreateListPage(player: Player, page: number) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.CREATELIST_OBJECT: {
      g_CreateObjListData.get(player.id).page = page;
      break;
    }
    case TD_MODE.CREATELIST_VEHICLE: {
      g_CreateVehListData.get(player.id).page = page;
      break;
    }
    case TD_MODE.CREATELIST_PICKUP: {
      g_CreatePickListData.get(player.id).page = page;
      break;
    }
    case TD_MODE.CREATELIST_ACTOR: {
      g_CreateActListData.get(player.id).page = page;
      break;
    }
    case TD_MODE.CREATELIST_ATTACH: {
      g_CreateAttachListData.get(player.id).page = page;
      break;
    }
    default: {
      return 0;
    }
  }
  return 1;
}

export function getCreateListMaxPage(player: Player) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.CREATELIST_OBJECT: {
      return g_CreateObjListData.get(player.id).maxPage;
    }
    case TD_MODE.CREATELIST_VEHICLE: {
      return g_CreateVehListData.get(player.id).maxPage;
    }
    case TD_MODE.CREATELIST_PICKUP: {
      return g_CreatePickListData.get(player.id).maxPage;
    }
    case TD_MODE.CREATELIST_ACTOR: {
      return g_CreateActListData.get(player.id).maxPage;
    }
    case TD_MODE.CREATELIST_ATTACH: {
      return g_CreateAttachListData.get(player.id).maxPage;
    }
  }
  return 0;
}

export function getCreateListSearch(player: Player) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.CREATELIST_OBJECT: {
      return g_CreateObjListData.get(player.id).search;
    }
    case TD_MODE.CREATELIST_VEHICLE: {
      return g_CreateVehListData.get(player.id).search;
    }
    case TD_MODE.CREATELIST_PICKUP: {
      return g_CreatePickListData.get(player.id).search;
    }
    case TD_MODE.CREATELIST_ACTOR: {
      return g_CreateActListData.get(player.id).search;
    }
    case TD_MODE.CREATELIST_ATTACH: {
      return g_CreateAttachListData.get(player.id).search;
    }
    default: {
      return null;
    }
  }
}

export function setCreateListSearch(player: Player, search: string) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.CREATELIST_OBJECT: {
      g_CreateObjListData.get(player.id).search = search;
      break;
    }
    case TD_MODE.CREATELIST_VEHICLE: {
      g_CreateVehListData.get(player.id).search = search;
      break;
    }
    case TD_MODE.CREATELIST_PICKUP: {
      g_CreatePickListData.get(player.id).search = search;
      break;
    }
    case TD_MODE.CREATELIST_ACTOR: {
      g_CreateActListData.get(player.id).search = search;
      break;
    }
    case TD_MODE.CREATELIST_ATTACH: {
      g_CreateAttachListData.get(player.id).search = search;
      break;
    }
    default: {
      return 0;
    }
  }
  return 1;
}

export function getCreateListCategory(player: Player) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.CREATELIST_OBJECT: {
      return g_CreateObjListData.get(player.id).category;
    }
    case TD_MODE.CREATELIST_VEHICLE: {
      return g_CreateVehListData.get(player.id).category;
    }
    case TD_MODE.CREATELIST_PICKUP: {
      return g_CreatePickListData.get(player.id).category;
    }
    case TD_MODE.CREATELIST_ACTOR: {
      return g_CreateActListData.get(player.id).category;
    }
    case TD_MODE.CREATELIST_ATTACH: {
      return g_CreateAttachListData.get(player.id).category;
    }
  }
  return INVALID_CATEGORY_ID;
}

export function setCreateListCategory(player: Player, categoryId: number) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.CREATELIST_OBJECT: {
      g_CreateObjListData.get(player.id).category = categoryId;
      break;
    }
    case TD_MODE.CREATELIST_VEHICLE: {
      g_CreateVehListData.get(player.id).category = categoryId;
      break;
    }
    case TD_MODE.CREATELIST_PICKUP: {
      g_CreatePickListData.get(player.id).category = categoryId;
      break;
    }
    case TD_MODE.CREATELIST_ACTOR: {
      g_CreateActListData.get(player.id).category = categoryId;
      break;
    }
    case TD_MODE.CREATELIST_ATTACH: {
      g_CreateAttachListData.get(player.id).category = categoryId;
      break;
    }
    default: {
      return 0;
    }
  }
  return 1;
}

export function getCreateListRowModelID(player: Player, row: number) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.CREATELIST_OBJECT: {
      return g_CreateObjListData.get(player.id).rowId[row];
    }
    case TD_MODE.CREATELIST_VEHICLE: {
      return g_CreateVehListData.get(player.id).rowId[row];
    }
    case TD_MODE.CREATELIST_PICKUP: {
      return g_CreatePickListData.get(player.id).rowId[row];
    }
    case TD_MODE.CREATELIST_ACTOR: {
      return g_CreateActListData.get(player.id).rowId[row];
    }
    case TD_MODE.CREATELIST_ATTACH: {
      return g_CreateAttachListData.get(player.id).rowId[row];
    }
  }
  return INVALID_MODEL_ID;
}

export function getCreateListSelectModelID(player: Player) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.CREATELIST_OBJECT: {
      return g_CreateObjListData.get(player.id).selectId;
    }
    case TD_MODE.CREATELIST_VEHICLE: {
      return g_CreateVehListData.get(player.id).selectId;
    }
    case TD_MODE.CREATELIST_PICKUP: {
      return g_CreatePickListData.get(player.id).selectId;
    }
    case TD_MODE.CREATELIST_ACTOR: {
      return g_CreateActListData.get(player.id).selectId;
    }
    case TD_MODE.CREATELIST_ATTACH: {
      return g_CreateAttachListData.get(player.id).selectId;
    }
  }
  return INVALID_MODEL_ID;
}

export function setCreateListSelectModelID(player: Player, modelId: number) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.CREATELIST_OBJECT: {
      g_CreateObjListData.get(player.id).selectId = modelId;
      break;
    }
    case TD_MODE.CREATELIST_VEHICLE: {
      g_CreateVehListData.get(player.id).selectId = modelId;
      break;
    }
    case TD_MODE.CREATELIST_PICKUP: {
      g_CreatePickListData.get(player.id).selectId = modelId;
      break;
    }
    case TD_MODE.CREATELIST_ACTOR: {
      g_CreateActListData.get(player.id).selectId = modelId;
      break;
    }
    case TD_MODE.CREATELIST_ATTACH: {
      g_CreateAttachListData.get(player.id).selectId = modelId;
      break;
    }
    default: {
      return 0;
    }
  }
  return 1;
}

export function getCreateListNewSelectRow(player: Player) {
  const selectModelId = getCreateListSelectModelID(player);
  if (selectModelId === INVALID_MODEL_ID) {
    return INVALID_ROW;
  }

  for (let row = 0; row < MAX_CREATELIST_ROWS; row++) {
    const rowModelId = getCreateListRowModelID(player, row);
    if (selectModelId === rowModelId) {
      return row;
    }
  }
  return INVALID_ROW;
}

export function getCreateListSelectRow(player: Player) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.CREATELIST_OBJECT: {
      return g_CreateObjListData.get(player.id).selectRow;
    }
    case TD_MODE.CREATELIST_VEHICLE: {
      return g_CreateVehListData.get(player.id).selectRow;
    }
    case TD_MODE.CREATELIST_PICKUP: {
      return g_CreatePickListData.get(player.id).selectRow;
    }
    case TD_MODE.CREATELIST_ACTOR: {
      return g_CreateActListData.get(player.id).selectRow;
    }
    case TD_MODE.CREATELIST_ATTACH: {
      return g_CreateAttachListData.get(player.id).selectRow;
    }
  }
  return INVALID_ROW;
}

export function setCreateListSelectRow(player: Player, row: number) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.CREATELIST_OBJECT: {
      g_CreateObjListData.get(player.id).selectRow = row;
      break;
    }
    case TD_MODE.CREATELIST_VEHICLE: {
      g_CreateVehListData.get(player.id).selectRow = row;
      break;
    }
    case TD_MODE.CREATELIST_PICKUP: {
      g_CreatePickListData.get(player.id).selectRow = row;
      break;
    }
    case TD_MODE.CREATELIST_ACTOR: {
      g_CreateActListData.get(player.id).selectRow = row;
      break;
    }
    case TD_MODE.CREATELIST_ATTACH: {
      g_CreateAttachListData.get(player.id).selectRow = row;
      break;
    }
    default: {
      return 0;
    }
  }
  return 1;
}

export function getCreateListCaption(player: Player) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.CREATELIST_OBJECT: {
      return "Create Object";
    }
    case TD_MODE.CREATELIST_VEHICLE: {
      return "Create Vehicle";
    }
    case TD_MODE.CREATELIST_PICKUP: {
      return "Create Pickup";
    }
    case TD_MODE.CREATELIST_ACTOR: {
      return "Create Actor";
    }
    case TD_MODE.CREATELIST_ATTACH: {
      return "Create Attachment";
    }
    default: {
      return "Create";
    }
  }
}

export function applyCreateListCaption(player: Player) {
  const g_TextDrawString = getCreateListCaption(player);
  g_CreateListPTD.get(player.id).caption?.setString(g_TextDrawString);
}

export function applyCreateListPage(player: Player) {
  const _page = getCreateListPage(player) + 1;
  const _pageMax = getCreateListMaxPage(player) + 1;
  const g_TextDrawString = `Page: ${_page} / ${_pageMax}`;
  g_CreateListPTD.get(player.id).page?.setString(g_TextDrawString);
}

export function applyCreateListCategory(player: Player) {
  const categoryId = getCreateListCategory(player);
  if (categoryId === INVALID_CATEGORY_ID) {
    g_CreateListPTD.get(player.id).category?.setString("Category");
    return 1;
  }

  let g_CategoryNameString = "";

  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.CREATELIST_OBJECT:
    case TD_MODE.CREATELIST_PICKUP:
    case TD_MODE.CREATELIST_ATTACH: {
      g_CategoryNameString = getModelCategoryName(categoryId).name;
      break;
    }
    case TD_MODE.CREATELIST_VEHICLE: {
      g_CategoryNameString = getVehicleCategoryName(categoryId).name;
      break;
    }
    case TD_MODE.CREATELIST_ACTOR: {
      g_CategoryNameString = getSkinCategoryName(categoryId).name;
      break;
    }
    default: {
      return 0;
    }
  }

  const g_TextDrawString = `Category: ${g_CategoryNameString}`;
  g_CreateListPTD.get(player.id).category?.setString(g_TextDrawString);
  return 1;
}

export function applyCreateListSearch(player: Player) {
  const g_SearchString = getCreateListSearch(player);
  if (!g_SearchString || !g_SearchString.trim().length) {
    g_CreateListPTD.get(player.id).search?.setString("Search");
  } else {
    const g_TextDrawString = `Search: ${g_SearchString}`;
    g_CreateListPTD.get(player.id).search?.setString(g_TextDrawString);
  }
}

export function applyCreateListRowColor(player: Player, row: number) {
  const selectRow = getCreateListSelectRow(player);
  const rgbaBoxColor = row === selectRow ? 0xffffff64 : 0x00000000;
  g_CreateListPTD.get(player.id).idRow[row]?.setBoxColors(rgbaBoxColor).show();
  g_CreateListPTD
    .get(player.id)
    .nameRow[row]?.setBoxColors(rgbaBoxColor)
    .show();
}

export function applyCreateListRowData(player: Player) {
  for (let row = 0; row < MAX_CREATELIST_ROWS; row++) {
    const rowModelId = getCreateListRowModelID(player, row);

    if (rowModelId === INVALID_MODEL_ID) {
      g_CreateListPTD.get(player.id).idRow[row]?.hide();
      g_CreateListPTD.get(player.id).nameRow[row]?.hide();
      continue;
    }

    const g_IntegerString = rowModelId.toString();
    g_CreateListPTD.get(player.id).idRow[row]?.setString(g_IntegerString);

    if (isValidVehicleModel(rowModelId)) {
      const g_VehModelString = getVehicleModelName(rowModelId);
      g_CreateListPTD
        .get(player.id)
        .nameRow[row]?.setString(g_VehModelString || "");
    } else if (isValidSkin(rowModelId)) {
      const g_SkinString = getSkinName(rowModelId);
      g_CreateListPTD
        .get(player.id)
        .nameRow[row]?.setString(g_SkinString || "");
    } else {
      const g_ModelString = getModelName(rowModelId).name;
      g_CreateListPTD
        .get(player.id)
        .nameRow[row]?.setString(g_ModelString || "");
    }

    applyCreateListRowColor(player, row);
  }
  return 1;
}

export function loadCreateListRowData(player: Player) {
  let maxOffset = 0;
  let rowsAdded = 0;

  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.CREATELIST_OBJECT: {
      const g_SearchString = g_CreateObjListData.get(player.id).search;

      const res = findModels(
        g_CreateObjListData.get(player.id).rowId,
        MAX_CREATELIST_ROWS,
        g_SearchString,
        g_CreateObjListData.get(player.id).category,
        g_CreateObjListData.get(player.id).page * MAX_CREATELIST_ROWS
      );
      maxOffset = res.maxOffset;
      rowsAdded = res.rowsAdded;

      g_CreateObjListData.get(player.id).maxPage = Math.ceil(
        maxOffset / MAX_CREATELIST_ROWS
      );

      for (let row = rowsAdded; row < MAX_CREATELIST_ROWS; row++) {
        g_CreateObjListData.get(player.id).rowId[row] = INVALID_MODEL_ID;
      }
      break;
    }
    case TD_MODE.CREATELIST_VEHICLE: {
      const g_SearchString = g_CreateVehListData.get(player.id).search;

      const res = findVehicleModels(
        g_CreateVehListData.get(player.id).rowId,
        MAX_CREATELIST_ROWS,
        g_SearchString,
        g_CreateVehListData.get(player.id).category,
        g_CreateVehListData.get(player.id).page * MAX_CREATELIST_ROWS
      );
      maxOffset = res.maxOffset;
      rowsAdded = res.rowsAdded;

      g_CreateVehListData.get(player.id).maxPage = Math.ceil(
        maxOffset / MAX_CREATELIST_ROWS
      );

      for (let row = rowsAdded; row < MAX_CREATELIST_ROWS; row++) {
        g_CreateVehListData.get(player.id).rowId[row] = INVALID_MODEL_ID;
      }
      break;
    }
    case TD_MODE.CREATELIST_PICKUP: {
      const g_SearchString = g_CreatePickListData.get(player.id).search;

      const res = findModels(
        g_CreatePickListData.get(player.id).rowId,
        MAX_CREATELIST_ROWS,
        g_SearchString,
        g_CreatePickListData.get(player.id).category,
        g_CreatePickListData.get(player.id).page * MAX_CREATELIST_ROWS
      );
      maxOffset = res.maxOffset;
      rowsAdded = res.rowsAdded;

      g_CreatePickListData.get(player.id).maxPage = Math.ceil(
        maxOffset / MAX_CREATELIST_ROWS
      );

      for (let row = rowsAdded; row < MAX_CREATELIST_ROWS; row++) {
        g_CreatePickListData.get(player.id).rowId[row] = INVALID_MODEL_ID;
      }
      break;
    }
    case TD_MODE.CREATELIST_ACTOR: {
      const g_SearchString = g_CreateActListData.get(player.id).search;

      const res = findSkins(
        g_CreateActListData.get(player.id).rowId,
        MAX_CREATELIST_ROWS,
        g_SearchString,
        g_CreateActListData.get(player.id).category,
        g_CreateActListData.get(player.id).page * MAX_CREATELIST_ROWS
      );
      maxOffset = res.maxOffset;
      rowsAdded = res.rowsAdded;

      g_CreateActListData.get(player.id).maxPage = Math.ceil(
        maxOffset / MAX_CREATELIST_ROWS
      );

      for (let row = rowsAdded; row < MAX_CREATELIST_ROWS; row++) {
        g_CreateActListData.get(player.id).rowId[row] = INVALID_MODEL_ID;
      }
      break;
    }
    case TD_MODE.CREATELIST_ATTACH: {
      const g_SearchString = g_CreateAttachListData.get(player.id).search;

      const res = findModels(
        g_CreateAttachListData.get(player.id).rowId,
        MAX_CREATELIST_ROWS,
        g_SearchString,
        g_CreateAttachListData.get(player.id).category,
        g_CreateAttachListData.get(player.id).page * MAX_CREATELIST_ROWS
      );
      maxOffset = res.maxOffset;
      rowsAdded = res.rowsAdded;

      g_CreateAttachListData.get(player.id).maxPage = Math.ceil(
        maxOffset / MAX_CREATELIST_ROWS
      );

      for (let row = rowsAdded; row < MAX_CREATELIST_ROWS; row++) {
        g_CreateAttachListData.get(player.id).rowId[row] = INVALID_MODEL_ID;
      }
      break;
    }
    default: {
      return 0;
    }
  }

  setCreateListSelectRow(player, getCreateListNewSelectRow(player));
  return 1;
}

export async function showCreateListDialog(player: Player, dialogId: number) {
  let g_DialogCaption = "";
  switch (dialogId) {
    case DIALOG_ID.CREATELIST_PAGE: {
      g_DialogCaption = getCreateListCaption(player);
      g_DialogCaption += ": Page";

      const _page = getCreateListPage(player) + 1;
      const _pageMax = getCreateListMaxPage(player) + 1;

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
    case DIALOG_ID.CREATELIST_SEARCH: {
      g_DialogCaption = getCreateListCaption(player);
      g_DialogCaption += ": Search";

      let g_DialogInfo = "";

      const g_SearchString = getCreateListSearch(player);
      if (!g_SearchString || g_SearchString.trim().length) {
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
