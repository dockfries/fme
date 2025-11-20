import { ObjectMaterialAlignmentEnum } from "@infernus/core";

export const MAX_MATERIAL_ALIGNMENTS = 3;

export function isValidMaterialAlignment(alignment: number) {
  return alignment >= 0 && alignment <= 2;
}

export function getAlignmentName(alignment: number) {
  switch (alignment) {
    case ObjectMaterialAlignmentEnum.LEFT: {
      return { name: "Left", ret: true };
    }
    case ObjectMaterialAlignmentEnum.CENTER: {
      return { name: "Center", ret: true };
    }
    case ObjectMaterialAlignmentEnum.RIGHT: {
      return { name: "Right", ret: true };
    }
    default: {
      return { name: alignment.toString(), ret: false };
    }
  }
}
