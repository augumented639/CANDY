export type CandyColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';

export type SpecialType = 'none' | 'striped-h' | 'striped-v' | 'wrapped' | 'color-bomb';

export type BoosterId = 'hammer' | 'free-switch' | 'sugar-bomb';

export type GameShellState = 'title' | 'playing' | 'paused' | 'gameover';

export interface CandyPiece {
  id: number;
  color: CandyColor;
  special: SpecialType;
  // Visual interpolation state used by Canvas renderer
  renderRow: number;
  renderCol: number;
  scaleX: number;
  scaleY: number;
  alpha: number;
  flashTimer: number;
}

export interface GridCell {
  row: number;
  col: number;
  jelly: number; // 0 = none, 1 = single crystal jelly, 2 = thick royal jelly
  frosting: number; // 0 = none, 1..3 = multi-layer sugar frosting blocker (occupies cell instead of candy)
  chocolate: boolean; // dark chocolate hazard blocker (spreads if none cleared on turn)
  candy: CandyPiece | null;
}

export interface StageObjective {
  type: 'score' | 'jelly' | 'frosting' | 'color';
  targetColor?: CandyColor;
  target: number;
  current: number;
  label: string;
}

export interface StageConfig {
  index: number; // 0..4
  number: number; // 1..5
  name: string;
  subtitle: string;
  moves: number;
  targetScore: number;
  starThresholds: [number, number, number];
  colorsCount: number; // 5 or 6
  seed: number;
  jellyLayout: Array<[number, number, number]>; // [row, col, layer]
  frostingLayout: Array<[number, number, number]>; // [row, col, layer]
  chocolateLayout: Array<[number, number]>; // [row, col]
  targetCandies?: { color: CandyColor; count: number };
}

export interface BoosterStock {
  hammer: number;
  'free-switch': number;
  'sugar-bomb': number;
}

export interface MatchGroup {
  cells: Array<{ row: number; col: number }>;
  color: CandyColor;
  spawnSpecial: SpecialType;
  spawnAt: { row: number; col: number };
}

export interface StepClearedEvent {
  row: number;
  col: number;
  color: CandyColor;
  special: SpecialType;
  points: number;
  jellyCleared: boolean;
  frostingDamaged: boolean;
  chocolateCleared: boolean;
}

export interface CascadeStepResult {
  cleared: StepClearedEvent[];
  spawnedSpecials: Array<{ row: number; col: number; color: CandyColor; special: SpecialType }>;
  pointsEarned: number;
  jellyClearedCount: number;
  frostingClearedCount: number;
  chocolateClearedCount: number;
  colorClearedCounts: Record<CandyColor, number>;
  isHeavyImpact: boolean;
}

export interface RunSnapshot {
  outcome: 'victory' | 'defeat';
  stageNumber: number;
  stageName: string;
  score: number;
  bestScore: number;
  stars: number;
  movesLeft: number;
  movesUsed: number;
  maxCascadeCombo: number;
  objectives: StageObjective[];
}
