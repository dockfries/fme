import { getVehicleModelName } from "@/vehModel";
import { InvalidEnum, ObjectMp, Player, rgba, Vehicle } from "@infernus/core";
import { g_VehicleData, INVALID_PAINTJOB_ID } from ".";
import { g_PlayerData, getPlayerEditVehicle } from "@/player";
import { ID_TYPE } from "@/idType";
import {
  g_SelectListPTD,
  g_SelectVehListData,
  MAX_SELECT_LIST_ROWS,
} from "@/selectList";
import { INVALID_ROW } from "@/constants";
import { TD_MODE } from "@/tdMode";
import { getObjectAttachVehicle } from "@/object";

const orig_CreateVehicle = Vehicle.__inject__.create;

export function hook_CreateVehicle(
  vehicleType: number,
  x: number,
  y: number,
  z: number,
  rotation: number,
  color1: number | string,
  color2: number | string,
  respawnDelay: number,
  addSiren = false
) {
  const vehicleId = orig_CreateVehicle(
    vehicleType,
    x,
    y,
    z,
    rotation,
    color1,
    color2,
    respawnDelay,
    addSiren
  );
  if (vehicleId !== InvalidEnum.VEHICLE_ID) {
    const g_CommentString = getVehicleModelName(vehicleType);
    if (g_CommentString) {
      g_VehicleData.get(vehicleId - 1).comment = g_CommentString;
    }

    g_VehicleData.get(vehicleId - 1).color1 = rgba(color1);
    g_VehicleData.get(vehicleId - 1).color2 = rgba(color2);
    g_VehicleData.get(vehicleId - 1).paintJob = INVALID_PAINTJOB_ID;
  }
  return vehicleId;
}

Vehicle.__inject__.create = hook_CreateVehicle;

const orig_DestroyVehicle = Vehicle.__inject__.destroy;

export function hook_DestroyVehicle(vehicleId: number) {
  const success = orig_DestroyVehicle(vehicleId);
  if (success) {
    Player.getInstances().forEach((p) => {
      if (!p.isConnected()) {
        return;
      }

      if (getPlayerEditVehicle(p) === vehicleId) {
        g_PlayerData.get(p.id).editIdType = ID_TYPE.NONE;
      }

      const editRow = g_SelectVehListData.get(p.id).editRow;
      if (editRow !== INVALID_ROW) {
        const editVehicleId = g_SelectVehListData.get(p.id).rowId[editRow];

        if (vehicleId === editVehicleId) {
          g_SelectVehListData.get(p.id).rowId[editRow] = INVALID_ROW;
        }
      }

      for (let row = 0; row < MAX_SELECT_LIST_ROWS; row++) {
        if (vehicleId !== g_SelectVehListData.get(p.id).rowId[row]) {
          continue;
        }

        g_SelectVehListData.get(p.id).rowId[row] = InvalidEnum.VEHICLE_ID;

        if (g_PlayerData.get(p.id).tdMode !== TD_MODE.SELECTLIST_VEHICLE) {
          continue;
        }

        g_SelectListPTD.get(p.id).idRow[row]?.hide();
        g_SelectListPTD.get(p.id).commentRow[row]?.hide();
      }
    });

    ObjectMp.getInstances().forEach((o) => {
      if (o.isValid() && getObjectAttachVehicle(o.id) === vehicleId) {
        o.destroy();
      }
    });
  }

  return success;
}

Vehicle.__inject__.destroy = hook_DestroyVehicle;
