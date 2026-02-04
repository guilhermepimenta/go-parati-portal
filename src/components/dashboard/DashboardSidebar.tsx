import React from 'react';
import {
    Store, Users, FileCheck, Calendar, Settings, LogOut,
    MapPin, List, Mail, ChevronRight
} from 'lucide-react';
import Logo from '../Logo';
import { User } from '../../types';

interface DashboardSidebarProps {
    activeMenu: string;
    onNavigate: (menu: string) => void;
    user: User;
    pendingCount: number;
    onLogout: () => void;
    onBack: () => void;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
    activeMenu,
    onNavigate,
    user,
    pendingCount,
    onLogout,
    onBack
}) => {
    const menuItems = [
        { id: 'businesses', label: 'Estabelecimentos', icon: Store },
        { id: 'events', label: 'Eventos', icon: Calendar },
        { id: 'totems', label: 'Totens', icon: MapPin },
        { id: 'categories', label: 'Categorias', icon: List },
        ...(user.role === 'admin' ? [{ id: 'users', label: 'Usuários', icon: Users }] : []),
        ...(user.role === 'admin' ? [{ id: 'leads', label: 'Propostas', icon: Mail }] : []),
        ...(user.role === 'admin' ? [{ id: 'approvals', label: `Aprovações (${pendingCount})`, icon: FileCheck }] : []),
        ...(user.role === 'admin' ? [{ id: 'settings', label: 'Configurações', icon: Settings }] : []),
        ...(user.role === 'admin' ? [{ id: 'analytics', label: 'Analytics & BI', icon: BarChart3 }] : []),
    ];

    return (
        <aside className="w-72 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 flex flex-col fixed h-full z-20 hidden md:flex shadow-2xl">
            <div className="p-8">
                <div className="flex items-center gap-2 mb-1">
                    <Logo variant="light" />
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-10">Portal Admin</p>
            </div>

            <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 group ${activeMenu === item.id
                            ? 'bg-sky-600/20 text-sky-400 font-bold shadow-sm border border-sky-600/20'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white font-bold'
                            }`}
                    >
                        <item.icon className={`w-5 h-5 ${activeMenu === item.id ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                        <span className="tracking-wide">{item.label}</span>
                        {item.id === 'approvals' && pendingCount > 0 && (
                            <span className="ml-auto bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                                {pendingCount}
                            </span>
                        )}
                    </button>
                ))}
            </nav>

            <div className="p-6 border-t border-slate-800">
                <button
                    onClick={onBack}
                    className="w-full flex items-center justify-center gap-2 p-3 text-sky-400 hover:bg-sky-950/30 rounded-xl transition-colors font-bold text-sm mb-4 border border-sky-900/30"
                >
                    <ChevronRight className="w-4 h-4 rotate-180" /> Ir para o Site
                </button>

                <div className="flex items-center gap-3 mb-4 p-3 bg-slate-800/50 rounded-xl border border-slate-800">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-lg">
                        {user.name.charAt(0)}
                    </div>
                    <div className="overflow-hidden">
                        <p className="font-bold text-sm text-slate-200 truncate">{user.name}</p>
                        <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                    </div>
                </div>
                <button
                    onClick={onLogout}
                    className="w-full flex items-center justify-center gap-2 p-3 text-rose-400 hover:bg-rose-950/30 rounded-xl transition-colors font-bold text-sm"
                >
                    <LogOut className="w-4 h-4" /> Sair do Portal
                </button>
            </div>
        </aside>
    );
};

export default DashboardSidebar;
