import React from 'react';
import { GameShellState, RunSnapshot } from '../game/types';

interface StatusModalProps {
  shellState: GameShellState;
  snapshot: RunSnapshot | null;
  stageNumber: number;
  stageName: string;
  hasNextStage: boolean;
  onResume: () => void;
  onRestart: () => void;
  onNextStage: () => void;
  onBackToTitle: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  shellState,
  snapshot,
  stageNumber,
  stageName,
  hasNextStage,
  onResume,
  onRestart,
  onNextStage,
  onBackToTitle,
}) => {
  if (shellState !== 'paused' && shellState !== 'gameover') {
    return null;
  }

  const isPaused = shellState === 'paused';
  const isVictory = snapshot?.outcome === 'victory';

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 select-none"
      style={{ backgroundColor: 'rgba(14, 4, 22, 0.78)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-heading"
    >
      <div
        className="w-full max-w-md rounded-3xl p-6 sm:p-8 border-2 flex flex-col items-center text-center"
        style={{
          backgroundColor: 'rgba(36, 11, 52, 0.98)',
          borderColor: isVictory ? '#FACC15' : 'rgba(251, 191, 36, 0.55)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.85)',
        }}
      >
        {isPaused ? (
          <>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-300/80">
              STAGE {stageNumber} · {stageName}
            </span>
            <h2
              id="modal-heading"
              className="text-3xl font-black text-amber-100 mt-1 mb-6"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Game Paused
            </h2>

            <div className="w-full flex flex-col gap-3">
              <button
                type="button"
                onClick={onResume}
                className="w-full py-3.5 px-6 rounded-2xl font-extrabold text-base text-rose-950 bg-amber-400 hover:bg-amber-300 border-2 border-amber-100 cursor-pointer whitespace-nowrap"
              >
                Resume Stage
              </button>
              <button
                type="button"
                onClick={onRestart}
                className="w-full py-3 px-6 rounded-2xl font-bold text-sm text-amber-100 bg-purple-900 hover:bg-purple-800 border border-amber-300/35 cursor-pointer whitespace-nowrap"
              >
                Restart Stage
              </button>
              <button
                type="button"
                onClick={onBackToTitle}
                className="w-full py-3 px-6 rounded-2xl font-bold text-sm text-amber-200/80 hover:text-amber-100 bg-purple-950/80 border border-purple-700/40 cursor-pointer whitespace-nowrap"
              >
                Back to Title Screen
              </button>
            </div>
          </>
        ) : (
          snapshot && (
            <>
              {/* 3-Star Confectionery Crest on Victory / Defeat */}
              <div className="flex items-center justify-center gap-2 mb-2" aria-label={`${snapshot.stars} of 3 stars`}>
                {[1, 2, 3].map((starIdx) => {
                  const earned = starIdx <= snapshot.stars;
                  return (
                    <svg
                      key={starIdx}
                      viewBox="0 0 24 24"
                      className={`w-9 h-9 ${earned ? 'scale-110' : 'opacity-35'}`}
                      aria-hidden="true"
                    >
                      <polygon
                        points="12,2 15.1,8.4 22,9.3 17,14.2 18.2,21.1 12,17.8 5.8,21.1 7,14.2 2,9.3 8.9,8.4"
                        fill={earned ? '#FACC15' : '#4C1D95'}
                        stroke="#FEF08A"
                        strokeWidth="1.5"
                      />
                    </svg>
                  );
                })}
              </div>

              <span className="text-xs font-bold uppercase tracking-widest text-amber-300/80">
                STAGE {snapshot.stageNumber} · {snapshot.stageName}
              </span>
              <h2
                id="modal-heading"
                className="text-3xl font-black text-amber-100 mt-1 mb-5"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                {isVictory ? 'Sweet Stage Clear!' : 'Out of Moves'}
              </h2>

              {/* 3 Tabular-Nums Stat Tiles */}
              <div className="w-full grid grid-cols-3 gap-2.5 mb-5">
                <div className="p-3 rounded-2xl bg-purple-950/90 border border-amber-300/25">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-200/70">
                    SCORE / BEST
                  </div>
                  <div className="font-mono tabular-nums text-base font-extrabold text-amber-300 mt-1">
                    {Math.round(snapshot.score)}
                  </div>
                  <div className="font-mono tabular-nums text-[11px] text-amber-100/65">
                    Best {Math.round(snapshot.bestScore)}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-purple-950/90 border border-amber-300/25">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-200/70">
                    {isVictory ? 'MOVES LEFT' : 'MOVES USED'}
                  </div>
                  <div className="font-mono tabular-nums text-lg font-extrabold text-amber-100 mt-1">
                    {isVictory ? Math.round(snapshot.movesLeft) : Math.round(snapshot.movesUsed)}
                  </div>
                  <div className="font-mono tabular-nums text-[11px] text-amber-100/65">
                    Max {snapshot.maxCascadeCombo}x Combo
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-purple-950/90 border border-amber-300/25">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-200/70">
                    OBJECTIVES
                  </div>
                  <div className="font-mono tabular-nums text-lg font-extrabold text-emerald-300 mt-1">
                    {snapshot.objectives.filter((o) => o.current >= o.target).length}/
                    {snapshot.objectives.length}
                  </div>
                  <div className="font-mono tabular-nums text-[11px] text-amber-100/65">
                    {isVictory ? 'Cleared' : 'Progress'}
                  </div>
                </div>
              </div>

              <div className="w-full flex flex-col gap-3">
                {isVictory && hasNextStage ? (
                  <button
                    type="button"
                    data-start="true"
                    onClick={onNextStage}
                    className="w-full py-3.5 px-6 rounded-2xl font-extrabold text-base text-rose-950 bg-amber-400 hover:bg-amber-300 border-2 border-amber-100 cursor-pointer whitespace-nowrap"
                  >
                    Next Stage (Stage {snapshot.stageNumber + 1})
                  </button>
                ) : (
                  <button
                    type="button"
                    data-start="true"
                    onClick={onRestart}
                    className="w-full py-3.5 px-6 rounded-2xl font-extrabold text-base text-rose-950 bg-amber-400 hover:bg-amber-300 border-2 border-amber-100 cursor-pointer whitespace-nowrap"
                  >
                    {isVictory ? 'Play Stage Again' : 'Try Again'}
                  </button>
                )}

                {isVictory && hasNextStage && (
                  <button
                    type="button"
                    onClick={onRestart}
                    className="w-full py-3 px-6 rounded-2xl font-bold text-sm text-amber-100 bg-purple-900 hover:bg-purple-800 border border-amber-300/35 cursor-pointer whitespace-nowrap"
                  >
                    Replay Stage {snapshot.stageNumber}
                  </button>
                )}

                <button
                  type="button"
                  onClick={onBackToTitle}
                  className="w-full py-3 px-6 rounded-2xl font-bold text-sm text-amber-200/80 hover:text-amber-100 bg-purple-950/80 border border-purple-700/40 cursor-pointer whitespace-nowrap"
                >
                  Back to Title Screen
                </button>
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
};
