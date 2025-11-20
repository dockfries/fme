import fs from "node:fs";
import readline from "node:readline";
import { INVALID_MAP_ID, RGBA_RED, RGBA_WHITE } from "@/constants";
import { DIALOG_ID } from "@/dialog";
import { ID_TYPE } from "@/idType";
import { createMapID, getMapID } from "@/mapDB";
import { getMapFilePath, mapLoad_parseLine } from "@/utils/map";
import { SafetyMap } from "@/utils/safetyMap";
import {
  Actor,
  Dialog,
  DialogStylesEnum,
  IDialogResCommon,
  InvalidEnum,
  LimitsEnum,
  ObjectMp,
  Pickup,
  Player,
  Vehicle,
} from "@infernus/core";
import {
  applyObjectAttachData,
  applyObjectMaterialIndexData,
  g_ObjectData,
  g_ObjectFont,
  g_ObjectText,
  isValidMaterialIndex,
} from "@/object";
import { g_VehicleData } from "@/vehicle";
import { g_PickupData } from "@/pickup";
import { applyActorAnimationData, g_ActorData } from "@/actor";
import { getMaterialSize, INVALID_MATERIAL_SIZE } from "@/matSize";
import { MATERIAL_INDEX_TYPE } from "@/matIndexType";
import { getTextureID } from "@/texture";
import {
  applyPlayerAttachData,
  g_PlayerAttachData,
  isValidPlayerAttachIndex,
} from "@/pAttach";
import { isValidBone } from "@/bone";
import { getAnimationIndex, INVALID_ANIM_INDEX } from "@/anim";
import {
  BUILDING_DATA_SIZE,
  g_BuildingData,
  getBuildingsInRange,
  removeBuildingIDForAll,
} from "@/building";
import { g_MapVar, refreshMapLoadedTextDraw } from "@/mapLoaded";

export const MAX_MAPLOAD_VARNAME = 30;

export interface IMapLoadTypeData {
  typeId: number;
  typeVarName: string;
}

const l_ObjectData = new SafetyMap<number, IMapLoadTypeData>(() => {
  return {
    typeId: InvalidEnum.OBJECT_ID,
    typeVarName: "",
  };
});
const l_VehicleData = new SafetyMap<number, IMapLoadTypeData>(() => {
  return {
    typeId: InvalidEnum.VEHICLE_ID,
    typeVarName: "",
  };
});
const l_ActorData = new SafetyMap<number, IMapLoadTypeData>(() => {
  return {
    typeId: InvalidEnum.ACTOR_ID,
    typeVarName: "",
  };
});

let l_ObjectsAdded = 0;
let l_VehiclesAdded = 0;
let l_ActorsAdded = 0;

async function onDialogResponse(
  player: Player,
  res: IDialogResCommon,
  dialogId: number
) {
  const { inputText, response } = res;
  switch (dialogId) {
    case DIALOG_ID.MAP_LOAD: {
      if (!response) {
        return 1;
      }

      if (!inputText.trim().length) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You did not enter anything into the textfield!"
        );
        showMapLoadDialog(player, dialogId);
        return 1;
      }

      const {
        objectsLoaded,
        vehiclesLoaded,
        pickupsLoaded,
        actorsLoaded,
        attachmentsLoaded,
        buildingsLoaded,
        loadSuccess,
      } = await mapLoad(inputText, player);

      if (!loadSuccess) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: This map could not be loaded!"
        );
        showMapLoadDialog(player, dialogId);
        return 1;
      }

      if (getMapID(inputText) === INVALID_MAP_ID) {
        createMapID(inputText);
      }

      g_MapVar.loadedID = getMapID(inputText);
      refreshMapLoadedTextDraw();

      let g_ClientMessage = `[${player.id}] ${
        player.getName().name
      } has loaded the map: ${inputText}`;
      Player.sendClientMessageToAll(RGBA_WHITE, g_ClientMessage);

      g_ClientMessage = `Loaded: ${objectsLoaded} Object(s), ${vehiclesLoaded} Vehicle(s), ${pickupsLoaded} Pickup(s), ${actorsLoaded} Actor(s), ${buildingsLoaded} Building(s) removed.`;
      Player.sendClientMessageToAll(RGBA_WHITE, g_ClientMessage);

      if (attachmentsLoaded > 0) {
        const g_ClientMessage = `+ ${attachmentsLoaded} of your attachment(s).`;
        player.sendClientMessage(RGBA_WHITE, g_ClientMessage);
      }

      return 1;
    }
  }

  return 0;
}

