import React from 'react';

export const Logo = ({ className = '', size = 32 }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ color: 'var(--accent-color)' }}
      >
        {/* Minimalist eye logo with cross symbol inside pupil to convey OcuVision AI */}
        <path
          d="M2.0001 12C2.0001 12 5.5001 5 12.0001 5C18.5001 5 22.0001 12 22.0001 12C22.0001 12 18.5001 19 12.0001 19C5.5001 19 2.0001 12 2.0001 12Z"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
        <path
          d="M12 10.5V13.5M10.5 12H13.5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>
        Naw<span className="text-accent">IA</span>
      </span>
    </div>
  );
};
