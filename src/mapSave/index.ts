import fs from "node:fs";
import {
  INVALID_MAP_ID,
  MAX_OBJECT_INDEX,
  RGBA_RED,
  RGBA_WHITE,
} from "@/constants";
import { DIALOG_ID } from "@/dialog";
import { createMapID, getMapID, getMapName } from "@/mapDB";
import { g_MapVar } from "@/mapLoaded";
import { getMapFilePath } from "@/utils/map";
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
  Vehicle,
} from "@infernus/core";
import { g_PickupData } from "@/pickup";
import { g_ObjectData, g_ObjectFont, g_ObjectText } from "@/object";
import { MATERIAL_INDEX_TYPE } from "@/matIndexType";
import { getTextureData } from "@/texture";
import { getMaterialSizeName } from "@/matSize";
import { g_VehicleData, INVALID_PAINTJOB_ID } from "@/vehicle";
import { getModelName } from "@/model";
import { g_ActorData } from "@/actor";
import { INVALID_ANIM_INDEX } from "@/anim";
import { ID_TYPE } from "@/idType";
import { g_PlayerAttachData, MAX_PLAYERATTACH_INDEX } from "@/pAttach";
import { getBoneName } from "@/bone";
import {
  BUILDING_DATA_SIZE,
  g_BuildingData,
  INVALID_BUILDING_LOD_MODEL,
  REMOVE_BUILDING_RANGE,
} from "@/building";

export const SAVEMAP_COMMAND = "savemap";

function onDialogResponse(
  player: Player,
  res: IDialogResCommon,
  dialogId: number
) {
  const { inputText, response } = res;
  switch (dialogId) {
    case DIALOG_ID.MAP_SAVE_AS: {
      if (!response) {
        return 1;
      }

      const {
        objectsSaved,
        vehiclesSaved,
        pickupsSaved,
        actorsSaved,
        attachmentsSaved,
        buildingsSaved,
        saveSuccess,
      } = saveMap(inputText, player);

      if (!saveSuccess) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: This map could not be saved!"
        );
        showMapSaveDialog(player, dialogId);
        return 1;
      }

      if (getMapID(inputText) == INVALID_MAP_ID) {
        createMapID(inputText);
      }

      let g_ClientMessage = `[${player.id}] ${
        player.getName().name
      } has saved this map as: ${inputText}`;
      Player.sendClientMessageToAll(RGBA_WHITE, g_ClientMessage);

      g_ClientMessage = `Saved: ${objectsSaved} Object(s), ${vehiclesSaved} Vehicle(s), ${pickupsSaved} Pickup(s), ${actorsSaved} Actor(s), ${buildingsSaved} Building(s).`;
      Player.sendClientMessageToAll(RGBA_WHITE, g_ClientMessage);

      if (attachmentsSaved > 0) {
        g_ClientMessage = `+ ${attachmentsSaved} of your attachment(s).`;
        player.sendClientMessage(RGBA_WHITE, g_ClientMessage);
      }
      return 1;
    }
    case DIALOG_ID.MAP_SAVE_CONFIRM: {
      if (!response) {
        return 1;
      }

      if (g_MapVar.loadedID == INVALID_MAP_ID) {
        player.sendClientMessage(RGBA_RED, "ERROR: A map has not been loaded!");
        showMapSaveDialog(player, dialogId);
        return 1;
      }

      if (!inputText.trim().length || inputText !== SAVEMAP_COMMAND) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You did not enter the correct command into the textfield!"
        );
        showMapSaveDialog(player, dialogId);
        return 1;
      }

      const g_MapString = getMapName(g_MapVar.loadedID).name;

      const {
        objectsSaved,
        vehiclesSaved,
        pickupsSaved,
        actorsSaved,
        attachmentsSaved,
        buildingsSaved,
        saveSuccess,
      } = saveMap(g_MapString, player);

      if (!saveSuccess) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: This map could not be saved!"
        );
        showMapSaveDialog(player, dialogId);
        return 1;
      }

      let g_ClientMessage = `[${player.id}] ${
        player.getName().name
      } has saved the map.`;
      Player.sendClientMessageToAll(RGBA_WHITE, g_ClientMessage);

      g_ClientMessage = `Saved: ${objectsSaved} Object(s), ${vehiclesSaved} Vehicle(s), ${pickupsSaved} Pickup(s), ${actorsSaved} Actor(s), ${buildingsSaved} Building(s).`;
      Player.sendClientMessageToAll(RGBA_WHITE, g_ClientMessage);

      if (attachmentsSaved > 0) {
        g_ClientMessage = `+ ${attachmentsSaved} of your attachment(s)`;
        player.sendClientMessage(RGBA_WHITE, g_ClientMessage);
      }
      return 1;
    }
  }

  return 0;
}