export async function showMapLoadDialog(player: Player, dialogId: number) {
  switch (dialogId) {
    case DIALOG_ID.MAP_LOAD: {
      const res = await new Dialog({
        style: DialogStylesEnum.INPUT,
        caption: "Load Map",
        info: "Enter the name of the map you would like to load:",
        button1: "Load",
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

export function mapLoad_CreateVarName(
  id: number,
  idType: number,
  varName: string
) {
  switch (idType) {
    case ID_TYPE.OBJECT: {
      if (l_ObjectsAdded >= LimitsEnum.MAX_OBJECTS) {
        return 0;
      }

      l_ObjectData.get(l_ObjectsAdded).typeId = id;
      l_ObjectData.get(l_ObjectsAdded).typeVarName = varName;
      l_ObjectsAdded++;
      break;
    }
    case ID_TYPE.VEHICLE: {
      if (l_VehiclesAdded >= LimitsEnum.MAX_VEHICLES) {
        return 0;
      }

      l_VehicleData.get(l_VehiclesAdded).typeId = id;
      l_VehicleData.get(l_VehiclesAdded).typeVarName = varName;
      l_VehiclesAdded++;
      break;
    }
    case ID_TYPE.ACTOR: {
      if (l_ActorsAdded >= LimitsEnum.MAX_ACTORS) {
        return 0;
      }

      l_ActorData.get(l_ActorsAdded).typeId = id;
      l_ActorData.get(l_ActorsAdded).typeVarName = varName;
      l_ActorsAdded++;
      break;
    }
    default: {
      return 0;
    }
  }
  return 1;
}

export function mapLoad_GetVarName(idType: number, varName: string) {
  switch (idType) {
    case ID_TYPE.OBJECT: {
      if (l_ObjectsAdded === 0) {
        return InvalidEnum.OBJECT_ID;
      }

      for (let i = l_ObjectsAdded - 1; i >= 0; i--) {
        if (l_ObjectData.get(i).typeVarName === varName) {
          return l_ObjectData.get(i).typeId;
        }
      }
      return InvalidEnum.OBJECT_ID;
    }
    case ID_TYPE.VEHICLE: {
      if (l_VehiclesAdded === 0) {
        return InvalidEnum.VEHICLE_ID;
      }

      for (let i = l_VehiclesAdded - 1; i >= 0; i--) {
        if (l_VehicleData.get(i).typeVarName === varName) {
          return l_VehicleData.get(i).typeId;
        }
      }
      return InvalidEnum.VEHICLE_ID;
    }
    case ID_TYPE.ACTOR: {
      if (l_ActorsAdded === 0) {
        return InvalidEnum.ACTOR_ID;
      }

      for (let i = l_ActorsAdded - 1; i >= 0; i--) {
        if (l_ActorData.get(i).typeVarName === varName) {
          return l_ActorData.get(i).typeId;
        }
      }
      return InvalidEnum.ACTOR_ID;
    }
  }
  return 0;
}

export function mapLoad_ResetVariables() {
  while (l_ObjectsAdded > 0) {
    l_ObjectsAdded--;
    l_ObjectData.get(l_ObjectsAdded).typeId = InvalidEnum.OBJECT_ID;
    l_ObjectData.get(l_ObjectsAdded).typeVarName = "";
  }

  while (l_VehiclesAdded > 0) {
    l_VehiclesAdded--;
    l_VehicleData.get(l_VehiclesAdded).typeId = InvalidEnum.VEHICLE_ID;
    l_VehicleData.get(l_VehiclesAdded).typeVarName = "";
  }

  while (l_ActorsAdded > 0) {
    l_ActorsAdded--;
    l_ActorData.get(l_ActorsAdded).typeId = InvalidEnum.ACTOR_ID;
    l_ActorData.get(l_ActorsAdded).typeVarName = "";
  }
}

export async function mapLoad(
  mapName: string,
  player: Player | InvalidEnum.PLAYER_ID = InvalidEnum.PLAYER_ID
) {
  let objectsLoaded = 0;
  let vehiclesLoaded = 0;
  let pickupsLoaded = 0;
  let actorsLoaded = 0;
  let attachmentsLoaded = 0;
  let buildingsLoaded = 0;

  const g_FilePathString = getMapFilePath(mapName);
  if (!fs.existsSync(g_FilePathString)) {
    return {
      objectsLoaded,
      vehiclesLoaded,
      pickupsLoaded,
      actorsLoaded,
      attachmentsLoaded,
      buildingsLoaded,
      loadSuccess: false,
    };
  }

  const fileStream = fs.createReadStream(g_FilePathString);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  mapLoad_ResetVariables();

  for await (const line of rl) {
    const parsedLine = mapLoad_parseLine(line.trim());

    const { isValid } = parsedLine;

    if (!isValid) {
      continue;
    }

    const { varName, funcName, params, comment = "no comment" } = parsedLine;

    if (funcName === "CreateObject") {
      try {
        const objParams = params?.split(",");

        if (!objParams || objParams.length < 7) {
          continue;
        }

        const [modelId, x, y, z, rx, ry, rz, drawDistance = 0] = objParams.map(
          (n) => +n || 0
        );

        const object = new ObjectMp({
          modelId,
          x,
          y,
          z,
          rx,
          ry,
          rz,
          drawDistance,
        });
        object.create();

        const objectId = object.id;
        g_ObjectData.get(objectId).comment = comment || "";

        if (varName) {
          mapLoad_CreateVarName(objectId, ID_TYPE.OBJECT, varName);
        }

        objectsLoaded++;
      } catch {
        continue;
      }
    } else if (
      funcName === "AddStaticVehicleEx" ||
      funcName === "AddStaticVehicle" ||
      funcName === "CreateVehicle"
    ) {
      const vehParams = params?.split(",");

      if (!vehParams || vehParams.length < 7) {
        continue;
      }

      const [modelId, x, y, z, zAngle, color1, color2] = vehParams.map(
        (n) => +n || 0
      );

      try {
        const veh = new Vehicle({
          modelId,
          x,
          y,
          z,
          zAngle,
          color: [color1, color2],
          respawnDelay: -1,
        });
        veh.create();
        const vehicleId = veh.id;

        g_VehicleData.get(vehicleId - 1).comment = comment || "";

        if (varName) {
          mapLoad_CreateVarName(vehicleId, ID_TYPE.VEHICLE, varName);
        }

        vehiclesLoaded++;
      } catch {
        continue;
      }
    } else if (funcName === "AddStaticPickup" || funcName === "CreatePickup") {
      const pickupParams = params?.split(",");

      if (!pickupParams || pickupParams.length < 4) {
        continue;
      }

      const [model, x, y, z] = pickupParams.map((n) => +n || 0);

      try {
        const pickup = new Pickup({
          model,
          type: 1,
          x,
          y,
          z,
          virtualWorld: -1,
        });
        pickup.create();
        const pickupId = pickup.id;

        g_PickupData.get(pickupId).comment = comment || "";

        pickupsLoaded++;
      } catch {
        continue;
      }
    } else if (funcName === "CreateActor") {
      const actorParams = params?.split(",");

      if (!actorParams || actorParams.length < 5) {
        continue;
      }

      const [skin, x, y, z, rotation] = actorParams.map((n) => +n || 0);

      try {
        const actor = new Actor({
          skin,
          x,
          y,
          z,
          rotation,
        });
        actor.create();
        const actorId = actor.id;

        g_ActorData.get(actorId).comment = comment || "";

        if (varName) {
          mapLoad_CreateVarName(actorId, ID_TYPE.ACTOR, varName);
        }

        actorsLoaded++;
      } catch {
        continue;
      }
    } else if (funcName === "SetObjectMaterialText") {
      const matTxtParams = params?.split(",");

      if (!matTxtParams || matTxtParams.length < 10) {
        continue;
      }

      let [
        _varName,
        text,
        // eslint-disable-next-line prefer-const
        matIndex,
        // eslint-disable-next-line prefer-const
        matSizeName,
        font,
        // eslint-disable-next-line prefer-const
        fontSize,
        // eslint-disable-next-line prefer-const
        isBold,
        // eslint-disable-next-line prefer-const
        fontColor,
        // eslint-disable-next-line prefer-const
        backColor,
        // eslint-disable-next-line prefer-const
        alignment,
      ] = matTxtParams;

      text = text.replaceAll('"', "").trim();
      font = font.replaceAll('"', "").trim();
      _varName = _varName.replaceAll(" ", "");

      const _matIndex = +matIndex;
      const _fontSize = +fontSize;

      const objectId = mapLoad_GetVarName(ID_TYPE.OBJECT, _varName);
      if (objectId === InvalidEnum.OBJECT_ID) {
        continue;
      }

      if (!isValidMaterialIndex(_matIndex)) {
        continue;
      }

      const matSizeInt = getMaterialSize(matSizeName);
      if (matSizeInt === INVALID_MATERIAL_SIZE) {
        continue;
      }

      g_ObjectData.get(objectId - 1).matIndexType[_matIndex] =
        MATERIAL_INDEX_TYPE.TEXT;
      g_ObjectText.get(objectId - 1)[_matIndex] = text;
      g_ObjectData.get(objectId - 1).matIndexSize[_matIndex] = matSizeInt;
      g_ObjectFont.get(objectId - 1)[_matIndex] = font;
      g_ObjectData.get(objectId - 1).matIndexFontSize[_matIndex] = _fontSize;
      g_ObjectData.get(objectId - 1).matIndexIsBold[_matIndex] = Boolean(
        +isBold
      );
      g_ObjectData.get(objectId - 1).matIndexFontColor[_matIndex] = +fontColor;
      g_ObjectData.get(objectId - 1).matIndexColor[_matIndex] = +backColor;
      g_ObjectData.get(objectId - 1).matIndexAlignment[_matIndex] = +alignment;

      applyObjectMaterialIndexData(objectId, _matIndex);
    } else if (funcName === "SetObjectMaterial") {
      const matParams = params?.split(",");

      if (!matParams || matParams.length < 6) {
        continue;
      }

      let [
        _varName,
        // eslint-disable-next-line prefer-const
        matIndex,
        // eslint-disable-next-line prefer-const
        modelId,
        txdName,
        textureName,
        // eslint-disable-next-line prefer-const
        matColor,
      ] = matParams;

      _varName = _varName.replaceAll(" ", "");
      txdName = txdName.replaceAll('"', "").trim();
      textureName = textureName.replaceAll('"', "").trim();

      const _matIndex = +matIndex;
      const _modelId = +modelId;
      const _matColor = +matColor;

      if (!isValidMaterialIndex(_matIndex)) {
        continue;
      }

      const objectId = mapLoad_GetVarName(ID_TYPE.OBJECT, _varName);
      if (objectId === InvalidEnum.OBJECT_ID) {
        continue;
      }

      const textureId = getTextureID(_modelId, txdName, textureName);
      g_ObjectData.get(objectId - 1).matIndexType[_matIndex] =
        MATERIAL_INDEX_TYPE.TEXTURE;
      g_ObjectData.get(objectId - 1).matIndexTexture[_matIndex] = textureId;
      g_ObjectData.get(objectId - 1).matIndexColor[_matIndex] = _matColor;

      applyObjectMaterialIndexData(objectId, _matIndex);
    } else if (funcName === "AddVehicleComponent") {
      const vehCpnParams = params?.split(",");

      if (!vehCpnParams || vehCpnParams.length < 2) {
        continue;
      }

      // eslint-disable-next-line prefer-const
      let [_varName, componentId] = vehCpnParams;

      _varName = _varName.replaceAll(" ", "");
      const _componentId = +componentId;

      const vehicleId = mapLoad_GetVarName(ID_TYPE.VEHICLE, _varName);
      if (vehicleId !== InvalidEnum.VEHICLE_ID) {
        const veh = Vehicle.getInstance(vehicleId);
        veh?.addComponent(_componentId);
      }
    } else if (funcName === "ChangeVehiclePaintjob") {
      const vehCpjParams = params?.split(",");

      if (!vehCpjParams || vehCpjParams.length < 2) {
        continue;
      }

      // eslint-disable-next-line prefer-const
      let [_varName, paintJobId] = vehCpjParams;

      _varName = _varName.replaceAll(" ", "");
      const _paintJobId = +paintJobId;

      const vehicleId = mapLoad_GetVarName(ID_TYPE.VEHICLE, _varName);
      if (vehicleId === InvalidEnum.VEHICLE_ID) {
        continue;
      }

      g_VehicleData.get(vehicleId).paintJob = _paintJobId;
      const veh = Vehicle.getInstance(vehicleId);
      veh?.changePaintjob(_paintJobId as 0 | 1 | 2);
    } else if (funcName === "AttachObjectToObject") {
      const attachObjParams = params?.split(",");

      if (!attachObjParams || attachObjParams.length < 8) {
        continue;
      }

      // eslint-disable-next-line prefer-const
      let [_varName, _attachToVarname, x, y, z, rx, ry, rz] = attachObjParams;

      _varName = _varName.replaceAll(" ", "");
      _attachToVarname = _attachToVarname.replaceAll(" ", "");

      const objectId = mapLoad_GetVarName(ID_TYPE.OBJECT, _varName);
      if (objectId === InvalidEnum.OBJECT_ID) {
        continue;
      }

      const attachToId = mapLoad_GetVarName(ID_TYPE.OBJECT, _attachToVarname);
      if (attachToId === InvalidEnum.OBJECT_ID) {
        continue;
      }

      g_ObjectData.get(objectId - 1).attachIdType = ID_TYPE.OBJECT;
      g_ObjectData.get(objectId - 1).attachId = attachToId;
      g_ObjectData.get(objectId - 1).attachX = +x;
      g_ObjectData.get(objectId - 1).attachY = +y;
      g_ObjectData.get(objectId - 1).attachZ = +z;
      g_ObjectData.get(objectId - 1).attachRx = +rx;
      g_ObjectData.get(objectId - 1).attachRy = +ry;
      g_ObjectData.get(objectId - 1).attachRz = +rz;
      applyObjectAttachData(objectId);
    } else if (funcName === "AttachObjectToVehicle") {
      const attachVehParams = params?.split(",");

      if (!attachVehParams || attachVehParams.length < 8) {
        continue;
      }

      // eslint-disable-next-line prefer-const
      let [_varName, _attachToVarname, x, y, z, rx, ry, rz] = attachVehParams;

      _varName = _varName.replaceAll(" ", "");
      _attachToVarname = _attachToVarname.replaceAll(" ", "");

      const objectId = mapLoad_GetVarName(ID_TYPE.OBJECT, _varName);
      if (objectId === InvalidEnum.OBJECT_ID) {
        continue;
      }

      const attachToId = mapLoad_GetVarName(ID_TYPE.VEHICLE, _attachToVarname);
      if (attachToId === InvalidEnum.VEHICLE_ID) {
        continue;
      }

      g_ObjectData.get(objectId - 1).attachIdType = ID_TYPE.VEHICLE;
      g_ObjectData.get(objectId - 1).attachId = attachToId;
      g_ObjectData.get(objectId - 1).attachX = +x;
      g_ObjectData.get(objectId - 1).attachY = +y;
      g_ObjectData.get(objectId - 1).attachZ = +z;
      g_ObjectData.get(objectId - 1).attachRx = +rx;
      g_ObjectData.get(objectId - 1).attachRy = +ry;
      g_ObjectData.get(objectId - 1).attachRz = +rz;
      applyObjectAttachData(objectId);
    } else if (funcName === "SetPlayerAttachedObject") {
      const pAttachObjParams = params?.split(",");

      if (!pAttachObjParams || pAttachObjParams.length < 14) {
        continue;
      }

      const [
        index,
        modelId,
        bone,
        x,
        y,
        z,
        rx,
        ry,
        rz,
        sx,
        sy,
        sz,
        color1,
        color2,
      ] = pAttachObjParams.map((n) => +n || 0);

      if (!isValidPlayerAttachIndex(index) || !isValidBone(bone)) {
        continue;
      }

      if (typeof player !== "number") {
        g_PlayerAttachData.get(player.id)[index].toggle = true;
        g_PlayerAttachData.get(player.id)[index].model = modelId;
        g_PlayerAttachData.get(player.id)[index].bone = bone;
        g_PlayerAttachData.get(player.id)[index].x = x;
        g_PlayerAttachData.get(player.id)[index].y = y;
        g_PlayerAttachData.get(player.id)[index].z = z;
        g_PlayerAttachData.get(player.id)[index].rx = rx;
        g_PlayerAttachData.get(player.id)[index].ry = ry;
        g_PlayerAttachData.get(player.id)[index].rz = rz;
        g_PlayerAttachData.get(player.id)[index].sx = sx;
        g_PlayerAttachData.get(player.id)[index].sy = sy;
        g_PlayerAttachData.get(player.id)[index].sz = sz;
        g_PlayerAttachData.get(player.id)[index].color1 = color1;
        g_PlayerAttachData.get(player.id)[index].color2 = color2;
        applyPlayerAttachData(player, index);
      }
      attachmentsLoaded++;
    } else if (funcName === "ApplyActorAnimation") {
      const actorAniParams = params?.split(",");

      if (!actorAniParams || actorAniParams.length < 9) {
        continue;
      }

      let [
        _varName,
        animLib,
        animName,
        // eslint-disable-next-line prefer-const
        delta,
        // eslint-disable-next-line prefer-const
        loop,
        // eslint-disable-next-line prefer-const
        lockX,
        // eslint-disable-next-line prefer-const
        lockY,
        // eslint-disable-next-line prefer-const
        freeze,
        // eslint-disable-next-line prefer-const
        time,
      ] = actorAniParams;

      _varName = _varName.replaceAll(" ", "");
      animLib = animLib.replaceAll('"', "").trim();
      animName = animName.replaceAll('"', "").trim();

      const actorId = mapLoad_GetVarName(ID_TYPE.ACTOR, _varName);
      if (actorId === InvalidEnum.ACTOR_ID) {
        continue;
      }

      const animIndex = getAnimationIndex(animLib, animName);
      if (animIndex === INVALID_ANIM_INDEX) {
        continue;
      }

      g_ActorData.get(actorId).animIndex = animIndex;
      g_ActorData.get(actorId).animDelta = +delta;
      g_ActorData.get(actorId).animLoop = Boolean(+loop);
      g_ActorData.get(actorId).animLockX = Boolean(+lockX);
      g_ActorData.get(actorId).animLockY = Boolean(+lockY);
      g_ActorData.get(actorId).animFreeze = Boolean(+freeze);
      g_ActorData.get(actorId).animTime = +time;

      const actor = Actor.getInstance(actorId);
      if (actor) {
        applyActorAnimationData(actor);
      }
    } else if (funcName === "RemoveBuildingForPlayer") {
      const removeBuildingParams = params?.split(",");

      if (!removeBuildingParams || removeBuildingParams.length < 5) {
        continue;
      }

      const [modelId, x, y, z, radius] = removeBuildingParams.map(
        (n) => +n || 0
      );

      const buildingArray: number[] = [];
      const buildingsFound = getBuildingsInRange(
        buildingArray,
        BUILDING_DATA_SIZE,
        modelId,
        x,
        y,
        z,
        radius
      );

      for (let b = 0; b < buildingsFound; b++) {
        const buildingId = buildingArray[b];

        if (g_BuildingData.get(buildingId).isRemoved) {
          continue;
        }

        g_BuildingData.get(buildingId).isRemoved = true;

        removeBuildingIDForAll(buildingId);

        buildingsLoaded++;
      }
    }
  }

  return {
    objectsLoaded,
    vehiclesLoaded,
    pickupsLoaded,
    actorsLoaded,
    attachmentsLoaded,
    buildingsLoaded,
    loadSuccess: true,
  };
}
