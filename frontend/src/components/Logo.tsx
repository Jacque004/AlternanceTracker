import { useId } from 'react';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = 'h-10 w-auto' }: LogoProps) {
  const gradientId = `logo-${useId().replace(/:/g, '')}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 540 96"
      className={className}
      role="img"
      aria-label="AlternanceTracker"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4F46E5" />
          <stop offset="1" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="24" fill={`url(#${gradientId})`} />
      <polyline
        points="26,72 48,24 70,72"
        fill="none"
        stroke="#fff"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="36,57 45,66 62,45"
        fill="none"
        stroke="#FBBF24"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="112"
        y="63"
        fontFamily="Inter, 'Segoe UI', Helvetica, Arial, sans-serif"
        fontSize="40"
        fontWeight="700"
        fill="#1E1B4B"
        textLength="400"
        lengthAdjust="spacingAndGlyphs"
      >
        Alternance
        <tspan fill="#06B6D4">Tracker</tspan>
      </text>
    </svg>
  );
}
