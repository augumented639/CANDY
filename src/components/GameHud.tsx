import React from 'react';
import { BoosterId, BoosterStock, StageConfig, StageObjective } from '../game/types';
import { BoosterSvgIcon, ObjectiveSvgIcon } from './CandyIcons';

interface GameHudProps {
  stage: StageConfig;
  movesLeft: number;
  score: number;
  comboCount: number;
  objectives: StageObjective[];
  boosters: BoosterStock;
  activeBooster: BoosterId | null;
  muted: boolean;
  chocolateWarning: boolean;
  onSelectBooster: (booster: BoosterId) => void;
  onTriggerHint: () => void;
  onToggleMute: () => void;
  onRestartStage: () => void;
  onPauseGame: () => void;
}

const BOOSTER_CONFIG: Array<{
  id: BoosterId;
  keyLabel: string;
  name: string;
  shortName: string;
  roleClue: string;
}> = [
  {
    id: 'hammer',
    keyLabel: '1',
    name: 'Lollipop Hammer',
    shortName: 'Hammer',
    roleClue: 'Smash 1 Tile',
  },
  {
    id: 'free-switch',
    keyLabel: '2',
    name: 'Free Switch',
    shortName: 'Switch',
    roleClue: 'Swap Any 2',
  },
  {
    id: 'sugar-bomb',
    keyLabel: '3',
    name: 'Sugar Bomb',
    shortName: 'Bomb',
    roleClue: 'Blast 3x3 Area',
  },
];

