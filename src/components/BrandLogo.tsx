import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: number;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = '', size = 44 }) => {
  return (
    <div
      className={`relative flex items-center justify-center rounded-full bg-[#15161A] border border-[#2A2D36] shadow-lg select-none transition-transform hover:scale-105 ${className}`}
      style={{ width: size, height: size }}
      title="UnderPlan — Multiboard & Underware Planner"
    >
      <svg
        width={size * 0.72}
        height={size * 0.72}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Subtle Outer Octagon Guide */}
        <polygon
          points="10,2 26,2 34,10 34,26 26,34 10,34 2,26 2,10"
          stroke="#3B82F6"
          strokeWidth="1.2"
          strokeDasharray="2 2"
          opacity="0.25"
          fill="none"
        />

        {/* Conduit U-Shape Path */}
        <path
          d="M10 9 V21 C10 25.4183 13.5817 29 18 29 C22.4183 29 26 25.4183 26 21 V9"
          stroke="#3B82F6"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.6))',
          }}
        />

        {/* Inner Core Guide / Cable Channel Track */}
        <path
          d="M14 9 V20 C14 22.2091 15.7909 24 18 24 C20.2091 24 22 22.2091 22 20 V9"
          stroke="#0EA5E9"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.7"
        />

        {/* Central Snap Coordinate Node */}
        <circle cx="18" cy="15" r="2.2" fill="#38BDF8" opacity="0.9" />
        <circle cx="18" cy="15" r="4" stroke="#38BDF8" strokeWidth="0.8" opacity="0.4" />
      </svg>
    </div>
  );
};
