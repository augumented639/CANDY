import {
  BoosterId,
  CandyColor,
  CandyPiece,
  CascadeStepResult,
  GridCell,
  MatchGroup,
  SpecialType,
  StageConfig,
  StageObjective,
  StepClearedEvent,
} from './types';

export const GRID_SIZE = 8;

export const ALL_CANDY_COLORS: CandyColor[] = [
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
];

export const CANDY_METADATA: Record<
  CandyColor,
  { name: string; primaryHex: string; highlightHex: string; shadowHex: string }
> = {
  red: {
    name: 'Ruby Jelly Bean',
    primaryHex: '#E11D48',
    highlightHex: '#FDA4AF',
    shadowHex: '#881337',
  },
  orange: {
    name: 'Amber Citrus Lozenge',
    primaryHex: '#F97316',
    highlightHex: '#FDBA74',
    shadowHex: '#9A3412',
  },
  yellow: {
    name: 'Lemon Butter Drop',
    primaryHex: '#EAB308',
    highlightHex: '#FEF08A',
    shadowHex: '#854D0E',
  },
  green: {
    name: 'Emerald Mint Gumdrop',
    primaryHex: '#10B981',
    highlightHex: '#6EE7B7',
    shadowHex: '#065F46',
  },
  blue: {
    name: 'Sapphire Berry Bonbon',
    primaryHex: '#2563EB',
    highlightHex: '#93C5FD',
    shadowHex: '#1E3A8A',
  },
  purple: {
    name: 'Amethyst Plum Star',
    primaryHex: '#9333EA',
    highlightHex: '#D8B4FE',
    shadowHex: '#581C87',
  },
};

export const STAGES: StageConfig[] = [
  {
    index: 0,
    number: 1,
    name: 'Jelly Patisserie',
    subtitle: 'Clear all Crystal Jelly glazes beneath the confections',
    moves: 22,
    targetScore: 1800,
    starThresholds: [1800, 3200, 4800],
    colorsCount: 5,
    seed: 1042,
    jellyLayout: [
      [2, 2, 1], [2, 3, 1], [2, 4, 1], [2, 5, 1],
      [3, 2, 1], [3, 3, 2], [3, 4, 2], [3, 5, 1],
      [4, 2, 1], [4, 3, 2], [4, 4, 2], [4, 5, 1],
      [5, 2, 1], [5, 3, 1], [5, 4, 1], [5, 5, 1],
    ],
    frostingLayout: [],
    chocolateLayout: [],
  },
  {
    index: 1,
    number: 2,
    name: 'Frosting Citadel',
    subtitle: 'Shatter the piped Sugar Frosting and harvest Ruby Jelly Beans',
    moves: 24,
    targetScore: 2600,
    starThresholds: [2600, 4200, 6000],
    colorsCount: 5,
    seed: 2088,
    jellyLayout: [
      [1, 3, 1], [1, 4, 1],
      [6, 3, 1], [6, 4, 1],
    ],
    frostingLayout: [
      [3, 1, 1], [3, 2, 2], [3, 5, 2], [3, 6, 1],
      [4, 1, 1], [4, 2, 2], [4, 5, 2], [4, 6, 1],
    ],
    chocolateLayout: [],
    targetCandies: { color: 'red', count: 18 },
  },
  {
    index: 2,
    number: 3,
    name: 'Ganache Lab',
    subtitle: 'Contain the spreading Dark Chocolate and clear Royal Jelly',
    moves: 25,
    targetScore: 3400,
    starThresholds: [3400, 5200, 7400],
    colorsCount: 6,
    seed: 3199,
    jellyLayout: [
      [1, 1, 1], [1, 2, 1], [1, 5, 1], [1, 6, 1],
      [2, 2, 2], [2, 5, 2],
      [5, 2, 2], [5, 5, 2],
      [6, 1, 1], [6, 2, 1], [6, 5, 1], [6, 6, 1],
    ],
    frostingLayout: [
      [3, 3, 1], [3, 4, 1],
    ],
    chocolateLayout: [
      [4, 3], [4, 4],
    ],
  },
  {
    index: 3,
    number: 4,
    name: 'Caramel Vault',
    subtitle: 'Break through triple-layer Frosting vaults & collect Sapphire Bonbons',
    moves: 26,
    targetScore: 4200,
    starThresholds: [4200, 6400, 8800],
    colorsCount: 6,
    seed: 4512,
    jellyLayout: [
      [0, 3, 2], [0, 4, 2],
      [7, 3, 2], [7, 4, 2],
    ],
    frostingLayout: [
      [2, 1, 2], [2, 2, 3], [2, 5, 3], [2, 6, 2],
      [5, 1, 2], [5, 2, 3], [5, 5, 3], [5, 6, 2],
    ],
    chocolateLayout: [
      [3, 0], [4, 7],
    ],
    targetCandies: { color: 'blue', count: 24 },
  },
  {
    index: 4,
    number: 5,
    name: 'Grand Confectionery',
    subtitle: 'Master every hazard in the Royal Confectionery Finale',
    moves: 28,
    targetScore: 5500,
    starThresholds: [5500, 8000, 11000],
    colorsCount: 6,
    seed: 5991,
    jellyLayout: [
      [1, 1, 2], [1, 2, 2], [1, 5, 2], [1, 6, 2],
      [2, 1, 1], [2, 6, 1],
      [5, 1, 1], [5, 6, 1],
      [6, 1, 2], [6, 2, 2], [6, 5, 2], [6, 6, 2],
    ],
    frostingLayout: [
      [2, 3, 2], [2, 4, 2],
      [5, 3, 2], [5, 4, 2],
    ],
    chocolateLayout: [
      [3, 3], [3, 4], [4, 3], [4, 4],
    ],
  },
];

