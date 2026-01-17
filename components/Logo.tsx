
import React from 'react';

interface LogoProps {
  className?: string;
  hideText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = "h-10", hideText = false }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Symbolic Icon Part */}
      <div className="relative w-10 h-10 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Blue Sky/Water Circle */}
          <circle cx="50" cy="50" r="48" fill="#0EA5E9" fillOpacity="0.1" stroke="#0EA5E9" strokeWidth="2" />
          {/* Sun */}
          <circle cx="70" cy="30" r="15" fill="#FBBF24" />
          {/* Wave */}
          <path d="M10 70 Q 30 60 50 70 T 90 70" fill="none" stroke="#2563EB" strokeWidth="4" strokeLinecap="round" />
          {/* Palm Tree Mockup */}
          <path d="M75 75 Q 80 50 75 40" fill="none" stroke="#16A34A" strokeWidth="3" />
          {/* Boat Mockup */}
          <rect x="25" y="65" width="30" height="10" rx="2" fill="#DC2626" />
        </svg>
      </div>
      
      {!hideText && (
        <div className="flex flex-col leading-tight">
          <span className="font-extrabold text-2xl tracking-tight text-slate-800">
            Go<span className="text-sky-600">Paraty</span>
          </span>
          <span className="text-[8px] uppercase font-bold tracking-widest text-slate-500 whitespace-nowrap">
            Turismo • História • Aventura
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
