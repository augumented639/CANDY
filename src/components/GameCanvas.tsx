import React, { useEffect, useRef } from 'react';
import {
  ALL_CANDY_COLORS,
  CANDY_METADATA,
  GRID_SIZE,
  applyGravityAndRefill,
  areAllObjectivesMet,
  areCellsAdjacent,
  canSwapCells,
  createSeededRng,
  executeBoardBooster,
  findBestValidSwap,
  isValidMatchSwap,
  resolveMatchesOnBoard,
  spreadChocolateHazard,
  updateObjectivesWithStep,
} from '../game/rules';
import { soundEngine } from '../game/audio';
import {
  BoosterId,
  CandyColor,
  GameShellState,
  GridCell,
  StageConfig,
  StageObjective,
} from '../game/types';

interface GameCanvasProps {
  shellState: GameShellState;
  stage: StageConfig;
  boardRef: React.MutableRefObject<GridCell[][]>;
  movesLeft: number;
  score: number;
  objectives: StageObjective[];
  activeBooster: BoosterId | null;
  hintTriggerTick: number;
  onSyncHud: (payload: {
    movesLeft: number;
    score: number;
    comboCount: number;
    objectives: StageObjective[];
    chocolateWarning: boolean;
  }) => void;
  onConsumeBooster: (booster: BoosterId) => void;
  onStageOutcome: (
    outcome: 'victory' | 'defeat',
    finalScore: number,
    movesLeft: number,
    maxCombo: number,
    finalObjectives: StageObjective[]
  ) => void;
}

interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape: 'circle' | 'diamond' | 'spark';
}

interface FloatingPopup {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  scale: number;
  life: number;
  maxLife: number;
}

interface ClearFlash {
  active: boolean;
  row: number;
  col: number;
  color: string;
  timer: number;
  maxTimer: number;
  isBeamH: boolean;
  isBeamV: boolean;
}

const PARTICLE_POOL_SIZE = 256;
const POPUP_POOL_SIZE = 32;
const FLASH_POOL_SIZE = 64;

const COMBO_CALLOUTS = ['SWEET!', 'TASTY!', 'DELICIOUS!', 'DIVINE!', 'SUGAR CRUSH!'];

