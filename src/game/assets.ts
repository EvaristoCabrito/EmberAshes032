import { DECORATIONS, decorationImage } from "./data";
import type { GameArt, SpriteId, TerrainId } from "./types";

export const TILE_VARIANT_COUNT: Record<TerrainId, number> = {
  plains: 15,
  woods: 7,
  ruins: 7,
  water: 22,
  ember: 5,
  hill: 4,
  flame: 3,
  column: 2,
  nave: 2,
  barricade: 1,
  highwood: 1,
  highruin: 1,
  chest: 1,
  door: 1,
  deadtree: 1,
  void: 1,
  snow: 4,
  shallowsnow: 4,
  snowwoods: 6,
};

export function tileVariantName(id: TerrainId, variant: number): string {
  if (id === "plains") {
    if (variant === 0) return "plains016";
    if (variant === 1) return "plains015";
    if (variant === 2) return "plains001";
    return `plains${String(variant).padStart(3, "0")}`;
  }
  if (id === "water" && variant === 0) return "water023";
  if (id === "woods") {
    if (variant === 0) return "woods005";
    if (variant === 1) return "woods006";
    if (variant === 6) return "woods007";
    return `woods${String(variant - 1).padStart(3, "0")}`;
  }
  if (id === "hill") return `hill${String(variant + 4).padStart(3, "0")}`;
  if (id === "ruins") {
    if (variant === 0) return "ruins005";
    if (variant <= 4) return `ruins${String(variant).padStart(3, "0")}`;
    return `ruins${String(variant + 1).padStart(3, "0")}`;
  }
  return `${id}${String(variant + 1).padStart(3, "0")}`;
}

export function tileVariantSrc(id: TerrainId, variant: number): string {
  return `/game/tiles/${tileVariantName(id, variant)}.png?v=56`;
}