let nextPieceId = 1;

export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function createCandyPiece(
  color: CandyColor,
  row: number,
  col: number,
  special: SpecialType = 'none',
  startRowOffset = 0
): CandyPiece {
  return {
    id: nextPieceId++,
    color,
    special,
    renderRow: row + startRowOffset,
    renderCol: col,
    scaleX: 1,
    scaleY: 1,
    alpha: 1,
    flashTimer: 0,
  };
}

export function isCellBlockedForCandy(cell: GridCell): boolean {
  return cell.frosting > 0 || cell.chocolate;
}

export function createInitialBoard(stage: StageConfig): GridCell[][] {
  const rng = createSeededRng(stage.seed);
  const palette = ALL_CANDY_COLORS.slice(0, stage.colorsCount);

  const board: GridCell[][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row: GridCell[] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      row.push({
        row: r,
        col: c,
        jelly: 0,
        frosting: 0,
        chocolate: false,
        candy: null,
      });
    }
    board.push(row);
  }

  for (const [r, c, layer] of stage.jellyLayout) {
    if (board[r]?.[c]) board[r][c].jelly = layer;
  }
  for (const [r, c, layer] of stage.frostingLayout) {
    if (board[r]?.[c]) board[r][c].frosting = layer;
  }
  for (const [r, c] of stage.chocolateLayout) {
    if (board[r]?.[c]) board[r][c].chocolate = true;
  }

  // Populate non-blocked cells without creating initial 3-in-a-row matches
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = board[r][c];
      if (isCellBlockedForCandy(cell)) {
        cell.candy = null;
        continue;
      }
      const forbidden = new Set<CandyColor>();
      if (
        c >= 2 &&
        board[r][c - 1].candy &&
        board[r][c - 2].candy &&
        board[r][c - 1].candy!.color === board[r][c - 2].candy!.color
      ) {
        forbidden.add(board[r][c - 1].candy!.color);
      }
      if (
        r >= 2 &&
        board[r - 1][c].candy &&
        board[r - 2][c].candy &&
        board[r - 1][c].candy!.color === board[r - 2][c].candy!.color
      ) {
        forbidden.add(board[r - 1][c].candy!.color);
      }
      const allowed = palette.filter((col) => !forbidden.has(col));
      const color = allowed[Math.floor(rng() * allowed.length)] ?? palette[0];
      cell.candy = createCandyPiece(color, r, c, 'none', -2 - r * 0.25);
    }
  }

  // Guarantee at least one valid move on initial board
  if (!findBestValidSwap(board)) {
    // Inject a guaranteed horizontal match swap at row 0 or 1
    const r = 0;
    const targetColor = palette[0];
    if (
      !isCellBlockedForCandy(board[r][0]) &&
      !isCellBlockedForCandy(board[r][1]) &&
      !isCellBlockedForCandy(board[r + 1][2])
    ) {
      board[r][0].candy = createCandyPiece(targetColor, r, 0);
      board[r][1].candy = createCandyPiece(targetColor, r, 1);
      board[r + 1][2].candy = createCandyPiece(targetColor, r + 1, 2);
    }
  }

  return board;
}