export const GameCanvas: React.FC<GameCanvasProps> = ({
  shellState,
  stage,
  boardRef,
  movesLeft,
  score,
  objectives,
  activeBooster,
  hintTriggerTick,
  onSyncHud,
  onConsumeBooster,
  onStageOutcome,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Store latest React props & callbacks in a ref so the 60Hz loop never tears down
  const bridgeRef = useRef({
    shellState,
    stage,
    movesLeft,
    score,
    objectives,
    activeBooster,
    onSyncHud,
    onConsumeBooster,
    onStageOutcome,
  });

  useEffect(() => {
    bridgeRef.current = {
      shellState,
      stage,
      movesLeft,
      score,
      objectives,
      activeBooster,
      onSyncHud,
      onConsumeBooster,
      onStageOutcome,
    };
  }, [
    shellState,
    stage,
    movesLeft,
    score,
    objectives,
    activeBooster,
    onSyncHud,
    onConsumeBooster,
    onStageOutcome,
  ]);

  // Ref for triggering a manual hint from the HUD button or 'H' key
  const requestHintRef = useRef(false);
  useEffect(() => {
    if (hintTriggerTick > 0) {
      requestHintRef.current = true;
    }
  }, [hintTriggerTick]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.setAttribute('data-testid', 'game-canvas');
    canvas.setAttribute('aria-label', 'Candy Crush Saga 8 by 8 Confectionery Game Board');
    canvas.className = 'block w-full h-full touch-none select-none';
    container.innerHTML = '';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Live viewport & board layout metrics updated via ResizeObserver
    const layout = {
      width: window.innerWidth,
      height: window.innerHeight,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
      boardX: 0,
      boardY: 0,
      boardSize: 480,
      cellSize: 60,
      pointerClientX: window.innerWidth * 0.65,
      pointerClientY: window.innerHeight * 0.5,
    };

    const recomputeBoardGeometry = () => {
      const rect = container.getBoundingClientRect();
      layout.width = Math.max(320, rect.width || window.innerWidth);
      layout.height = Math.max(480, rect.height || window.innerHeight);
      layout.dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(layout.width * layout.dpr);
      canvas.height = Math.floor(layout.height * layout.dpr);

      // Reserve top and bottom safe space for perimeter HUD dock so >=85% playfield is clear
      const isNarrow = layout.width < 640;
      const safeTop = isNarrow ? 136 : 94;
      const safeBottom = isNarrow ? 82 : 86;
      const availH = Math.max(240, layout.height - safeTop - safeBottom);
      const availW = Math.max(240, layout.width - (isNarrow ? 24 : 36));
      const rawBoardSize = Math.min(availW, availH, 600);
      layout.cellSize = Math.floor(rawBoardSize / GRID_SIZE);
      layout.boardSize = layout.cellSize * GRID_SIZE;
      layout.boardX = Math.floor((layout.width - layout.boardSize) / 2);
      layout.boardY = Math.floor(safeTop + (availH - layout.boardSize) / 2);
    };

    recomputeBoardGeometry();
    const resizeObserver = new ResizeObserver(() => {
      recomputeBoardGeometry();
    });
    resizeObserver.observe(container);

    // Zero-GC pre-allocated pools
    const particlePool: PooledParticle[] = Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 4,
      color: '#FFF',
      alpha: 1,
      life: 0,
      maxLife: 0.5,
      shape: 'circle',
    }));
    let particleHead = 0;

    const spawnParticles = (
      x: number,
      y: number,
      color: string,
      count: number,
      speedScale = 1,
      shape: 'circle' | 'diamond' | 'spark' = 'circle'
    ) => {
      for (let i = 0; i < count; i++) {
        const p = particlePool[particleHead];
        particleHead = (particleHead + 1) % PARTICLE_POOL_SIZE;
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const speed = (65 + Math.random() * 160) * speedScale;
        p.active = true;
        p.x = x + (Math.random() - 0.5) * 14;
        p.y = y + (Math.random() - 0.5) * 14;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed - 45;
        p.size = (4 + Math.random() * 5) * (speedScale > 1.1 ? 1.25 : 1);
        p.color = color;
        p.alpha = 1;
        p.life = 0;
        p.maxLife = 0.38 + Math.random() * 0.28;
        p.shape = shape;
      }
    };

    const popupPool: FloatingPopup[] = Array.from({ length: POPUP_POOL_SIZE }, () => ({
      active: false,
      x: 0,
      y: 0,
      vy: -50,
      text: '',
      color: '#FEF08A',
      scale: 1,
      life: 0,
      maxLife: 0.85,
    }));
    let popupHead = 0;

    const spawnPopup = (x: number, y: number, text: string, color = '#FEF08A', scale = 1) => {
      const pop = popupPool[popupHead];
      popupHead = (popupHead + 1) % POPUP_POOL_SIZE;
      pop.active = true;
      pop.x = x;
      pop.y = y;
      pop.vy = -55;
      pop.text = text;
      pop.color = color;
      pop.scale = scale;
      pop.life = 0;
      pop.maxLife = 0.9;
    };

    const flashPool: ClearFlash[] = Array.from({ length: FLASH_POOL_SIZE }, () => ({
      active: false,
      row: 0,
      col: 0,
      color: '#FFF',
      timer: 0,
      maxTimer: 0.18,
      isBeamH: false,
      isBeamV: false,
    }));
    let flashHead = 0;

    const spawnCellFlash = (
      row: number,
      col: number,
      color: string,
      isBeamH = false,
      isBeamV = false
    ) => {
      const fl = flashPool[flashHead];
      flashHead = (flashHead + 1) % FLASH_POOL_SIZE;
      fl.active = true;
      fl.row = row;
      fl.col = col;
      fl.color = color;
      fl.timer = 0;
      fl.maxTimer = isBeamH || isBeamV ? 0.26 : 0.16;
      fl.isBeamH = isBeamH;
      fl.isBeamV = isBeamV;
    };

    // Internal simulation state
    type TurnPhase =
      | 'IDLE'
      | 'SWAPPING'
      | 'REVERTING'
      | 'RESOLVING'
      | 'FALLING'
      | 'OUTCOME_BEAT';

    let phase: TurnPhase = 'IDLE';
    let phaseTimer = 0;
    let hitstopTimer = 0;
    let shakeTrauma = 0;
    let idleHintTimer = 0;
    let hintPair: { a: { row: number; col: number }; b: { row: number; col: number } } | null =
      null;

    let selectedCell: { row: number; col: number } | null = null;
    let cursorCell: { row: number; col: number } = { row: 3, col: 3 };
    let dragStartCell: { row: number; col: number } | null = null;
    let dragStartClient = { x: 0, y: 0 };
    let pointerDown = false;

    let activeSwap: {
      a: { row: number; col: number };
      b: { row: number; col: number };
      isFreeSwitch: boolean;
    } | null = null;

    let currentCombo = 0;
    let maxCascadeCombo = 1;
    let clearedChocolateThisTurn = false;
    let rng = createSeededRng(bridgeRef.current.stage.seed + 99);
    let lastStageSeed = bridgeRef.current.stage.seed;
    let pendingOutcome: 'victory' | 'defeat' | null = null;

    // Unified Input Hygiene: track held keys & single-frame justPressed edges
    const keysHeld = new Set<string>();
    const keysJustPressed = new Set<string>();

    const clearInputState = () => {
      keysHeld.clear();
      keysJustPressed.clear();
      pointerDown = false;
      dragStartCell = null;
    };

    // Single screenToWorld / screenToBoard helper backed by live ResizeObserver bounds
    const screenToBoard = (clientX: number, clientY: number): { row: number; col: number } | null => {
      const rect = canvas.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const col = Math.floor((localX - layout.boardX) / layout.cellSize);
      const row = Math.floor((localY - layout.boardY) / layout.cellSize);
      if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        return { row, col };
      }
      return null;
    };

    const cellCenterPx = (row: number, col: number) => ({
      x: layout.boardX + (col + 0.5) * layout.cellSize,
      y: layout.boardY + (row + 0.5) * layout.cellSize,
    });

    const hasChocolateOnBoard = (board: GridCell[][]): boolean => {
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (board[r][c].chocolate) return true;
        }
      }
      return false;
    };

    const executeResolutionPass = (
      swapContext?: { a: { row: number; col: number }; b: { row: number; col: number } }
    ): boolean => {
      const board = boardRef.current;
      const stepCombo = currentCombo + 1;
      const step = resolveMatchesOnBoard(board, stepCombo, swapContext);

      if (step.cleared.length === 0) {
        return false;
      }

      currentCombo = stepCombo;
      if (currentCombo > maxCascadeCombo) {
        maxCascadeCombo = currentCombo;
      }
      if (step.chocolateClearedCount > 0) {
        clearedChocolateThisTurn = true;
      }

      // Trigger weight-scaled audio + visual feedback
      soundEngine.playMatchPop(currentCombo, step.isHeavyImpact);

      if (step.isHeavyImpact) {
        hitstopTimer = 0.055; // 55ms heavy impact freeze
        shakeTrauma = Math.min(1, shakeTrauma + 0.52);
      } else {
        shakeTrauma = Math.min(1, shakeTrauma + 0.18);
      }

      for (const item of step.cleared) {
        const center = cellCenterPx(item.row, item.col);
        const hex = CANDY_METADATA[item.color]?.primaryHex ?? '#FDE047';
        const isBeamH = item.special === 'striped-h';
        const isBeamV = item.special === 'striped-v';
        spawnCellFlash(item.row, item.col, hex, isBeamH, isBeamV);
        spawnParticles(
          center.x,
          center.y,
          hex,
          step.isHeavyImpact ? 14 : 6,
          step.isHeavyImpact ? 1.35 : 0.9,
          item.special !== 'none' ? 'spark' : 'circle'
        );
      }

      if (step.cleared.length > 0) {
        const midEvent = step.cleared[Math.floor(step.cleared.length / 2)];
        const pos = cellCenterPx(midEvent.row, midEvent.col);
        spawnPopup(pos.x, pos.y, `+${Math.round(step.pointsEarned)}`, '#FEF08A', 1.05);

        if (currentCombo >= 2 || step.isHeavyImpact) {
          const callout =
            COMBO_CALLOUTS[Math.min(currentCombo - 1, COMBO_CALLOUTS.length - 1)];
          spawnPopup(
            layout.boardX + layout.boardSize * 0.5,
            layout.boardY + layout.boardSize * 0.42,
            callout,
            '#F43F5E',
            1.35
          );
        }
      }

      const nextScore = bridgeRef.current.score + step.pointsEarned;
      const nextObjectives = updateObjectivesWithStep(
        bridgeRef.current.objectives,
        step,
        nextScore
      );

      bridgeRef.current.score = nextScore;
      bridgeRef.current.objectives = nextObjectives;
      bridgeRef.current.onSyncHud({
        movesLeft: bridgeRef.current.movesLeft,
        score: nextScore,
        comboCount: currentCombo,
        objectives: nextObjectives,
        chocolateWarning: hasChocolateOnBoard(board) && !clearedChocolateThisTurn,
      });

      return true;
    };

    const tryAttemptSwap = (
      a: { row: number; col: number },
      b: { row: number; col: number }
    ) => {
      if (phase !== 'IDLE') return;
      const board = boardRef.current;
      if (!canSwapCells(board, a, b)) return;

      const isFreeSwitch = bridgeRef.current.activeBooster === 'free-switch';
      const validMatch = isFreeSwitch || isValidMatchSwap(board, a, b);

      selectedCell = null;
      hintPair = null;
      idleHintTimer = 0;

      // Swap logical references immediately and animate renderRow/renderCol
      const temp = board[a.row][a.col].candy;
      board[a.row][a.col].candy = board[b.row][b.col].candy;
      board[b.row][b.col].candy = temp;

      if (board[a.row][a.col].candy) {
        board[a.row][a.col].candy!.scaleX = 1.18;
        board[a.row][a.col].candy!.scaleY = 0.85;
      }
      if (board[b.row][b.col].candy) {
        board[b.row][b.col].candy!.scaleX = 1.18;
        board[b.row][b.col].candy!.scaleY = 0.85;
      }

      activeSwap = { a, b, isFreeSwitch };
      soundEngine.playSwap(validMatch);

      if (validMatch) {
        phase = 'SWAPPING';
        phaseTimer = 0.15;
      } else {
        phase = 'REVERTING';
        phaseTimer = 0.22;
      }
    };

    const handleCellInteraction = (cell: { row: number; col: number }) => {
      if (bridgeRef.current.shellState !== 'playing' || phase !== 'IDLE') return;
      cursorCell = { ...cell };
      const booster = bridgeRef.current.activeBooster;
      const board = boardRef.current;

      // Single-click board boosters: Lollipop Hammer or Sugar Bomb
      if (booster === 'hammer' || booster === 'sugar-bomb') {
        const step = executeBoardBooster(board, booster, cell);
        if (step.cleared.length > 0) {
          selectedCell = null;
          hintPair = null;
          idleHintTimer = 0;
          bridgeRef.current.onConsumeBooster(booster);
          currentCombo = 1;
          if (step.chocolateClearedCount > 0) clearedChocolateThisTurn = true;
          soundEngine.playMatchPop(2, true);
          hitstopTimer = 0.055;
          shakeTrauma = Math.min(1, shakeTrauma + 0.6);

          for (const item of step.cleared) {
            const cPos = cellCenterPx(item.row, item.col);
            const hex = CANDY_METADATA[item.color]?.primaryHex ?? '#FACC15';
            spawnCellFlash(item.row, item.col, hex);
            spawnParticles(cPos.x, cPos.y, hex, 16, 1.35, 'spark');
          }

          const center = cellCenterPx(cell.row, cell.col);
          spawnPopup(
            center.x,
            center.y,
            booster === 'hammer' ? 'SMASH!' : 'SUGAR BLAST!',
            '#FACC15',
            1.25
          );

          const nextScore = bridgeRef.current.score + step.pointsEarned;
          const nextObj = updateObjectivesWithStep(
            bridgeRef.current.objectives,
            step,
            nextScore
          );
          bridgeRef.current.score = nextScore;
          bridgeRef.current.objectives = nextObj;
          bridgeRef.current.onSyncHud({
            movesLeft: bridgeRef.current.movesLeft,
            score: nextScore,
            comboCount: 1,
            objectives: nextObj,
            chocolateWarning: hasChocolateOnBoard(board) && !clearedChocolateThisTurn,
          });

          applyGravityAndRefill(board, bridgeRef.current.stage.colorsCount, rng);
          phase = 'FALLING';
          phaseTimer = 0.22;
        }
        return;
      }

      if (!selectedCell) {
        if (board[cell.row][cell.col].candy && !board[cell.row][cell.col].frosting) {
          selectedCell = { ...cell };
          soundEngine.playSelect();
          const piece = board[cell.row][cell.col].candy!;
          piece.scaleX = 1.2;
          piece.scaleY = 0.84;
        }
      } else if (selectedCell.row === cell.row && selectedCell.col === cell.col) {
        selectedCell = null;
      } else if (areCellsAdjacent(selectedCell, cell)) {
        tryAttemptSwap(selectedCell, cell);
      } else {
        if (board[cell.row][cell.col].candy && !board[cell.row][cell.col].frosting) {
          selectedCell = { ...cell };
          soundEngine.playSelect();
          const piece = board[cell.row][cell.col].candy!;
          piece.scaleX = 1.2;
          piece.scaleY = 0.84;
        } else {
          selectedCell = null;
        }
      }
    };

    // Pointer Events on Canvas
    const onPointerDown = (e: PointerEvent) => {
      layout.pointerClientX = e.clientX;
      layout.pointerClientY = e.clientY;
      if (bridgeRef.current.shellState !== 'playing' || phase !== 'IDLE') return;
      const cell = screenToBoard(e.clientX, e.clientY);
      if (!cell) {
        selectedCell = null;
        return;
      }
      pointerDown = true;
      dragStartCell = cell;
      dragStartClient = { x: e.clientX, y: e.clientY };
      handleCellInteraction(cell);
    };

    const onPointerMove = (e: PointerEvent) => {
      layout.pointerClientX = e.clientX;
      layout.pointerClientY = e.clientY;
      if (!pointerDown || !dragStartCell || phase !== 'IDLE') return;
      const dx = e.clientX - dragStartClient.x;
      const dy = e.clientY - dragStartClient.y;
      const dist = Math.hypot(dx, dy);
      if (dist >= layout.cellSize * 0.34) {
        let targetRow = dragStartCell.row;
        let targetCol = dragStartCell.col;
        if (Math.abs(dx) > Math.abs(dy)) {
          targetCol += dx > 0 ? 1 : -1;
        } else {
          targetRow += dy > 0 ? 1 : -1;
        }
        pointerDown = false;
        if (
          targetRow >= 0 &&
          targetRow < GRID_SIZE &&
          targetCol >= 0 &&
          targetCol < GRID_SIZE
        ) {
          tryAttemptSwap(dragStartCell, { row: targetRow, col: targetCol });
        }
        dragStartCell = null;
      }
    };

    const onPointerUp = () => {
      pointerDown = false;
      dragStartCell = null;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (bridgeRef.current.shellState !== 'playing') return;
      if (!keysHeld.has(e.code)) {
        keysJustPressed.add(e.code);
      }
      keysHeld.add(e.code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysHeld.delete(e.code);
    };

    const onVisibilityChange = () => {
      if (document.hidden) clearInputState();
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearInputState);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Sculpted Candy Drawing Helper
    const drawSculptedCandy = (
      c: CanvasRenderingContext2D,
      color: CandyColor,
      special: string,
      cx: number,
      cy: number,
      radius: number,
      scaleX: number,
      scaleY: number,
      alpha: number,
      timeSec: number
    ) => {
      c.save();
      c.translate(cx, cy);
      c.scale(scaleX, scaleY);
      c.globalAlpha = alpha;

      // Special Wrapped translucent pillow aura
      if (special === 'wrapped') {
        const pulse = 1 + Math.sin(timeSec * 8) * 0.05;
        c.fillStyle = 'rgba(254, 240, 138, 0.32)';
        c.strokeStyle = '#FEF08A';
        c.lineWidth = 2;
        c.beginPath();
        c.roundRect(-radius * 1.12 * pulse, -radius * 1.12 * pulse, radius * 2.24 * pulse, radius * 2.24 * pulse, 9);
        c.fill();
        c.stroke();
      }

      if (special === 'color-bomb') {
        // Dark Chocolate Truffle Bomb studded with glowing rainbow sprinkles
        const grad = c.createRadialGradient(-radius * 0.25, -radius * 0.25, radius * 0.1, 0, 0, radius);
        grad.addColorStop(0, '#78350F');
        grad.addColorStop(0.6, '#3B0764');
        grad.addColorStop(1, '#1E052A');
        c.fillStyle = grad;
        c.strokeStyle = '#FACC15';
        c.lineWidth = 2.5;
        c.beginPath();
        c.arc(0, 0, radius * 0.95, 0, Math.PI * 2);
        c.fill();
        c.stroke();

        const sprinkleColors = ['#F43F5E', '#38BDF8', '#4ADE80', '#FACC15', '#FB923C', '#C084FC'];
        for (let i = 0; i < 6; i++) {
          const ang = timeSec * 1.5 + (i * Math.PI) / 3;
          const sx = Math.cos(ang) * radius * 0.52;
          const sy = Math.sin(ang) * radius * 0.52;
          c.fillStyle = sprinkleColors[i];
          c.beginPath();
          c.arc(sx, sy, radius * 0.17, 0, Math.PI * 2);
          c.fill();
        }
        c.fillStyle = '#FEF9C3';
        c.beginPath();
        c.arc(0, 0, radius * 0.22, 0, Math.PI * 2);
        c.fill();
        c.restore();
        return;
      }

      const meta = CANDY_METADATA[color];
      const grad = c.createRadialGradient(-radius * 0.3, -radius * 0.35, radius * 0.12, 0, 0, radius * 1.05);
      grad.addColorStop(0, meta.highlightHex);
      grad.addColorStop(0.45, meta.primaryHex);
      grad.addColorStop(1, meta.shadowHex);

      c.fillStyle = grad;
      c.strokeStyle = '#1E0826';
      c.lineWidth = 2.2;

      // Distinct silhouette per candy color
      c.beginPath();
      if (color === 'red') {
        // Ruby Rounded Bean / Heart-Drop
        c.roundRect(-radius * 0.88, -radius * 0.78, radius * 1.76, radius * 1.56, radius * 0.72);
      } else if (color === 'orange') {
        // Amber Faceted Diamond Lozenge
        c.moveTo(0, -radius * 0.98);
        c.lineTo(radius * 0.92, 0);
        c.lineTo(0, radius * 0.98);
        c.lineTo(-radius * 0.92, 0);
        c.closePath();
      } else if (color === 'yellow') {
        // Lemon Butter Cushion Square
        c.roundRect(-radius * 0.84, -radius * 0.84, radius * 1.68, radius * 1.68, radius * 0.32);
      } else if (color === 'green') {
        // Emerald Hexagon Crown Gumdrop
        for (let i = 0; i < 6; i++) {
          const ang = (Math.PI / 3) * i - Math.PI / 2;
          const px = Math.cos(ang) * radius * 0.94;
          const py = Math.sin(ang) * radius * 0.94;
          if (i === 0) c.moveTo(px, py);
          else c.lineTo(px, py);
        }
        c.closePath();
      } else if (color === 'blue') {
        // Sapphire Berry Sphere
        c.arc(0, 0, radius * 0.9, 0, Math.PI * 2);
      } else {
        // Amethyst 6-Point Star Cluster
        const spikes = 6;
        for (let i = 0; i < spikes * 2; i++) {
          const r = i % 2 === 0 ? radius * 0.96 : radius * 0.58;
          const ang = (i * Math.PI) / spikes - Math.PI / 2;
          const px = Math.cos(ang) * r;
          const py = Math.sin(ang) * r;
          if (i === 0) c.moveTo(px, py);
          else c.lineTo(px, py);
        }
        c.closePath();
      }
      c.fill();
      c.stroke();

      // Striped Candy Cream Bands
      if (special === 'striped-h' || special === 'striped-v') {
        c.save();
        c.clip();
        c.strokeStyle = 'rgba(255, 251, 235, 0.92)';
        c.lineWidth = radius * 0.26;
        for (const offset of [-radius * 0.48, 0, radius * 0.48]) {
          c.beginPath();
          if (special === 'striped-h') {
            c.moveTo(-radius, offset);
            c.lineTo(radius, offset);
          } else {
            c.moveTo(offset, -radius);
            c.lineTo(offset, radius);
          }
          c.stroke();
        }
        c.restore();
      }

      // Top Specular Sugar Glaze Highlight
      c.fillStyle = 'rgba(255, 255, 255, 0.55)';
      c.beginPath();
      c.ellipse(-radius * 0.26, -radius * 0.32, radius * 0.34, radius * 0.18, -0.45, 0, Math.PI * 2);
      c.fill();

      c.restore();
    };

    let rafId = 0;
    let lastTime = performance.now();

    const frameLoop = (now: number) => {
      rafId = requestAnimationFrame(frameLoop);
      const rawDt = Math.max(0.001, (now - lastTime) / 1000);
      lastTime = now;
      // Clamp frame delta time to <= 0.05s
      const dt = Math.min(rawDt, 0.05);
      const timeSec = now * 0.001;

      const currentShell = bridgeRef.current.shellState;

      // Reset phase when stage seed changes
      if (bridgeRef.current.stage.seed !== lastStageSeed) {
        lastStageSeed = bridgeRef.current.stage.seed;
        rng = createSeededRng(lastStageSeed + 99);
        phase = 'IDLE';
        selectedCell = null;
        hintPair = null;
        idleHintTimer = 0;
        currentCombo = 0;
        maxCascadeCombo = 1;
        clearedChocolateThisTurn = false;
        pendingOutcome = null;
      }

      // Trigger manual hint if requested via HUD button
      if (requestHintRef.current && currentShell === 'playing') {
        requestHintRef.current = false;
        hintPair = findBestValidSwap(boardRef.current);
        soundEngine.playSelect();
      }

      // Process edge-triggered keyboard inputs when playing
      if (currentShell === 'playing' && keysJustPressed.size > 0) {
        const moveCursorOrSwap = (dr: number, dc: number) => {
          const nextR = Math.max(0, Math.min(GRID_SIZE - 1, cursorCell.row + dr));
          const nextC = Math.max(0, Math.min(GRID_SIZE - 1, cursorCell.col + dc));
          if (selectedCell) {
            tryAttemptSwap(selectedCell, { row: nextR, col: nextC });
            cursorCell = { row: nextR, col: nextC };
          } else {
            cursorCell = { row: nextR, col: nextC };
            soundEngine.playSelect();
          }
        };

        if (keysJustPressed.has('ArrowUp') || keysJustPressed.has('KeyW')) {
          moveCursorOrSwap(-1, 0);
        } else if (keysJustPressed.has('ArrowDown') || keysJustPressed.has('KeyS')) {
          moveCursorOrSwap(1, 0);
        } else if (keysJustPressed.has('ArrowLeft') || keysJustPressed.has('KeyA')) {
          moveCursorOrSwap(0, -1);
        } else if (keysJustPressed.has('ArrowRight') || keysJustPressed.has('KeyD')) {
          moveCursorOrSwap(0, 1);
        } else if (keysJustPressed.has('Space') || keysJustPressed.has('Enter')) {
          handleCellInteraction(cursorCell);
        } else if (keysJustPressed.has('KeyH')) {
          hintPair = findBestValidSwap(boardRef.current);
          soundEngine.playSelect();
        }
        keysJustPressed.clear();
      }

      // Hitstop timer ticks in real dt while simulation pauses
      if (hitstopTimer > 0) {
        hitstopTimer = Math.max(0, hitstopTimer - dt);
      }
      const simDt = currentShell === 'playing' && hitstopTimer <= 0 ? dt : 0;

      // Decay camera shake trauma in real dt
      if (shakeTrauma > 0) {
        shakeTrauma = Math.max(0, shakeTrauma - dt * 1.85);
      }

      // Advance active gameplay state machine in simDt
      const board = boardRef.current;
      if (simDt > 0) {
        if (phase === 'IDLE') {
          idleHintTimer += simDt;
          if (idleHintTimer >= 4.0 && !hintPair) {
            hintPair = findBestValidSwap(board);
          }
        } else if (phase === 'SWAPPING') {
          phaseTimer -= simDt;
          if (phaseTimer <= 0 && activeSwap) {
            const swapUsed = activeSwap;
            activeSwap = null;
            currentCombo = 0;
            clearedChocolateThisTurn = false;

            if (swapUsed.isFreeSwitch) {
              bridgeRef.current.onConsumeBooster('free-switch');
            } else {
              bridgeRef.current.movesLeft = Math.max(0, bridgeRef.current.movesLeft - 1);
            }

            const matched = executeResolutionPass({ a: swapUsed.a, b: swapUsed.b });
            if (matched) {
              applyGravityAndRefill(board, bridgeRef.current.stage.colorsCount, rng);
              phase = 'FALLING';
              phaseTimer = 0.24;
            } else {
              // Free-switch with no immediate match still updates HUD moves/turn
              bridgeRef.current.onSyncHud({
                movesLeft: bridgeRef.current.movesLeft,
                score: bridgeRef.current.score,
                comboCount: 0,
                objectives: bridgeRef.current.objectives,
                chocolateWarning: hasChocolateOnBoard(board),
              });
              phase = 'IDLE';
            }
          }
        } else if (phase === 'REVERTING') {
          phaseTimer -= simDt;
          if (phaseTimer <= 0 && activeSwap) {
            // Swap back when invalid
            const { a, b } = activeSwap;
            const temp = board[a.row][a.col].candy;
            board[a.row][a.col].candy = board[b.row][b.col].candy;
            board[b.row][b.col].candy = temp;
            activeSwap = null;
            phase = 'IDLE';
          }
        } else if (phase === 'FALLING') {
          phaseTimer -= simDt;
          if (phaseTimer <= 0) {
            phase = 'RESOLVING';
            phaseTimer = 0.08;
          }
        } else if (phase === 'RESOLVING') {
          phaseTimer -= simDt;
          if (phaseTimer <= 0) {
            const cascaded = executeResolutionPass();
            if (cascaded) {
              applyGravityAndRefill(board, bridgeRef.current.stage.colorsCount, rng);
              phase = 'FALLING';
              phaseTimer = 0.24;
            } else {
              // End of cascade turn: check Dark Chocolate spread hazard
              if (hasChocolateOnBoard(board) && !clearedChocolateThisTurn) {
                soundEngine.playHazardTelegraph();
                const spreadTarget = spreadChocolateHazard(board, rng);
                if (spreadTarget) {
                  const pos = cellCenterPx(spreadTarget.row, spreadTarget.col);
                  spawnParticles(pos.x, pos.y, '#451A03', 10, 0.9, 'diamond');
                  spawnPopup(pos.x, pos.y, 'CHOCOLATE SPREAD!', '#FDA4AF', 0.95);
                }
              }

              // Guarantee board has at least one valid move; shuffle candies if deadlocked
              if (!findBestValidSwap(board)) {
                const flatCandies = [];
                for (let r = 0; r < GRID_SIZE; r++) {
                  for (let c = 0; c < GRID_SIZE; c++) {
                    if (board[r][c].candy) flatCandies.push(board[r][c].candy!);
                  }
                }
                for (let i = flatCandies.length - 1; i > 0; i--) {
                  const j = Math.floor(rng() * (i + 1));
                  const tmpColor = flatCandies[i].color;
                  flatCandies[i].color = flatCandies[j].color;
                  flatCandies[j].color = tmpColor;
                }
              }

              // Check Stage Victory or Out-of-Moves Defeat
              if (areAllObjectivesMet(bridgeRef.current.objectives)) {
                pendingOutcome = 'victory';
                phase = 'OUTCOME_BEAT';
                phaseTimer = 0.5;
                soundEngine.playVictory();
              } else if (bridgeRef.current.movesLeft <= 0) {
                pendingOutcome = 'defeat';
                phase = 'OUTCOME_BEAT';
                phaseTimer = 0.55;
                soundEngine.playDefeat();
              } else {
                phase = 'IDLE';
                currentCombo = 0;
                bridgeRef.current.onSyncHud({
                  movesLeft: bridgeRef.current.movesLeft,
                  score: bridgeRef.current.score,
                  comboCount: 0,
                  objectives: bridgeRef.current.objectives,
                  chocolateWarning: hasChocolateOnBoard(board),
                });
              }
            }
          }
        } else if (phase === 'OUTCOME_BEAT') {
          phaseTimer -= simDt;
          if (phaseTimer <= 0 && pendingOutcome) {
            const finalOut = pendingOutcome;
            pendingOutcome = null;
            phase = 'IDLE';
            bridgeRef.current.onStageOutcome(
              finalOut,
              bridgeRef.current.score,
              bridgeRef.current.movesLeft,
              maxCascadeCombo,
              bridgeRef.current.objectives
            );
          }
        }

        // Smoothly interpolate candy visual positions and squash-and-stretch
        const interpRate = Math.min(1, simDt * 15);
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            const piece = board[r][c].candy;
            if (!piece) continue;
            const prevRow = piece.renderRow;
            piece.renderRow += (r - piece.renderRow) * interpRate;
            piece.renderCol += (c - piece.renderCol) * interpRate;
            // Landing squash when piece settles onto target row
            if (Math.abs(prevRow - r) > 0.08 && Math.abs(piece.renderRow - r) <= 0.08) {
              piece.scaleX = 1.2;
              piece.scaleY = 0.82;
            }
            piece.scaleX += (1 - piece.scaleX) * Math.min(1, simDt * 12);
            piece.scaleY += (1 - piece.scaleY) * Math.min(1, simDt * 12);
          }
        }
      }

      // Update pooled particles and popups in real dt
      for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
        const p = particlePool[i];
        if (!p.active) continue;
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          continue;
        }
        p.vy += 320 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha = 1 - p.life / p.maxLife;
      }

      for (let i = 0; i < POPUP_POOL_SIZE; i++) {
        const pop = popupPool[i];
        if (!pop.active) continue;
        pop.life += dt;
        if (pop.life >= pop.maxLife) {
          pop.active = false;
          continue;
        }
        pop.y += pop.vy * dt;
      }

      for (let i = 0; i < FLASH_POOL_SIZE; i++) {
        const fl = flashPool[i];
        if (!fl.active) continue;
        fl.timer += dt;
        if (fl.timer >= fl.maxTimer) {
          fl.active = false;
        }
      }

      // ==================== RENDERING ====================
      ctx.save();
      ctx.scale(layout.dpr, layout.dpr);

      // 1. Royal Confectionery Deep Velvet Plum Backdrop
      const bgGrad = ctx.createRadialGradient(
        layout.width * 0.55,
        layout.height * 0.45,
        40,
        layout.width * 0.5,
        layout.height * 0.5,
        Math.max(layout.width, layout.height) * 0.85
      );
      bgGrad.addColorStop(0, '#3B0F54');
      bgGrad.addColorStop(0.55, '#220833');
      bgGrad.addColorStop(1, '#11031C');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, layout.width, layout.height);

      // Ambient drifting gold confection sparkles
      for (let i = 0; i < 24; i++) {
        const sx = ((i * 197 + Math.sin(timeSec * 0.4 + i) * 45) % layout.width + layout.width) % layout.width;
        const sy = ((i * 131 + timeSec * (12 + (i % 5) * 3)) % layout.height + layout.height) % layout.height;
        const sAlpha = 0.15 + 0.15 * Math.sin(timeSec * 2 + i);
        ctx.fillStyle = `rgba(253, 230, 138, ${sAlpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 2 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. If in 'title' state, stage the Interactive Confectionery Hero Centerpiece in the right 55% of the viewport
      if (currentShell === 'title') {
        const centerX = layout.width >= 900 ? layout.width * 0.7 : layout.width * 0.5;
        const centerY = layout.height * 0.5;
        const tiltX = ((layout.pointerClientX - centerX) / layout.width) * 28;
        const tiltY = ((layout.pointerClientY - centerY) / layout.height) * 28;
        const showcaseRadius = Math.min(layout.width, layout.height) * 0.28;

        // Ornate Golden Patisserie Turntable Platter
        ctx.save();
        ctx.translate(centerX + tiltX, centerY + tiltY);

        const platterGrad = ctx.createRadialGradient(0, 0, showcaseRadius * 0.1, 0, 0, showcaseRadius * 1.15);
        platterGrad.addColorStop(0, 'rgba(88, 28, 135, 0.85)');
        platterGrad.addColorStop(0.75, 'rgba(30, 7, 46, 0.92)');
        platterGrad.addColorStop(1, 'rgba(15, 3, 24, 0)');
        ctx.fillStyle = platterGrad;
        ctx.beginPath();
        ctx.arc(0, 0, showcaseRadius * 1.15, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, showcaseRadius * 0.86, 0, Math.PI * 2);
        ctx.stroke();

        // Central Giant Color Bomb Crown Jewel
        drawSculptedCandy(
          ctx,
          'red',
          'color-bomb',
          0,
          Math.sin(timeSec * 2.2) * 8,
          showcaseRadius * 0.32,
          1 + Math.sin(timeSec * 3) * 0.04,
          1 - Math.sin(timeSec * 3) * 0.04,
          1,
          timeSec
        );

        // 6 Orbiting Sculpted Candies with Special Overlays
        ALL_CANDY_COLORS.forEach((col, idx) => {
          const orbitAng = timeSec * 0.55 + (idx * Math.PI * 2) / ALL_CANDY_COLORS.length;
          const ox = Math.cos(orbitAng) * showcaseRadius * 0.68;
          const oy = Math.sin(orbitAng) * showcaseRadius * 0.68;
          const spec =
            idx === 0 ? 'striped-h' : idx === 2 ? 'wrapped' : idx === 4 ? 'striped-v' : 'none';
          drawSculptedCandy(
            ctx,
            col,
            spec,
            ox,
            oy,
            showcaseRadius * 0.21,
            1 + Math.sin(timeSec * 4 + idx) * 0.05,
            1 - Math.sin(timeSec * 4 + idx) * 0.05,
            1,
            timeSec
          );
        });

        ctx.restore();
        ctx.restore();
        return;
      }

      // 3. Active Gameplay Board Rendering (with decaying trauma*trauma camera shake)
      const shakeMag = shakeTrauma * shakeTrauma * 14;
      const shakeX = (Math.random() * 2 - 1) * shakeMag;
      const shakeY = (Math.random() * 2 - 1) * shakeMag;
      ctx.translate(shakeX, shakeY);

      // Ornate Gilded Confectionery Board Frame
      const pad = 12;
      ctx.fillStyle = '#1E072C';
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(
        layout.boardX - pad,
        layout.boardY - pad,
        layout.boardSize + pad * 2,
        layout.boardSize + pad * 2,
        22
      );
      ctx.fill();
      ctx.stroke();

      // Inner checkerboard & tile glazes
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const cell = board[r][c];
          const x = layout.boardX + c * layout.cellSize;
          const y = layout.boardY + r * layout.cellSize;
          const isEven = (r + c) % 2 === 0;

          ctx.fillStyle = isEven ? '#2E0F42' : '#260B37';
          ctx.fillRect(x, y, layout.cellSize, layout.cellSize);

          ctx.strokeStyle = 'rgba(253, 230, 138, 0.08)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, layout.cellSize - 1, layout.cellSize - 1);

          // Crystal Jelly Underlay (1 = single sky glaze, 2 = thick royal double glaze)
          if (cell.jelly > 0) {
            ctx.fillStyle =
              cell.jelly === 2 ? 'rgba(56, 189, 248, 0.42)' : 'rgba(56, 189, 248, 0.24)';
            ctx.strokeStyle = cell.jelly === 2 ? '#7DD3FC' : 'rgba(125, 211, 252, 0.65)';
            ctx.lineWidth = cell.jelly === 2 ? 3 : 1.5;
            ctx.beginPath();
            ctx.roundRect(x + 4, y + 4, layout.cellSize - 8, layout.cellSize - 8, 8);
            ctx.fill();
            ctx.stroke();
          }

          // Multi-layer Sugar Frosting Blocker
          if (cell.frosting > 0) {
            const inset = 5;
            ctx.fillStyle = cell.frosting >= 3 ? '#F8FAFC' : cell.frosting === 2 ? '#E2E8F0' : '#CBD5E1';
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.roundRect(
              x + inset,
              y + inset,
              layout.cellSize - inset * 2,
              layout.cellSize - inset * 2,
              10
            );
            ctx.fill();
            ctx.stroke();

            // Piped berry icing swirl & layer pips
            ctx.strokeStyle = '#E11D48';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(
              x + layout.cellSize * 0.5,
              y + layout.cellSize * 0.5,
              layout.cellSize * 0.22,
              0,
              Math.PI * 1.65
            );
            ctx.stroke();

            ctx.fillStyle = '#0F172A';
            ctx.font = '800 11px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
              `${cell.frosting}`,
              x + layout.cellSize * 0.5,
              y + layout.cellSize * 0.5
            );
          }

          // Spreading Dark Chocolate Hazard Blocker (with visible pulsing windup telegraph ring)
          if (cell.chocolate) {
            const inset = 5;
            ctx.fillStyle = '#3E1F0D';
            ctx.strokeStyle = '#78350F';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.roundRect(
              x + inset,
              y + inset,
              layout.cellSize - inset * 2,
              layout.cellSize - inset * 2,
              8
            );
            ctx.fill();
            ctx.stroke();

            ctx.strokeStyle = '#A16207';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(
              x + inset + 5,
              y + inset + 5,
              layout.cellSize - (inset + 5) * 2,
              layout.cellSize - (inset + 5) * 2
            );

            // Visible Hazard Telegraph if no chocolate cleared yet this turn
            if (!clearedChocolateThisTurn) {
              const pulseAlpha = 0.45 + 0.45 * Math.sin(timeSec * 7);
              ctx.strokeStyle = `rgba(251, 113, 133, ${pulseAlpha.toFixed(2)})`;
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.roundRect(x + 2, y + 2, layout.cellSize - 4, layout.cellSize - 4, 10);
              ctx.stroke();
            }
          }
        }
      }

      // Highlight Selected Cell, Keyboard Cursor, and Hint Pair
      if (cursorCell && !selectedCell && phase === 'IDLE') {
        const kx = layout.boardX + cursorCell.col * layout.cellSize;
        const ky = layout.boardY + cursorCell.row * layout.cellSize;
        ctx.save();
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.55)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.roundRect(kx + 4, ky + 4, layout.cellSize - 8, layout.cellSize - 8, 10);
        ctx.stroke();
        ctx.restore();
      }

      if (selectedCell) {
        const sx = layout.boardX + selectedCell.col * layout.cellSize;
        const sy = layout.boardY + selectedCell.row * layout.cellSize;
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.roundRect(sx + 3, sy + 3, layout.cellSize - 6, layout.cellSize - 6, 10);
        ctx.stroke();
      }

      if (hintPair && phase === 'IDLE') {
        const hAlpha = 0.55 + 0.45 * Math.sin(timeSec * 6);
        ctx.strokeStyle = `rgba(110, 231, 183, ${hAlpha.toFixed(2)})`;
        ctx.lineWidth = 3.5;
        for (const hc of [hintPair.a, hintPair.b]) {
          const hx = layout.boardX + hc.col * layout.cellSize;
          const hy = layout.boardY + hc.row * layout.cellSize;
          ctx.beginPath();
          ctx.roundRect(hx + 4, hy + 4, layout.cellSize - 8, layout.cellSize - 8, 12);
          ctx.stroke();
        }
      }

      // Draw Candies clipped inside the board frame
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(layout.boardX, layout.boardY, layout.boardSize, layout.boardSize, 14);
      ctx.clip();

      const candyRadius = layout.cellSize * 0.4;
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const piece = board[r][c].candy;
          if (!piece) continue;
          const cx = layout.boardX + (piece.renderCol + 0.5) * layout.cellSize;
          const cy = layout.boardY + (piece.renderRow + 0.5) * layout.cellSize;
          const isSelected =
            selectedCell && selectedCell.row === r && selectedCell.col === c;
          const pulseScale = isSelected ? 1 + Math.sin(timeSec * 8) * 0.07 : 1;

          drawSculptedCandy(
            ctx,
            piece.color,
            piece.special,
            cx,
            cy,
            candyRadius,
            piece.scaleX * pulseScale,
            piece.scaleY * pulseScale,
            piece.alpha,
            timeSec
          );
        }
      }

      // Draw Hit Flashes & Striped Candy Laser Beams
      for (let i = 0; i < FLASH_POOL_SIZE; i++) {
        const fl = flashPool[i];
        if (!fl.active) continue;
        const progress = fl.timer / fl.maxTimer;
        const alpha = 1 - progress;
        const fx = layout.boardX + fl.col * layout.cellSize;
        const fy = layout.boardY + fl.row * layout.cellSize;

        ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.85).toFixed(2)})`;
        ctx.beginPath();
        ctx.roundRect(fx + 2, fy + 2, layout.cellSize - 4, layout.cellSize - 4, 10);
        ctx.fill();

        if (fl.isBeamH) {
          ctx.fillStyle = `rgba(254, 240, 138, ${(alpha * 0.75).toFixed(2)})`;
          ctx.fillRect(
            layout.boardX,
            fy + layout.cellSize * 0.25,
            layout.boardSize,
            layout.cellSize * 0.5
          );
        }
        if (fl.isBeamV) {
          ctx.fillStyle = `rgba(254, 240, 138, ${(alpha * 0.75).toFixed(2)})`;
          ctx.fillRect(
            fx + layout.cellSize * 0.25,
            layout.boardY,
            layout.cellSize * 0.5,
            layout.boardSize
          );
        }
      }

      ctx.restore();

      // Render Pooled Particle Bursts
      for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
        const p = particlePool[i];
        if (!p.active) continue;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        if (p.shape === 'spark') {
          ctx.rotate(p.life * 8);
          ctx.fillRect(-p.size, -p.size * 0.35, p.size * 2, p.size * 0.7);
          ctx.fillRect(-p.size * 0.35, -p.size, p.size * 0.7, p.size * 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Render Floating Score Popups & Cascade Callouts
      for (let i = 0; i < POPUP_POOL_SIZE; i++) {
        const pop = popupPool[i];
        if (!pop.active) continue;
        const alpha = Math.max(0, 1 - pop.life / pop.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `900 ${Math.round(18 * pop.scale)}px "Fraunces", Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#2E0718';
        ctx.lineWidth = 4;
        ctx.strokeText(pop.text, pop.x, pop.y);
        ctx.fillStyle = pop.color;
        ctx.fillText(pop.text, pop.x, pop.y);
        ctx.restore();
      }

      ctx.restore();
    };

    rafId = requestAnimationFrame(frameLoop);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearInputState);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [boardRef]);

  return <div ref={mountRef} className="fixed inset-0 z-0 overflow-hidden" />;
};
