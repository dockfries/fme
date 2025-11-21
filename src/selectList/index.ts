import { findActors, g_ActorData, showActorDialog } from "@/actor";
import { g_CamModeData } from "@/camMode";
import { INVALID_ROW, RGBA_RED, RGBA_WHITE } from "@/constants";
import { DIALOG_ID } from "@/dialog";
import { ID_TYPE } from "@/idType";
import { getModelSphere } from "@/model";
import {
  showObjectDialog,
  getObjectAttachObject,
  getObjectAttachVehicle,
  g_ObjectData,
  findObjects,
} from "@/object";
import { showPickupDialog, g_PickupData, findPickups } from "@/pickup";
import {
  g_PlayerData,
  getPlayerEditActor,
  getPlayerEditObject,
  getPlayerEditPickup,
  getPlayerEditVehicle,
} from "@/player";
import { hidePlayerTextDrawMode, TD_MODE } from "@/tdMode";
import { positionFromOffset, toRadians } from "@/utils/math";
import { SafetyMap } from "@/utils/safetyMap";
import { findVehicles, g_VehicleData, showVehicleDialog } from "@/vehicle";
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

export const MAX_SELECT_LIST_ROWS = 20;
export const MIN_SELECT_LIST_PAGE = 0;

export interface ISelectListGtd {
  bg: TextDraw | null;
  close: TextDraw | null;
  pageF: TextDraw | null;
  pageP: TextDraw | null;
  pageN: TextDraw | null;
  pageL: TextDraw | null;
}

export interface ISelectListPtd {
  caption: TextDraw | null;
  page: TextDraw | null;
  search: TextDraw | null;
  idCol: TextDraw | null;
  modelIdCol: TextDraw | null;
  commentCol: TextDraw | null;
  idRow: (TextDraw | null)[];
  modelIdRow: (TextDraw | null)[];
  commentRow: (TextDraw | null)[];
}

export interface ISelectListData {
  page: number;
  maxPage: number;
  search: string;
  rowId: number[];
  editRow: number;
  editViewed: boolean;
}

export const g_SelectObjListData = new SafetyMap<number, ISelectListData>(
  () => {
    return {
      page: MIN_SELECT_LIST_PAGE,
      maxPage: MIN_SELECT_LIST_PAGE,
      search: "",
      rowId: Array.from(
        { length: MAX_SELECT_LIST_ROWS },
        () => InvalidEnum.OBJECT_ID
      ),
      editRow: INVALID_ROW,
      editViewed: false,
    };
  }
);

export const g_SelectVehListData = new SafetyMap<number, ISelectListData>(
  () => {
    return {
      page: MIN_SELECT_LIST_PAGE,
      maxPage: MIN_SELECT_LIST_PAGE,
      search: "",
      rowId: Array.from(
        { length: MAX_SELECT_LIST_ROWS },
        () => InvalidEnum.VEHICLE_ID
      ),
      editRow: INVALID_ROW,
      editViewed: false,
    };
  }
);

export const g_SelectPickListData = new SafetyMap<number, ISelectListData>(
  () => {
    return {
      page: MIN_SELECT_LIST_PAGE,
      maxPage: MIN_SELECT_LIST_PAGE,
      search: "",
      rowId: Array.from(
        { length: MAX_SELECT_LIST_ROWS },
        () => InvalidEnum.PICKUP_ID
      ),
      editRow: INVALID_ROW,
      editViewed: false,
    };
  }
);

export const g_SelectActListData = new SafetyMap<number, ISelectListData>(
  () => {
    return {
      page: MIN_SELECT_LIST_PAGE,
      maxPage: MIN_SELECT_LIST_PAGE,
      search: "",
      rowId: Array.from(
        { length: MAX_SELECT_LIST_ROWS },
        () => InvalidEnum.ACTOR_ID
      ),
      editRow: INVALID_ROW,
      editViewed: false,
    };
  }
);

export const g_SelectListGTD: ISelectListGtd = {
  bg: null,
  close: null,
  pageF: null,
  pageP: null,
  pageN: null,
  pageL: null,
};

export const g_SelectListPTD = new SafetyMap<number, ISelectListPtd>(() => {
  return {
    caption: null,
    page: null,
    search: null,
    idCol: null,
    modelIdCol: null,
    commentCol: null,
    idRow: Array.from({ length: MAX_SELECT_LIST_ROWS }, () => null),
    modelIdRow: Array.from({ length: MAX_SELECT_LIST_ROWS }, () => null),
    commentRow: Array.from({ length: MAX_SELECT_LIST_ROWS }, () => null),
  };
});

GameMode.onInit(({ next }) => {
  createGenericSelectList();
  Player.getInstances().forEach((p) => {
    if (p.isConnected()) {
      defaultSelectListData(p);
    }
  });
  return next();
});

GameMode.onExit(({ next }) => {
  destroyGenericSelectList();
  g_SelectObjListData.clear();
  g_SelectVehListData.clear();
  g_SelectPickListData.clear();
  g_SelectActListData.clear();
  return next();
});

PlayerEvent.onConnect(({ player, next }) => {
  defaultSelectListData(player);
  return next();
});

