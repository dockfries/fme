import { g_CamModeData } from "@/camMode";
import { g_PlayerData } from "@/player";
import { setSelectListEditViewed } from "@/selectList";
import { hidePlayerTextDrawMode, TD_MODE } from "@/tdMode";
import {
  createToolbarKeyTextDraw,
  g_ToolbarTextDraw,
  ITdToolBar,
} from "@/toolBar";
import { ObjectMp, Player } from "@infernus/core";

const orig_SelectTextDraw = Player.__inject__.selectTextDraw;

function hook_SelectTextDraw(playerId: number, hoverColor: number | string) {
  const player = Player.getInstance(playerId)!;

  orig_SelectTextDraw(playerId, hoverColor);
  g_PlayerData.get(playerId).selectTd = true;

  Object.values(g_ToolbarTextDraw).forEach(
    (gtd: ITdToolBar[keyof ITdToolBar]) => {
      if (gtd && gtd.isValid()) {
        gtd.show(player);
      }
    }
  );

  createToolbarKeyTextDraw(player, true);
}

Player.__inject__.selectTextDraw = hook_SelectTextDraw;

const orig_CancelSelectTextDraw = Player.__inject__.cancelSelectTextDraw;

function hook_CancelSelectTextDraw(playerId: number) {
  const player = Player.getInstance(playerId)!;

  orig_CancelSelectTextDraw(playerId);
  g_PlayerData.get(playerId).selectTd = false;

  Object.values(g_ToolbarTextDraw).forEach(
    (gtd: ITdToolBar[keyof ITdToolBar]) => {
      if (gtd && gtd.isValid()) {
        gtd.hide(player);
      }
    }
  );

  createToolbarKeyTextDraw(player, false);

  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.SELECTLIST_OBJECT:
    case TD_MODE.SELECTLIST_VEHICLE:
    case TD_MODE.SELECTLIST_PICKUP:
    case TD_MODE.SELECTLIST_ACTOR: {
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
    }
  }

  if (g_PlayerData.get(player.id).tdMode !== TD_MODE.NONE) {
    hidePlayerTextDrawMode(player);
  }
}

Player.__inject__.cancelSelectTextDraw = hook_CancelSelectTextDraw;
