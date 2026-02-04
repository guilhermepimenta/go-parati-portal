
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { BarChart3, TrendingUp, Search, MousePointer2, MapPin } from 'lucide-react';

interface Stats {
    totalEvents: number;
    topBusinesses: { name: string; count: number }[];
    topSearches: { query: string; count: number }[];
    eventTrends: { date: string; count: number }[];
}

const AnalyticsOverview: React.FC = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            try {
                // In a real scenario, this would be a more complex aggregation or a Supabase View/RPC
                // For now, we fetch recent events and aggregate in JS for the demo
                const { data: events, error } = await supabase
                    .from('analytics_events')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(1000);

                if (error) throw error;

                if (events) {
                    const totalEvents = events.length;

                    // Aggregate Businesses
                    const bizMap: Record<string, number> = {};
                    events.filter(e => e.event_type === 'business_click' || e.event_type === 'page_view' && e.category === 'business_detail')
                        .forEach(e => {
                            const id = e.resource_id || 'Unknown';
                            bizMap[id] = (bizMap[id] || 0) + 1;
                        });

                    // Aggregate Searches
                    const searchMap: Record<string, number> = {};
                    events.filter(e => e.event_type === 'search')
                        .forEach(e => {
                            const q = e.query?.toLowerCase().trim();
                            if (q) searchMap[q] = (searchMap[q] || 0) + 1;
                        });

                    setStats({
                        totalEvents,
                        topBusinesses: Object.entries(bizMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, count]) => ({ name: id, count })),
                        topSearches: Object.entries(searchMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([query, count]) => ({ query, count })),
                        eventTrends: [] // Simplified for now
                    });
                }
            } catch (err) {
                console.error('Failed to fetch analytics:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (isLoading) return <div className="p-8 animate-pulse text-slate-400">Carregando métricas...</div>;
    if (!stats) return <div className="p-8 text-slate-400">Nenhum dado disponível ainda.</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-blue-50 rounded-2xl">
                            <BarChart3 className="w-6 h-6 text-blue-600" />
                        </div>
                        <h4 className="font-bold text-slate-900">Total de Interações</h4>
                    </div>
                    <p className="text-4xl font-black text-slate-900">{stats.totalEvents}</p>
                    <p className="text-sm text-slate-500 mt-2">Eventos registrados</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-emerald-50 rounded-2xl">
                            <TrendingUp className="w-6 h-6 text-emerald-600" />
                        </div>
                        <h4 className="font-bold text-slate-900">Conversão de Rota</h4>
                    </div>
                    <p className="text-4xl font-black text-slate-900">--</p>
                    <p className="text-sm text-slate-500 mt-2">Baseado em cliques no mapa</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-amber-50 rounded-2xl">
                            <Search className="w-6 h-6 text-amber-600" />
                        </div>
                        <h4 className="font-bold text-slate-900">Principais Buscas</h4>
                    </div>
                    <p className="text-4xl font-black text-slate-900">{stats.topSearches.length}</p>
                    <p className="text-sm text-slate-500 mt-2">Termos únicos hoje</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                    <h4 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <MousePointer2 className="w-5 h-5 text-sky-500" />
                        Negócios mais Populares
                    </h4>
                    <div className="space-y-4">
                        {stats.topBusinesses.map((biz, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                <span className="font-semibold text-slate-700 truncate mr-4">{biz.name}</span>
                                <span className="px-3 py-1 bg-white text-sky-600 rounded-full text-xs font-bold border border-sky-100">
                                    {biz.count} views
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                    <h4 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Search className="w-5 h-5 text-amber-500" />
                        Termos mais Buscados
                    </h4>
                    <div className="space-y-4">
                        {stats.topSearches.map((s, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                <span className="font-semibold text-slate-700 italic">"{s.query}"</span>
                                <span className="px-3 py-1 bg-white text-amber-600 rounded-full text-xs font-bold border border-amber-100">
                                    {s.count} vezes
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsOverview;
