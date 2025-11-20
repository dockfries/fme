export const MAX_BONES = 18;
export const MIN_BONE_ID = 1;
export const MAX_BONE_ID = 18;

const boneNames = [
  "Spine",
  "Head",
  "Left Upper Arm",
  "Right Upper Arm",
  "Left Hand",
  "Right Hand",
  "Left Thigh",
  "Right Thigh",
  "Left Foot",
  "Right Foot",
  "Right Calf",
  "Left Calf",
  "Left Forearm",
  "Right Forearm",
  "Left Clavicle",
  "Right Clavicle",
  "Neck",
  "Jaw",
] as const;

export function getBoneName(boneId: number) {
  return boneNames[boneId] || `Invalid Bone (${boneId})`;
}

export function isValidBone(boneId: number) {
  return boneId >= MIN_BONE_ID && boneId <= MAX_BONE_ID;
}
