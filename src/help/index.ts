import { RGBA_WHITE } from "@/constants";
import { g_PlayerData } from "@/player";
import {
  hidePlayerTextDrawMode,
  showPlayerTextDrawMode,
  TD_MODE,
} from "@/tdMode";
import {
  GameMode,
  InvalidEnum,
  Player,
  TextDraw,
  TextDrawEvent,
} from "@infernus/core";

export enum HELP_KEYBIND {
  OFFEDIT_ADD,
  OFFEDIT_SUB,
  OFFEDIT_MODE,
  OFFEDIT_SLOW,
  CAM_FORWARD,
  CAM_BACK,
  CAM_LEFT,
  CAM_RIGHT,
  CAM_FAST,
  CAM_SLOW,
  MOUSE_ON,
  MOUSE_OFF,
  EDIT_LOOK,
  MAX,
}

export enum HELP_CREDIT {
  AUTHOR,
  TDEDIT,
  TEXTURES,
  BUILDINGS,
  MODELNAMES,
  MODELSIZES,
  CAMMODE,
  STRLIB,
  SSCANF,
  SKINNAMES,
  ATTACHOBJPOS,
  MAX,
}

export interface IHelpGtd {
  bg: TextDraw | null;
  close: TextDraw | null;
  caption: TextDraw | null;
  infoTab: TextDraw | null;
  infoCaption: TextDraw | null;
  infoContent: TextDraw | null;
  keyBindTab: TextDraw | null;
  keyBindCaption: TextDraw | null;
  keyBindL: (TextDraw | null)[];
  keyBindC: (TextDraw | null)[];
  keyBindR: (TextDraw | null)[];
  creditTab: TextDraw | null;
  creditCaption: TextDraw | null;
  creditL: (TextDraw | null)[];
  creditC: (TextDraw | null)[];
  creditR: (TextDraw | null)[];
}

export const g_HelpGTD: IHelpGtd = {
  bg: null,
  close: null,
  caption: null,
  infoTab: null,
  infoCaption: null,
  infoContent: null,
  keyBindTab: null,
  keyBindCaption: null,
  keyBindL: Array.from({ length: HELP_KEYBIND.MAX }, () => null),
  keyBindC: Array.from({ length: HELP_KEYBIND.MAX }, () => null),
  keyBindR: Array.from({ length: HELP_KEYBIND.MAX }, () => null),
  creditTab: null,
  creditCaption: null,
  creditL: Array.from({ length: HELP_KEYBIND.MAX }, () => null),
  creditC: Array.from({ length: HELP_KEYBIND.MAX }, () => null),
  creditR: Array.from({ length: HELP_KEYBIND.MAX }, () => null),
};

GameMode.onInit(({ next }) => {
  createGenericHelpWindow();
  return next();
});

GameMode.onExit(({ next }) => {
  destroyGenericHelpWindow();
  return next();
});

TextDrawEvent.onPlayerClickGlobal(({ player, textDraw, next }) => {
  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.HELP_INFO:
    case TD_MODE.HELP_KEYBIND:
    case TD_MODE.HELP_CREDIT: {
      if (textDraw === InvalidEnum.TEXT_DRAW) {
        hidePlayerTextDrawMode(player);
      } else if (textDraw === g_HelpGTD.close) {
        hidePlayerTextDrawMode(player);
        return 1;
      }
    }
  }

  if (textDraw === g_HelpGTD.infoTab) {
    showPlayerTextDrawMode(player, TD_MODE.HELP_INFO);
    return 1;
  }
  if (textDraw === g_HelpGTD.keyBindTab) {
    showPlayerTextDrawMode(player, TD_MODE.HELP_KEYBIND);
    return 1;
  }
  if (textDraw === g_HelpGTD.creditTab) {
    showPlayerTextDrawMode(player, TD_MODE.HELP_CREDIT);
    return 1;
  }

  return next();
});

