import React from 'react';
import { Mail, Phone, Trash2 } from 'lucide-react';
import { Lead } from '../../types';

interface LeadsManagerProps {
    leadsList: Lead[];
    handleDeleteLead: (id: string) => void;
}

const LeadsManager: React.FC<LeadsManagerProps> = ({ leadsList, handleDeleteLead }) => {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Propostas Comerciais</h1>
                    <p className="text-slate-400 font-medium text-lg">Gerencie os contatos de interessados em anunciar.</p>
                </div>
            </div>

            <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
                {leadsList.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                            <Mail className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-1">Caixa de Entrada Vazia</h3>
                        <p className="text-slate-500">Nenhuma solicitação de proposta recebida ainda.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {leadsList.map((lead) => (
                            <div key={lead.id} className="p-6 hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">{lead.business_name}</h3>
                                        <p className="text-sm text-slate-500 font-bold">{lead.name}</p>
                                    </div>
                                    <span className="text-xs font-mono text-slate-400">
                                        {new Date(lead.created_at).toLocaleDateString()}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Mail className="w-4 h-4 text-sky-500" />
                                        <a href={`mailto:${lead.email}`} className="hover:text-sky-600 hover:underline">{lead.email}</a>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Phone className="w-4 h-4 text-emerald-500" />
                                        <a href={`tel:${lead.phone.replace(/\D/g, '')}`} className="hover:text-emerald-600 hover:underline">{lead.phone}</a>
                                    </div>
                                </div>

                                {lead.message && (
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-600 italic mb-4">
                                        "{lead.message}"
                                    </div>
                                )}

                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={() => handleDeleteLead(lead.id)}
                                        className="px-4 py-2 text-rose-500 hover:bg-rose-50 rounded-lg font-bold text-xs flex items-center gap-2 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" /> Excluir Solicitação
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeadsManager;
