import React from 'react';
import { BoosterId, CandyColor } from '../game/types';

export function CandySvgIcon({
  color,
  className = 'w-6 h-6',
}: {
  color: CandyColor;
  className?: string;
}) {
  switch (color) {
    case 'red':
      // Ruby Jelly Bean
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path
            d="M6 5C10 2 18 4 19 10C20 16 15 21 9 20C4 19 3 15 5 11C6 9 4 7 6 5Z"
            fill="#E11D48"
            stroke="#4C0519"
            strokeWidth="1.75"
          />
          <path
            d="M8.5 6.5C11.5 5 15.5 6.5 16 10"
            stroke="#FFE4E6"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      );
    case 'orange':
      // Amber Citrus Lozenge
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <polygon
            points="12,2 21,12 12,22 3,12"
            fill="#F97316"
            stroke="#431407"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <polygon
            points="12,6 17,12 12,18 7,12"
            fill="#FB923C"
            stroke="#FFEDD5"
            strokeWidth="1.2"
          />
        </svg>
      );
    case 'yellow':
      // Lemon Butter Drop
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="5"
            fill="#EAB308"
            stroke="#422006"
            strokeWidth="1.75"
          />
          <path
            d="M7 8.5H17M7 12H17M7 15.5H13"
            stroke="#FEF08A"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'green':
      // Emerald Mint Gumdrop
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <polygon
            points="12,3 20,8 20,16 12,21 4,16 4,8"
            fill="#10B981"
            stroke="#022C22"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M8 8.5L12 6L16 8.5"
            stroke="#A7F3D0"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      );
    case 'blue':
      // Sapphire Berry Bonbon
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="#2563EB"
            stroke="#172554"
            strokeWidth="1.75"
          />
          <path
            d="M12 12C12 9.5 14.5 9.5 14.5 12C14.5 15 10 15.5 9 12.5C8 9 12 6.5 15.5 8.5"
            stroke="#DBEAFE"
            strokeWidth="1.75"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      );
    case 'purple':
      // Amethyst Plum Star
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <polygon
            points="12,2 14.9,8.2 21.7,9.1 16.7,13.8 18,20.6 12,17.3 6,20.6 7.3,13.8 2.3,9.1 9.1,8.2"
            fill="#9333EA"
            stroke="#3B0764"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="2.5" fill="#F3E8FF" />
        </svg>
      );
  }
}

export function ObjectiveSvgIcon({
  type,
  targetColor,
  className = 'w-5 h-5',
}: {
  type: 'score' | 'jelly' | 'frosting' | 'color';
  targetColor?: CandyColor;
  className?: string;
}) {
  if (type === 'color' && targetColor) {
    return <CandySvgIcon color={targetColor} className={className} />;
  }
  if (type === 'jelly') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="4"
          fill="#38BDF8"
          fillOpacity="0.85"
          stroke="#082F49"
          strokeWidth="1.75"
        />
        <rect
          x="6.5"
          y="6.5"
          width="11"
          height="11"
          rx="2.5"
          fill="#E0F2FE"
          fillOpacity="0.6"
        />
      </svg>
    );
  }
  if (type === 'frosting') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <rect
          x="3"
          y="4"
          width="18"
          height="16"
          rx="4"
          fill="#F8FAFC"
          stroke="#334155"
          strokeWidth="1.75"
        />
        <path
          d="M6 10C8 8 10 12 12 10C14 8 16 12 18 10"
          stroke="#F43F5E"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M7 15H17"
          stroke="#94A3B8"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  // Score star
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <polygon
        points="12,2 15.1,8.4 22,9.3 17,14.2 18.2,21.1 12,17.8 5.8,21.1 7,14.2 2,9.3 8.9,8.4"
        fill="#FACC15"
        stroke="#422006"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.2" fill="#FEF9C3" />
    </svg>
  );
}

export function BoosterSvgIcon({
  booster,
  className = 'w-6 h-6',
}: {
  booster: BoosterId;
  className?: string;
}) {
  if (booster === 'hammer') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <line
          x1="6"
          y1="19"
          x2="14"
          y2="11"
          stroke="#FDE68A"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle
          cx="15.5"
          cy="8.5"
          r="5.5"
          fill="#F43F5E"
          stroke="#4C0519"
          strokeWidth="1.75"
        />
        <path
          d="M13 7.5C14.5 6 17 6.5 17.5 8.5"
          stroke="#FFE4E6"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    );
  }
  if (booster === 'free-switch') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <rect
          x="2.5"
          y="2.5"
          width="19"
          height="19"
          rx="5"
          fill="#8B5CF6"
          stroke="#2E1065"
          strokeWidth="1.75"
        />
        <path
          d="M7 9H16L13.5 6.5M17 15H8L10.5 17.5"
          stroke="#F5F3FF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  }
  // sugar-bomb
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle
        cx="12"
        cy="13"
        r="7.5"
        fill="#3B0764"
        stroke="#FACC15"
        strokeWidth="1.75"
      />
      <path d="M12 5.5V2.5L15 4" stroke="#F97316" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="9.5" cy="11" r="1.3" fill="#F43F5E" />
      <circle cx="14.5" cy="11.5" r="1.3" fill="#38BDF8" />
      <circle cx="11.5" cy="15.5" r="1.3" fill="#4ADE80" />
      <circle cx="14.5" cy="15" r="1.1" fill="#FACC15" />
    </svg>
  );
}