export function buildInitialObjectives(stage: StageConfig, board: GridCell[][]): StageObjective[] {
  const objectives: StageObjective[] = [];

  let totalJelly = 0;
  let totalFrosting = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c].jelly > 0) totalJelly += board[r][c].jelly;
      if (board[r][c].frosting > 0) totalFrosting += board[r][c].frosting;
    }
  }

  if (totalJelly > 0) {
    objectives.push({
      type: 'jelly',
      target: totalJelly,
      current: 0,
      label: 'Crystal Jelly',
    });
  }

  if (totalFrosting > 0) {
    objectives.push({
      type: 'frosting',
      target: totalFrosting,
      current: 0,
      label: 'Sugar Frosting',
    });
  }

  if (stage.targetCandies) {
    const colorName = CANDY_METADATA[stage.targetCandies.color].name.split(' ')[0];
    objectives.push({
      type: 'color',
      targetColor: stage.targetCandies.color,
      target: stage.targetCandies.count,
      current: 0,
      label: `${colorName} Candies`,
    });
  }

  objectives.push({
    type: 'score',
    target: stage.targetScore,
    current: 0,
    label: 'Target Score',
  });

  return objectives;
}

export function areCellsAdjacent(
  a: { row: number; col: number },
  b: { row: number; col: number }
): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

export function canSwapCells(
  board: GridCell[][],
  a: { row: number; col: number },
  b: { row: number; col: number }
): boolean {
  if (!areCellsAdjacent(a, b)) return false;
  const cellA = board[a.row]?.[a.col];
  const cellB = board[b.row]?.[b.col];
  if (!cellA || !cellB) return false;
  if (isCellBlockedForCandy(cellA) || isCellBlockedForCandy(cellB)) return false;
  if (!cellA.candy || !cellB.candy) return false;
  return true;
}

export function cloneBoardState(board: GridCell[][]): GridCell[][] {
  return board.map((row) =>
    row.map((cell) => ({
      ...cell,
      candy: cell.candy ? { ...cell.candy } : null,
    }))
  );
}

/**
 * Finds all match-3+ groups on the board and classifies special candy spawns:
 * - 5+ in a straight line -> 'color-bomb'
 * - Intersecting horizontal & vertical runs (L or T shape, >= 5 unique tiles) -> 'wrapped'
 * - 4 in a straight line -> 'striped-h' or 'striped-v'
 */
