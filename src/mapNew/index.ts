import { BUILDING_DATA_SIZE, g_BuildingData } from "@/building";
import { INVALID_MAP_ID, RGBA_ORANGE, RGBA_RED, RGBA_WHITE } from "@/constants";
import { DIALOG_ID } from "@/dialog";
import { g_MapVar, refreshMapLoadedTextDraw } from "@/mapLoaded";
import {
  defaultPlayerAttachData,
  g_PlayerAttachData,
  MAX_PLAYERATTACH_INDEX,
} from "@/pAttach";
import { g_PickupData } from "@/pickup";
import {
  Actor,
  Dialog,
  DialogStylesEnum,
  IDialogResCommon,
  InvalidEnum,
  ObjectMp,
  Pickup,
  Player,
  Vehicle,
} from "@infernus/core";

export const NEWMAP_COMMAND = "newmap";

function onDialogResponse(
  player: Player,
  res: IDialogResCommon,
  dialogId: number
) {
  const { inputText, response } = res;
  switch (dialogId) {
    case DIALOG_ID.MAP_NEW: {
      if (!response) {
        return 1;
      }

      if (!inputText.trim().length || inputText !== NEWMAP_COMMAND) {
        player.sendClientMessage(
          RGBA_RED,
          "ERROR: You did not enter the correct command into the textfield!"
        );
        showMapNewDialog(player, dialogId);
      } else {
        const {
          objectsRemoved,
          vehiclesRemoved,
          pickupsRemoved,
          actorsRemoved,
          buildingsRecreated,
          attachmentsRemoved,
        } = newMap(player);

        let g_ClientMessage = `[${player.id}] ${
          player.getName().name
        } has started a new map.`;
        Player.sendClientMessageToAll(RGBA_WHITE, g_ClientMessage);

        g_ClientMessage = `Reset: ${objectsRemoved} Object(s), ${vehiclesRemoved} Vehicle(s), ${pickupsRemoved} or more Pickup(s), ${actorsRemoved} Actor(s), ${buildingsRecreated} Building(s) recreated.`;
        Player.sendClientMessageToAll(RGBA_WHITE, g_ClientMessage);

        if (attachmentsRemoved > 0) {
          g_ClientMessage = `+ ${attachmentsRemoved} or more of your attachment(s).`;
          player.sendClientMessage(RGBA_WHITE, g_ClientMessage);
        }

        if (buildingsRecreated > 0) {
          Player.sendClientMessageToAll(
            RGBA_ORANGE,
            "Please note that you need to reconnect to see recreated buildings."
          );
        }

        g_MapVar.loadedID = INVALID_MAP_ID;
        refreshMapLoadedTextDraw();
      }
      return 1;
    }
  }

  return 0;
}

export async function showMapNewDialog(player: Player, dialogId: number) {
  switch (dialogId) {
    case DIALOG_ID.MAP_NEW: {
      const g_DialogInfo = `Type & Enter "${NEWMAP_COMMAND}" to create a new map.`;
      const res = await new Dialog({
        style: DialogStylesEnum.INPUT,
        caption: "New Map",
        info: g_DialogInfo,
        button1: "Confirm",
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

export function newMap(
  player: Player | InvalidEnum.PLAYER_ID = InvalidEnum.PLAYER_ID
) {
  let objectsRemoved = 0;
  let vehiclesRemoved = 0;
  let pickupsRemoved = 0;
  let actorsRemoved = 0;
  let buildingsRecreated = 0;
  let attachmentsRemoved = 0;
  ObjectMp.getInstances().forEach((o) => {
    if (o.isValid()) {
      o.destroy();
      objectsRemoved++;
    }
  });

  Vehicle.getInstances().forEach((v) => {
    if (v.isValid()) {
      v.destroy();
      vehiclesRemoved++;
    }
  });

  Pickup.getInstances().forEach((p) => {
    if (p.isValid()) {
      if (g_PickupData.has(p.id) && g_PickupData.get(p.id).isValid) {
        pickupsRemoved++;
      }
      p.destroy();
    }
  });

  Actor.getInstances().forEach((a) => {
    if (a.isValid()) {
      a.destroy();
      actorsRemoved++;
    }
  });

  for (let b = 0; b < BUILDING_DATA_SIZE; b++) {
    if (g_BuildingData.has(b) && g_BuildingData.get(b).isRemoved) {
      g_BuildingData.get(b).isRemoved = false;
      buildingsRecreated++;
    }
  }

  if (player !== InvalidEnum.PLAYER_ID) {
    for (let i = 0; i < MAX_PLAYERATTACH_INDEX; i++) {
      if (g_PlayerAttachData.get(player.id)[i].toggle) {
        attachmentsRemoved++;
      }
      defaultPlayerAttachData(player, i);
      player.removeAttachedObject(i);
    }
  }

  return {
    objectsRemoved,
    vehiclesRemoved,
    pickupsRemoved,
    actorsRemoved,
    buildingsRecreated,
    attachmentsRemoved,
  };
}