export const GameHud: React.FC<GameHudProps> = ({
  stage,
  movesLeft,
  score,
  comboCount,
  objectives,
  boosters,
  activeBooster,
  muted,
  chocolateWarning,
  onSelectBooster,
  onTriggerHint,
  onToggleMute,
  onRestartStage,
  onPauseGame,
}) => {
  const maxThreshold = stage.starThresholds[2];
  const progressPct = Math.min(100, Math.round((score / maxThreshold) * 100));

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-2.5 sm:p-5 select-none">
      {/* Top Perimeter Strip: Left Stage/Moves/Score/Objectives Cluster + Right Utility Controls */}
      <div className="w-full flex flex-wrap items-start justify-between gap-2 sm:gap-3">
        {/* Left Unified Confectionery Status Cluster */}
        <div
          className="pointer-events-auto flex flex-wrap items-center gap-2.5 sm:gap-5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl border-2 max-w-full"
          style={{
            backgroundColor: 'rgba(34, 10, 48, 0.94)',
            borderColor: 'rgba(251, 191, 36, 0.5)',
            boxShadow: '0 8px 24px rgba(12, 3, 20, 0.65)',
          }}
        >
          {/* Moves Hero Counter (~3:1 scale vs kicker) */}
          <div className="flex flex-col items-center pr-2.5 sm:pr-3 border-r border-amber-300/20">
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-amber-200/80">
              MOVES
            </span>
            <span
              data-testid="hud-moves"
              className={`font-mono tabular-nums text-2xl sm:text-4xl font-extrabold leading-none mt-0.5 ${
                movesLeft <= 5 ? 'text-rose-400' : 'text-amber-300'
              }`}
              style={{
                paintOrder: 'stroke fill',
                WebkitTextStroke: '2.5px #2E0718',
              }}
            >
              {Math.round(movesLeft)}
            </span>
          </div>

          {/* Score & 3-Star Progress Meter */}
          <div className="flex flex-col min-w-[110px] sm:min-w-[165px] pr-2.5 sm:pr-3 border-r border-amber-300/20">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] font-extrabold tracking-widest uppercase text-amber-200/80">
                STAGE {stage.number} · SCORE
              </span>
              {comboCount > 1 && (
                <span className="text-[10px] font-mono tabular-nums font-bold text-emerald-300">
                  {comboCount}x
                </span>
              )}
            </div>
            <div
              data-testid="hud-score"
              className="font-mono tabular-nums text-xl sm:text-3xl font-extrabold text-amber-50 leading-tight"
              style={{
                paintOrder: 'stroke fill',
                WebkitTextStroke: '2px #2E0718',
              }}
            >
              {Math.round(score)}
            </div>
            {/* Progress Bar with 3 Star Threshold Markers */}
            <div className="relative w-full h-2 sm:h-2.5 bg-purple-950 rounded-full overflow-hidden border border-amber-300/30 mt-1">
              <div
                className="h-full bg-amber-400 transition-transform duration-150 origin-left"
                style={{ transform: `scaleX(${progressPct / 100})` }}
              />
              {stage.starThresholds.slice(0, 2).map((thresh, i) => {
                const leftPct = Math.min(96, Math.round((thresh / maxThreshold) * 100));
                return (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 w-0.5 bg-amber-200/70"
                    style={{ left: `${leftPct}%` }}
                  />
                );
              })}
            </div>
          </div>

          {/* Live Stage Objectives */}
          <div className="flex items-center gap-2.5 sm:gap-4" aria-label="Stage objectives">
            {objectives.map((obj, idx) => {
              const done = obj.current >= obj.target;
              return (
                <div
                  key={`${obj.type}-${idx}`}
                  className="flex items-center gap-1.5 sm:gap-2"
                  title={`${obj.label}: ${Math.round(obj.current)} / ${Math.round(obj.target)}`}
                >
                  <ObjectiveSvgIcon
                    type={obj.type}
                    targetColor={obj.targetColor}
                    className="w-5 h-5 sm:w-6 sm:h-6 shrink-0"
                  />
                  <div className="flex flex-col">
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-200/75 whitespace-nowrap">
                      {obj.label}
                    </span>
                    <span
                      className={`font-mono tabular-nums text-xs sm:text-sm font-extrabold whitespace-nowrap ${
                        done ? 'text-emerald-300' : 'text-amber-100'
                      }`}
                    >
                      {Math.round(obj.current)}/{Math.round(obj.target)}
                      {done ? ' · DONE' : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top-Right Compact Utility Controls (Hint [H], Mute [M], Restart [R], Pause [P]) */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 ml-auto sm:ml-0">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Show Hint (H)"
            title="Show Hint [H]"
            onClick={(e) => {
              e.currentTarget.blur();
              onTriggerHint();
            }}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border-2 transition-transform active:scale-95 cursor-pointer"
            style={{
              backgroundColor: 'rgba(34, 10, 48, 0.94)',
              borderColor: 'rgba(251, 191, 36, 0.5)',
            }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
              <path
                d="M9 18H15M10 21H14M12 3C8.7 3 6 5.7 6 9C6 11.2 7.2 13.1 9 14.1V15.5C9 16.1 9.4 16.5 10 16.5H14C14.6 16.5 15 16.1 15 15.5V14.1C16.8 13.1 18 11.2 18 9C18 5.7 15.3 3 12 3Z"
                stroke="#FDE047"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? 'Unmute Audio (M)' : 'Mute Audio (M)'}
            title={muted ? 'Unmute [M]' : 'Mute [M]'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border-2 transition-transform active:scale-95 cursor-pointer"
            style={{
              backgroundColor: 'rgba(34, 10, 48, 0.94)',
              borderColor: 'rgba(251, 191, 36, 0.5)',
            }}
          >
            {muted ? (
              <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                <path
                  d="M11 5L6 9H2V15H6L11 19V5ZM22 9L16 15M16 9L22 15"
                  stroke="#FDA4AF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                <path
                  d="M11 5L6 9H2V15H6L11 19V5ZM15.5 8.5C16.8 9.8 16.8 14.2 15.5 15.5M19 5C22 8 22 16 19 19"
                  stroke="#FDE68A"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            )}
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Restart Stage (R)"
            title="Restart Stage [R]"
            onClick={(e) => {
              e.currentTarget.blur();
              onRestartStage();
            }}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border-2 transition-transform active:scale-95 cursor-pointer"
            style={{
              backgroundColor: 'rgba(34, 10, 48, 0.94)',
              borderColor: 'rgba(251, 191, 36, 0.5)',
            }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
              <path
                d="M3 12C3 7 7 3 12 3C15.4 3 18.4 4.9 19.9 7.7M21 3V8H16M21 12C21 17 17 21 12 21C8.6 21 5.6 19.1 4.1 16.3M3 21V16H8"
                stroke="#FDE68A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Pause Game (P)"
            title="Pause Game [P / Esc]"
            onClick={(e) => {
              e.currentTarget.blur();
              onPauseGame();
            }}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border-2 transition-transform active:scale-95 cursor-pointer"
            style={{
              backgroundColor: 'rgba(34, 10, 48, 0.94)',
              borderColor: 'rgba(251, 191, 36, 0.5)',
            }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1" fill="#FDE68A" />
              <rect x="14" y="5" width="4" height="14" rx="1" fill="#FDE68A" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bottom Perimeter Booster Dock framing the board without overlapping tiles */}
      <div className="w-full flex flex-col items-center gap-1.5">
        {activeBooster && (
          <div
            className="pointer-events-auto px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold text-amber-950 bg-amber-300 border border-amber-100 shadow-md text-center"
            role="status"
          >
            {activeBooster === 'free-switch'
              ? 'FREE SWITCH ACTIVE: Swap any 2 adjacent candies (0 Moves)'
              : activeBooster === 'hammer'
              ? 'LOLLIPOP HAMMER READY: Tap any tile to smash it'
              : 'SUGAR BOMB READY: Tap any tile to detonate a 3x3 blast'}
          </div>
        )}
        {!activeBooster && chocolateWarning && (
          <div
            className="px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold text-amber-100 bg-rose-900/95 border border-amber-300/50 text-center"
            role="status"
          >
            DARK CHOCOLATE HAZARD: Match adjacent to chocolate to stop spreading
          </div>
        )}

        <div
          className="pointer-events-auto flex items-center justify-center gap-1.5 sm:gap-3 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl border-2 max-w-full"
          style={{
            backgroundColor: 'rgba(34, 10, 48, 0.94)',
            borderColor: 'rgba(251, 191, 36, 0.5)',
            boxShadow: '0 8px 24px rgba(12, 3, 20, 0.7)',
          }}
          role="toolbar"
          aria-label="Confectionery Boosters"
        >
          {BOOSTER_CONFIG.map((item) => {
            const count = boosters[item.id];
            const isSelected = activeBooster === item.id;
            const disabled = count <= 0;
            return (
              <button
                key={item.id}
                type="button"
                tabIndex={-1}
                disabled={disabled}
                aria-label={`${item.name} (${item.roleClue}) — Stock: ${count} — Shortcut Key ${item.keyLabel}`}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onSelectBooster(item.id);
                }}
                className={`flex items-center gap-1.5 sm:gap-2.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl border transition-transform whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-400 text-rose-950 border-amber-100 scale-105'
                    : disabled
                    ? 'bg-purple-950/60 text-purple-400/40 border-purple-800/30 cursor-not-allowed'
                    : 'bg-purple-900/80 text-amber-100 border-amber-300/30 hover:bg-purple-800'
                }`}
              >
                <BoosterSvgIcon booster={item.id} className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                <div className="flex flex-col items-start text-left">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono tabular-nums font-extrabold px-1 rounded bg-black/30 text-amber-200">
                      [{item.keyLabel}]
                    </span>
                    <span className="text-[11px] sm:hidden font-extrabold">{item.shortName}</span>
                    <span className="hidden sm:inline text-xs font-extrabold">{item.name}</span>
                  </div>
                  <span
                    className={`text-[10px] ${
                      isSelected ? 'text-rose-950/80 font-semibold' : 'text-amber-200/75'
                    }`}
                  >
                    <span className="hidden sm:inline">{item.roleClue} · </span>Stock:{' '}
                    <strong className="font-mono tabular-nums">{count}</strong>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
