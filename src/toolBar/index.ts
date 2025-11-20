import { showActorDialog } from "@/actor";
import { g_CamModeData, toggleCam } from "@/camMode";
import { RGBA_ORANGE, RGBA_RED, RGBA_WHITE } from "@/constants";
import { DIALOG_ID } from "@/dialog";
import { ID_TYPE } from "@/idType";
import { loadMapListData, showMapListDialog } from "@/mapList";
import { showMapLoadDialog } from "@/mapLoad";
import { showMapNewDialog } from "@/mapNew";
import { showMapSaveDialog } from "@/mapSave";
import { showObjectDialog } from "@/object";
import { showAttachedDialog } from "@/pAttach";
import { showPickupDialog } from "@/pickup";
import {
  g_PlayerData,
  getPlayerNearestActor,
  getPlayerNearestObject,
  getPlayerNearestPickup,
  getPlayerNearestVehicle,
} from "@/player";
import { showPlayerTextDrawMode, TD_MODE } from "@/tdMode";
import { SafetyMap } from "@/utils/safetyMap";
import { showVehicleDialog } from "@/vehicle";
import {
  GameMode,
  InvalidEnum,
  Player,
  PlayerEvent,
  PlayerStateEnum,
  TextDraw,
  TextDrawEvent,
} from "@infernus/core";

export interface ITdToolBar {
  bg: TextDraw | null;
  objectBg: TextDraw | null;
  objectModel: TextDraw | null;
  objectText: TextDraw | null;
  objectListSelect: TextDraw | null;
  objectNSelect: TextDraw | null;
  objectLookSelect: TextDraw | null;
  objectSSelect: TextDraw | null;
  object3dSelect: TextDraw | null;
  objectCreate: TextDraw | null;
  vehicleBg: TextDraw | null;
  vehicleModel: TextDraw | null;
  vehicleText: TextDraw | null;
  vehicleListSelect: TextDraw | null;
  vehicleNSelect: TextDraw | null;
  vehicleLookSelect: TextDraw | null;
  vehicleSSelect: TextDraw | null;
  vehicleCreate: TextDraw | null;
  pickupBg: TextDraw | null;
  pickupModel: TextDraw | null;
  pickupText: TextDraw | null;
  pickupListSelect: TextDraw | null;
  pickupNSelect: TextDraw | null;
  pickupCreate: TextDraw | null;
  attachedBg: TextDraw | null;
  attachedModel: TextDraw | null;
  attachedText: TextDraw | null;
  actorBg: TextDraw | null;
  actorModel: TextDraw | null;
  actorText: TextDraw | null;
  actorListSelect: TextDraw | null;
  actorNSelect: TextDraw | null;
  actorLookSelect: TextDraw | null;
  actorCreate: TextDraw | null;
  mapBg: TextDraw | null;
  mapModel: TextDraw | null;
  mapText: TextDraw | null;
  mapNew: TextDraw | null;
  mapSave: TextDraw | null;
  mapSaveAs: TextDraw | null;
  mapLoadList: TextDraw | null;
  mapLoadName: TextDraw | null;
  camBg: TextDraw | null;
  camModel: TextDraw | null;
  camText: TextDraw | null;
  buildingBg: TextDraw | null;
  buildingModel: TextDraw | null;
  buildingText: TextDraw | null;
  miscBg: TextDraw | null;
  miscModel: TextDraw | null;
  miscText: TextDraw | null;
  miscCategory: TextDraw | null;
  miscInfo: TextDraw | null;
}

