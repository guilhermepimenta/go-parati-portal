import React from 'react';
import { X, Calendar, Clock, Sparkles } from 'lucide-react';
import { FeaturedEvent } from '../types';

interface ScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: FeaturedEvent;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ isOpen, onClose, event }) => {
    if (!isOpen) return null;

    // Parse schedule string into items
    // Assumes format: "HH:mm - Activity" separated by newlines or literal \n
    const scheduleItems = event.schedule
        ? event.schedule.split(/\\n|\n/).map(item => {
            const parts = item.trim().split('-');
            if (parts.length >= 2) {
                return {
                    time: parts[0].trim(),
                    activity: parts.slice(1).join('-').trim()
                };
            }
            return { time: '', activity: item.trim() };
        }).filter(item => item.activity)
        : [];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col relative max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
            >

                {/* Header */}
                <div className="p-8 pb-4 text-center shrink-0">
                    <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Sparkles className="w-8 h-8 text-amber-400" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2 leading-tight">{event.title}</h3>
                    <p className="text-slate-500 font-medium">Programação Oficial</p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-8 pb-8">
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                        {scheduleItems.length > 0 ? (
                            <div className="space-y-0">
                                {scheduleItems.map((item, index) => (
                                    <div key={index} className="flex gap-4 group">
                                        {/* Timeline Line */}
                                        <div className="flex flex-col items-center">
                                            <div className={`w-3 h-3 rounded-full border-2 z-10 bg-white ${index === 0 ? 'border-sky-500 ring-4 ring-sky-500/20' : 'border-slate-300 group-hover:border-sky-400 transition-colors'}`} />
                                            {index !== scheduleItems.length - 1 && (
                                                <div className="w-0.5 flex-1 bg-slate-200 my-1 group-hover:bg-slate-300 transition-colors" />
                                            )}
                                        </div>

                                        {/* Item Content */}
                                        <div className="pb-8 flex-1">
                                            {item.time && (
                                                <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold mb-2 ${index === 0 ? 'bg-sky-100 text-sky-700' : 'bg-slate-200 text-slate-600'}`}>
                                                    {item.time}
                                                </span>
                                            )}
                                            <p className={`text-base font-medium leading-relaxed ${index === 0 ? 'text-slate-900' : 'text-slate-600'}`}>
                                                {item.activity}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">Cronograma não disponível</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 pt-0 bg-white flex shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors active:scale-95"
                    >
                        Fechar
                    </button>
                </div>

                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 bg-white rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

            </div>
        </div>
    );
};

export default ScheduleModal;