export function createGenericHelpWindow() {
  let g_TextDrawString = "";
  g_TextDrawString += "~r~What is the purpose of this script?~n~";
  g_TextDrawString +=
    "~w~This script is made for creating your own maps ingame with ease. In other words it's a user friendly Map Editor.~n~ ~n~";

  g_TextDrawString += "~r~What can i modify with this map editor?~n~";
  g_TextDrawString += "~w~Objects~n~";
  g_TextDrawString += "Vehicles~n~";
  g_TextDrawString += "Pickups~n~";
  g_TextDrawString += "Actors~n~";
  g_TextDrawString += "Player Attachments~n~ ~n~";

  g_TextDrawString += "~r~What is unique about this map editor?~n~";
  g_TextDrawString +=
    "~w~The graphical user interface makes this map editor one of the most user friendly available. ";
  g_TextDrawString +=
    "This map editor has every tool you need to make a high quality map.";

  g_HelpGTD.bg = new TextDraw({
    x: 320.0,
    y: 40.0,
    text: "_",
  })
    .create()
    .setAlignment(2)
    .setLetterSize(0.0, 27.0)
    .useBox(true)
    .setBoxColors(100)
    .setTextSize(0.0, 270.0);

  g_HelpGTD.close = new TextDraw({
    x: 445.0,
    y: 40.0,
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

  g_HelpGTD.caption = new TextDraw({
    x: 191.0,
    y: 28.0,
    text: "Fusez's Map Editor",
  })
    .create()
    .setBackgroundColors(255)
    .setFont(0)
    .setLetterSize(0.5, 2.0)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true)
    .setSelectable(false);

  g_HelpGTD.infoTab = new TextDraw({
    x: 351.0,
    y: 40.0,
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
    .setTextSize(10.0, 30.0)
    .setSelectable(true);

  g_HelpGTD.infoCaption = new TextDraw({
    x: 320.0,
    y: 60.0,
    text: "Information",
  })
    .create()
    .setAlignment(2)
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.3, 1.5)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true)
    .useBox(true)
    .setBoxColors(0)
    .setTextSize(0.0, 260.0)
    .setSelectable(false);

  g_HelpGTD.infoContent = new TextDraw({
    x: 320.0,
    y: 80.0,
    text: g_TextDrawString,
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
    .setBoxColors(0)
    .setTextSize(0.0, 260.0);

  g_HelpGTD.keyBindTab = new TextDraw({
    x: 384.0,
    y: 40.0,
    text: "Keys",
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
    .setBoxColors(-206)
    .setTextSize(10.0, 30.0)
    .setSelectable(true);

  g_HelpGTD.keyBindCaption = new TextDraw({
    x: 320.0,
    y: 60.0,
    text: "Keybinds",
  })
    .create()
    .setAlignment(2)
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.3, 1.5)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true)
    .useBox(true)
    .setBoxColors(0)
    .setTextSize(0.0, 260.0)
    .setSelectable(false);

  for (let row = 0, y = 80.0; row < HELP_KEYBIND.MAX; row++, y += 12.0) {
    g_HelpGTD.keyBindL[row] = new TextDraw({
      x: 310.0,
      y,
      text: "Key",
    })
      .create()
      .setAlignment(3)
      .setBackgroundColors(255)
      .setFont(1)
      .setLetterSize(0.2, 1.0)
      .setColor(RGBA_WHITE)
      .setOutline(1)
      .setProportional(true)
      .setSelectable(false);

    g_HelpGTD.keyBindC[row] = new TextDraw({
      x: 320.0,
      y,
      text: "-",
    })
      .create()
      .setAlignment(2)
      .setBackgroundColors(255)
      .setFont(1)
      .setLetterSize(0.2, 1.0)
      .setColor(RGBA_WHITE)
      .setOutline(1)
      .setProportional(true)
      .setSelectable(false);

    g_HelpGTD.keyBindR[row] = new TextDraw({
      x: 330.0,
      y,
      text: "Action",
    })
      .create()
      .setBackgroundColors(255)
      .setFont(1)
      .setLetterSize(0.2, 1.0)
      .setColor(RGBA_WHITE)
      .setOutline(1)
      .setProportional(true)
      .setSelectable(false);

    switch (row) {
      case HELP_KEYBIND.OFFEDIT_ADD: {
        g_HelpGTD.keyBindL[row]?.setString("~k~~VEHICLE_TURRETRIGHT~");
        g_HelpGTD.keyBindR[row]?.setString("Offset Edit +");
        break;
      }
      case HELP_KEYBIND.OFFEDIT_SUB: {
        g_HelpGTD.keyBindL[row]?.setString("~k~~VEHICLE_TURRETLEFT~");
        g_HelpGTD.keyBindR[row]?.setString("Offset Edit -");
        break;
      }
      case HELP_KEYBIND.OFFEDIT_MODE: {
        g_HelpGTD.keyBindL[row]?.setString(
          "Hold ~k~~PED_SPRINT~ / ~k~~VEHICLE_ACCELERATE~"
        );
        g_HelpGTD.keyBindR[row]?.setString("Offset Edit Mode");
        break;
      }
      case HELP_KEYBIND.OFFEDIT_SLOW: {
        g_HelpGTD.keyBindL[row]?.setString("Hold ~k~~SNEAK_ABOUT~");
        g_HelpGTD.keyBindR[row]?.setString("Offset Edit Slower");
        break;
      }
      case HELP_KEYBIND.CAM_FORWARD: {
        g_HelpGTD.keyBindL[row]?.setString("Up");
        g_HelpGTD.keyBindR[row]?.setString("Move Camera Forward");
        break;
      }
      case HELP_KEYBIND.CAM_BACK: {
        g_HelpGTD.keyBindL[row]?.setString("Down");
        g_HelpGTD.keyBindR[row]?.setString("Move Camera Backwards");
        break;
      }
      case HELP_KEYBIND.CAM_LEFT: {
        g_HelpGTD.keyBindL[row]?.setString("Left");
        g_HelpGTD.keyBindR[row]?.setString("Move Camera Left");
        break;
      }
      case HELP_KEYBIND.CAM_RIGHT: {
        g_HelpGTD.keyBindL[row]?.setString("Right");
        g_HelpGTD.keyBindR[row]?.setString("Move Camera Right");
        break;
      }
      case HELP_KEYBIND.CAM_FAST: {
        g_HelpGTD.keyBindL[row]?.setString("Hold ~k~~PED_JUMPING~");
        g_HelpGTD.keyBindR[row]?.setString("Move Camera Faster");
        break;
      }
      case HELP_KEYBIND.CAM_SLOW: {
        g_HelpGTD.keyBindL[row]?.setString("Hold ~k~~SNEAK_ABOUT~");
        g_HelpGTD.keyBindR[row]?.setString("Move Camera Slower");
        break;
      }
      case HELP_KEYBIND.MOUSE_ON: {
        g_HelpGTD.keyBindL[row]?.setString(
          "~k~~CONVERSATION_YES~ / ~k~~PED_DUCK~"
        );
        g_HelpGTD.keyBindR[row]?.setString("Toggle Mouse Mode");
        break;
      }
      case HELP_KEYBIND.MOUSE_OFF: {
        g_HelpGTD.keyBindL[row]?.setString("ESC");
        g_HelpGTD.keyBindR[row]?.setString("Untoggle Mouse Mode");
        break;
      }
      case HELP_KEYBIND.EDIT_LOOK: {
        g_HelpGTD.keyBindL[row]?.setString(
          "Hold ~k~~PED_SPRINT~ / ~k~~VEHICLE_ACCELERATE~"
        );
        g_HelpGTD.keyBindR[row]?.setString("Click&Drag/3D Select Look Around");
        break;
      }
      default: {
        continue;
      }
    }
  }

  g_HelpGTD.creditTab = new TextDraw({
    x: 417.0,
    y: 40.0,
    text: "Credits",
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
    .setTextSize(10.0, 30.0)
    .setSelectable(true);

  g_HelpGTD.creditCaption = new TextDraw({
    x: 320.0,
    y: 60.0,
    text: "Credits",
  })
    .create()
    .setAlignment(2)
    .setBackgroundColors(255)
    .setFont(1)
    .setLetterSize(0.3, 1.5)
    .setColor(RGBA_WHITE)
    .setOutline(1)
    .setProportional(true)
    .useBox(true)
    .setBoxColors(0)
    .setTextSize(0.0, 260.0)
    .setSelectable(false);

  for (let row = 0, y = 80.0; row < HELP_CREDIT.MAX; row++, y += 12.0) {
    g_HelpGTD.creditL[row] = new TextDraw({
      x: 310.0,
      y,
      text: "User",
    })
      .create()
      .setAlignment(3)
      .setBackgroundColors(255)
      .setFont(1)
      .setLetterSize(0.2, 1.0)
      .setColor(RGBA_WHITE)
      .setOutline(1)
      .setProportional(true)
      .setSelectable(false);

    g_HelpGTD.creditC[row] = new TextDraw({
      x: 320.0,
      y,
      text: "-",
    })
      .create()
      .setAlignment(2)
      .setBackgroundColors(255)
      .setFont(1)
      .setLetterSize(0.2, 1.0)
      .setColor(RGBA_WHITE)
      .setOutline(1)
      .setProportional(true)
      .setSelectable(false);

    g_HelpGTD.creditR[row] = new TextDraw({
      x: 330.0,
      y,
      text: "Contribution",
    })
      .create()
      .setBackgroundColors(255)
      .setFont(1)
      .setLetterSize(0.2, 1.0)
      .setColor(RGBA_WHITE)
      .setOutline(1)
      .setProportional(true)
      .setSelectable(false);

    switch (row) {
      case HELP_CREDIT.AUTHOR: {
        g_HelpGTD.creditL[row]?.setString("Fusez");
        g_HelpGTD.creditR[row]?.setString("Author");
        break;
      }
      case HELP_CREDIT.TDEDIT: {
        g_HelpGTD.creditL[row]?.setString("Zamaroht");
        g_HelpGTD.creditR[row]?.setString("TextDraw Editor");
        break;
      }
      case HELP_CREDIT.TEXTURES: {
        g_HelpGTD.creditL[row]?.setString("Pottus");
        g_HelpGTD.creditR[row]?.setString("Textures");
        break;
      }
      case HELP_CREDIT.BUILDINGS: {
        g_HelpGTD.creditL[row]?.setString("Pottus");
        g_HelpGTD.creditR[row]?.setString("Buildings");
        break;
      }
      case HELP_CREDIT.MODELNAMES: {
        g_HelpGTD.creditL[row]?.setString("SuperViper");
        g_HelpGTD.creditR[row]?.setString("Model Names");
        break;
      }
      case HELP_CREDIT.MODELSIZES: {
        g_HelpGTD.creditL[row]?.setString("Crayder");
        g_HelpGTD.creditR[row]?.setString("Model Sizes");
        break;
      }
      case HELP_CREDIT.CAMMODE: {
        g_HelpGTD.creditL[row]?.setString("h02");
        g_HelpGTD.creditR[row]?.setString("Camera Mode");
        break;
      }
      case HELP_CREDIT.STRLIB: {
        g_HelpGTD.creditL[row]?.setString("Slice");
        g_HelpGTD.creditR[row]?.setString("strlib");
        break;
      }
      case HELP_CREDIT.SSCANF: {
        g_HelpGTD.creditL[row]?.setString("Y_Less");
        g_HelpGTD.creditR[row]?.setString("sscanf");
        break;
      }
      case HELP_CREDIT.SKINNAMES: {
        g_HelpGTD.creditL[row]?.setString("Crayder");
        g_HelpGTD.creditR[row]?.setString("Skin Names");
        break;
      }
      case HELP_CREDIT.ATTACHOBJPOS: {
        g_HelpGTD.creditL[row]?.setString("Stylock");
        g_HelpGTD.creditR[row]?.setString("GetAttachedObjectPos");
        break;
      }
      default: {
        continue;
      }
    }
  }
}

export function destroyGenericHelpWindow() {
  Object.entries(g_HelpGTD).forEach((item) => {
    const [key, gtd] = item as unknown as [
      keyof IHelpGtd,
      (typeof g_HelpGTD)[keyof IHelpGtd]
    ];
    if (Array.isArray(gtd)) {
      gtd.forEach((_gtd, index) => {
        if (_gtd && _gtd.isValid()) {
          _gtd.destroy();
        }
        gtd[index] = null;
      });
    } else {
      if (gtd && gtd.isValid()) {
        gtd.destroy();
      }
      g_HelpGTD[key] = null!;
    }
  });
}

export function showHelpWindow(player: Player) {
  g_HelpGTD.infoTab?.setBoxColors(0x00000064);
  g_HelpGTD.keyBindTab?.setBoxColors(0x00000064);
  g_HelpGTD.creditTab?.setBoxColors(0x00000064);

  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.HELP_INFO: {
      g_HelpGTD.infoTab?.setBoxColors(0xffffff64);
      break;
    }
    case TD_MODE.HELP_KEYBIND: {
      g_HelpGTD.keyBindTab?.setBoxColors(0xffffff64);
      break;
    }
    case TD_MODE.HELP_CREDIT: {
      g_HelpGTD.creditTab?.setBoxColors(0xffffff64);
      break;
    }
  }

  g_HelpGTD.bg?.show(player);
  g_HelpGTD.close?.show(player);
  g_HelpGTD.caption?.show(player);
  g_HelpGTD.infoTab?.show(player);
  g_HelpGTD.keyBindTab?.show(player);
  g_HelpGTD.creditTab?.show(player);

  switch (g_PlayerData.get(player.id).tdMode) {
    case TD_MODE.HELP_INFO: {
      g_HelpGTD.infoCaption?.show(player);
      g_HelpGTD.infoContent?.show(player);
      break;
    }
    case TD_MODE.HELP_KEYBIND: {
      g_HelpGTD.keyBindCaption?.show(player);
      for (let row = 0; row < HELP_KEYBIND.MAX; row++) {
        g_HelpGTD.keyBindL[row]?.show(player);
        g_HelpGTD.keyBindC[row]?.show(player);
        g_HelpGTD.keyBindR[row]?.show(player);
      }
      break;
    }
    case TD_MODE.HELP_CREDIT: {
      g_HelpGTD.creditCaption?.show(player);
      for (let row = 0; row < HELP_CREDIT.MAX; row++) {
        g_HelpGTD.creditL[row]?.show(player);
        g_HelpGTD.creditC[row]?.show(player);
        g_HelpGTD.creditR[row]?.show(player);
      }
      break;
    }
  }
}

export function hideHelpWindow(player: Player) {
  Object.values(g_HelpGTD).forEach((gtd: IHelpGtd[keyof IHelpGtd]) => {
    if (Array.isArray(gtd)) {
      gtd.forEach((_gtd) => {
        _gtd?.hide(player);
      });
    } else {
      gtd?.hide(player);
    }
  });
}