function onDialogResponse(
  player: Player,
  res: IDialogResCommon,
  dialogId: number
) {
  const { inputText, response } = res;
  switch (dialogId) {
    case DIALOG_ID.SELECTLIST_PAGE: {
      if (!response) {
        return 1;
      }

      let page = +inputText;

      if (!inputText.trim().length || Number.isNaN(page)) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You did not enter a valid page number!"
        );
        showSelectListDialog(player, dialogId);
        return 1;
      }

      page--;

      if (page < MIN_SELECT_LIST_PAGE || page > getSelectListMaxPage(player)) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You did not enter a valid page number!"
        );
        showSelectListDialog(player, dialogId);
        return 1;
      }

      setSelectListPage(player, page);
      loadSelectListRowData(player);

      applySelectListPage(player);
      for (let row = 0; row < MAX_SELECT_LIST_ROWS; row++) {
        applySelectListRowData(player, row);
      }
      return 1;
    }
    case DIALOG_ID.SELECTLIST_SEARCH: {
      if (!response) {
        return 1;
      }

      setSelectListPage(player, MIN_SELECT_LIST_PAGE);
      setSelectListSearch(player, inputText);
      loadSelectListRowData(player);

      applySelectListPage(player);
      applySelectListSearch(player);
      for (let row = 0; row < MAX_SELECT_LIST_ROWS; row++) {
        applySelectListRowData(player, row);
      }
      return 1;
    }
  }

  return 0;
}

TextDrawEvent.onPlayerClickGlobal(({ player, textDraw, next }) => {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.SELECTLIST_OBJECT:
    case TD_MODE.SELECTLIST_VEHICLE:
    case TD_MODE.SELECTLIST_ACTOR:
    case TD_MODE.SELECTLIST_PICKUP: {
      if (
        textDraw === g_SelectListGTD.close ||
        textDraw === InvalidEnum.TEXT_DRAW
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

        setSelectListEditViewed(player, false);

        hidePlayerTextDrawMode(player);

        if (textDraw === g_SelectListGTD.close) {
          return 1;
        }
      }
    }
  }

  if (textDraw === g_SelectListGTD.pageF) {
    if (getSelectListPage(player) === MIN_SELECT_LIST_PAGE) {
      return 1;
    }

    setSelectListPage(player, MIN_SELECT_LIST_PAGE);
    loadSelectListRowData(player);

    applySelectListPage(player);
    for (let row = 0; row < MAX_SELECT_LIST_ROWS; row++) {
      applySelectListRowData(player, row);
    }
    return 1;
  }
  if (textDraw === g_SelectListGTD.pageP) {
    let page = getSelectListPage(player);

    if (page === MIN_SELECT_LIST_PAGE) {
      return 1;
    }

    if (--page < MIN_SELECT_LIST_PAGE) {
      page = MIN_SELECT_LIST_PAGE;
    }

    setSelectListPage(player, page);
    loadSelectListRowData(player);

    applySelectListPage(player);
    for (let row = 0; row < MAX_SELECT_LIST_ROWS; row++) {
      applySelectListRowData(player, row);
    }
    return 1;
  }
  if (textDraw === g_SelectListGTD.pageN) {
    let page = getSelectListPage(player);
    const maxPage = getSelectListMaxPage(player);

    if (page === maxPage) {
      return 1;
    }

    if (++page > maxPage) {
      page = maxPage;
    }

    setSelectListPage(player, page);
    loadSelectListRowData(player);

    applySelectListPage(player);
    for (let row = 0; row < MAX_SELECT_LIST_ROWS; row++) {
      applySelectListRowData(player, row);
    }
    return 1;
  }
  if (textDraw === g_SelectListGTD.pageL) {
    const maxPage = getSelectListMaxPage(player);

    if (getSelectListPage(player) === maxPage) {
      return 1;
    }

    setSelectListPage(player, maxPage);
    loadSelectListRowData(player);

    applySelectListPage(player);
    for (let row = 0; row < MAX_SELECT_LIST_ROWS; row++) {
      applySelectListRowData(player, row);
    }
    return 1;
  }

  return next();
});

