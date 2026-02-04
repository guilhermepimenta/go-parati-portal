import React from 'react';
import { AlertCircle, Trash2, FileCheck } from 'lucide-react';
import { Business } from '../../types';

interface ApprovalsManagerProps {
    pendingBusinesses: Business[];
    handleApproveBusiness: (b: Business) => void;
    setEditingBusiness: (b: Business | null) => void;
    setIsAddingNew: (val: boolean) => void;
    handleDeleteBusiness: (id: string) => void;
}

const ApprovalsManager: React.FC<ApprovalsManagerProps> = ({
    pendingBusinesses,
    handleApproveBusiness,
    setEditingBusiness,
    setIsAddingNew,
    handleDeleteBusiness
}) => {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Aprovações Pendentes</h1>
                    <p className="text-slate-400 font-medium text-lg">Conteúdo enviado por estagiários aguardando revisão.</p>
                </div>
            </div>

            {pendingBusinesses.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-[32px] border border-slate-100">
                    <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Nenhum item pendente no momento.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingBusinesses.map(b => (
                        <div key={b.id} className="bg-white p-6 rounded-[32px] border border-amber-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4">
                                <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Revisão
                                </span>
                            </div>
                            <h3 className="font-bold text-lg mb-1">{b.name}</h3>
                            <p className="text-xs text-slate-400 mb-4 uppercase tracking-wider">{b.category}</p>

                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-50">
                                <button
                                    onClick={() => handleApproveBusiness(b)}
                                    className="flex-1 py-2 bg-emerald-50 text-emerald-600 font-bold rounded-xl hover:bg-emerald-100 transition-colors text-sm"
                                >
                                    Aprovar
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingBusiness(b);
                                        setIsAddingNew(true); // Re-use the edit form
                                    }}
                                    className="flex-1 py-2 bg-slate-50 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-colors text-sm"
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleDeleteBusiness(b.id)}
                                    className="p-2 text-rose-500 bg-rose-50 rounded-xl hover:bg-rose-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ApprovalsManager;
