import path from "node:path";

export function getMapFilePath(mapName: string) {
  return path.resolve(`scriptfiles/maps/${mapName}.map`);
}

export interface ParseResult {
  varName: string | null;
  funcName: string | null;
  params: string | null;
  comment: string | null;
  isValid: boolean;
}

export function mapLoad_parseLine(line: string): ParseResult {
  const regex =
    /^\s*([a-zA-Z_]\w*(?:\[\d+\])?)\s*=\s*([a-zA-Z_]\w*)\(([^)]*)\)\s*;?\s*(?:\/\/\s*(.*))?\s*$/;

  const match = line.match(regex);

  if (!match) {
    return {
      varName: null,
      funcName: null,
      params: null,
      comment: null,
      isValid: false,
    };
  }

  return {
    varName: match[1]?.trim().replaceAll(" ", "") || null,
    funcName: match[2]?.trim() || null,
    params: match[3]?.trim() || null,
    comment: match[4]?.trim() || null,
    isValid: true,
  };
}