TextDrawEvent.onPlayerClickPlayer(({ player, textDraw, next }) => {
  if (textDraw === g_SelectListPTD.get(player.id).page) {
    showSelectListDialog(player, DIALOG_ID.SELECTLIST_PAGE);
    return 1;
  }
  if (textDraw === g_SelectListPTD.get(player.id).search) {
    showSelectListDialog(player, DIALOG_ID.SELECTLIST_SEARCH);
    return 1;
  }
  for (let row = 0; row < MAX_SELECT_LIST_ROWS; row++) {
    if (
      textDraw === g_SelectListPTD.get(player.id).idRow[row] ||
      textDraw === g_SelectListPTD.get(player.id).modelIdRow[row] ||
      textDraw === g_SelectListPTD.get(player.id).commentRow[row]
    ) {
      let objectId = InvalidEnum.OBJECT_ID;
      let vehicleId = InvalidEnum.VEHICLE_ID;
      let pickupId = InvalidEnum.PICKUP_ID;
      let actorId = InvalidEnum.ACTOR_ID;

      switch (g_PlayerData.get(player.id).tdMode) {
        case TD_MODE.SELECTLIST_OBJECT: {
          objectId = g_SelectObjListData.get(player.id).rowId[row];
          if (!ObjectMp.isValid(objectId)) {
            return 1;
          }
          break;
        }
        case TD_MODE.SELECTLIST_VEHICLE: {
          vehicleId = g_SelectVehListData.get(player.id).rowId[row];
          if (!Vehicle.isValid(vehicleId)) {
            return 1;
          }
          break;
        }
        case TD_MODE.SELECTLIST_PICKUP: {
          pickupId = g_SelectPickListData.get(player.id).rowId[row];
          if (!Pickup.isValid(pickupId)) {
            return 1;
          }
          break;
        }
        case TD_MODE.SELECTLIST_ACTOR: {
          actorId = g_SelectActListData.get(player.id).rowId[row];
          if (!Actor.isValid(actorId)) {
            return 1;
          }
          break;
        }
        default: {
          return 1;
        }
      }

      const prevRow = getSelectListEditRow(player);
      if (row !== prevRow) {
        switch (g_PlayerData.get(player.id).tdMode) {
          case TD_MODE.SELECTLIST_OBJECT: {
            g_PlayerData.get(player.id).editId = objectId;
            g_PlayerData.get(player.id).editIdType = ID_TYPE.OBJECT;
            break;
          }
          case TD_MODE.SELECTLIST_VEHICLE: {
            g_PlayerData.get(player.id).editId = vehicleId;
            g_PlayerData.get(player.id).editIdType = ID_TYPE.VEHICLE;
            break;
          }
          case TD_MODE.SELECTLIST_PICKUP: {
            g_PlayerData.get(player.id).editId = pickupId;
            g_PlayerData.get(player.id).editIdType = ID_TYPE.PICKUP;
            break;
          }
          case TD_MODE.SELECTLIST_ACTOR: {
            g_PlayerData.get(player.id).editId = actorId;
            g_PlayerData.get(player.id).editIdType = ID_TYPE.ACTOR;
            break;
          }
          default: {
            return 0;
          }
        }
      }

      const prevIsViewed = isSelectListEditViewed(player);
      if (row === prevRow && prevIsViewed) {
        switch (g_PlayerData.get(player.id).tdMode) {
          case TD_MODE.SELECTLIST_OBJECT: {
            showObjectDialog(player, DIALOG_ID.OBJECT_MAIN);
            break;
          }
          case TD_MODE.SELECTLIST_VEHICLE: {
            showVehicleDialog(player, DIALOG_ID.VEHICLE_MAIN);
            break;
          }
          case TD_MODE.SELECTLIST_PICKUP: {
            showPickupDialog(player, DIALOG_ID.PICKUP_MAIN);
            break;
          }
          case TD_MODE.SELECTLIST_ACTOR: {
            showActorDialog(player, DIALOG_ID.ACTOR_MAIN);
            break;
          }
          default: {
            return 1;
          }
        }

        g_PlayerData.get(player.id).posSaved = false;

        setSelectListEditViewed(player, false);

        hidePlayerTextDrawMode(player);
        return 1;
      }

      let x = 0;
      let y = 0;
      let z = 0;
      let distance = 0.0;

      switch (g_PlayerData.get(player.id).tdMode) {
        case TD_MODE.SELECTLIST_OBJECT: {
          const attachToObjectId = getObjectAttachObject(objectId);
          const attachToVehicleId = getObjectAttachVehicle(objectId);

          if (ObjectMp.isValid(attachToObjectId)) {
            const attachToObject = ObjectMp.getInstance(attachToObjectId)!;
            const attachOffX = g_ObjectData.get(objectId - 1).attachX;
            const attachOffY = g_ObjectData.get(objectId - 1).attachY;
            const attachOffZ = g_ObjectData.get(objectId - 1).attachZ;

            const { x: objX, y: objY, z: objZ } = attachToObject.getPos();
            const { x: objRx, y: objRy, z: objRz } = attachToObject.getRot();
            const obj = ObjectMp.getInstance(objectId)!;
            const {
              radius: sphere_radius,
              offX: sphere_off_x,
              offY: sphere_off_y,
              offZ: sphere_off_z,
            } = getModelSphere(obj.getModel());

            const res = positionFromOffset(
              objX,
              objY,
              objZ,
              objRx,
              objRy,
              objRz,
              attachOffX + sphere_off_x,
              attachOffY + sphere_off_y,
              attachOffZ + sphere_off_z
            );

            x = res.x;
            y = res.y;
            z = res.z;

            distance = sphere_radius + 1.0;
          } else if (Vehicle.isValid(attachToVehicleId)) {
            let size = 0;

            const vehicle = Vehicle.getInstance(attachToVehicleId)!;
            const {
              x: xSize,
              y: ySize,
              z: zSize,
            } = Vehicle.getModelInfo(
              vehicle.getModel(),
              VehicleModelInfoEnum.SIZE
            );

            if (xSize > size) size = xSize;
            if (ySize > size) size = ySize;
            if (zSize > size) size = zSize;

            const pos = vehicle.getPos();
            x = pos.x;
            y = pos.y;
            z = pos.z;

            distance = size + 1.0;
          } else {
            const object = ObjectMp.getInstance(objectId)!;
            const { x: objX, y: objY, z: objZ } = object.getPos();
            const { x: objRx, y: objRy, z: objRz } = object.getRot();

            const {
              radius: sphereRadius,
              offX: sphereOffX,
              offY: sphereOffY,
              offZ: sphereOffZ,
            } = getModelSphere(object.getModel());

            const pos = positionFromOffset(
              objX,
              objY,
              objZ,
              objRx,
              objRy,
              objRz,
              sphereOffX,
              sphereOffY,
              sphereOffZ
            );

            x = pos.x;
            y = pos.y;
            z = pos.z;

            distance = sphereRadius + 1.0;
          }
          break;
        }
        case TD_MODE.SELECTLIST_VEHICLE: {
          const vehicle = Vehicle.getInstance(vehicleId)!;
          let size = 0;

          const pos = vehicle.getPos();

          x = pos.x;
          y = pos.y;
          z = pos.z;

          const {
            x: sizeX,
            y: sizeY,
            z: sizeZ,
          } = Vehicle.getModelInfo(
            vehicle.getModel(),
            VehicleModelInfoEnum.SIZE
          );

          if (sizeX > size) {
            size = sizeX;
          }
          if (sizeY > size) {
            size = sizeY;
          }
          if (sizeZ > size) {
            size = sizeZ;
          }

          distance = size + 1.0;
          break;
        }
        case TD_MODE.SELECTLIST_PICKUP: {
          x = g_PickupData.get(pickupId).x;
          y = g_PickupData.get(pickupId).y;
          z = g_PickupData.get(pickupId).z;

          const {
            radius: sphereRadius,
            offX: sphereOffX,
            offY: sphereOffY,
            offZ: sphereOffZ,
          } = getModelSphere(g_PickupData.get(pickupId).model);

          x += sphereOffX;
          y += sphereOffY;
          z += sphereOffZ;

          distance = sphereRadius + 1.0;
          break;
        }
        case TD_MODE.SELECTLIST_ACTOR: {
          const actor = Actor.getInstance(actorId)!;
          const pos = actor.getPos();
          x = pos.x;
          y = pos.y;
          z = pos.z;
          distance = 2.0;
          break;
        }
        default: {
          return 0;
        }
      }

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
        const a = toRadians(player.getFacingAngle().angle);

        x -= distance * Math.sin(-a);
        y -= distance * Math.cos(-a);

        player.setPos(x, y, z);
        player.setCameraBehind();
      }

      if (!prevIsViewed || row !== prevRow) {
        setSelectListEditViewed(player, true);

        setSelectListEditRow(player, row);

        applySelectListRowColor(player, row);

        if (prevRow !== INVALID_ROW) {
          applySelectListRowColor(player, prevRow);
        }
      }

      if (!g_PlayerData.get(player.id).posSaved) {
        const pos = player.getPos();
        g_PlayerData.get(player.id).posX = pos.x;
        g_PlayerData.get(player.id).posY = pos.y;
        g_PlayerData.get(player.id).posZ = pos.z;

        g_PlayerData.get(player.id).posSaved = true;
      }
      return 1;
    }
  }
  return next();
});

