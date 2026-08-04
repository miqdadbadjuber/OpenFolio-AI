import React from 'react';
import { motion } from 'motion/react';

interface LogoProps {
  className?: string;
  size?: number | string;
  variant?: 'gradient' | 'white' | 'muted' | 'currentColor';
  showText?: boolean;
  textClassName?: string;
  animated?: boolean;
}

export default function Logo({
  className = '',
  size = 32,
  variant = 'gradient',
  showText = false,
  textClassName = 'text-white text-base font-semibold tracking-tight',
  animated = false
}: LogoProps) {
  // Select color fills based on variant
  const getFillColor = () => {
    switch (variant) {
      case 'white':
        return '#FFFFFF';
      case 'muted':
        return '#71717A'; // Zinc 500
      case 'currentColor':
        return 'currentColor';
      case 'gradient':
      default:
        return 'url(#openfolio-logo-gradient)';
    }
  };

  const svgContent = (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: size, height: size }}
      className={`shrink-0 transition-transform duration-500 ${className}`}
    >
      <defs>
        {/* Cinematic gradient combining warm silver and soft anthracite titanium */}
        <linearGradient id="openfolio-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" /> {/* Titanium Highlight */}
          <stop offset="50%" stopColor="#D4D4D8" /> {/* Brushed Platinum */}
          <stop offset="100%" stopColor="#71717A" /> {/* Matte Graphite */}
        </linearGradient>

        <filter id="logo-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <g filter="url(#logo-glow)">
        {/* Background shadow or glow ring for premium depth */}
        <circle cx="50" cy="50" r="41" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

        {/* 
          High-fidelity mathematical reproduction of the open circle.
          Refined to match the clean minimalist circle with the overlapping spiral tail.
        */}
        {animated ? (
          <motion.path
            d="M 26.192 85.808 A 43 43 0 1 1 32.654 89.346 L 43.694 78.306 A 29 29 0 1 0 36.391 75.609 Z"
            fill={getFillColor()}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
        ) : (
          <path
            d="M 26.192 85.808 A 43 43 0 1 1 32.654 89.346 L 43.694 78.306 A 29 29 0 1 0 36.391 75.609 Z"
            fill={getFillColor()}
          />
        )}
      </g>
    </svg>
  );

  if (showText) {
    return (
      <div className="flex items-center gap-2.5">
        {svgContent}
        <span className={textClassName}>OpenFolio</span>
      </div>
    );
  }

  return svgContent;
}
