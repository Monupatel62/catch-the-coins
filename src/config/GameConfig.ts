export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;
export const FIXED_DELTA_TIME = 1 / 60;

export const PLAYER_SPEED = 420;
export const PLAYER_WIDTH = 88;
export const PLAYER_HEIGHT = 36;
export const PLAYER_COLOR = "#4ade80";

/** Vertical movement bounds — basket stays in lower 40% of screen */
export const PLAYER_MIN_Y_RATIO = 0.55;   // 55% from top = upper limit
export const PLAYER_MAX_Y_OFFSET = 52;    // pixels from bottom = lower limit

export const COIN_RADIUS = 14;
export const COIN_COLOR = "#facc15";

export type CoinType = "normal" | "silver" | "bonus";

export interface CoinTypeConfig {
  type: CoinType;
  value: number;
  color: string;
  strokeColor: string;
  spawnWeight: number;
  label: string;
}

export const COIN_TYPES: CoinTypeConfig[] = [
  {
    type: "normal",
    value: 10,
    color: "#facc15",
    strokeColor: "#a16207",
    spawnWeight: 70,
    label: "",
  },
  {
    type: "silver",
    value: 5,
    color: "#e2e8f0",
    strokeColor: "#64748b",
    spawnWeight: 20,
    label: "",
  },
  {
    type: "bonus",
    value: 25,
    color: "#f97316",
    strokeColor: "#c2410c",
    spawnWeight: 10,
    label: "★",
  },
];

export const MAX_LIVES = 5;
export const GAME_DURATION = 60;
export const COIN_SCORE_VALUE = 10;

export const COMBO_TIER_SIZE = 3;
export const COMBO_MAX_MULTIPLIER = 4;

export interface DifficultyStage {
  name: string;
  spawnInterval: number;
  coinSpeed: number;
}

export const DIFFICULTY_STAGES: DifficultyStage[] = [
  { name: "Stage 1", spawnInterval: 1.2, coinSpeed: 180 },
  { name: "Stage 2", spawnInterval: 0.95, coinSpeed: 220 },
  { name: "Stage 3", spawnInterval: 0.7, coinSpeed: 260 },
];

export const DIFFICULTY_STAGE_DURATION = 20;

export const DEFAULT_VOLUME = 0.6;

export const STORAGE_HIGH_SCORE_KEY = "high-score";
export const STORAGE_BEST_TIME_KEY = "best-time";
export const STORAGE_MUTED_KEY = "muted";
export const STORAGE_VOLUME_KEY = "volume";
