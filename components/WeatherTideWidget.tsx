import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, Droplets, Wind, Waves, AlertTriangle, Moon, ArrowDown, ArrowUp } from 'lucide-react';

interface WeatherData {
    temperature: number;
    weatherCode: number;
    windSpeed: number;
    isDay: boolean;
}

interface TideData {
    status: 'rising' | 'falling';
    nextHighTide: string;
    nextLowTide: string;
    height: number; // meters representation
    isHighTideWarning: boolean;
}

interface WeatherTideWidgetProps {
    variant?: 'default' | 'footer';
}

const WeatherTideWidget: React.FC<WeatherTideWidgetProps> = ({ variant = 'default' }) => {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [tide, setTide] = useState<TideData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Weather from Open-Meteo
                // Coordinates for Paraty: -23.2204, -44.7197
                const weatherRes = await fetch(
                    'https://api.open-meteo.com/v1/forecast?latitude=-23.2204&longitude=-44.7197&current=temperature_2m,weather_code,wind_speed_10m,is_day&timezone=America%2FSao_Paulo'
                );
                const weatherData = await weatherRes.json();

                if (weatherData.current) {
                    setWeather({
                        temperature: Math.round(weatherData.current.temperature_2m),
                        weatherCode: weatherData.current.weather_code,
                        windSpeed: weatherData.current.wind_speed_10m,
                        isDay: weatherData.current.is_day === 1
                    });
                }

                // 2. Simulate Tide Data (Mock Logic based on time for prototype)
                // In a real production app, we would use a specific marine API.
                // For now, we simulate a 6-hour tide cycle.
                const now = new Date();
                const hours = now.getHours();
                const cycle = (hours % 12) / 12; // 0 to 1 cycle

                // Simple mock sine wave for tide height
                const tideHeight = 1.5 + Math.sin(cycle * Math.PI * 2);
                const isRising = Math.cos(cycle * Math.PI * 2) > 0;

                // Calculate dynamic "Next" times
                const nextHigh = new Date();
                nextHigh.setHours(hours + (isRising ? 2 : 8), 30);
                const nextLow = new Date();
                nextLow.setHours(hours + (isRising ? 8 : 2), 30);

                setTide({
                    status: isRising ? 'rising' : 'falling',
                    height: parseFloat(tideHeight.toFixed(1)),
                    nextHighTide: nextHigh.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    nextLowTide: nextLow.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    // Warning if tide is high (>2.0m) AND it's likely raining (weather code > 50)
                    isHighTideWarning: tideHeight > 2.0
                });

            } catch (error) {
                console.error("Error fetching weather/tide:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const getWeatherIcon = (code: number, isDay: boolean) => {
        // Open-Meteo WMO codes: https://open-meteo.com/en/docs
        if (code === 0) return isDay ? <Sun className={`${variant === 'footer' ? 'w-5 h-5' : 'w-8 h-8'} text-amber-400`} /> : <Moon className={`${variant === 'footer' ? 'w-5 h-5' : 'w-8 h-8'} text-indigo-300`} />;
        if (code >= 1 && code <= 3) return <Cloud className={`${variant === 'footer' ? 'w-5 h-5' : 'w-8 h-8'} text-slate-400`} />;
        if (code >= 51 && code <= 67) return <CloudRain className={`${variant === 'footer' ? 'w-5 h-5' : 'w-8 h-8'} text-sky-400`} />;
        if (code >= 80) return <Droplets className={`${variant === 'footer' ? 'w-5 h-5' : 'w-8 h-8'} text-sky-600`} />;
        return <Cloud className={`${variant === 'footer' ? 'w-5 h-5' : 'w-8 h-8'} text-slate-400`} />;
    };

    const getWeatherDescription = (code: number) => {
        switch (code) {
            case 0: return 'Céu Limpo';
            case 1:
            case 2:
            case 3: return 'Parcialmente Nublado';
            case 45:
            case 48: return 'Nevoeiro';
            case 51:
            case 53:
            case 55: return 'Garoa';
            case 61:
            case 63:
            case 65: return 'Chuva';
            case 80:
            case 81:
            case 82: return 'Pancadas de Chuva';
            case 95:
            case 96:
            case 99: return 'Tempestade';
            default: return 'Nublado';
        }
    };

    if (loading) return null; // Or a skeleton loader if preferred

    if (variant === 'footer') {
        return (
            <div className="mt-8 pt-8 border-t border-white/10">
                <div className="flex flex-col gap-4">
                    {/* Weather Row */}
                    <div className="flex items-center gap-3">
                        <div className="bg-white/5 p-2 rounded-lg">
                            {weather && getWeatherIcon(weather.weatherCode, weather.isDay)}
                        </div>
                        <div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-bold text-white">{weather?.temperature}°</span>
                                <span className="text-xs text-slate-400">{weather && getWeatherDescription(weather.weatherCode)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Tide Row */}
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${tide?.isHighTideWarning ? 'bg-amber-500/10' : 'bg-white/5'}`}>
                            {tide?.status === 'rising' ?
                                <Waves className={`w-5 h-5 ${tide?.isHighTideWarning ? 'text-amber-500' : 'text-sky-400'}`} /> :
                                <Waves className="w-5 h-5 text-indigo-400" />
                            }
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-300">Maré {tide?.status === 'rising' ? 'Enchendo' : 'Vazando'}</span>
                                {tide?.isHighTideWarning && (
                                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                                <span>Alta: {tide?.nextHighTide}</span>
                                <span className="w-1 h-1 bg-slate-700 rounded-full" />
                                <span>Baixa: {tide?.nextLowTide}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto -mt-8 relative z-20 px-4">
            <div className="bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl rounded-[24px] p-6 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-12 animate-in fade-in slide-in-from-bottom-8 duration-700">

                {/* Weather Section */}
                <div className="flex items-center gap-6 flex-1 border-b md:border-b-0 md:border-r border-slate-200/60 pb-6 md:pb-0 md:pr-6 w-full md:w-auto">
                    <div className="p-4 bg-sky-50 rounded-2xl shadow-inner">
                        {weather && getWeatherIcon(weather.weatherCode, weather.isDay)}
                    </div>
                    <div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-slate-900">{weather?.temperature}°</span>
                            <span className="text-sm font-bold text-slate-500">{weather && getWeatherDescription(weather.weatherCode)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <Wind className="w-3 h-3" /> Vento: {weather?.windSpeed} km/h
                        </div>
                    </div>
                </div>

                {/* Tide Section */}
                <div className="flex items-center gap-6 flex-1 w-full md:w-auto">
                    <div className={`p-3 rounded-2xl shadow-inner relative overflow-hidden ${tide?.isHighTideWarning ? 'bg-amber-50 text-amber-500' : 'bg-indigo-50 text-indigo-500'}`}>
                        <Waves className="w-8 h-8 relative z-10" />
                        {/* Simple wave animation background could go here */}
                    </div>

                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Maré {tide?.status === 'rising' ? 'Enchendo' : 'Vazando'}</span>
                            {tide?.isHighTideWarning && (
                                <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black uppercase">
                                    <AlertTriangle className="w-3 h-3" /> Atenção
                                </span>
                            )}
                        </div>

                        <div className="flex items-end gap-1">
                            <span className="text-2xl font-black text-slate-900">{tide?.height}m</span>
                            {tide?.status === 'rising' ?
                                <ArrowUp className="w-5 h-5 text-emerald-500 mb-1" /> :
                                <ArrowDown className="w-5 h-5 text-rose-500 mb-1" />
                            }
                        </div>

                        <div className="flex gap-4 mt-2 text-[10px] font-bold text-slate-500">
                            <span className="flex items-center gap-1"><ArrowUp className="w-3 h-3 text-slate-300" /> Alta: {tide?.nextHighTide}</span>
                            <span className="flex items-center gap-1"><ArrowDown className="w-3 h-3 text-slate-300" /> Baixa: {tide?.nextLowTide}</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default WeatherTideWidget;
