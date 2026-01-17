
import React, { useState } from 'react';
import { Menu, X, Search, User, Compass, MapPin, LayoutDashboard, Ticket } from 'lucide-react';
import Logo from './Logo';

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

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'explore', label: 'Explorar' },
    { id: 'history', label: 'História' },
    { id: 'adventure', label: 'Aventura' },
    { id: 'totems', label: 'Totens Paraty Rotativo', special: true },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <button onClick={() => onNavigate('home')} className="flex-shrink-0">
              <Logo />
            </button>
            <div className="hidden md:ml-10 md:flex md:space-x-8">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`inline-flex items-center px-1 pt-1 text-sm font-bold border-b-2 transition-colors duration-200 ${currentView === item.id
                    ? 'border-sky-600 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    } ${item.special ? 'text-sky-600' : ''}`}
                >
                  {item.special && (
                    <img
                      src="/paraty-rotativo.png"
                      alt="Icon"
                      className="w-5 h-5 mr-1 object-contain"
                    />
                  )}
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {!hasLocation && (
              <button
                onClick={onRequestLocation}
                className="inline-flex items-center px-4 py-2 text-sm font-semibold text-sky-700 bg-sky-50 rounded-full hover:bg-sky-100 transition-colors"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Ativar Localização
              </button>
            )}
            {isAuthenticated && (
              <button
                onClick={() => onNavigate('dashboard')}
                className={`p-2 transition-colors ${currentView === 'dashboard' ? 'text-sky-600 bg-sky-50 rounded-lg' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <LayoutDashboard className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onLoginClick}
              className={`px-6 py-2 font-semibold rounded-full shadow-lg transition-all active:scale-95 flex items-center gap-2 ${isAuthenticated
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'bg-sky-600 text-white hover:bg-sky-700 shadow-sky-600/20'
                }`}
            >
              {isAuthenticated ? (
                <>
                  <User className="w-4 h-4" />
                  Minha Conta
                </>
              ) : 'Login'}
            </button>
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 focus:outline-none"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-white border-b border-slate-200">
          <div className="pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setIsOpen(false);
                }}
                className={`flex items-center w-full text-left px-4 py-3 text-base font-bold ${currentView === item.id
                  ? 'bg-sky-50 text-sky-700 border-l-4 border-sky-600'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  } ${item.special ? 'text-sky-600' : ''}`}
              >
                {item.special && <Ticket className="w-5 h-5 mr-3" />}
                {item.label}
              </button>
            ))}
            {isAuthenticated && (
              <button
                onClick={() => { onNavigate('dashboard'); setIsOpen(false); }}
                className="flex items-center w-full px-4 py-3 text-base font-medium text-slate-500 hover:bg-slate-50"
              >
                <LayoutDashboard className="w-5 h-5 mr-3" />
                Painel Admin
              </button>
            )}
          </div>
          <div className="pt-4 pb-3 border-t border-slate-200 px-4">
            <button
              onClick={() => { onLoginClick(); setIsOpen(false); }}
              className="w-full py-3 bg-sky-600 text-white font-bold rounded-xl"
            >
              {isAuthenticated ? 'Sair' : 'Login / Criar Conta'}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