export function findMatchGroups(
  board: GridCell[][],
  preferredPivot?: { row: number; col: number }
): MatchGroup[] {
  interface LineRun {
    cells: Array<{ row: number; col: number }>;
    color: CandyColor;
    orientation: 'h' | 'v';
  }

  const runs: LineRun[] = [];

  // Horizontal runs
  for (let r = 0; r < GRID_SIZE; r++) {
    let c = 0;
    while (c < GRID_SIZE) {
      const candy = board[r][c].candy;
      if (!candy || candy.special === 'color-bomb') {
        c++;
        continue;
      }
      const color = candy.color;
      const runCells = [{ row: r, col: c }];
      let nextC = c + 1;
      while (nextC < GRID_SIZE) {
        const nextCandy = board[r][nextC].candy;
        if (nextCandy && nextCandy.color === color && nextCandy.special !== 'color-bomb') {
          runCells.push({ row: r, col: nextC });
          nextC++;
        } else {
          break;
        }
      }
      if (runCells.length >= 3) {
        runs.push({ cells: runCells, color, orientation: 'h' });
      }
      c = nextC;
    }
  }

  // Vertical runs
  for (let c = 0; c < GRID_SIZE; c++) {
    let r = 0;
    while (r < GRID_SIZE) {
      const candy = board[r][c].candy;
      if (!candy || candy.special === 'color-bomb') {
        r++;
        continue;
      }
      const color = candy.color;
      const runCells = [{ row: r, col: c }];
      let nextR = r + 1;
      while (nextR < GRID_SIZE) {
        const nextCandy = board[nextR][c].candy;
        if (nextCandy && nextCandy.color === color && nextCandy.special !== 'color-bomb') {
          runCells.push({ row: nextR, col: c });
          nextR++;
        } else {
          break;
        }
      }
      if (runCells.length >= 3) {
        runs.push({ cells: runCells, color, orientation: 'v' });
      }
      r = nextR;
    }
  }

  if (runs.length === 0) return [];

  // Merge intersecting runs of the same color into connected components
  const visited = new Array(runs.length).fill(false);
  const groups: MatchGroup[] = [];

  const shareCell = (a: LineRun, b: LineRun) =>
    a.color === b.color &&
    a.cells.some((ca) => b.cells.some((cb) => ca.row === cb.row && ca.col === cb.col));

  for (let i = 0; i < runs.length; i++) {
    if (visited[i]) continue;
    visited[i] = true;
    const component: LineRun[] = [runs[i]];
    const queue = [runs[i]];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (let j = 0; j < runs.length; j++) {
        if (!visited[j] && shareCell(curr, runs[j])) {
          visited[j] = true;
          component.push(runs[j]);
          queue.push(runs[j]);
        }
      }
    }

    const cellMap = new Map<string, { row: number; col: number }>();
    let maxStraightLen = 0;
    let longestOrientation: 'h' | 'v' = component[0].orientation;
    let hasH = false;
    let hasV = false;

    for (const run of component) {
      if (run.orientation === 'h') hasH = true;
      if (run.orientation === 'v') hasV = true;
      if (run.cells.length > maxStraightLen) {
        maxStraightLen = run.cells.length;
        longestOrientation = run.orientation;
      }
      for (const cell of run.cells) {
        cellMap.set(`${cell.row},${cell.col}`, cell);
      }
    }

    const uniqueCells = Array.from(cellMap.values());
    let spawnSpecial: SpecialType = 'none';
    if (maxStraightLen >= 5) {
      spawnSpecial = 'color-bomb';
    } else if (hasH && hasV && uniqueCells.length >= 5) {
      spawnSpecial = 'wrapped';
    } else if (maxStraightLen === 4) {
      spawnSpecial = longestOrientation === 'h' ? 'striped-v' : 'striped-h';
    }

    let spawnAt = uniqueCells[0];
    if (
      preferredPivot &&
      uniqueCells.some((u) => u.row === preferredPivot.row && u.col === preferredPivot.col)
    ) {
      spawnAt = { row: preferredPivot.row, col: preferredPivot.col };
    } else if (uniqueCells.length > 1) {
      spawnAt = uniqueCells[Math.floor(uniqueCells.length / 2)];
    }

    groups.push({
      cells: uniqueCells,
      color: component[0].color,
      spawnSpecial,
      spawnAt,
    });
  }

  return groups;
}

