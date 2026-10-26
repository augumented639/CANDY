import React from 'react';
import { STAGES } from '../game/rules';
import { StageConfig } from '../game/types';

interface TitleScreenProps {
  selectedStageIndex: number;
  highestReachedStage: number;
  stageBestScores: Record<number, number>;
  onSelectStage: (index: number) => void;
  onStartGame: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedStageIndex,
  highestReachedStage,
  stageBestScores,
  onSelectStage,
  onStartGame,
}) => {
  const currentStage: StageConfig = STAGES[selectedStageIndex] ?? STAGES[0];
  const bestForStage = stageBestScores[currentStage.number] ?? 0;

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-6 md:p-12 pointer-events-none select-none">
      {/* Main Asymmetric Split: Left 45% negative-space stage lockup & controls; Right 55% open to live interactive Confectionery Showcase on Canvas */}
      <div className="flex-1 flex items-center">
        <div className="w-full max-w-xl pointer-events-auto flex flex-col items-start gap-6">
          {/* Bespoke Inline SVG Confectionery Crest & Title Lockup */}
          <div className="w-full">
            <svg
              viewBox="0 0 540 165"
              className="w-full max-w-[500px] h-auto drop-shadow-[0_10px_24px_rgba(18,6,28,0.85)]"
              role="img"
              aria-label="Candy Crush Saga: Royal Confectionery"
            >
              <defs>
                <linearGradient id="crestGold" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FEF08A" />
                  <stop offset="55%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#B45309" />
                </linearGradient>
                <linearGradient id="ribbonBerry" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#9F1239" />
                  <stop offset="50%" stopColor="#E11D48" />
                  <stop offset="100%" stopColor="#9F1239" />
                </linearGradient>
              </defs>

              {/* Ornate Confectionery Plaque Base */}
              <rect
                x="10"
                y="14"
                width="520"
                height="136"
                rx="26"
                fill="#260B36"
                fillOpacity="0.92"
                stroke="url(#crestGold)"
                strokeWidth="3.5"
              />
              <rect
                x="18"
                y="22"
                width="504"
                height="120"
                rx="20"
                fill="none"
                stroke="#FDE68A"
                strokeOpacity="0.3"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />

              {/* Left & Right Sculpted Candy Jewels on Crest */}
              <circle cx="48" cy="70" r="18" fill="#E11D48" stroke="#FDE68A" strokeWidth="2.5" />
              <path
                d="M40 62C44 58 51 59 53 64"
                stroke="#FFE4E6"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
              <polygon
                points="492,50 510,70 492,90 474,70"
                fill="#2563EB"
                stroke="#FDE68A"
                strokeWidth="2.5"
              />
              <polygon points="492,57 503,70 492,83 481,70" fill="#93C5FD" fillOpacity="0.55" />

              {/* Main Display Title Lettering */}
              <text
                x="270"
                y="74"
                textAnchor="middle"
                fill="url(#crestGold)"
                stroke="#450A0A"
                strokeWidth="6"
                style={{
                  paintOrder: 'stroke fill',
                  fontFamily: "'Fraunces', Georgia, serif",
                  fontWeight: 900,
                  fontSize: '46px',
                  letterSpacing: '0.02em',
                }}
              >
                CANDY CRUSH
              </text>

              {/* Lower Ribbon Banner */}
              <rect
                x="96"
                y="94"
                width="348"
                height="36"
                rx="18"
                fill="url(#ribbonBerry)"
                stroke="#FDE68A"
                strokeWidth="2"
              />
              <text
                x="270"
                y="117"
                textAnchor="middle"
                fill="#FFFBEB"
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 800,
                  fontSize: '15px',
                  letterSpacing: '0.18em',
                }}
              >
                ROYAL CONFECTIONERY SAGA
              </text>
            </svg>
          </div>

          {/* Stage Selector Panel (World-Matched Patisserie Wood/Plum Tray) */}
          <div
            className="w-full rounded-2xl p-5 border-2"
            style={{
              backgroundColor: 'rgba(29, 10, 43, 0.92)',
              borderColor: 'rgba(251, 191, 36, 0.45)',
              boxShadow: '0 16px 36px rgba(10, 3, 18, 0.75)',
            }}
          >
            <div className="flex items-center justify-between gap-4 mb-3">
              <span className="text-xs font-bold tracking-wider uppercase text-amber-200/80">
                Select Patisserie Stage
              </span>
              <span className="text-xs font-mono tabular-nums text-amber-300">
                Best: {bestForStage.toFixed(0)} pts
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2.5 mb-4" role="group" aria-label="Stage selection">
              {STAGES.map((stage, idx) => {
                const isLocked = idx > highestReachedStage;
                const isSelected = idx === selectedStageIndex;
                return (
                  <button
                    key={stage.number}
                    type="button"
                    disabled={isLocked}
                    onClick={() => onSelectStage(idx)}
                    aria-label={`Stage ${stage.number}: ${stage.name}${isLocked ? ' (Locked)' : ''}`}
                    className={`h-12 rounded-xl font-mono tabular-nums font-bold text-sm transition-transform flex flex-col items-center justify-center border whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-amber-400 text-rose-950 border-amber-100 scale-105 shadow-md'
                        : isLocked
                        ? 'bg-purple-950/50 text-purple-400/40 border-purple-800/30 cursor-not-allowed'
                        : 'bg-purple-900/80 text-amber-100 border-amber-400/30 hover:bg-purple-800'
                    }`}
                  >
                    <span>{stage.number}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-baseline justify-between gap-3 border-t border-amber-300/15 pt-3">
              <div>
                <h2
                  className="text-lg font-bold text-amber-100"
                  style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  Stage {currentStage.number}: {currentStage.name}
                </h2>
                <p className="text-xs text-rose-100/80 mt-0.5">{currentStage.subtitle}</p>
              </div>
              <div className="text-right font-mono tabular-nums shrink-0">
                <div className="text-xs text-amber-200/70">MOVES</div>
                <div className="text-base font-bold text-amber-300">{currentStage.moves}</div>
              </div>
            </div>
          </div>

          {/* Primary Start CTA */}
          <div className="flex items-center gap-4 w-full">
            <button
              type="button"
              data-start="true"
              onClick={(e) => {
                e.currentTarget.blur();
                onStartGame();
              }}
              className="w-full sm:w-auto min-w-[240px] py-4 px-8 rounded-2xl font-extrabold text-lg tracking-wide text-rose-950 bg-amber-400 hover:bg-amber-300 active:scale-95 transition-transform border-2 border-amber-100 shadow-[0_8px_0_#92400E,0_14px_24px_rgba(0,0,0,0.5)] cursor-pointer whitespace-nowrap shrink-0"
            >
              Play Stage {currentStage.number}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Safe Margin: Single flat borderless inline control hint */}
      <div className="w-full flex items-center justify-between text-xs text-amber-100/75 tracking-wide pt-2">
        <span>
          Drag or Click Candies to Swap · Arrow Keys + Space Keyboard Play · 1–3 Use Boosters · H Hint · P / Esc Pause
        </span>
      </div>
    </div>
  );
};
