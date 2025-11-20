export const MAX_MATERIAL_SIZES = 14;
export const INVALID_MATERIAL_SIZE = 0;

export const g_MaterialSizeName = [
  "OBJECT_MATERIAL_SIZE_32x32",
  "OBJECT_MATERIAL_SIZE_64x32",
  "OBJECT_MATERIAL_SIZE_64x64",
  "OBJECT_MATERIAL_SIZE_128x32",
  "OBJECT_MATERIAL_SIZE_128x64",
  "OBJECT_MATERIAL_SIZE_128x128",
  "OBJECT_MATERIAL_SIZE_256x32",
  "OBJECT_MATERIAL_SIZE_256x64",
  "OBJECT_MATERIAL_SIZE_256x128",
  "OBJECT_MATERIAL_SIZE_256x256",
  "OBJECT_MATERIAL_SIZE_512x64",
  "OBJECT_MATERIAL_SIZE_512x128",
  "OBJECT_MATERIAL_SIZE_512x256",
  "OBJECT_MATERIAL_SIZE_512x512",
] as const;

export function getMaterialSizeName(materialSize: number) {
  const index = materialSize / 10 - 1;

  if (index >= 0 && index < MAX_MATERIAL_SIZES) {
    return g_MaterialSizeName[index];
  } else {
    return `Unknown Material Size (${materialSize})`;
  }
}

export function getMaterialSize(search: string) {
  let size = INVALID_MATERIAL_SIZE;

  if (Number.isNaN(+search)) {
    return size;
  }

  size = +search;

  for (let i = 0; i < MAX_MATERIAL_SIZES; i++) {
    if (search === g_MaterialSizeName[i]) {
      return (i + 1) * 10;
    }
  }

  return INVALID_MATERIAL_SIZE;
}
