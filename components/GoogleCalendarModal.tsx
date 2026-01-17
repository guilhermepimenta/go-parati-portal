
import React from 'react';
import { X, Calendar, MapPin, Clock, ExternalLink } from 'lucide-react';
import { FeaturedEvent } from '../types';
import { generateGoogleCalendarUrl } from '../utils';

interface GoogleCalendarModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: FeaturedEvent;
}

const GoogleCalendarModal: React.FC<GoogleCalendarModalProps> = ({ isOpen, onClose, event }) => {
    if (!isOpen) return null;

    const handleAddToCalendar = () => {
        const url = generateGoogleCalendarUrl({
            title: event.title,
            description: event.description,
            startDate: event.startDate,
            endDate: event.endDate,
            location: event.location
        });

        // Open as a popup
        const width = 600;
        const height = 700;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;

        window.open(
            url,
            'google-calendar',
            `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
        );

        onClose();
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col relative">

                {/* Header */}
                <div className="p-8 pb-4 text-center">
                    <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Calendar className="w-8 h-8 text-sky-600" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">Adicionar ao Calendário</h3>
                    <p className="text-slate-500 font-medium">Confirme os detalhes do evento abaixo</p>
                </div>

                {/* Content */}
                <div className="px-8 pb-8 space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <h4 className="font-bold text-slate-900 mb-3 text-lg leading-tight">{event.title}</h4>

                        <div className="flex items-start gap-3 text-slate-600 mb-2">
                            <Clock className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
                            <span className="font-medium">{formatDate(event.startDate)}</span>
                        </div>

                        <div className="flex items-start gap-3 text-slate-600">
                            <MapPin className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
                            <span className="font-medium">{event.location || 'Paraty, RJ'}</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col gap-3">
                    <button
                        onClick={handleAddToCalendar}
                        className="w-full py-4 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 active:scale-95"
                    >
                        Abrir Google Agenda para Salvar
                        <ExternalLink className="w-4 h-4 opacity-80" />
                    </button>

                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-white text-slate-500 font-bold rounded-xl hover:bg-slate-100 transition-all border border-slate-200 active:scale-95"
                    >
                        Cancelar
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

export default GoogleCalendarModal;
