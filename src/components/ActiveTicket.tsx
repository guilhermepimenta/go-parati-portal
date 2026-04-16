import React, { useState, useEffect, useCallback } from 'react';
import { Clock, AlertTriangle, RotateCw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ParkingTicket } from '../types';

interface ActiveTicketProps {
    onRenew?: () => void;
}

const ActiveTicket: React.FC<ActiveTicketProps> = ({ onRenew }) => {
    const { t } = useTranslation();
    const [ticket, setTicket] = useState<ParkingTicket | null>(null);
    const [timeLeft, setTimeLeft] = useState('');
    const [urgent, setUrgent] = useState(false);
    const [expired, setExpired] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    // Load ticket from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('activeTicket');
        if (stored) {
            try {
                const parsed: ParkingTicket = JSON.parse(stored);
                // Check if ticket has already expired (with 30min grace to still show)
                const expiresAt = new Date(parsed.expires_at).getTime();
                const gracePeriod = 30 * 60 * 1000; // 30 min after expiry still show
                if (Date.now() < expiresAt + gracePeriod && parsed.status === 'paid') {
                    setTicket(parsed);
                } else {
                    localStorage.removeItem('activeTicket');
                }
            } catch {
                localStorage.removeItem('activeTicket');
            }
        }
    }, []);

    // Listen for storage changes (new ticket created)
    useEffect(() => {
        const handleUpdate = () => {
            const stored = localStorage.getItem('activeTicket');
            if (stored) {
                try {
                    setTicket(JSON.parse(stored));
                    setDismissed(false);
                    setExpired(false);
                } catch { /* ignore */ }
            } else {
                setTicket(null);
            }
        };
        window.addEventListener('storage', handleUpdate);
        window.addEventListener('ticketUpdated', handleUpdate);
        return () => {
            window.removeEventListener('storage', handleUpdate);
            window.removeEventListener('ticketUpdated', handleUpdate);
        };
    }, []);

    // Countdown timer
    const updateTimer = useCallback(() => {
        if (!ticket) return;

        const expiresAt = new Date(ticket.expires_at).getTime();
        const now = Date.now();
        const diff = expiresAt - now;

        if (diff <= 0) {
            setTimeLeft('00:00');
            setExpired(true);
            setUrgent(true);
            return;
        }

        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
        setUrgent(minutes < 10);
        setExpired(false);
    }, [ticket]);

    useEffect(() => {
        if (!ticket) return;
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [ticket, updateTimer]);

    const handleDismiss = () => {
        setDismissed(true);
        if (expired) {
            localStorage.removeItem('activeTicket');
            setTicket(null);
        }
    };

    if (!ticket || dismissed) return null;

    return (
        <div className={`fixed top-4 left-4 right-4 z-[55] sm:left-auto sm:right-4 sm:max-w-xs animate-in slide-in-from-top-4 duration-300`}>
            <div className={`rounded-2xl shadow-xl border p-3 backdrop-blur-sm ${
                expired
                    ? 'bg-red-50/95 border-red-300'
                    : urgent
                        ? 'bg-amber-50/95 border-amber-300'
                        : 'bg-white/95 border-border'
            }`}>
                <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl ${
                        expired ? 'bg-red-100' : urgent ? 'bg-amber-100' : 'bg-coral/10'
                    }`}>
                        {expired ? (
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                        ) : (
                            <Clock className={`w-5 h-5 ${urgent ? 'text-amber-600' : 'text-coral'}`} />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-muted">
                                {expired ? t('parking.timer_expired') : t('parking.timer_active')}
                            </p>
                            <button onClick={handleDismiss} className="p-0.5 hover:bg-black/5 rounded">
                                <X className="w-3.5 h-3.5 text-muted" />
                            </button>
                        </div>
                        <div className="flex items-baseline gap-2 mt-0.5">
                            <span className={`text-2xl font-black tabular-nums ${
                                expired ? 'text-red-600' : urgent ? 'text-amber-600' : 'text-ink'
                            }`}>
                                {timeLeft}
                            </span>
                            <span className="text-xs font-bold tracking-widest text-muted">{ticket.plate}</span>
                        </div>
                    </div>
                </div>

                {(urgent || expired) && onRenew && (
                    <button
                        onClick={onRenew}
                        className={`w-full mt-2 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                            expired
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-amber-500 text-white hover:bg-amber-600'
                        }`}
                    >
                        <RotateCw className="w-3.5 h-3.5" />
                        {t('parking.renew')}
                    </button>
                )}
            </div>
        </div>
    );
};

export default ActiveTicket;
