import React from 'react';
import { LogOut } from 'lucide-react';

interface DashboardMobileHeaderProps {
    onLogout: () => void;
}

const DashboardMobileHeader: React.FC<DashboardMobileHeaderProps> = ({ onLogout }) => {
    return (
        <div className="md:hidden flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold">GP</div>
                <span className="font-bold text-slate-900">GoParati Admin</span>
            </div>
            <button onClick={onLogout} className="p-2 text-slate-400"><LogOut className="w-5 h-5" /></button>
        </div>
    );
};

export default DashboardMobileHeader;
