export function setARGBAlpha(aRGB: number, alpha: number) {
  return (alpha << 24) | (aRGB & 0x00ffffff);
}

export function rgbToARGB(rgb: number, alpha: number) {
  return (alpha << 24) | rgb;
}

export function rgbToRGBA(rgb: number, alpha: number) {
  return (rgb << 8) | alpha;
}

export function aRGBtoRGB(aRGB: number) {
  return aRGB & 0x00ffffff;
}

export function aRGBtoA(aRGB: number) {
  return (aRGB & 0xff000000) >>> 24;
}
