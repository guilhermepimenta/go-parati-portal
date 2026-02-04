
import React from 'react';
import { Palmtree } from 'lucide-react';

interface LogoProps {
  className?: string;
  hideText?: boolean;
  variant?: 'default' | 'light';
}

const Logo: React.FC<LogoProps> = ({ className = "h-10", hideText = false, variant = 'default' }) => {
  return (
    <div className={`flex items-center gap-3 ${className} group select-none`}>
      {/* Icon: App-style rounded square with gradient */}
      <div className="relative flex items-center justify-center w-10 h-10 bg-gradient-to-br from-coral to-amber-500 rounded-xl shadow-lg shadow-coral/20 group-hover:scale-105 group-hover:shadow-coral/40 transition-all duration-300">
        <Palmtree className="w-5 h-5 text-white drop-shadow-md stroke-[2.5]" />
      </div>

      {!hideText && (
        <div className="flex flex-col justify-center">
          <span className={`font-serif font-extrabold text-2xl tracking-tighter leading-none transition-colors ${variant === 'light' ? 'text-white group-hover:text-white/90' : 'text-ink group-hover:text-ink/80'
            }`}>
            Go<span className="text-coral">Paraty</span>
            <span className="text-amber-500">.</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
