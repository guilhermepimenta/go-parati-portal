import React, { useEffect, useState } from 'react';
import { AlertTriangle, X, Info, Wind, CloudRain } from 'lucide-react';
import { fetchWeatherAlerts, WeatherAlert } from '../services/WeatherService';

const EmergencyBanner: React.FC = () => {
    const [alert, setAlert] = useState<WeatherAlert | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const loadAlerts = async () => {
            const alerts = await fetchWeatherAlerts('Paraty');
            if (alerts.length > 0) {
                setAlert(alerts[0]); // Show the first/most critical alert
                setIsVisible(true);
            }
        };

        loadAlerts();
    }, []);

    if (!isVisible || !alert) return null;

    // Determine visual style based on severity/event
    const isCritical = alert.severity === 'Extreme' || alert.severity === 'Severe';

    // Theme Colors
    const bgClass = isCritical
        ? 'bg-rose-600/90 shadow-rose-900/20'
        : 'bg-amber-500/90 shadow-amber-900/20';

    const iconBase = isCritical
        ? <AlertTriangle className="w-6 h-6 text-white animate-pulse" />
        : <Info className="w-6 h-6 text-white" />;

    return (
        <div className={`fixed top-24 sm:top-28 md:top-32 lg:top-36 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-4xl z-[70] animate-in slide-in-from-top-4 duration-700 ease-out rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md border border-white/20 ${bgClass}`}>

            {/* Animated Texture */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')]"></div>

            <div className="relative p-5 md:p-6 flex items-start gap-4">
                <div className={`p-3 rounded-xl bg-white/20 shadow-inner flex-shrink-0`}>
                    {iconBase}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-white/20 text-white border border-white/10">
                            {alert.note || 'Defesa Civil'}
                        </span>
                        <span className="text-white/80 text-xs font-bold uppercase tracking-wider">
                            {new Date(alert.effective).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>

                    <h3 className="text-white font-bold text-lg leading-tight mb-2 pr-8">
                        {alert.event || alert.headline}
                    </h3>

                    <p className="text-white/90 text-sm leading-relaxed line-clamp-2 md:line-clamp-none font-medium">
                        {alert.desc}
                    </p>

                    {alert.instruction && (
                        <div className="mt-3 pt-3 border-t border-white/20 text-xs text-white/80 font-bold flex items-center gap-2">
                            <Info className="w-3.5 h-3.5" />
                            {alert.instruction}
                        </div>
                    )}
                </div>

                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute top-4 right-4 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default EmergencyBanner;
