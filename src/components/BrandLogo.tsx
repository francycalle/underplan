import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: number;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = '', size = 57.5 }) => {
  return (
    <div
      className={`relative flex items-center justify-center select-none transition-transform hover:scale-105 ${className}`}
      style={{ width: size, height: size }}
      title="UnderPlan — Multiboard & Underware Planner"
    >
      <svg
        width={size}
        height={size}
        viewBox="33 36 60.5 60.5"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Exact Figma Background Circle */}
        <circle
          cx="63.2344"
          cy="66.2344"
          r="28.7344"
          fill="#15161A"
          stroke="#2A2D36"
          strokeWidth="3"
        />

        {/* Exact Figma Conduit U-Shape 4-part Vector Paths */}
        <path
          d="M58.1953 68.9297V70.5703C58.1953 71.3162 58.4921 72.0311 59.0195 72.5586C59.547 73.086 60.2619 73.3828 61.0078 73.3828H62.6484V81.1172H61.0078C58.2106 81.1172 55.5277 80.0062 53.5498 78.0283C51.5719 76.0504 50.4609 73.3675 50.4609 70.5703V68.9297H58.1953Z"
          fill="#3B82F6"
          fillOpacity="0.22"
          stroke="#3B82F6"
          strokeWidth="1.17188"
        />
        <path
          d="M58.1953 51.1172V67.7578H50.4609V51.1172H58.1953Z"
          fill="#3B82F6"
          fillOpacity="0.22"
          stroke="#3B82F6"
          strokeWidth="1.17188"
          strokeLinejoin="round"
        />
        <path
          d="M68.2734 68.9297V70.5703C68.2734 71.3162 67.9767 72.0311 67.4492 72.5586C66.9218 73.086 66.2069 73.3828 65.4609 73.3828H63.8203V81.1172H65.4609C68.2581 81.1172 70.941 80.0062 72.9189 78.0283C74.8969 76.0504 76.0078 73.3675 76.0078 70.5703V68.9297H68.2734Z"
          fill="#3B82F6"
          fillOpacity="0.22"
          stroke="#3B82F6"
          strokeWidth="1.17188"
        />
        <path
          d="M68.2734 51.1172V67.7578H76.0078V51.1172H68.2734Z"
          fill="#3B82F6"
          fillOpacity="0.22"
          stroke="#3B82F6"
          strokeWidth="1.17188"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