export const g_ToolbarTextDraw: ITdToolBar = {
  bg: null,
  objectBg: null,
  objectModel: null,
  objectText: null,
  objectListSelect: null,
  objectNSelect: null,
  objectLookSelect: null,
  objectSSelect: null,
  object3dSelect: null,
  objectCreate: null,
  vehicleBg: null,
  vehicleModel: null,
  vehicleText: null,
  vehicleListSelect: null,
  vehicleNSelect: null,
  vehicleLookSelect: null,
  vehicleSSelect: null,
  vehicleCreate: null,
  pickupBg: null,
  pickupModel: null,
  pickupText: null,
  pickupListSelect: null,
  pickupNSelect: null,
  pickupCreate: null,
  attachedBg: null,
  attachedModel: null,
  attachedText: null,
  actorBg: null,
  actorModel: null,
  actorText: null,
  actorListSelect: null,
  actorNSelect: null,
  actorLookSelect: null,
  actorCreate: null,
  mapBg: null,
  mapModel: null,
  mapText: null,
  mapNew: null,
  mapSave: null,
  mapSaveAs: null,
  mapLoadList: null,
  mapLoadName: null,
  camBg: null,
  camModel: null,
  camText: null,
  buildingBg: null,
  buildingModel: null,
  buildingText: null,
  miscBg: null,
  miscModel: null,
  miscText: null,
  miscCategory: null,
  miscInfo: null,
};

export const g_ToolbarKeyTextDraw = new SafetyMap<number, TextDraw | null>(
  () => null
);

GameMode.onInit(({ next }) => {
  createToolbarTextDraws();
  return next();
});

GameMode.onExit(({ next }) => {
  destroyToolbarTextDraws();
  g_ToolbarKeyTextDraw.clear();
  return next();
});

PlayerEvent.onConnect(({ player, next }) => {
  createToolbarKeyTextDraw(player, false);
  return next();
});

PlayerEvent.onStateChange(({ player, newState, oldState, next }) => {
  if (
    newState === PlayerStateEnum.SPECTATING ||
    oldState === PlayerStateEnum.SPECTATING
  ) {
    createToolbarKeyTextDraw(player, g_PlayerData.get(player.id).selectTd);
  }
  return next();
});

