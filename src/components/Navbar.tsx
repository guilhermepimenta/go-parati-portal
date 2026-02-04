import React, { useState } from 'react';
import {
  Menu,
  X,
  User,
  MapPin,
  Home,
  Palmtree,
  Landmark,
  Compass,
  Ticket
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Logo from './Logo';
import LanguageSwitcher from './LanguageSwitcher';

interface NavbarProps {
  onNavigate: (view: string) => void;
  currentView: string;
  hasLocation: boolean;
  onRequestLocation: () => void;
  onLoginClick: () => void;
  isAuthenticated: boolean;
}

const Navbar: React.FC<NavbarProps> = ({
  onNavigate,
  currentView,
  hasLocation,
  onRequestLocation,
  onLoginClick,
  isAuthenticated
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  // Airbnb-style navigation items with icons
  const navItems = [
    { id: 'home', label: t('nav.home'), icon: Home, color: 'text-rose-500' },
    { id: 'explore', label: t('nav.explore'), icon: Compass, color: 'text-sky-500' },
    { id: 'history', label: t('nav.history'), icon: Landmark, color: 'text-amber-500', microCopy: t('nav.culture') },
    { id: 'adventure', label: t('nav.adventure'), icon: Palmtree, color: 'text-emerald-500', microCopy: t('nav.trails') },
    { id: 'totems', label: t('nav.totems'), icon: MapPin, special: true, color: 'text-coral', microCopy: t('nav.skip_lines') },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 transition-all duration-500 bg-surface/90 backdrop-blur-2xl border-b border-border/40 shadow-sm" aria-label="Main Navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 md:h-24 lg:h-28 items-center">

          {/* Left: Logo */}
          <div className="flex-shrink-0 flex items-center">
            <button
              onClick={() => onNavigate('home')}
              className="focus:outline-none focus:ring-2 focus:ring-coral rounded-lg transition-transform active:scale-95"
              aria-label="Go to Home"
            >
              <Logo />
            </button>
          </div>

          {/* Center: Airbnb-style Iconic Menu (Desktop) */}
          <div className="hidden md:flex flex-1 justify-center items-center pl-12" role="menubar">
            <div className="flex space-x-8">
              {navItems.map((item) => {
                const isActive = currentView === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    role="menuitem"
                    aria-current={isActive ? 'page' : undefined}
                    className="group flex flex-col items-center gap-1 min-w-[64px] cursor-pointer pb-3 border-b-2 border-transparent hover:border-black/10 transition-all outline-none"
                  >
                    <div className="relative">
                      <Icon
                        className={`w-6 h-6 transition-all duration-300 group-hover:scale-110 
                          ${isActive
                            ? (item.special ? 'text-coral' : `${item.color || 'text-ink'} fill-current/10`)
                            : 'text-ink-light group-hover:text-ink'
                          }
                          ${item.special && !isActive ? 'text-coral/80 group-hover:text-coral' : ''}
                        `}
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                      {/* Badge for Special Items if needed */}
                      {item.special && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-coral rounded-full animate-pulse z-10" />
                      )}

                      {/* Micro-copy Tooltip - Positioned Below to avoid clip */}
                      {item.microCopy && (
                        <div className={`absolute top-[3.5rem] left-1/2 -translate-x-1/2 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none transform -translate-y-2 group-hover:translate-y-0
                          ${item.special ? 'bg-coral text-white' : 'bg-ink text-white'}
                        `}>
                          {item.microCopy}
                          {/* Triangle Arrow (Pointing Up) */}
                          <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 
                            ${item.special ? 'bg-coral' : 'bg-ink'}
                          `}></div>
                        </div>
                      )}
                    </div>

                    <span
                      className={`text-[12px] font-medium transition-colors duration-200
                        ${isActive
                          ? (item.special ? 'text-coral font-semibold' : 'text-ink font-semibold')
                          : 'text-ink-light group-hover:text-ink'
                        }
                      `}
                    >
                      {item.label}
                    </span>

                    {/* Active Underline Indicator */}
                    {isActive && (
                      <span className={`absolute bottom-0 w-[calc(100%-16px)] h-0.5 rounded-t-full 
                        ${item.special ? 'bg-coral' : 'bg-ink'}
                      `} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="hidden md:flex items-center space-x-3 flex-shrink-0">
            {/* Language Switcher (Desktop) */}
            <LanguageSwitcher className="mr-1" />

            {!hasLocation && (
              <button
                onClick={onRequestLocation}
                className="inline-flex items-center px-4 py-2 text-xs font-bold uppercase tracking-wider text-ink hover:bg-black/5 rounded-full transition-colors border border-transparent hover:border-black/5"
                aria-label="Ativar localização"
              >
                <MapPin className="w-4 h-4 mr-2 text-ocean" />
                Localização
              </button>
            )}

            {/* Login Button - Hidden for public users
            <button
              onClick={onLoginClick}
              className={`px-5 py-2.5 font-sans font-semibold text-sm rounded-full shadow-sm transition-all active:scale-95 flex items-center gap-2 border
                ${isAuthenticated
                  ? 'bg-surface text-ink border-border hover:shadow-md'
                  : 'bg-coral text-white border-transparent hover:bg-coral-hover shadow-coral/20 hover:shadow-coral/30'
                }`}
            >
              {isAuthenticated ? <User className="w-4 h-4" /> : 'Entrar'}
            </button>
            */}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-xl text-ink hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-coral"
              aria-expanded={isOpen}
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-surface/95 backdrop-blur-xl border-b border-border shadow-xl animate-in slide-in-from-top-4 duration-300">
          <div className="p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setIsOpen(false);
                  }}
                  className={`flex items-center w-full px-4 py-4 rounded-xl text-base font-semibold transition-all ${currentView === item.id
                    ? 'bg-black/5 text-ink'
                    : 'text-ink-light hover:bg-black/5 hover:text-ink'
                    }`}
                >
                  <Icon className={`w-5 h-5 mr-3 ${item.special ? 'text-coral' : ''}`} />
                  <div className="flex flex-col items-start">
                    <span className={item.special ? 'text-coral' : ''}>
                      {item.label}
                    </span>
                    {item.microCopy && (
                      <span className="text-[10px] uppercase tracking-wider opacity-60 font-bold">
                        {item.microCopy}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
            <div className="h-px bg-black/10 my-4" />
            {/* Login Button - Hidden for Public
            <button
              onClick={() => { onLoginClick(); setIsOpen(false); }}
              className="w-full py-4 bg-coral text-white font-bold rounded-xl active:scale-95 transition-transform font-sans shadow-md"
            >
              {isAuthenticated ? 'Sair' : 'Entrar'}
            </button>
            */}

            {/* Language Switcher (Mobile) */}
            <div className="pt-4 flex justify-center border-t border-black/5 mt-2">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
