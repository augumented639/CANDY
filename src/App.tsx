/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  STAGES,
  buildInitialObjectives,
  calculateStarRating,
  createInitialBoard,
} from './game/rules';
import { soundEngine } from './game/audio';
import {
  BoosterId,
  BoosterStock,
  GameShellState,
  GridCell,
  RunSnapshot,
  StageObjective,
} from './game/types';
import { GameCanvas } from './components/GameCanvas';
import { TitleScreen } from './components/TitleScreen';
import { GameHud } from './components/GameHud';
import { StatusModal } from './components/StatusModal';

export default function App() {
  const isAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [shellState, setShellState] = useState<GameShellState>(
    isAutostart ? 'playing' : 'title'
  );
  const [selectedStageIndex, setSelectedStageIndex] = useState<number>(0);
  const [highestReachedStage, setHighestReachedStage] = useState<number>(0);
  const [stageBestScores, setStageBestScores] = useState<Record<number, number>>({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  });

  const currentStage = STAGES[selectedStageIndex] ?? STAGES[0];
  const boardRef = useRef<GridCell[][]>(createInitialBoard(currentStage));

  const [movesLeft, setMovesLeft] = useState<number>(currentStage.moves);
  const [score, setScore] = useState<number>(0);
  const [comboCount, setComboCount] = useState<number>(0);
  const [objectives, setObjectives] = useState<StageObjective[]>(() =>
    buildInitialObjectives(currentStage, boardRef.current)
  );
  const [chocolateWarning, setChocolateWarning] = useState<boolean>(
    currentStage.chocolateLayout.length > 0
  );

  const [boosters, setBoosters] = useState<BoosterStock>({
    hammer: 2,
    'free-switch': 2,
    'sugar-bomb': 1,
  });
  const [activeBooster, setActiveBooster] = useState<BoosterId | null>(null);
  const [muted, setMuted] = useState<boolean>(false);
  const [hintTriggerTick, setHintTriggerTick] = useState<number>(0);
  const [runSnapshot, setRunSnapshot] = useState<RunSnapshot | null>(null);

  // Mirror shellState to document.body.dataset.state immediately
  useEffect(() => {
    document.body.dataset.state = shellState;
  }, [shellState]);

  const initStageSession = useCallback((stageIdx: number) => {
    const targetStage = STAGES[stageIdx] ?? STAGES[0];
    // Give each stage run a fresh deterministic board
    const freshConfig = {
      ...targetStage,
      seed: targetStage.seed + Math.floor( performance.now() % 100 ),
    };
    const newBoard = createInitialBoard(freshConfig);
    boardRef.current = newBoard;
    setSelectedStageIndex(stageIdx);
    setMovesLeft(targetStage.moves);
    setScore(0);
    setComboCount(0);
    setObjectives(buildInitialObjectives(targetStage, newBoard));
    setChocolateWarning(targetStage.chocolateLayout.length > 0);
    setActiveBooster(null);
    setRunSnapshot(null);
    setBoosters({
      hammer: 2,
      'free-switch': 2,
      'sugar-bomb': 1,
    });
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    document.body.dataset.state = 'playing';
    setShellState('playing');
  }, []);

  const handleStartFromTitle = useCallback(() => {
    initStageSession(selectedStageIndex);
  }, [initStageSession, selectedStageIndex]);

  const handleSyncHud = useCallback(
    (payload: {
      movesLeft: number;
      score: number;
      comboCount: number;
      objectives: StageObjective[];
      chocolateWarning: boolean;
    }) => {
      setMovesLeft(payload.movesLeft);
      setScore(payload.score);
      setComboCount(payload.comboCount);
      setObjectives(payload.objectives);
      setChocolateWarning(payload.chocolateWarning);
    },
    []
  );

  const handleSelectBooster = useCallback(
    (booster: BoosterId) => {
      if (boosters[booster] <= 0) return;
      soundEngine.playSelect();
      setActiveBooster((prev) => (prev === booster ? null : booster));
    },
    [boosters]
  );

  const handleConsumeBooster = useCallback((booster: BoosterId) => {
    setBoosters((prev) => ({
      ...prev,
      [booster]: Math.max(0, prev[booster] - 1),
    }));
    setActiveBooster(null);
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const handleStageOutcome = useCallback(
    (
      outcome: 'victory' | 'defeat',
      finalScore: number,
      finalMovesLeft: number,
      maxCombo: number,
      finalObjectives: StageObjective[]
    ) => {
      // Bonus score for remaining moves on victory
      const moveBonus = outcome === 'victory' ? finalMovesLeft * 120 : 0;
      const totalScore = finalScore + moveBonus;
      const prevBest = stageBestScores[currentStage.number] ?? 0;
      const newBest = Math.max(prevBest, totalScore);

      setStageBestScores((prev) => ({
        ...prev,
        [currentStage.number]: newBest,
      }));

      if (outcome === 'victory') {
        setHighestReachedStage((prev) =>
          Math.min(STAGES.length - 1, Math.max(prev, selectedStageIndex + 1))
        );
      }

      const stars =
        outcome === 'victory'
          ? Math.max(1, calculateStarRating(totalScore, currentStage.starThresholds))
          : 0;

      const snapshot: RunSnapshot = {
        outcome,
        stageNumber: currentStage.number,
        stageName: currentStage.name,
        score: totalScore,
        bestScore: newBest,
        stars,
        movesLeft: finalMovesLeft,
        movesUsed: currentStage.moves - finalMovesLeft,
        maxCascadeCombo: maxCombo,
        objectives: finalObjectives.map((o) =>
          o.type === 'score' ? { ...o, current: totalScore } : o
        ),
      };

      setScore(totalScore);
      setRunSnapshot(snapshot);
      document.body.dataset.state = 'gameover';
      setShellState('gameover');
    },
    [currentStage, selectedStageIndex, stageBestScores]
  );

  // Global keyboard shortcuts for Title Start (Enter/Space), Pause (P/Escape), Boosters (1-3), Mute (M), Restart (R)
  useEffect(() => {
    const onWindowKeyDown = (e: KeyboardEvent) => {
      if (shellState === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleStartFromTitle();
        }
        return;
      }

      if (shellState === 'playing') {
        if (e.code === 'Escape' || e.code === 'KeyP') {
          e.preventDefault();
          document.body.dataset.state = 'paused';
          setShellState('paused');
        } else if (e.code === 'Digit1') {
          handleSelectBooster('hammer');
        } else if (e.code === 'Digit2') {
          handleSelectBooster('free-switch');
        } else if (e.code === 'Digit3') {
          handleSelectBooster('sugar-bomb');
        } else if (e.code === 'KeyM') {
          handleToggleMute();
        } else if (e.code === 'KeyR') {
          initStageSession(selectedStageIndex);
        }
      } else if (shellState === 'paused') {
        if (e.code === 'Escape' || e.code === 'KeyP') {
          e.preventDefault();
          document.body.dataset.state = 'playing';
          setShellState('playing');
        }
      } else if (shellState === 'gameover') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          if (runSnapshot?.outcome === 'victory' && selectedStageIndex + 1 < STAGES.length) {
            initStageSession(selectedStageIndex + 1);
          } else {
            initStageSession(selectedStageIndex);
          }
        }
      }
    };

    window.addEventListener('keydown', onWindowKeyDown);
    return () => window.removeEventListener('keydown', onWindowKeyDown);
  }, [
    shellState,
    handleStartFromTitle,
    handleSelectBooster,
    handleToggleMute,
    initStageSession,
    selectedStageIndex,
    runSnapshot,
  ]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#160424] text-amber-50 font-sans">
      {/* Persistent 60fps Canvas2D Renderer mounted in isolated sibling div */}
      <GameCanvas
        shellState={shellState}
        stage={currentStage}
        boardRef={boardRef}
        movesLeft={movesLeft}
        score={score}
        objectives={objectives}
        activeBooster={activeBooster}
        hintTriggerTick={hintTriggerTick}
        onSyncHud={handleSyncHud}
        onConsumeBooster={handleConsumeBooster}
        onStageOutcome={handleStageOutcome}
      />

      {/* Title Screen Overlay */}
      {shellState === 'title' && (
        <TitleScreen
          selectedStageIndex={selectedStageIndex}
          highestReachedStage={highestReachedStage}
          stageBestScores={stageBestScores}
          onSelectStage={(idx) => {
            soundEngine.playSelect();
            setSelectedStageIndex(idx);
          }}
          onStartGame={handleStartFromTitle}
        />
      )}

      {/* Active Gameplay Perimeter HUD */}
      {shellState === 'playing' && (
        <GameHud
          stage={currentStage}
          movesLeft={movesLeft}
          score={score}
          comboCount={comboCount}
          objectives={objectives}
          boosters={boosters}
          activeBooster={activeBooster}
          muted={muted}
          chocolateWarning={chocolateWarning}
          onSelectBooster={handleSelectBooster}
          onTriggerHint={() => setHintTriggerTick((t) => t + 1)}
          onToggleMute={handleToggleMute}
          onRestartStage={() => initStageSession(selectedStageIndex)}
          onPauseGame={() => {
            document.body.dataset.state = 'paused';
            setShellState('paused');
          }}
        />
      )}

      {/* Single Focused Status Modal for Pause, Victory, or Game Over */}
      <StatusModal
        shellState={shellState}
        snapshot={runSnapshot}
        stageNumber={currentStage.number}
        stageName={currentStage.name}
        hasNextStage={selectedStageIndex + 1 < STAGES.length}
        onResume={() => {
          document.body.dataset.state = 'playing';
          setShellState('playing');
        }}
        onRestart={() => initStageSession(selectedStageIndex)}
        onNextStage={() => initStageSession(selectedStageIndex + 1)}
        onBackToTitle={() => {
          document.body.dataset.state = 'title';
          setShellState('title');
        }}
      />
    </main>
  );
}