export function defaultSelectListData(player: Player) {
  g_SelectObjListData.get(player.id).page = MIN_SELECT_LIST_PAGE;
  g_SelectVehListData.get(player.id).page = MIN_SELECT_LIST_PAGE;
  g_SelectPickListData.get(player.id).page = MIN_SELECT_LIST_PAGE;
  g_SelectActListData.get(player.id).page = MIN_SELECT_LIST_PAGE;

  g_SelectObjListData.get(player.id).maxPage = MIN_SELECT_LIST_PAGE;
  g_SelectVehListData.get(player.id).maxPage = MIN_SELECT_LIST_PAGE;
  g_SelectPickListData.get(player.id).maxPage = MIN_SELECT_LIST_PAGE;
  g_SelectActListData.get(player.id).maxPage = MIN_SELECT_LIST_PAGE;

  g_SelectObjListData.get(player.id).search = "";
  g_SelectVehListData.get(player.id).search = "";
  g_SelectPickListData.get(player.id).search = "";
  g_SelectActListData.get(player.id).search = "";

  for (let r = 0; r < MAX_SELECT_LIST_ROWS; r++) {
    g_SelectObjListData.get(player.id).rowId[r] = InvalidEnum.OBJECT_ID;
    g_SelectVehListData.get(player.id).rowId[r] = InvalidEnum.VEHICLE_ID;
    g_SelectPickListData.get(player.id).rowId[r] = InvalidEnum.PICKUP_ID;
    g_SelectActListData.get(player.id).rowId[r] = InvalidEnum.ACTOR_ID;
  }

  g_SelectObjListData.get(player.id).editRow = INVALID_ROW;
  g_SelectVehListData.get(player.id).editRow = INVALID_ROW;
  g_SelectPickListData.get(player.id).editRow = INVALID_ROW;
  g_SelectActListData.get(player.id).editRow = INVALID_ROW;

  g_SelectObjListData.get(player.id).editViewed = false;
  g_SelectVehListData.get(player.id).editViewed = false;
  g_SelectPickListData.get(player.id).editViewed = false;
  g_SelectActListData.get(player.id).editViewed = false;
}

