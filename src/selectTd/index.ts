import { g_PlayerData } from "@/player";
import { InvalidEnum, TextDrawEvent } from "@infernus/core";

TextDrawEvent.onPlayerClickGlobal(({ player, textDraw, next }) => {
  if (textDraw === InvalidEnum.TEXT_DRAW) {
    g_PlayerData.get(player.id).selectTd = false;
  }
  return next();
});
