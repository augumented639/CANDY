import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STAGES,
  createInitialBoard,
  findMatchGroups,
  isValidMatchSwap,
  resolveMatchesOnBoard,
  applyGravityAndRefill,
  spreadChocolateHazard,
  executeBoardBooster,
  buildInitialObjectives,
  updateObjectivesWithStep,
  areAllObjectivesMet,
  calculateStarRating,
  createCandyPiece,
  findBestValidSwap,
  GRID_SIZE,
} from './rules';

test('createInitialBoard generates an 8x8 board with zero immediate matches and at least one valid swap', () => {
  for (const stage of STAGES) {
    const board = createInitialBoard(stage);
    assert.equal(board.length, GRID_SIZE);
    assert.equal(board[0].length, GRID_SIZE);

    const initialMatches = findMatchGroups(board);
    assert.equal(initialMatches.length, 0, `Stage ${stage.number} should start with 0 matches`);

    const hint = findBestValidSwap(board);
    assert.notEqual(hint, null, `Stage ${stage.number} should have at least one valid move`);
  }
});

test('findMatchGroups detects 3-in-a-row, 4-in-a-row striped, L/T-shape wrapped, and 5-in-a-row color bomb', () => {
  const board = createInitialBoard(STAGES[0]);
  // Clear all candies first
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      board[r][c].frosting = 0;
      board[r][c].chocolate = false;
      board[r][c].candy = createCandyPiece((r + c) % 2 === 0 ? 'blue' : 'green', r, c);
    }
  }

  // 1. Horizontal 4-match on row 0 -> spawns 'striped-v'
  board[0][0].candy = createCandyPiece('red', 0, 0);
  board[0][1].candy = createCandyPiece('red', 0, 1);
  board[0][2].candy = createCandyPiece('red', 0, 2);
  board[0][3].candy = createCandyPiece('red', 0, 3);

  let groups = findMatchGroups(board, { row: 0, col: 2 });
  assert.equal(groups.length, 1);
  assert.equal(groups[0].spawnSpecial, 'striped-v');
  assert.deepEqual(groups[0].spawnAt, { row: 0, col: 2 });

  // 2. 5-in-a-row on row 2 -> spawns 'color-bomb'
  for (let c = 0; c < 5; c++) {
    board[2][c].candy = createCandyPiece('purple', 2, c);
  }
  groups = findMatchGroups(board);
  const purpleGroup = groups.find((g) => g.color === 'purple');
  assert.ok(purpleGroup);
  assert.equal(purpleGroup.spawnSpecial, 'color-bomb');

  // 3. L-shape on rows 4..6, cols 4..6 -> spawns 'wrapped'
  board[4][4].candy = createCandyPiece('orange', 4, 4);
  board[4][5].candy = createCandyPiece('orange', 4, 5);
  board[4][6].candy = createCandyPiece('orange', 4, 6);
  board[5][4].candy = createCandyPiece('orange', 5, 4);
  board[6][4].candy = createCandyPiece('orange', 6, 4);

  groups = findMatchGroups(board);
  const orangeGroup = groups.find((g) => g.color === 'orange');
  assert.ok(orangeGroup);
  assert.equal(orangeGroup.spawnSpecial, 'wrapped');
});

test('resolveMatchesOnBoard clears jelly, damages adjacent frosting, and awards combo points', () => {
  const board = createInitialBoard(STAGES[0]);
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      board[r][c].jelly = 0;
      board[r][c].frosting = 0;
      board[r][c].chocolate = false;
      board[r][c].candy = createCandyPiece((r + c) % 2 === 0 ? 'yellow' : 'green', r, c);
    }
  }

  board[3][2].candy = createCandyPiece('red', 3, 2);
  board[3][3].candy = createCandyPiece('red', 3, 3);
  board[3][4].candy = createCandyPiece('red', 3, 4);
  board[3][2].jelly = 1;
  board[3][3].jelly = 2;
  board[2][3].frosting = 2;
  board[2][3].candy = null;

  const step = resolveMatchesOnBoard(board, 2);
  assert.equal(step.jellyClearedCount, 2);
  assert.equal(board[3][2].jelly, 0);
  assert.equal(board[3][3].jelly, 1);
  assert.equal(step.frostingClearedCount, 1);
  assert.equal(board[2][3].frosting, 1);
  assert.ok(step.pointsEarned > 0);
});

test('applyGravityAndRefill drops candies and fills all non-blocked cells', () => {
  const board = createInitialBoard(STAGES[1]);
  board[0][0].candy = null;
  board[2][0].candy = null;
  applyGravityAndRefill(board, 5);

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c].frosting === 0 && !board[r][c].chocolate) {
        assert.notEqual(board[r][c].candy, null, `Cell (${r},${c}) should be refilled`);
      }
    }
  }
});

test('executeBoardBooster smashes target tile or 3x3 area and updates objectives', () => {
  const stage = STAGES[0];
  const board = createInitialBoard(stage);
  const objectives = buildInitialObjectives(stage, board);

  const step = executeBoardBooster(board, 'sugar-bomb', { row: 3, col: 3 });
  assert.equal(step.cleared.length, 9);
  assert.ok(step.jellyClearedCount > 0);

  const updated = updateObjectivesWithStep(objectives, step, 2500);
  const scoreObj = updated.find((o) => o.type === 'score')!;
  assert.equal(scoreObj.current, 2500);
  assert.equal(calculateStarRating(5000, stage.starThresholds), 3);
  assert.equal(areAllObjectivesMet(updated.map((o) => ({ ...o, current: o.target }))), true);
});

test('spreadChocolateHazard spreads chocolate to one adjacent tile when active', () => {
  const board = createInitialBoard(STAGES[2]);
  let countBefore = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c].chocolate) countBefore++;
    }
  }
  const spreadPos = spreadChocolateHazard(board);
  assert.notEqual(spreadPos, null);
  let countAfter = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c].chocolate) countAfter++;
    }
  }
  assert.equal(countAfter, countBefore + 1);
});

test('isValidMatchSwap validates legal and illegal swaps accurately', () => {
  const board = createInitialBoard(STAGES[0]);
  const hint = findBestValidSwap(board);
  assert.ok(hint);
  assert.equal(isValidMatchSwap(board, hint.a, hint.b), true);
  assert.equal(isValidMatchSwap(board, { row: 0, col: 0 }, { row: 5, col: 5 }), false);
});