export function createGenericSelectList() {
  g_SelectListGTD.bg = new TextDraw({
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

  g_SelectListGTD.close = new TextDraw({
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

  g_SelectListGTD.pageF = new TextDraw({
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

  g_SelectListGTD.pageP = new TextDraw({
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

  g_SelectListGTD.pageN = new TextDraw({
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

  g_SelectListGTD.pageL = new TextDraw({
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

export function destroyGenericSelectList() {
  Object.entries(g_SelectListGTD).forEach((item) => {
    const [key, gtd] = item as unknown as [
      keyof ISelectListGtd,
      (typeof g_SelectListGTD)[keyof ISelectListGtd]
    ];
    if (gtd && gtd.isValid()) {
      gtd.destroy();
    }
    g_SelectListGTD[key] = null;
  });
}

export function createPlayerSelectList(player: Player) {
  g_SelectListPTD.get(player.id).caption = new TextDraw({
    x: 4.0,
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

  g_SelectListPTD.get(player.id).page = new TextDraw({
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

  g_SelectListPTD.get(player.id).search = new TextDraw({
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

  g_SelectListPTD.get(player.id).idCol = new TextDraw({
    x: 1.0,
    y: 177.0,
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
    .setTextSize(40.0, 10.0);

  g_SelectListPTD.get(player.id).modelIdCol = new TextDraw({
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

  g_SelectListPTD.get(player.id).commentCol = new TextDraw({
    x: 85.0,
    y: 177.0,
    text: "Comment",
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

  for (let row = 0, y = 190.0; row < MAX_SELECT_LIST_ROWS; row++, y += 13.0) {
    g_SelectListPTD.get(player.id).idRow[row] = new TextDraw({
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

    g_SelectListPTD.get(player.id).modelIdRow[row] = new TextDraw({
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

    g_SelectListPTD.get(player.id).commentRow[row] = new TextDraw({
      x: 85.0,
      y,
      text: "Comment",
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

export function destroyPlayerSelectList(player: Player) {
  Object.entries(g_SelectListPTD.get(player.id)).forEach((item) => {
    const [key, ptd] = item as unknown as [
      keyof ISelectListPtd,
      ISelectListPtd[keyof ISelectListPtd]
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
      g_SelectListPTD.get(player.id)[key] = null!;
    }
  });
}

export function showSelectList(player: Player) {
  createPlayerSelectList(player);

  Object.values(g_SelectListGTD).forEach(
    (gtd: ISelectListGtd[keyof ISelectListGtd]) => {
      if (gtd && gtd.isValid()) {
        gtd.show(player);
      }
    }
  );

  loadSelectListRowData(player);

  applySelectListColumns(player);
  g_SelectListPTD.get(player.id).idCol?.show(player);
  g_SelectListPTD.get(player.id).modelIdCol?.show(player);
  g_SelectListPTD.get(player.id).commentCol?.show(player);

  applySelectListCaption(player);
  g_SelectListPTD.get(player.id).caption?.show(player);

  applySelectListPage(player);
  g_SelectListPTD.get(player.id).page?.show(player);

  applySelectListSearch(player);
  g_SelectListPTD.get(player.id).search?.show(player);

  for (let row = 0; row < MAX_SELECT_LIST_ROWS; row++) {
    applySelectListRowData(player, row);
  }
}

export function hideSelectList(player: Player) {
  Object.values(g_SelectListGTD).forEach(
    (gtd: ISelectListGtd[keyof ISelectListGtd]) => {
      if (gtd && gtd.isValid()) {
        gtd.hide(player);
      }
    }
  );

  destroyPlayerSelectList(player);
}

export function getSelectListPage(player: Player) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.SELECTLIST_OBJECT: {
      return g_SelectObjListData.get(player.id).page;
    }
    case TD_MODE.SELECTLIST_VEHICLE: {
      return g_SelectVehListData.get(player.id).page;
    }
    case TD_MODE.SELECTLIST_ACTOR: {
      return g_SelectActListData.get(player.id).page;
    }
    case TD_MODE.SELECTLIST_PICKUP: {
      return g_SelectPickListData.get(player.id).page;
    }
  }
  return 0;
}

export function setSelectListPage(player: Player, page: number) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.SELECTLIST_OBJECT: {
      g_SelectObjListData.get(player.id).page = page;
      break;
    }
    case TD_MODE.SELECTLIST_VEHICLE: {
      g_SelectVehListData.get(player.id).page = page;
      break;
    }
    case TD_MODE.SELECTLIST_ACTOR: {
      g_SelectActListData.get(player.id).page = page;
      break;
    }
    case TD_MODE.SELECTLIST_PICKUP: {
      g_SelectPickListData.get(player.id).page = page;
      break;
    }
    default: {
      return 0;
    }
  }
  return 1;
}

export function getSelectListMaxPage(player: Player) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.SELECTLIST_OBJECT: {
      return g_SelectObjListData.get(player.id).maxPage;
    }
    case TD_MODE.SELECTLIST_VEHICLE: {
      return g_SelectVehListData.get(player.id).maxPage;
    }
    case TD_MODE.SELECTLIST_ACTOR: {
      return g_SelectActListData.get(player.id).maxPage;
    }
    case TD_MODE.SELECTLIST_PICKUP: {
      return g_SelectPickListData.get(player.id).maxPage;
    }
  }
  return 0;
}

export function getSelectListSearch(player: Player) {
  let search = "";
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.SELECTLIST_OBJECT: {
      search = g_SelectObjListData.get(player.id).search;
      break;
    }
    case TD_MODE.SELECTLIST_VEHICLE: {
      search = g_SelectVehListData.get(player.id).search;
      break;
    }
    case TD_MODE.SELECTLIST_ACTOR: {
      search = g_SelectActListData.get(player.id).search;
      break;
    }
    case TD_MODE.SELECTLIST_PICKUP: {
      search = g_SelectPickListData.get(player.id).search;
      break;
    }
    default: {
      return {
        ret: 0,
        search: "",
      };
    }
  }
  return { ret: 1, search };
}

export function setSelectListSearch(player: Player, search: string) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.SELECTLIST_OBJECT: {
      g_SelectObjListData.get(player.id).search = search;
      break;
    }
    case TD_MODE.SELECTLIST_VEHICLE: {
      g_SelectVehListData.get(player.id).search = search;
      break;
    }
    case TD_MODE.SELECTLIST_ACTOR: {
      g_SelectActListData.get(player.id).search = search;
      break;
    }
    case TD_MODE.SELECTLIST_PICKUP: {
      g_SelectPickListData.get(player.id).search = search;
      break;
    }
    default: {
      return 0;
    }
  }
  return 1;
}

export function getSelectListNewEditRow(player: Player) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.SELECTLIST_OBJECT: {
      const editObjectId = getPlayerEditObject(player);
      if (!ObjectMp.isValid(editObjectId)) {
        return INVALID_ROW;
      }

      for (let row = 0; row < MAX_SELECT_LIST_ROWS; row++) {
        const rowObjectId = g_SelectObjListData.get(player.id).rowId[row];
        if (editObjectId === rowObjectId) {
          return row;
        }
      }
      break;
    }
    case TD_MODE.SELECTLIST_VEHICLE: {
      const editVehicleId = getPlayerEditVehicle(player);
      if (!Vehicle.isValid(editVehicleId)) {
        return INVALID_ROW;
      }

      for (let row = 0; row < MAX_SELECT_LIST_ROWS; row++) {
        const rowVehicleId = g_SelectVehListData.get(player.id).rowId[row];
        if (editVehicleId === rowVehicleId) {
          return row;
        }
      }
      break;
    }
    case TD_MODE.SELECTLIST_ACTOR: {
      const editActorId = getPlayerEditActor(player);
      if (!Actor.isValid(editActorId)) {
        return INVALID_ROW;
      }

      for (let row = 0; row < MAX_SELECT_LIST_ROWS; row++) {
        const rowActorId = g_SelectActListData.get(player.id).rowId[row];
        if (editActorId === rowActorId) {
          return row;
        }
      }
      break;
    }
    case TD_MODE.SELECTLIST_PICKUP: {
      const editPickupId = getPlayerEditPickup(player);
      if (!Pickup.isValid(editPickupId)) {
        return INVALID_ROW;
      }

      for (let row = 0; row < MAX_SELECT_LIST_ROWS; row++) {
        const rowPickupId = g_SelectPickListData.get(player.id).rowId[row];
        if (editPickupId === rowPickupId) {
          return row;
        }
      }
      break;
    }
  }
  return INVALID_ROW;
}

export function getSelectListEditRow(player: Player) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.SELECTLIST_OBJECT: {
      return g_SelectObjListData.get(player.id).editRow;
    }
    case TD_MODE.SELECTLIST_VEHICLE: {
      return g_SelectVehListData.get(player.id).editRow;
    }
    case TD_MODE.SELECTLIST_ACTOR: {
      return g_SelectActListData.get(player.id).editRow;
    }
    case TD_MODE.SELECTLIST_PICKUP: {
      return g_SelectPickListData.get(player.id).editRow;
    }
  }
  return INVALID_ROW;
}

export function setSelectListEditRow(player: Player, row: number) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.SELECTLIST_OBJECT: {
      g_SelectObjListData.get(player.id).editRow = row;
      break;
    }
    case TD_MODE.SELECTLIST_VEHICLE: {
      g_SelectVehListData.get(player.id).editRow = row;
      break;
    }
    case TD_MODE.SELECTLIST_ACTOR: {
      g_SelectActListData.get(player.id).editRow = row;
      break;
    }
    case TD_MODE.SELECTLIST_PICKUP: {
      g_SelectPickListData.get(player.id).editRow = row;
      break;
    }
    default: {
      return 0;
    }
  }
  return 1;
}

export function isSelectListEditViewed(player: Player) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.SELECTLIST_OBJECT: {
      return g_SelectObjListData.get(player.id).editViewed;
    }
    case TD_MODE.SELECTLIST_VEHICLE: {
      return g_SelectVehListData.get(player.id).editViewed;
    }
    case TD_MODE.SELECTLIST_ACTOR: {
      return g_SelectActListData.get(player.id).editViewed;
    }
    case TD_MODE.SELECTLIST_PICKUP: {
      return g_SelectPickListData.get(player.id).editViewed;
    }
  }
  return false;
}

export function setSelectListEditViewed(player: Player, selected: boolean) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.SELECTLIST_OBJECT: {
      g_SelectObjListData.get(player.id).editViewed = selected;
      break;
    }
    case TD_MODE.SELECTLIST_VEHICLE: {
      g_SelectVehListData.get(player.id).editViewed = selected;
      break;
    }
    case TD_MODE.SELECTLIST_ACTOR: {
      g_SelectActListData.get(player.id).editViewed = selected;
      break;
    }
    case TD_MODE.SELECTLIST_PICKUP: {
      g_SelectPickListData.get(player.id).editViewed = selected;
      break;
    }
    default: {
      return 0;
    }
  }
  return 1;
}

export function getSelectListCaption(player: Player) {
  let caption = "";
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.SELECTLIST_OBJECT: {
      caption = "Select Object";
      break;
    }
    case TD_MODE.SELECTLIST_VEHICLE: {
      caption = "Select Vehicle";
      break;
    }
    case TD_MODE.SELECTLIST_ACTOR: {
      caption = "Select Actor";
      break;
    }
    case TD_MODE.SELECTLIST_PICKUP: {
      caption = "Select Pickup";
      break;
    }
    default: {
      caption = "Select";
      return { ret: 0, caption };
    }
  }
  return { ret: 1, caption };
}

export function applySelectListColumns(player: Player) {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.SELECTLIST_OBJECT: {
      g_SelectListPTD.get(player.id).idCol?.setString("Object ID");
      g_SelectListPTD.get(player.id).modelIdCol?.setString("Model ID");
      g_SelectListPTD.get(player.id).commentCol?.setString("Object Comment");
      break;
    }
    case TD_MODE.SELECTLIST_VEHICLE: {
      g_SelectListPTD.get(player.id).idCol?.setString("Vehicle ID");
      g_SelectListPTD.get(player.id).modelIdCol?.setString("Model ID");
      g_SelectListPTD.get(player.id).commentCol?.setString("Vehicle Comment");
      break;
    }
    case TD_MODE.SELECTLIST_ACTOR: {
      g_SelectListPTD.get(player.id).idCol?.setString("Actor ID");
      g_SelectListPTD.get(player.id).modelIdCol?.setString("Skin ID");
      g_SelectListPTD.get(player.id).commentCol?.setString("Actor Comment");
      break;
    }
    case TD_MODE.SELECTLIST_PICKUP: {
      g_SelectListPTD.get(player.id).idCol?.setString("Pickup ID");
      g_SelectListPTD.get(player.id).modelIdCol?.setString("Model ID");
      g_SelectListPTD.get(player.id).commentCol?.setString("Pickup Comment");
      break;
    }
    default: {
      g_SelectListPTD.get(player.id).idCol?.setString("ID");
      g_SelectListPTD.get(player.id).modelIdCol?.setString("Model ID");
      g_SelectListPTD.get(player.id).commentCol?.setString("Comment");
      return 0;
    }
  }
  return 1;
}

export function applySelectListCaption(player: Player) {
  const g_TextDrawString = getSelectListCaption(player).caption;
  g_SelectListPTD.get(player.id).caption?.setString(g_TextDrawString);
}

export function applySelectListPage(player: Player) {
  const _page = getSelectListPage(player) + 1;
  const _pageMax = getSelectListMaxPage(player) + 1;
  const g_TextDrawString = `Page ${_page} / ${_pageMax}`;
  g_SelectListPTD.get(player.id).page?.setString(g_TextDrawString);
}

export function applySelectListSearch(player: Player) {
  const g_SearchString = getSelectListSearch(player).search;

  if (!g_SearchString.trim().length) {
    g_SelectListPTD.get(player.id).search?.setString("Search");
  } else {
    const g_TextDrawString = `Search: ${g_SearchString}`;
    g_SelectListPTD.get(player.id).search?.setString(g_TextDrawString);
  }
}

export function applySelectListRowColor(player: Player, row: number) {
  let rgbaBoxColor = 0;

  if (row === getSelectListEditRow(player)) {
    rgbaBoxColor = isSelectListEditViewed(player) ? 0xffff0064 : 0xffff0032;
  } else {
    rgbaBoxColor = 0x00000000;
  }

  g_SelectListPTD
    .get(player.id)
    .idRow[row]?.setBoxColors(rgbaBoxColor)
    .show();
  g_SelectListPTD
    .get(player.id)
    .modelIdRow[row]?.setBoxColors(rgbaBoxColor)
    .show();
  g_SelectListPTD
    .get(player.id)
    .commentRow[row]?.setBoxColors(rgbaBoxColor)
    .show();
  return 1;
}

export function applySelectListRowData(player: Player, row: number) {
  let objectId = InvalidEnum.OBJECT_ID;
  let vehicleId = InvalidEnum.VEHICLE_ID;
  let actorId = InvalidEnum.ACTOR_ID;
  let pickupId = InvalidEnum.PICKUP_ID;
  let isValid = false;

  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.SELECTLIST_OBJECT: {
      objectId = g_SelectObjListData.get(player.id).rowId[row];
      isValid = ObjectMp.isValid(objectId);
      break;
    }
    case TD_MODE.SELECTLIST_VEHICLE: {
      vehicleId = g_SelectVehListData.get(player.id).rowId[row];
      isValid = Vehicle.isValid(vehicleId);
      break;
    }
    case TD_MODE.SELECTLIST_ACTOR: {
      actorId = g_SelectActListData.get(player.id).rowId[row];
      isValid = Actor.isValid(actorId);
      break;
    }
    case TD_MODE.SELECTLIST_PICKUP: {
      pickupId = g_SelectPickListData.get(player.id).rowId[row];
      isValid = Pickup.isValid(pickupId);
      break;
    }
    default: {
      return 0;
    }
  }

  if (!isValid) {
    g_SelectListPTD.get(player.id).idRow[row]?.hide();
    g_SelectListPTD.get(player.id).modelIdRow[row]?.hide();
    g_SelectListPTD.get(player.id).commentRow[row]?.hide();
    return 0;
  }

  let idStr = "";
  let modelIdStr = "";
  let g_CommentString = "";

  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.SELECTLIST_OBJECT: {
      idStr = objectId.toString();
      modelIdStr = ObjectMp.getInstance(objectId)!.getModel().toString();
      g_CommentString = g_ObjectData.get(objectId - 1).comment;
      break;
    }
    case TD_MODE.SELECTLIST_VEHICLE: {
      idStr = vehicleId.toString();
      modelIdStr = Vehicle.getInstance(objectId)!.getModel().toString();
      g_CommentString = g_VehicleData.get(vehicleId - 1).comment;
      break;
    }
    case TD_MODE.SELECTLIST_ACTOR: {
      
      idStr = actorId.toString();
      modelIdStr = Actor.getInstance(actorId)!.getSkin().toString();
      g_CommentString = g_ActorData.get(actorId).comment || "";
      break;
    }
    case TD_MODE.SELECTLIST_PICKUP: {
      idStr = pickupId.toString();
      modelIdStr = Pickup.getInstance(pickupId)!.getModel().toString();
      g_CommentString = g_PickupData.get(pickupId).comment;
      break;
    }
  }

  g_SelectListPTD.get(player.id).idRow[row]?.setString(idStr);
  g_SelectListPTD.get(player.id).modelIdRow[row]?.setString(modelIdStr);
  g_SelectListPTD.get(player.id).commentRow[row]?.setString(g_CommentString);

  applySelectListRowColor(player, row);
  return 1;
}

export function loadSelectListRowData(player: Player) {
  let rowsAdded = 0;
  let maxOffset = 0;
  let g_SearchString = "";

  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.SELECTLIST_OBJECT: {
      g_SearchString = g_SelectObjListData.get(player.id).search;

      const res = findObjects(
        g_SelectObjListData.get(player.id).rowId,
        MAX_SELECT_LIST_ROWS,
        g_SearchString,
        g_SelectObjListData.get(player.id).page * MAX_SELECT_LIST_ROWS
      );
      rowsAdded = res.rowsAdded;
      maxOffset = res.maxOffset;

      g_SelectObjListData.get(player.id).maxPage = Math.floor(
        maxOffset / MAX_SELECT_LIST_ROWS
      );

      for (let row = rowsAdded; row < MAX_SELECT_LIST_ROWS; row++) {
        g_SelectObjListData.get(player.id).rowId[row] = InvalidEnum.OBJECT_ID;
      }
      break;
    }
    case TD_MODE.SELECTLIST_VEHICLE: {
      g_SearchString = g_SelectVehListData.get(player.id).search;

      const res = findVehicles(
        g_SelectVehListData.get(player.id).rowId,
        MAX_SELECT_LIST_ROWS,
        g_SearchString,
        g_SelectVehListData.get(player.id).page * MAX_SELECT_LIST_ROWS
      );
      rowsAdded = res.rowsAdded;
      maxOffset = res.maxOffset;

      g_SelectVehListData.get(player.id).maxPage = Math.floor(
        maxOffset / MAX_SELECT_LIST_ROWS
      );

      for (let row = rowsAdded; row < MAX_SELECT_LIST_ROWS; row++) {
        g_SelectVehListData.get(player.id).rowId[row] = InvalidEnum.VEHICLE_ID;
      }
      break;
    }
    case TD_MODE.SELECTLIST_ACTOR: {
      g_SearchString = g_SelectActListData.get(player.id).search;

      const res = findActors(
        g_SelectActListData.get(player.id).rowId,
        MAX_SELECT_LIST_ROWS,
        g_SearchString,
        g_SelectActListData.get(player.id).page * MAX_SELECT_LIST_ROWS
      );
      rowsAdded = res.rowsAdded;
      maxOffset = res.maxOffset;

      g_SelectActListData.get(player.id).maxPage = Math.floor(
        maxOffset / MAX_SELECT_LIST_ROWS
      );

      for (let row = rowsAdded; row < MAX_SELECT_LIST_ROWS; row++) {
        g_SelectActListData.get(player.id).rowId[row] = InvalidEnum.ACTOR_ID;
      }
      break;
    }
    case TD_MODE.SELECTLIST_PICKUP: {
      g_SearchString = g_SelectPickListData.get(player.id).search;

      const res = findPickups(
        g_SelectPickListData.get(player.id).rowId,
        MAX_SELECT_LIST_ROWS,
        g_SearchString,
        g_SelectPickListData.get(player.id).page * MAX_SELECT_LIST_ROWS
      );
      rowsAdded = res.rowsAdded;
      maxOffset = res.maxOffset;

      g_SelectPickListData.get(player.id).maxPage = Math.floor(
        maxOffset / MAX_SELECT_LIST_ROWS
      );

      for (let row = rowsAdded; row < MAX_SELECT_LIST_ROWS; row++) {
        g_SelectPickListData.get(player.id).rowId[row] = InvalidEnum.PICKUP_ID;
      }
      break;
    }
    default: {
      return 0;
    }
  }

  setSelectListEditRow(player, getSelectListNewEditRow(player));
  return 1;
}

export async function showSelectListDialog(player: Player, dialogId: number) {
  switch (dialogId) {
    case DIALOG_ID.SELECTLIST_PAGE: {
      let g_DialogCaption = getSelectListCaption(player).caption;
      g_DialogCaption += ": Page";

      const _page = getSelectListPage(player) + 1;
      const _pageMax = getSelectListMaxPage(player) + 1;
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
    case DIALOG_ID.SELECTLIST_SEARCH: {
      let g_DialogInfo = "";

      let g_DialogCaption = getSelectListCaption(player).caption;
      g_DialogCaption += ": Search";

      const g_SearchString = getSelectListSearch(player).search;
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