export function isValidMatchSwap(
  board: GridCell[][],
  a: { row: number; col: number },
  b: { row: number; col: number }
): boolean {
  if (!canSwapCells(board, a, b)) return false;
  const candyA = board[a.row][a.col].candy!;
  const candyB = board[b.row][b.col].candy!;

  // Swapping a Color Bomb with any candy or swapping two Special candies is always valid
  if (candyA.special === 'color-bomb' || candyB.special === 'color-bomb') {
    return true;
  }
  if (candyA.special !== 'none' && candyB.special !== 'none') {
    return true;
  }

  const sim = cloneBoardState(board);
  const temp = sim[a.row][a.col].candy;
  sim[a.row][a.col].candy = sim[b.row][b.col].candy;
  sim[b.row][b.col].candy = temp;

  const groups = findMatchGroups(sim);
  return groups.length > 0;
}

export function findBestValidSwap(
  board: GridCell[][]
): { a: { row: number; col: number }; b: { row: number; col: number } } | null {
  let bestSwap: {
    a: { row: number; col: number };
    b: { row: number; col: number };
    weight: number;
  } | null = null;

  const deltas = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
  ];

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      for (const { dr, dc } of deltas) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= GRID_SIZE || nc >= GRID_SIZE) continue;
        const a = { row: r, col: c };
        const b = { row: nr, col: nc };
        if (!canSwapCells(board, a, b)) continue;

        const candyA = board[r][c].candy!;
        const candyB = board[nr][nc].candy!;
        if (candyA.special === 'color-bomb' || candyB.special === 'color-bomb') {
          return { a, b };
        }
        if (candyA.special !== 'none' && candyB.special !== 'none') {
          return { a, b };
        }

        const sim = cloneBoardState(board);
        sim[r][c].candy = sim[nr][nc].candy;
        sim[nr][nc].candy = candyA;
        const groups = findMatchGroups(sim, b);
        if (groups.length > 0) {
          let weight = 0;
          for (const g of groups) {
            weight += g.cells.length * 10;
            if (g.spawnSpecial !== 'none') weight += 50;
            for (const cell of g.cells) {
              if (board[cell.row][cell.col].jelly > 0) weight += 25;
            }
          }
          if (!bestSwap || weight > bestSwap.weight) {
            bestSwap = { a, b, weight };
          }
        }
      }
    }
  }

  return bestSwap ? { a: bestSwap.a, b: bestSwap.b } : null;
}

/**
 * Resolves a single resolution pass on the board (either a Special+Special swap,
 * a Color-Bomb swap, or standard match groups + chained special candy blasts).
 */
