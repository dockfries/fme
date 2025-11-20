export const INVALID_MODSHOP_ID = -1;

export enum MODSHOP {
  TRANSFENDER,
  LOCOLOW,
  WHEELARCH,
}

export function getModShopName(modShopId: number) {
  switch (modShopId) {
    case MODSHOP.TRANSFENDER: {
      return "Transfender";
    }
    case MODSHOP.LOCOLOW: {
      return "Loco Low Co";
    }
    case MODSHOP.WHEELARCH: {
      return "Wheel Arch Angels";
    }
    default: {
      return `Unknown Tuning Shop (${modShopId})`;
    }
  }
}

export function getModShopPosition(modShopId: number) {
  switch (modShopId) {
    case MODSHOP.TRANSFENDER: {
      return {
        x: 2386.7168,
        y: 1049.6642,
        z: 10.643,
        a: 0.0,
      };
    }
    case MODSHOP.LOCOLOW: {
      return {
        x: 2644.8989,
        y: -2044.821,
        z: 13.3657,
        a: 180.0,
      };
    }
    case MODSHOP.WHEELARCH: {
      return {
        x: -2723.5051,
        y: 217.1725,
        z: 4.2119,
        a: 90.0,
      };
    }
    default: {
      return null;
    }
  }
}

export function getVehicleModelModShop(modelId: number) {
  if (
    [
      400, 401, 402, 404, 405, 409, 410, 411, 415, 418, 419, 420, 421, 422, 424,
      426, 429, 436, 438, 439, 442, 445, 451, 458, 466, 467, 474, 475, 477, 478,
      479, 480, 489, 491, 492, 496, 500, 506, 507, 516, 517, 518, 526, 527, 529,
      533, 540, 541, 542, 545, 546, 547, 549, 550, 551, 555, 579, 580, 585, 587,
      589, 600, 602, 603,
    ].includes(modelId)
  ) {
    return MODSHOP.TRANSFENDER;
  } else if ([412, 534, 535, 536, 566, 567, 575, 576].includes(modelId)) {
    return MODSHOP.LOCOLOW;
  } else if ([558, 559, 560, 561, 562, 565].includes(modelId)) {
    return MODSHOP.WHEELARCH;
  }

  return INVALID_MODSHOP_ID;
}