TextDrawEvent.onPlayerClickGlobal(({ player, textDraw, next }) => {
  if (textDraw === InvalidEnum.TEXT_DRAW) {
    createToolbarKeyTextDraw(player, false);

    Object.values(g_ToolbarTextDraw).forEach(
      (gtd: ITdToolBar[keyof ITdToolBar]) => {
        if (gtd && gtd.isValid()) {
          gtd.hide(player);
        }
      }
    );
  }

  if (textDraw === g_ToolbarTextDraw.objectListSelect) {
    showPlayerTextDrawMode(player, TD_MODE.SELECTLIST_OBJECT);
    return 1;
  }
  if (textDraw === g_ToolbarTextDraw.objectNSelect) {
    const objectId = getPlayerNearestObject(player, 50.0);

    if (objectId === InvalidEnum.OBJECT_ID) {
      player.sendClientMessage(RGBA_RED, "ERROR: You are not near any object!");
      return 1;
    }

    g_PlayerData.get(player.id).editIdType = ID_TYPE.OBJECT;
    g_PlayerData.get(player.id).editId = objectId;
    showObjectDialog(player, DIALOG_ID.OBJECT_MAIN);
    return 1;
  }
  if (textDraw === g_ToolbarTextDraw.objectLookSelect) {
    const object = player.getCameraTargetObject();

    if (!object || object.id === InvalidEnum.OBJECT_ID) {
      player.sendClientMessage(
        RGBA_RED,
        "ERROR: You are not looking at any object!"
      );
      return 1;
    }

    g_PlayerData.get(player.id).editIdType = ID_TYPE.OBJECT;
    g_PlayerData.get(player.id).editId = object.id;
    showObjectDialog(player, DIALOG_ID.OBJECT_MAIN);
    return 1;
  }
  if (textDraw === g_ToolbarTextDraw.objectSSelect) {
    const object = player.getSurfingObject();

    if (!object || object.id === InvalidEnum.OBJECT_ID) {
      player.sendClientMessage(
        RGBA_RED,
        "ERROR: You are not surfing any object!"
      );
      return 1;
    }

    g_PlayerData.get(player.id).editIdType = ID_TYPE.OBJECT;
    g_PlayerData.get(player.id).editId = object.id;
    showObjectDialog(player, DIALOG_ID.OBJECT_MAIN);
    return 1;
  }
  if (textDraw === g_ToolbarTextDraw.object3dSelect) {
    player.beginObjectSelecting();
    player.sendClientMessage(
      RGBA_ORANGE,
      "3D-Select Object: {FFFFFF}Hold ~k~~PED_SPRINT~ to look around and press ESC to cancel."
    );
    return 1;
  }
  if (textDraw === g_ToolbarTextDraw.objectCreate) {
    showPlayerTextDrawMode(player, TD_MODE.CREATELIST_OBJECT);
    return 1;
  }
  if (textDraw === g_ToolbarTextDraw.vehicleListSelect) {
    showPlayerTextDrawMode(player, TD_MODE.SELECTLIST_VEHICLE);
    return 1;
  }
  if (textDraw === g_ToolbarTextDraw.vehicleNSelect) {
    const vehicleId = getPlayerNearestVehicle(player, 50.0);

    if (vehicleId === InvalidEnum.VEHICLE_ID) {
      player.sendClientMessage(
        RGBA_RED,
        "ERROR: You are not near any vehicle!"
      );
      return 1;
    }

    g_PlayerData.get(player.id).editIdType = ID_TYPE.VEHICLE;
    g_PlayerData.get(player.id).editId = vehicleId;
    showVehicleDialog(player, DIALOG_ID.VEHICLE_MAIN);
    return 1;
  }
  if (textDraw === g_ToolbarTextDraw.vehicleLookSelect) {
    const vehicle = player.getCameraTargetVehicle();

    if (!vehicle || vehicle.id === InvalidEnum.VEHICLE_ID) {
      player.sendClientMessage(
        RGBA_RED,
        "ERROR: You are not looking at any vehicle!"
      );
      return 1;
    }

    g_PlayerData.get(player.id).editIdType = ID_TYPE.VEHICLE;
    g_PlayerData.get(player.id).editId = vehicle.id;
    showVehicleDialog(player, DIALOG_ID.VEHICLE_MAIN);
    return 1;
  }
  if (textDraw === g_ToolbarTextDraw.vehicleSSelect) {
    const vehicle = player.getSurfingVehicle();

    if (!vehicle || vehicle.id === InvalidEnum.VEHICLE_ID) {
      player.sendClientMessage(
        RGBA_RED,
        "ERROR: You are not surfing at any vehicle!"
      );
      return 1;
    }

    g_PlayerData.get(player.id).editIdType = ID_TYPE.VEHICLE;
    g_PlayerData.get(player.id).editId = vehicle.id;
    showVehicleDialog(player, DIALOG_ID.VEHICLE_MAIN);
    return 1;
  }
  if (textDraw === g_ToolbarTextDraw.vehicleCreate) {
    showPlayerTextDrawMode(player, TD_MODE.CREATELIST_VEHICLE);
    return 1;
  }
  if (textDraw === g_ToolbarTextDraw.pickupListSelect) {
    showPlayerTextDrawMode(player, TD_MODE.SELECTLIST_PICKUP);
    return 1;
  }
  if (textDraw === g_ToolbarTextDraw.pickupNSelect) {
    const pickupId = getPlayerNearestPickup(player, 50.0);

    if (pickupId === InvalidEnum.PICKUP_ID) {
      player.sendClientMessage(RGBA_RED, "ERROR: You are not near any pickup!");
      return 1;
    }

    g_PlayerData.get(player.id).editIdType = ID_TYPE.PICKUP;
    g_PlayerData.get(player.id).editId = pickupId;
    showPickupDialog(player, DIALOG_ID.PICKUP_MAIN);
    return 1;
  }
  if (textDraw === g_ToolbarTextDraw.pickupCreate) {
    showPlayerTextDrawMode(player, TD_MODE.CREATELIST_PICKUP);
    return 1;
  }
  if (textDraw === g_ToolbarTextDraw.attachedModel) {
    showAttachedDialog(player, DIALOG_ID.ATTACH_INDEXLIST);
    return 1;
  }
  if (textDraw === g_ToolbarTextDraw.actorListSelect) {
    showPlayerTextDrawMode(player, TD_MODE.SELECTLIST_ACTOR);
    return 1;
  }
  if (textDraw === g_ToolbarTextDraw.actorNSelect) {
    const actorId = getPlayerNearestActor(player, 50.0);

    if (actorId === InvalidEnum.ACTOR_ID) {
      player.sendClientMessage(RGBA_RED, "ERROR: You are not near any actor!");
      return 1;
    }

    g_PlayerData.get(player.id).editIdType = ID_TYPE.ACTOR;
    g_PlayerData.get(player.id).editId = actorId;
    showActorDialog(player, DIALOG_ID.ACTOR_MAIN);
    return 1;
  }
  if (textDraw === g_ToolbarTextDraw.actorLookSelect) {
    const actor = player.getCameraTargetActor();

    if (!actor || actor.id === InvalidEnum.ACTOR_ID) {
      player.sendClientMessage(
        RGBA_RED,
        "ERROR: You are not looking at any actor!"
      );
      return 1;
    }

    g_PlayerData.get(player.id).editIdType = ID_TYPE.ACTOR;
    g_PlayerData.get(player.id).editId = actor.id;
    showActorDialog(player, DIALOG_ID.ACTOR_MAIN);
    return 1;
  }
  if (textDraw === g_ToolbarTextDraw.actorCreate) {
    showPlayerTextDrawMode(player, TD_MODE.CREATELIST_ACTOR);
    return 1;
  }
  if (textDraw === g_ToolbarTextDraw.mapNew) {
    showMapNewDialog(player, DIALOG_ID.MAP_NEW);
    return 1;
  }
  if (textDraw === g_ToolbarTextDraw.mapSave) {
    showMapSaveDialog(player, DIALOG_ID.MAP_SAVE_CONFIRM);
    return 1;
  }
  if (textDraw === g_ToolbarTextDraw.mapSaveAs) {
    showMapSaveDialog(player, DIALOG_ID.MAP_SAVE_AS);
    return 1;
  }
  if (textDraw === g_ToolbarTextDraw.mapLoadList) {
    loadMapListData(player);
    showMapListDialog(player, DIALOG_ID.MAPLIST);
    return 1;
  }
  if (textDraw === g_ToolbarTextDraw.mapLoadName) {
    showMapLoadDialog(player, DIALOG_ID.MAP_LOAD);
    return 1;
  }
  if (textDraw === g_ToolbarTextDraw.camModel) {
    toggleCam(player, !g_CamModeData.get(player.id).toggle);
    return 1;
  }
  if (textDraw === g_ToolbarTextDraw.buildingModel) {
    showPlayerTextDrawMode(player, TD_MODE.BUILDLIST);
    return 1;
  }
  if (textDraw === g_ToolbarTextDraw.miscCategory) {
    showPlayerTextDrawMode(player, TD_MODE.CATMANAGER_MODELS);
    return 1;
  }
  if (textDraw === g_ToolbarTextDraw.miscInfo) {
    showPlayerTextDrawMode(player, TD_MODE.HELP_INFO);
    return 1;
  }
  return next();
});