export function resolveMatchesOnBoard(
  board: GridCell[][],
  comboMultiplier = 1,
  swapContext?: {
    a: { row: number; col: number };
    b: { row: number; col: number };
  }
): CascadeStepResult {
  const result: CascadeStepResult = {
    cleared: [],
    spawnedSpecials: [],
    pointsEarned: 0,
    jellyClearedCount: 0,
    frostingClearedCount: 0,
    chocolateClearedCount: 0,
    colorClearedCounts: {
      red: 0,
      orange: 0,
      yellow: 0,
      green: 0,
      blue: 0,
      purple: 0,
    },
    isHeavyImpact: false,
  };

  const toClear = new Map<string, { row: number; col: number; fromSpecial: boolean }>();
  const spawnedNext = new Map<
    string,
    { row: number; col: number; color: CandyColor; special: SpecialType }
  >();
  const triggeredSpecials = new Set<string>();

  const queueCellClear = (row: number, col: number, fromSpecial: boolean) => {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;
    const key = `${row},${col}`;
    if (!toClear.has(key)) {
      toClear.set(key, { row, col, fromSpecial });
    }
    const cell = board[row][col];
    if (cell.candy && cell.candy.special !== 'none' && !triggeredSpecials.has(key)) {
      triggeredSpecials.add(key);
      result.isHeavyImpact = true;
      const spec = cell.candy.special;
      if (spec === 'striped-h') {
        for (let cc = 0; cc < GRID_SIZE; cc++) queueCellClear(row, cc, true);
      } else if (spec === 'striped-v') {
        for (let rr = 0; rr < GRID_SIZE; rr++) queueCellClear(rr, col, true);
      } else if (spec === 'wrapped') {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            queueCellClear(row + dr, col + dc, true);
          }
        }
      } else if (spec === 'color-bomb') {
        const targetColor = cell.candy.color;
        for (let rr = 0; rr < GRID_SIZE; rr++) {
          for (let cc = 0; cc < GRID_SIZE; cc++) {
            if (board[rr][cc].candy?.color === targetColor) {
              queueCellClear(rr, cc, true);
            }
          }
        }
      }
    }
  };

  // Check if swapContext triggered a direct Special combination
  if (swapContext) {
    const cellA = board[swapContext.a.row][swapContext.a.col];
    const cellB = board[swapContext.b.row][swapContext.b.col];
    const candyA = cellA.candy;
    const candyB = cellB.candy;

    if (candyA && candyB) {
      if (candyA.special === 'color-bomb' || candyB.special === 'color-bomb') {
        result.isHeavyImpact = true;
        const bombCell = candyA.special === 'color-bomb' ? swapContext.a : swapContext.b;
        const otherCandy = candyA.special === 'color-bomb' ? candyB : candyA;
        triggeredSpecials.add(`${bombCell.row},${bombCell.col}`);
        toClear.set(`${bombCell.row},${bombCell.col}`, {
          row: bombCell.row,
          col: bombCell.col,
          fromSpecial: true,
        });

        if (otherCandy.special === 'color-bomb') {
          // Double Color Bomb clears the entire board!
          for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
              queueCellClear(r, c, true);
            }
          }
        } else {
          // Clear all candies matching otherCandy.color
          for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
              const target = board[r][c].candy;
              if (target && target.color === otherCandy.color) {
                if (otherCandy.special !== 'none' && target.special === 'none') {
                  target.special = otherCandy.special;
                }
                queueCellClear(r, c, true);
              }
            }
          }
        }
      } else if (candyA.special !== 'none' && candyB.special !== 'none') {
        result.isHeavyImpact = true;
        const pivot = swapContext.b;
        triggeredSpecials.add(`${swapContext.a.row},${swapContext.a.col}`);
        triggeredSpecials.add(`${swapContext.b.row},${swapContext.b.col}`);
        // Cross blast or 3-row/3-col mega blast
        const hasWrapped = candyA.special === 'wrapped' || candyB.special === 'wrapped';
        const span = hasWrapped ? 1 : 0;
        for (let d = -span; d <= span; d++) {
          for (let c = 0; c < GRID_SIZE; c++) queueCellClear(pivot.row + d, c, true);
          for (let r = 0; r < GRID_SIZE; r++) queueCellClear(r, pivot.col + d, true);
        }
      }
    }
  }

  // Also find standard match-3+ groups
  const groups = findMatchGroups(board, swapContext?.b);
  for (const group of groups) {
    if (group.spawnSpecial !== 'none') {
      result.isHeavyImpact = true;
      const key = `${group.spawnAt.row},${group.spawnAt.col}`;
      spawnedNext.set(key, {
        row: group.spawnAt.row,
        col: group.spawnAt.col,
        color: group.color,
        special: group.spawnSpecial,
      });
    }
    for (const pos of group.cells) {
      queueCellClear(pos.row, pos.col, false);
    }
  }

  if (toClear.size === 0) {
    return result;
  }

  // Damage adjacent frosting and chocolate around direct matches, or directly inside special blasts
  const adjacentBlockerChecked = new Set<string>();
  const damageBlockerAt = (r: number, c: number) => {
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return;
    const key = `${r},${c}`;
    if (adjacentBlockerChecked.has(key)) return;
    const cell = board[r][c];
    if (cell.frosting > 0) {
      adjacentBlockerChecked.add(key);
      cell.frosting -= 1;
      result.frostingClearedCount += 1;
      result.pointsEarned += 80 * comboMultiplier;
      result.cleared.push({
        row: r,
        col: c,
        color: 'blue',
        special: 'none',
        points: 80 * comboMultiplier,
        jellyCleared: false,
        frostingDamaged: true,
        chocolateCleared: false,
      });
    } else if (cell.chocolate) {
      adjacentBlockerChecked.add(key);
      cell.chocolate = false;
      result.chocolateClearedCount += 1;
      result.pointsEarned += 120 * comboMultiplier;
      result.cleared.push({
        row: r,
        col: c,
        color: 'orange',
        special: 'none',
        points: 120 * comboMultiplier,
        jellyCleared: false,
        frostingDamaged: false,
        chocolateCleared: true,
      });
    }
  };

  for (const { row, col, fromSpecial } of toClear.values()) {
    const cell = board[row][col];
    if (fromSpecial && (cell.frosting > 0 || cell.chocolate)) {
      damageBlockerAt(row, col);
      continue;
    }

    // Any normal match damages adjacent orthogonal blockers
    if (!fromSpecial) {
      damageBlockerAt(row - 1, col);
      damageBlockerAt(row + 1, col);
      damageBlockerAt(row, col - 1);
      damageBlockerAt(row, col + 1);
    }

    let jellyCleared = false;
    if (cell.jelly > 0) {
      cell.jelly -= 1;
      jellyCleared = true;
      result.jellyClearedCount += 1;
    }

    if (cell.candy) {
      const basePts = cell.candy.special !== 'none' ? 120 : 40;
      const pts = (basePts + (jellyCleared ? 60 : 0)) * comboMultiplier;
      result.pointsEarned += pts;
      result.colorClearedCounts[cell.candy.color] += 1;

      const event: StepClearedEvent = {
        row,
        col,
        color: cell.candy.color,
        special: cell.candy.special,
        points: pts,
        jellyCleared,
        frostingDamaged: false,
        chocolateCleared: false,
      };
      result.cleared.push(event);
      cell.candy = null;
    }
  }

  // Place newly forged special candies
  for (const spawn of spawnedNext.values()) {
    const cell = board[spawn.row][spawn.col];
    if (!isCellBlockedForCandy(cell)) {
      cell.candy = createCandyPiece(spawn.color, spawn.row, spawn.col, spawn.special);
      cell.candy.scaleX = 1.35;
      cell.candy.scaleY = 1.35;
      result.spawnedSpecials.push(spawn);
    }
  }

  if (result.cleared.length >= 5 || comboMultiplier >= 2) {
    result.isHeavyImpact = true;
  }

  return result;
}