export async function showMapSaveDialog(player: Player, dialogId: number) {
  switch (dialogId) {
    case DIALOG_ID.MAP_SAVE_AS: {
      const res = await new Dialog({
        style: DialogStylesEnum.INPUT,
        caption: "Save Map",
        info: "Enter a name for this map:",
        button1: "Save",
        button2: "Cancel",
      }).show(player);
      onDialogResponse(player, res, dialogId);
      break;
    }
    case DIALOG_ID.MAP_SAVE_CONFIRM: {
      const g_DialogInfo = `Type & Enter "${SAVEMAP_COMMAND}" to save this map.`;
      const res = await new Dialog({
        style: DialogStylesEnum.INPUT,
        caption: "Save Map",
        info: g_DialogInfo,
        button1: "Save",
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

export function saveMap(
  mapName: string,
  player: Player | InvalidEnum.PLAYER_ID = InvalidEnum.PLAYER_ID
) {
  const g_FilePathString = getMapFilePath(mapName);

  const ws = fs.createWriteStream(g_FilePathString, { flags: "a" });

  const slotObjectId: number[] = [];
  const objectIdSlot: Record<number, number> = {};
  const slotVehicleId: number[] = [];
  const vehicleIdSlot: Record<number, number> = {};
  const slotPickupId: number[] = [];
  const slotActorId: number[] = [];

  ObjectMp.getInstances().forEach((o, index) => {
    if (o.isValid()) {
      slotObjectId.push(o.id);
      objectIdSlot[o.id - 1] = index;
    }
  });

  Vehicle.getInstances().forEach((v, index) => {
    if (v.isValid()) {
      slotVehicleId.push(v.id);
      vehicleIdSlot[v.id - 1] = index;
    }
  });

  Pickup.getInstances().forEach((p) => {
    if (p.isValid() && g_PickupData.get(p.id).isValid) {
      slotPickupId.push(p.id);
    }
  });

  Actor.getInstances().forEach((a) => {
    if (a.isValid()) {
      slotActorId.push(a.id);
    }
  });

  let writeString = "";
  if (slotObjectId.length > 0) {
    writeString = `new g_Object[${slotObjectId.length}];\r\n`;
    ws.write(writeString);
  }

  if (slotVehicleId.length > 0) {
    writeString = `new g_Vehicle[${slotVehicleId.length}];\r\n`;
    ws.write(writeString);
  }

  if (slotPickupId.length > 0) {
    const writeString = `new g_Pickup[${slotPickupId.length}];\r\n`;
    ws.write(writeString);
  }

  if (slotActorId.length > 0) {
    const writeString = `new g_Actor[${slotActorId.length}];\r\n`;
    ws.write(writeString);
  }

  for (let o = 0; o < slotObjectId.length; o++) {
    const objId = slotObjectId[o];
    const obj = ObjectMp.getInstance(objId)!;

    const { x, y, z } = obj.getPos();
    const { x: rx, y: ry, z: rz } = obj.getRot();
    const g_CommentString = g_ObjectData.get(objId - 1).comment;

    writeString = `g_Object[${o}] = CreateObject(${obj.getModel()}, ${x.toFixed(
      4
    )}, ${y.toFixed(4)}, ${z.toFixed(4)}, ${rx.toFixed(4)}, ${ry.toFixed(
      4
    )}, ${rz.toFixed(4)}); //${g_CommentString}\r\n`;
    ws.write(writeString);

    for (
      let materialIndex = 0;
      materialIndex < MAX_OBJECT_INDEX;
      materialIndex++
    ) {
      switch (g_ObjectData.get(objId - 1).matIndexType[materialIndex]) {
        case MATERIAL_INDEX_TYPE.TEXTURE: {
          const textureId = g_ObjectData.get(objId - 1).matIndexTexture[
            materialIndex
          ];
          const { modelId, txd, name } = getTextureData(textureId);

          const matIndexColor = g_ObjectData
            .get(objId - 1)
            .matIndexColor[materialIndex].toString(16)
            .padStart(8, "0");
          const writeString =
            `SetObjectMaterial(g_Object[${o}], ${materialIndex}, ${modelId}, ` +
            `"${txd}", "${name}", 0x${matIndexColor});\r\n`;
          ws.write(writeString);
          break;
        }
        case MATERIAL_INDEX_TYPE.TEXT: {
          const g_ObjectTextString = g_ObjectText.get(objId - 1)[materialIndex];
          const g_FontString = g_ObjectFont.get(objId - 1)[materialIndex];
          const g_MaterialSizeString = getMaterialSizeName(
            g_ObjectData.get(objId - 1).matIndexSize[materialIndex]
          );

          const matIndexFontColor = g_ObjectData
            .get(objId - 1)
            .matIndexFontColor[materialIndex].toString(16)
            .padStart(8, "0");
          const matIndexColor = g_ObjectData
            .get(objId - 1)
            .matIndexColor[materialIndex].toString(16)
            .padStart(8, "0");
          const matIndexAlign = g_ObjectData.get(objId - 1).matIndexAlignment[
            materialIndex
          ];

          const writeString =
            `SetObjectMaterialText(g_Object[${o}], "${g_ObjectTextString}", ` +
            `${materialIndex}, ${g_MaterialSizeString}, "${g_FontString}", ` +
            `${g_ObjectData.get(objId - 1).matIndexFontSize[materialIndex]}, ` +
            `${g_ObjectData.get(objId - 1).matIndexIsBold[materialIndex]}` +
            `, 0x${matIndexFontColor}, 0x${matIndexColor}, ` +
            `${matIndexAlign});\r\n`;
          ws.write(writeString);
          break;
        }
      }
    }
  }

  for (let v = 0; v < slotVehicleId.length; v++) {
    const vehicleId = slotVehicleId[v];
    const vehicle = Vehicle.getInstance(vehicleId)!;

    const { x, y, z } = vehicle.getPos();
    const { angle } = vehicle.getZAngle();
    const g_CommentString = g_VehicleData.get(vehicleId - 1).comment;

    const writeString =
      `g_Vehicle[${v}] = CreateVehicle(${vehicle.getModel()}, ` +
      `${x.toFixed(4)}, ${y.toFixed(4)}, ${z.toFixed(4)}, ` +
      `${angle.toFixed(4)}, ${g_VehicleData.get(vehicleId - 1).color1}, ` +
      `${g_VehicleData.get(vehicleId - 1).color2}` +
      `, -1); //${g_CommentString}\r\n`;
    ws.write(writeString);

    for (let slot = 0; slot < 14; slot++) {
      const componentId = vehicle.getComponentInSlot(slot);
      if (componentId) {
        const g_ModelString = getModelName(componentId);
        const writeString = `AddVehicleComponent(g_Vehicle[${v}], ${componentId});//${g_ModelString}\r\n`;
        ws.write(writeString);
      }

      const paintJobId = g_VehicleData.get(vehicleId - 1).paintJob;
      if (paintJobId !== INVALID_PAINTJOB_ID) {
        const writeString = `ChangeVehiclePaintjob(g_Vehicle[${v}], ${paintJobId});\r\n`;
        ws.write(writeString);
      }
    }
  }

  for (let p = 0; p < slotPickupId.length; p++) {
    const pickupId = slotPickupId[p];
    const modelId = g_PickupData.get(pickupId).model;
    const x = g_PickupData.get(pickupId).x;
    const y = g_PickupData.get(pickupId).y;
    const z = g_PickupData.get(pickupId).z;
    const g_CommentString = g_PickupData.get(pickupId).comment;
    const writeString =
      `g_Pickup[${p}] = CreatePickup(${modelId}, 1, ` +
      `${x.toFixed(4)}, ${y.toFixed(4)}, ` +
      `${z.toFixed(4)}, -1); //${g_CommentString}\r\n`;
    ws.write(writeString);
  }

  for (let a = 0; a < slotActorId.length; a++) {
    const actorId = slotActorId[a];
    const actor = Actor.getInstance(actorId)!;
    const { x, y, z } = actor.getPos();
    const r = actor.getFacingAngle().angle;
    const g_CommentString = g_ActorData.get(actorId).comment;

    const writeString =
      `g_Actor[${a}] = CreateActor(${g_ActorData.get(actorId).skin}, ` +
      `${x.toFixed(4)}, ${y.toFixed(4)}, ${z.toFixed(4)}, ` +
      `${r.toFixed(4)}); //${g_CommentString}\r\n`;
    ws.write(writeString);

    const animIndex = g_ActorData.get(actorId).animIndex;
    if (animIndex != INVALID_ANIM_INDEX) {
      const { animLib, animName } = GameMode.getAnimationName(animIndex);
      const writeString =
        `ApplyActorAnimation(g_Actor[${a}], "${animLib}", "${animName}"` +
        `, ${g_ActorData.get(actorId).animDelta.toFixed(4)}` +
        `, ${g_ActorData.get(actorId).animLoop}, ` +
        `${g_ActorData.get(actorId).animLockX}, ${
          g_ActorData.get(actorId).animLockY
        }, ` +
        `${g_ActorData.get(actorId).animFreeze}, ` +
        `${g_ActorData.get(actorId).animTime});\r\n`;
      ws.write(writeString);
    }
  }

  for (let o = 0; o < slotObjectId.length; o++) {
    const objectId = slotObjectId[o];

    switch (g_ObjectData.get(objectId - 1).attachIdType) {
      case ID_TYPE.OBJECT: {
        const attachToId = g_ObjectData.get(objectId - 1).attachId;
        const attachToSlot = objectIdSlot[attachToId - 1];

        const writeString =
          `AttachObjectToObject(g_Object[${o}], g_Object[${attachToSlot}]` +
          `, ${g_ObjectData.get(objectId - 1).attachX.toFixed(4)}, ` +
          `${g_ObjectData.get(objectId - 1).attachY.toFixed(4)}, ` +
          `${g_ObjectData.get(objectId - 1).attachZ.toFixed(4)}, ` +
          `${g_ObjectData.get(objectId - 1).attachRx.toFixed(4)}, ` +
          `${g_ObjectData.get(objectId - 1).attachRy.toFixed(4)}, ` +
          `${g_ObjectData.get(objectId - 1).attachRz.toFixed(4)});\r\n`;
        ws.write(writeString);
        break;
      }
      case ID_TYPE.VEHICLE: {
        const vehicleId = g_ObjectData.get(objectId - 1).attachId;
        const vehicleSlot = vehicleIdSlot[vehicleId - 1];

        const writeString =
          `AttachObjectToVehicle(g_Object[${o}], g_Vehicle[${vehicleSlot}], ` +
          `${g_ObjectData.get(objectId - 1).attachX.toFixed(4)}, ` +
          `${g_ObjectData.get(objectId - 1).attachY.toFixed(4)}, ` +
          `${g_ObjectData.get(objectId - 1).attachZ.toFixed(4)}, ` +
          `${g_ObjectData.get(objectId - 1).attachRx.toFixed(4)}, ` +
          `${g_ObjectData.get(objectId - 1).attachRy.toFixed(4)}, ` +
          `${g_ObjectData.get(objectId - 1).attachRz.toFixed(4)});\r\n`;
        ws.write(writeString);
        break;
      }
    }
  }

  let attachmentsSaved = 0;

  if (player !== InvalidEnum.PLAYER_ID) {
    const playerName = player.getName().name;

    for (let index = 0; index < MAX_PLAYERATTACH_INDEX; index++) {
      if (!g_PlayerAttachData.get(player.id)[index].toggle) {
        continue;
      }

      const g_ModelString = getModelName(
        g_PlayerAttachData.get(player.id)[index].model
      );
      const g_BoneString = getBoneName(
        g_PlayerAttachData.get(player.id)[index].bone
      );

      const color1_ = g_PlayerAttachData.get(player.id)[index].color1;
      const color1 = color1_.toFixed(16).padStart(8, "0");
      const color2_ = g_PlayerAttachData.get(player.id)[index].color2;
      const color2 = color2_.toFixed(16).padStart(8, "0");
      const writeString =
        `SetPlayerAttachedObject(playerid, ${index}` +
        `, ${g_PlayerAttachData.get(player.id)[index].model}` +
        `, ${g_PlayerAttachData.get(player.id)[index].bone}, ` +
        `${g_PlayerAttachData.get(player.id)[index].x.toFixed(4)}, ` +
        `${g_PlayerAttachData.get(player.id)[index].y.toFixed(4)}, ` +
        `${g_PlayerAttachData.get(player.id)[index].z.toFixed(4)}, ` +
        `${g_PlayerAttachData.get(player.id)[index].rx.toFixed(4)}, ` +
        `${g_PlayerAttachData.get(player.id)[index].ry.toFixed(4)}, ` +
        `${g_PlayerAttachData.get(player.id)[index].rz.toFixed(4)}, ` +
        `${g_PlayerAttachData.get(player.id)[index].sx.toFixed(4)}, ` +
        `${g_PlayerAttachData.get(player.id)[index].sy.toFixed(4)}, ` +
        `${g_PlayerAttachData.get(player.id)[index].sz}, ` +
        `0x${color1}, 0x${color2}); ` +
        `// ${g_ModelString} attached to the ${g_BoneString}` +
        ` of ${playerName}\r\n`;
      ws.write(writeString);

      attachmentsSaved++;
    }
  }

  let buildingsSaved = 0;

  for (let b = 0; b < BUILDING_DATA_SIZE; b++) {
    if (!g_BuildingData.has(b)) {
      continue;
    }

    if (!g_BuildingData.get(b).isLoaded) {
      continue;
    }

    if (!g_BuildingData.get(b).isRemoved) {
      continue;
    }

    const g_ModelString = getModelName(g_BuildingData.get(b).model);

    const writeString =
      `RemoveBuildingForPlayer(playerid, ` +
      `${g_BuildingData.get(b).model}, ${g_BuildingData
        .get(b)
        .x.toFixed(4)}, ` +
      `${g_BuildingData.get(b).y.toFixed(4)}, ` +
      `${g_BuildingData.get(b).z.toFixed(4)}, ` +
      `${(g_BuildingData.get(b).offset + REMOVE_BUILDING_RANGE).toFixed(2)});` +
      ` // ${g_ModelString}\r\n`;
    ws.write(writeString);

    const _offset = g_BuildingData.get(b).offset + REMOVE_BUILDING_RANGE;
    if (g_BuildingData.get(b).lodModel !== INVALID_BUILDING_LOD_MODEL) {
      const writeString =
        `RemoveBuildingForPlayer(playerid, ` +
        `${g_BuildingData.get(b).lodModel}, ` +
        `${g_BuildingData.get(b).x.toFixed(4)}, ` +
        `${g_BuildingData.get(b).y.toFixed(4)}, ` +
        `${g_BuildingData.get(b).z.toFixed(4)}, ` +
        `${_offset.toFixed(2)})` +
        `; // LOD Model of ${g_ModelString}\r\n`;
      ws.write(writeString);
    }

    buildingsSaved++;
  }

  const objectsSaved = slotObjectId.length;
  const vehiclesSaved = slotVehicleId.length;
  const pickupsSaved = slotPickupId.length;
  const actorsSaved = slotActorId.length;

  return {
    objectsSaved,
    vehiclesSaved,
    pickupsSaved,
    actorsSaved,
    attachmentsSaved,
    buildingsSaved,
    saveSuccess: true,
  };
}
