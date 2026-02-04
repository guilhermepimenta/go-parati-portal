import React, { useEffect, useState } from 'react';
import { Heart, Instagram, ExternalLink } from 'lucide-react';
import { supabase } from '../supabase';
import { FeedPost } from '../types';

interface InstagramPost {
    id: string;
    imageUrl: string;
    caption: string;
    permalink: string;
    timestamp: string;
    likes: number;
    comments: number;
}

const LiveFeed: React.FC = () => {
    const [displayPosts, setDisplayPosts] = useState<any[]>([]); // Using any for flexibility or FeedPost
    const [isFading, setIsFading] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRealFeed = async () => {
        try {
            const { data, error } = await supabase
                .from('feed_posts')
                .select('*')
                .eq('active', true)
                .order('created_at', { ascending: false })
                .limit(8); // Fetch latest 8 to cycle through

            if (error) throw error;

            if (data && data.length > 0) {
                // Transform to match InstagramPost shape if needed, or just use as is
                const adapted = data.map((p: FeedPost) => ({
                    id: p.id,
                    imageUrl: p.image_url,
                    caption: p.caption,
                    likes: p.likes || 0,
                    comments: 0
                }));

                // Shuffle initially
                const shuffled = [...adapted].sort(() => 0.5 - Math.random());
                setDisplayPosts(shuffled.slice(0, 4));
            } else {
                // Fallback to constants if empty
                const { MOCK_INSTAGRAM_FEED } = await import('../config/constants');
                setDisplayPosts(MOCK_INSTAGRAM_FEED.slice(0, 4));
            }
        } catch (err) {
            console.error('Error fetching live feed:', err);
            // Fallback
            const { MOCK_INSTAGRAM_FEED } = await import('../config/constants');
            setDisplayPosts(MOCK_INSTAGRAM_FEED.slice(0, 4));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRealFeed();

        const interval = setInterval(() => {
            setIsFading(true);

            setTimeout(() => {
                fetchRealFeed(); // Re-fetch or reshuffle. For now simpliest is just fetch & shuffle logic re-trigger or locally shuffle.
                // Better: shuffle local list.
                setDisplayPosts(prev => {
                    // Since we fetch only 8, we can just reshuffle existing if we stored all. 
                    // For simplicity, let's just trigger a re-fetch or store all in another state.
                    // But simpler: just re-trigger fetchRealFeed to ensure updates appear? 
                    // Or better: fetchRealFeed sets a pool, interval rotates the pool.
                    // Let's keep it simple: just fetch again to get new uploads immediately.
                    return prev;
                });
                fetchRealFeed().then(() => setIsFading(false));
            }, 500);

        }, 10000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-slate-900 rounded-[32px] p-6 shadow-xl shadow-slate-900/20 border border-slate-800">
            <div className="flex flex-col gap-6">

                {/* Header */}
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                            </span>
                            <h2 className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">AO VIVO</h2>
                        </div>
                        <h3 className="text-lg font-bold text-white leading-tight">
                            @prefeitura.paraty
                        </h3>
                    </div>

                    <a
                        href="https://www.instagram.com/prefeitura.paraty/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-slate-800 border border-slate-700 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-all active:scale-95"
                        title="Ver no Instagram"
                    >
                        <Instagram className="w-4 h-4" />
                    </a>
                </div>

                {/* Grid (Cole seu Widget Aqui) */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Exemplo com Elfsight ou SnapWidget: 
                        <div className="elfsight-app-..." ></div>
                        OU
                        <iframe src="https://snapwidget.com/..." ...></iframe>
                    */}

                    {/* Fallback Display (Mock Data) */}
                    {displayPosts.map((post) => (
                        <a
                            key={post.id}
                            href="https://www.instagram.com/prefeitura.paraty/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative aspect-square overflow-hidden rounded-xl bg-slate-800 cursor-pointer block"
                        >
                            <img
                                src={post.imageUrl}
                                alt={post.caption}
                                className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:opacity-100 ${isFading ? 'opacity-0 scale-95 blur-sm' : 'opacity-80'}`}
                            />

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-2">
                                <div className="flex items-center gap-2 text-white font-bold">
                                    <Heart className="w-3 h-3 fill-white text-white" />
                                    <span className="text-[10px]">{post.likes}</span>
                                </div>
                            </div>
                        </a>
                    ))}
                </div>

                {/* CTA */}
                <a
                    href="https://www.instagram.com/prefeitura.paraty/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-bold text-slate-300 text-xs transition-all active:scale-95"
                >
                    <ExternalLink className="w-3 h-3" />
                    Acessar Perfil
                </a>
            </div>
        </div>
    );
};

export default LiveFeed;