/**
 * Applies gravity to drop existing candies into empty cells below them,
 * and spawns fresh candies from above the top row.
 */
export function applyGravityAndRefill(
  board: GridCell[][],
  colorsCount: number,
  rng: () => number = Math.random
): void {
  const palette = ALL_CANDY_COLORS.slice(0, colorsCount);

  for (let c = 0; c < GRID_SIZE; c++) {
    let writeRow = GRID_SIZE - 1;
    for (let r = GRID_SIZE - 1; r >= 0; r--) {
      if (isCellBlockedForCandy(board[r][c])) {
        writeRow = r - 1;
        continue;
      }
      if (board[r][c].candy) {
        if (writeRow !== r) {
          board[writeRow][c].candy = board[r][c].candy;
          board[r][c].candy = null;
        }
        writeRow--;
        while (writeRow >= 0 && isCellBlockedForCandy(board[writeRow][c])) {
          writeRow--;
        }
      }
    }

    // Fill remaining empty non-blocked cells from writeRow upwards
    let spawnOffset = -1;
    for (let r = writeRow; r >= 0; r--) {
      if (isCellBlockedForCandy(board[r][c])) continue;
      if (!board[r][c].candy) {
        const color = palette[Math.floor(rng() * palette.length)] ?? palette[0];
        board[r][c].candy = createCandyPiece(color, r, c, 'none', spawnOffset - (writeRow - r));
        spawnOffset -= 0.6;
      }
    }
  }
}

/**
 * Chocolate hazard behavior: if chocolate exists on the board and none was destroyed
 * during the player's turn, 1 chocolate block spreads to an adjacent candy tile.
 */