export function createToolbarTextDraws() {
  g_ToolbarTextDraw.bg = new TextDraw({
    x: 236.0,
    y: 318.0,
    text: "_",
  })
    .create()
    .setLetterSize(0.0, 14.3)
    .useBox(true)
    .setBoxColors(50)
    .setTextSize(639.0, 0.0);

  g_ToolbarTextDraw.objectBg = new TextDraw({
    x: 618.0,
    y: 397.0,
    text: "_",
  })
    .create()
    .setAlignment(2)
    .setLetterSize(0.0, 5.5)
    .useBox(true)
    .setBoxColors(100)
    .setTextSize(0.0, 42.0);

  g_ToolbarTextDraw.objectModel = new TextDraw({
    x: 598.0,
    y: 398.0,
    text: "_",
  })
    .create()
    .setBackgroundColors(0)
    .setFont(5)
    .setColor(RGBA_WHITE)
    .useBox(true)
    .setBoxColors(0)
    .setTextSize(40.0, 40.0)
    .setPreviewModel(1220)
    .setPreviewRot(335.0, 0.0, 45.0, 1.0)
    .setSelectable(false);

  g_ToolbarTextDraw.objectText = new TextDraw({
    x: 598.0,
    y: 437.0,
    text: "Object",
  })
    .create()
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true);

  g_ToolbarTextDraw.objectListSelect = new TextDraw({
    x: 618.0,
    y: 384.0,
    text: "List Select",
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
    .setBoxColors(100)
    .setTextSize(10.0, 42.0)
    .setSelectable(true);

  g_ToolbarTextDraw.objectNSelect = new TextDraw({
    x: 618.0,
    y: 371.0,
    text: "Near Select",
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
    .setBoxColors(100)
    .setTextSize(10.0, 42.0)
    .setSelectable(true);

  g_ToolbarTextDraw.objectLookSelect = new TextDraw({
    x: 618.0,
    y: 358.0,
    text: "Look Select",
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
    .setBoxColors(100)
    .setTextSize(10.0, 42.0)
    .setSelectable(true);

  g_ToolbarTextDraw.objectSSelect = new TextDraw({
    x: 618.0,
    y: 345.0,
    text: "Surf Select",
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
    .setBoxColors(100)
    .setTextSize(10.0, 42.0)
    .setSelectable(true);

  g_ToolbarTextDraw.object3dSelect = new TextDraw({
    x: 618.0,
    y: 332.0,
    text: "3D Select",
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
    .setBoxColors(100)
    .setTextSize(10.0, 42.0)
    .setSelectable(true);

  g_ToolbarTextDraw.objectCreate = new TextDraw({
    x: 618.0,
    y: 319.0,
    text: "Create",
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
    .setBoxColors(100)
    .setTextSize(10.0, 42.0)
    .setSelectable(true);

  g_ToolbarTextDraw.vehicleBg = new TextDraw({
    x: 573.0,
    y: 397.0,
    text: "_",
  })
    .create()
    .setAlignment(2)
    .setLetterSize(0.0, 5.5)
    .useBox(true)
    .setBoxColors(100)
    .setTextSize(0.0, 42.0);

  g_ToolbarTextDraw.vehicleModel = new TextDraw({
    x: 553.0,
    y: 398.0,
    text: "_",
  })
    .create()
    .setBackgroundColors(0)
    .setFont(5)
    .setColor(RGBA_WHITE)
    .useBox(true)
    .setBoxColors(0)
    .setTextSize(40.0, 40.0)
    .setPreviewModel(557)
    .setPreviewRot(340.0, 0.0, 320.0, 0.8)
    .setSelectable(false);

  g_ToolbarTextDraw.vehicleText = new TextDraw({
    x: 553.0,
    y: 437.0,
    text: "Vehicle",
  })
    .create()
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true);

  g_ToolbarTextDraw.vehicleListSelect = new TextDraw({
    x: 573.0,
    y: 384.0,
    text: "List Select",
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
    .setBoxColors(100)
    .setTextSize(10.0, 42.0)
    .setSelectable(true);

  g_ToolbarTextDraw.vehicleNSelect = new TextDraw({
    x: 573.0,
    y: 371.0,
    text: "Near Select",
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
    .setBoxColors(100)
    .setTextSize(10.0, 42.0)
    .setSelectable(true);

  g_ToolbarTextDraw.vehicleLookSelect = new TextDraw({
    x: 573.0,
    y: 358.0,
    text: "Look Select",
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
    .setBoxColors(100)
    .setTextSize(10.0, 42.0)
    .setSelectable(true);

  g_ToolbarTextDraw.vehicleSSelect = new TextDraw({
    x: 573.0,
    y: 345.0,
    text: "Surf Select",
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
    .setBoxColors(100)
    .setTextSize(10.0, 42.0)
    .setSelectable(true);

  g_ToolbarTextDraw.vehicleCreate = new TextDraw({
    x: 573.0,
    y: 332.0,
    text: "Create",
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
    .setBoxColors(100)
    .setTextSize(10.0, 42.0)
    .setSelectable(true);

  g_ToolbarTextDraw.pickupBg = new TextDraw({
    x: 528.0,
    y: 397.0,
    text: "_",
  })
    .create()
    .setAlignment(2)
    .setLetterSize(0.0, 5.5)
    .useBox(true)
    .setBoxColors(100)
    .setTextSize(0.0, 42.0);

  g_ToolbarTextDraw.pickupModel = new TextDraw({
    x: 508.0,
    y: 398.0,
    text: "_",
  })
    .create()
    .setBackgroundColors(0)
    .setFont(5)
    .setColor(RGBA_WHITE)
    .useBox(true)
    .setBoxColors(0)
    .setTextSize(40.0, 40.0)
    .setPreviewModel(1240)
    .setPreviewRot(330.0, 0.0, 325.0, 1.0)
    .setSelectable(false);

  g_ToolbarTextDraw.pickupText = new TextDraw({
    x: 508.0,
    y: 437.0,
    text: "Pickup",
  })
    .create()
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(false);

  g_ToolbarTextDraw.pickupListSelect = new TextDraw({
    x: 528.0,
    y: 384.0,
    text: "List Select",
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
    .setBoxColors(100)
    .setTextSize(10.0, 42.0)
    .setSelectable(true);

  g_ToolbarTextDraw.pickupNSelect = new TextDraw({
    x: 528.0,
    y: 371.0,
    text: "Near Select",
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
    .setBoxColors(100)
    .setTextSize(10.0, 42.0)
    .setSelectable(true);

  g_ToolbarTextDraw.pickupCreate = new TextDraw({
    x: 528.0,
    y: 358.0,
    text: "Create",
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
    .setBoxColors(100)
    .setTextSize(10.0, 42.0)
    .setSelectable(true);

  g_ToolbarTextDraw.attachedBg = new TextDraw({
    x: 483.0,
    y: 397.0,
    text: "_",
  })
    .create()
    .setAlignment(2)
    .setLetterSize(0.0, 5.5)
    .useBox(true)
    .setBoxColors(100)
    .setTextSize(0.0, 42.0);

  g_ToolbarTextDraw.attachedModel = new TextDraw({
    x: 463.0,
    y: 398.0,
    text: "_",
  })
    .create()
    .setBackgroundColors(0)
    .setFont(5)
    .setColor(RGBA_WHITE)
    .useBox(true)
    .setBoxColors(0)
    .setTextSize(40.0, 40.0)
    .setPreviewModel(18978)
    .setPreviewRot(0.0, 0.0, 50.0, 0.7)
    .setSelectable(true);

  g_ToolbarTextDraw.attachedText = new TextDraw({
    x: 463.0,
    y: 437.0,
    text: "Attached",
  })
    .create()
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true);

  g_ToolbarTextDraw.actorBg = new TextDraw({
    x: 438.0,
    y: 397.0,
    text: "_",
  })
    .create()
    .setAlignment(2)
    .setLetterSize(0.0, 5.5)
    .useBox(true)
    .setBoxColors(100)
    .setTextSize(0.0, 42.0);

  g_ToolbarTextDraw.actorModel = new TextDraw({
    x: 418.0,
    y: 398.0,
    text: "_",
  })
    .create()
    .setBackgroundColors(0)
    .setFont(5)
    .setColor(RGBA_WHITE)
    .useBox(true)
    .setBoxColors(0)
    .setTextSize(40.0, 40.0)
    .setPreviewModel(106)
    .setPreviewRot(340.0, 0.0, 330.0, 1.0)
    .setSelectable(false);

  g_ToolbarTextDraw.actorText = new TextDraw({
    x: 418.0,
    y: 437.0,
    text: "Actor",
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
    .setTextSize(459.0, 42.0);

  g_ToolbarTextDraw.actorListSelect = new TextDraw({
    x: 438.0,
    y: 384.0,
    text: "List Select",
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
    .setBoxColors(100)
    .setTextSize(10.0, 42.0)
    .setSelectable(true);

  g_ToolbarTextDraw.actorNSelect = new TextDraw({
    x: 438.0,
    y: 371.0,
    text: "Near Select",
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
    .setBoxColors(100)
    .setTextSize(10.0, 42.0)
    .setSelectable(true);

  g_ToolbarTextDraw.actorLookSelect = new TextDraw({
    x: 438.0,
    y: 358.0,
    text: "Look Select",
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
    .setBoxColors(100)
    .setTextSize(10.0, 42.0)
    .setSelectable(true);

  g_ToolbarTextDraw.actorCreate = new TextDraw({
    x: 438.0,
    y: 345.0,
    text: "Create",
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
    .setBoxColors(100)
    .setTextSize(10.0, 42.0)
    .setSelectable(true);

  g_ToolbarTextDraw.mapBg = new TextDraw({
    x: 393.0,
    y: 397.0,
    text: "_",
  })
    .create()
    .setAlignment(2)
    .setLetterSize(0.0, 5.5)
    .useBox(true)
    .setBoxColors(100)
    .setTextSize(0.0, 42.0);

  g_ToolbarTextDraw.mapModel = new TextDraw({
    x: 373.0,
    y: 398.0,
    text: "_",
  })
    .create()
    .setBackgroundColors(0)
    .setFont(5)
    .setColor(RGBA_WHITE)
    .useBox(true)
    .setBoxColors(0)
    .setTextSize(40.0, 40.0)
    .setPreviewModel(3111)
    .setPreviewRot(90.0, 330.0, 180.0, 0.9)
    .setSelectable(false);

  g_ToolbarTextDraw.mapText = new TextDraw({
    x: 373.0,
    y: 437.0,
    text: "Map",
  })
    .create()
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true);

  g_ToolbarTextDraw.mapNew = new TextDraw({
    x: 393.0,
    y: 384.0,
    text: "New",
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
    .setBoxColors(100)
    .setTextSize(10.0, 42.0)
    .setSelectable(true);

  g_ToolbarTextDraw.mapSave = new TextDraw({
    x: 393.0,
    y: 371.0,
    text: "Save",
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
    .setBoxColors(100)
    .setTextSize(10.0, 42.0)
    .setSelectable(true);

  g_ToolbarTextDraw.mapSaveAs = new TextDraw({
    x: 393.0,
    y: 358.0,
    text: "Save As..",
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
    .setBoxColors(100)
    .setTextSize(10.0, 42.0)
    .setSelectable(true);

  g_ToolbarTextDraw.mapLoadList = new TextDraw({
    x: 393.0,
    y: 345.0,
    text: "Load f. List",
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
    .setBoxColors(100)
    .setTextSize(10.0, 42.0)
    .setSelectable(true);

  g_ToolbarTextDraw.mapLoadName = new TextDraw({
    x: 393.0,
    y: 332.0,
    text: "Load Name",
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
    .setBoxColors(100)
    .setTextSize(10.0, 42.0)
    .setSelectable(true);

  g_ToolbarTextDraw.camBg = new TextDraw({
    x: 348.0,
    y: 397.0,
    text: "_",
  })
    .create()
    .setAlignment(2)
    .setLetterSize(0.0, 5.5)
    .useBox(true)
    .setBoxColors(100)
    .setTextSize(0.0, 42.0);

  g_ToolbarTextDraw.camModel = new TextDraw({
    x: 328.0,
    y: 398.0,
    text: "_",
  })
    .create()
    .setBackgroundColors(0)
    .setFont(5)
    .setColor(RGBA_WHITE)
    .useBox(true)
    .setBoxColors(0)
    .setTextSize(40.0, 40.0)
    .setPreviewModel(367)
    .setPreviewRot(340.0, 0.0, 50.0, 0.8)
    .setSelectable(true);

  g_ToolbarTextDraw.camText = new TextDraw({
    x: 328.0,
    y: 437.0,
    text: "Cam",
  })
    .create()
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true);

  g_ToolbarTextDraw.buildingBg = new TextDraw({
    x: 303.0,
    y: 397.0,
    text: "_",
  })
    .create()
    .setAlignment(2)
    .setLetterSize(0.0, 5.5)
    .useBox(true)
    .setBoxColors(100)
    .setTextSize(0.0, 42.0);

  g_ToolbarTextDraw.buildingModel = new TextDraw({
    x: 283.0,
    y: 398.0,
    text: "_",
  })
    .create()
    .setBackgroundColors(0)
    .setFont(5)
    .setColor(RGBA_WHITE)
    .useBox(true)
    .setBoxColors(0)
    .setTextSize(40.0, 40.0)
    .setPreviewModel(9319)
    .setPreviewRot(350.0, 0.0, 220.0, 0.8)
    .setSelectable(true);

  g_ToolbarTextDraw.buildingText = new TextDraw({
    x: 283.0,
    y: 437.0,
    text: "Buildings",
  })
    .create()
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true);

  g_ToolbarTextDraw.miscBg = new TextDraw({
    x: 258.0,
    y: 397.0,
    text: "_",
  })
    .create()
    .setAlignment(2)
    .setLetterSize(0.0, 5.5)
    .useBox(true)
    .setBoxColors(100)
    .setTextSize(0.0, 42.0);

  g_ToolbarTextDraw.miscModel = new TextDraw({
    x: 238.0,
    y: 398.0,
    text: "_",
  })
    .create()
    .setBackgroundColors(0)
    .setFont(5)
    .setColor(RGBA_WHITE)
    .useBox(true)
    .setBoxColors(0)
    .setTextSize(40.0, 40.0)
    .setPreviewModel(19918)
    .setPreviewRot(330.0, 0.0, 40.0, 1.0)
    .setSelectable(false);

  g_ToolbarTextDraw.miscText = new TextDraw({
    x: 238.0,
    y: 437.0,
    text: "Misc",
  })
    .create()
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.2, 1.0)
    .setColor(RGBA_WHITE)
    .setOutline(1);

  g_ToolbarTextDraw.miscCategory = new TextDraw({
    x: 258.0,
    y: 384.0,
    text: "Categories",
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
    .setBoxColors(100)
    .setTextSize(10.0, 42.0)
    .setSelectable(true);

  g_ToolbarTextDraw.miscInfo = new TextDraw({
    x: 258.0,
    y: 371.0,
    text: "Info",
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
    .setBoxColors(100)
    .setTextSize(10.0, 42.0)
    .setSelectable(true);
}

export function destroyToolbarTextDraws() {
  Object.entries(g_ToolbarTextDraw).forEach((item) => {
    const [key, gtd] = item as unknown as [
      keyof ITdToolBar,
      (typeof g_ToolbarTextDraw)[keyof ITdToolBar]
    ];
    if (gtd && gtd.isValid()) {
      gtd.destroy();
    }
    g_ToolbarTextDraw[key] = null;
  });
}

export function createToolbarKeyTextDraw(player: Player, mouseMode: boolean) {
  if (g_ToolbarKeyTextDraw.get(player.id)?.id !== InvalidEnum.TEXT_DRAW) {
    g_ToolbarKeyTextDraw.get(player.id)?.destroy();
    g_ToolbarKeyTextDraw.delete(player.id);
  }

  if (mouseMode) {
    const textDraw = new TextDraw({
      player,
      x: 637.0,
      y: 296.0,
      text: "~w~Press ~r~ESC ~w~to disable mouse mode",
    });
    textDraw.create();
    g_ToolbarKeyTextDraw.set(player.id, textDraw);
  } else {
    if (player.getState() === PlayerStateEnum.SPECTATING) {
      const textDraw = new TextDraw({
        player,
        x: 637.0,
        y: 425.0,
        text: "~w~Press ~r~~k~~PED_DUCK~ ~w~to enable mouse mode",
      });
      textDraw.create();
      g_ToolbarKeyTextDraw.set(player.id, textDraw);
    } else {
      const textDraw = new TextDraw({
        player,
        x: 637.0,
        y: 425.0,
        text: "~w~Press ~r~~k~~CONVERSATION_YES~ ~w~to enable mouse mode",
      });
      textDraw.create();
      g_ToolbarKeyTextDraw.set(player.id, textDraw);
    }
  }

  g_ToolbarKeyTextDraw
    .get(player.id)
    ?.setAlignment(3)
    .setBackgroundColors(255)
    .setFont(3)
    .setLetterSize(0.5, 2.0)
    .setColor(RGBA_WHITE)
    .setOutline(2)
    .setProportional(true)
    .show();
}

export function destroyToolbarKeyTextDraw(player: Player) {
  if (
    !g_ToolbarKeyTextDraw.has(player.id) ||
    g_ToolbarKeyTextDraw.get(player.id)?.id === InvalidEnum.TEXT_DRAW
  ) {
    return 0;
  }
  g_ToolbarKeyTextDraw.get(player.id)?.destroy();
  g_ToolbarKeyTextDraw.delete(player.id);
  return 1;
}
