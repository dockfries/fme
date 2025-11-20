import { PlayerEvent } from "@infernus/core";

const MONEYREFILL_AMOUNT = 10000;
const MONEYREFILL_TOGGLED = false;

PlayerEvent.onUpdate(({ player, next }) => {
  if (MONEYREFILL_TOGGLED && player.getMoney() !== MONEYREFILL_AMOUNT) {
    player.resetMoney();
    player.giveMoney(MONEYREFILL_AMOUNT);
  }
  return next();
});