export function spreadChocolateHazard(
  board: GridCell[][],
  rng: () => number = Math.random
): { row: number; col: number } | null {
  const candidates: Array<{ row: number; col: number }> = [];
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!board[r][c].chocolate) continue;
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
        const neighbor = board[nr][nc];
        if (
          !neighbor.chocolate &&
          neighbor.frosting === 0 &&
          neighbor.candy &&
          neighbor.candy.special === 'none'
        ) {
          candidates.push({ row: nr, col: nc });
        }
      }
    }
  }

  if (candidates.length === 0) return null;
  const target = candidates[Math.floor(rng() * candidates.length)];
  const cell = board[target.row][target.col];
  cell.chocolate = true;
  cell.candy = null;
  return target;
}

/**
 * Executes a single-tile or area Booster ('hammer' | 'sugar-bomb') on the board.
 */
export function executeBoardBooster(
  board: GridCell[][],
  booster: BoosterId,
  target: { row: number; col: number }
): CascadeStepResult {
  const result: CascadeStepResult = {
    cleared: [],
    spawnedSpecials: [],
    pointsEarned: 0,
    jellyClearedCount: 0,
    frostingClearedCount: 0,
    chocolateClearedCount: 0,
    colorClearedCounts: {
      red: 0,
      orange: 0,
      yellow: 0,
      green: 0,
      blue: 0,
      purple: 0,
    },
    isHeavyImpact: true,
  };

  const coords: Array<{ row: number; col: number }> = [];
  if (booster === 'hammer') {
    coords.push(target);
  } else if (booster === 'sugar-bomb') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = target.row + dr;
        const c = target.col + dc;
        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
          coords.push({ row: r, col: c });
        }
      }
    }
  }

  for (const { row, col } of coords) {
    const cell = board[row][col];
    let jellyCleared = false;
    let frostingDamaged = false;
    let chocolateCleared = false;

    if (cell.frosting > 0) {
      cell.frosting -= 1;
      frostingDamaged = true;
      result.frostingClearedCount += 1;
    }
    if (cell.chocolate) {
      cell.chocolate = false;
      chocolateCleared = true;
      result.chocolateClearedCount += 1;
    }
    if (cell.jelly > 0 && !isCellBlockedForCandy(cell)) {
      cell.jelly -= 1;
      jellyCleared = true;
      result.jellyClearedCount += 1;
    }

    const color: CandyColor = cell.candy?.color ?? 'red';
    const special: SpecialType = cell.candy?.special ?? 'none';
    if (cell.candy) {
      result.colorClearedCounts[cell.candy.color] += 1;
      cell.candy = null;
    }

    const pts = 100;
    result.pointsEarned += pts;
    result.cleared.push({
      row,
      col,
      color,
      special,
      points: pts,
      jellyCleared,
      frostingDamaged,
      chocolateCleared,
    });
  }

  return result;
}

export function updateObjectivesWithStep(
  objectives: StageObjective[],
  step: CascadeStepResult,
  newTotalScore: number
): StageObjective[] {
  return objectives.map((obj) => {
    if (obj.type === 'score') {
      return { ...obj, current: newTotalScore };
    }
    if (obj.type === 'jelly') {
      return { ...obj, current: Math.min(obj.target, obj.current + step.jellyClearedCount) };
    }
    if (obj.type === 'frosting') {
      return { ...obj, current: Math.min(obj.target, obj.current + step.frostingClearedCount) };
    }
    if (obj.type === 'color' && obj.targetColor) {
      const gained = step.colorClearedCounts[obj.targetColor] ?? 0;
      return { ...obj, current: Math.min(obj.target, obj.current + gained) };
    }
    return obj;
  });
}

export function areAllObjectivesMet(objectives: StageObjective[]): boolean {
  return objectives.every((obj) => obj.current >= obj.target);
}

export function calculateStarRating(score: number, thresholds: [number, number, number]): number {
  if (score >= thresholds[2]) return 3;
  if (score >= thresholds[1]) return 2;
  if (score >= thresholds[0]) return 1;
  return 0;
}
