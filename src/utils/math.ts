import { GameMode } from "@infernus/core";

export function toRadians(degrees: number) {
  return degrees * (Math.PI / 180);
}

export function fixRot(r: number) {
  const laps = Math.floor(r / 360);
  if (laps !== 0) {
    r -= laps * 360.0;
  }
  return r;
}

export function getDistanceBetweenPoints(
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number
) {
  return GameMode.vectorSize(x1 - x2, y1 - y2, z1 - z2);
}

export function positionFromOffset(
  inputX: number,
  inputY: number,
  inputZ: number,
  inputRx: number,
  inputRy: number,
  inputRz: number,
  offsetX: number,
  offsetY: number,
  offsetZ: number
) {
  const cosX = Math.cos(toRadians(inputRx));
  const cosY = Math.cos(toRadians(inputRy));
  const cosZ = Math.cos(toRadians(inputRz));
  const sinX = Math.sin(toRadians(inputRx));
  const sinY = Math.sin(toRadians(inputRy));
  const sinZ = Math.sin(toRadians(inputRz));

  const x =
    inputX +
    offsetX * cosY * cosZ -
    offsetX * sinX * sinY * sinZ -
    offsetY * cosX * sinZ +
    offsetZ * sinY * cosZ +
    offsetZ * sinX * cosY * sinZ;
  const y =
    inputY +
    offsetX * cosY * sinZ +
    offsetX * sinX * sinY * cosZ +
    offsetY * cosX * cosZ +
    offsetZ * sinY * sinZ -
    offsetZ * sinX * cosY * cosZ;
  const z =
    inputZ - offsetX * cosX * sinY + offsetY * sinX + offsetZ * cosX * cosY;
  return {
    x,
    y,
    z,
  };
}
