import React, { useEffect, useState } from 'react';
import { Heart, Instagram, ExternalLink } from 'lucide-react';
import { MOCK_INSTAGRAM_FEED } from '../constants';

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
    // Para usar um Widget real (Ex: SnapWidget, Elfsight):
    // 1. Gere o código no site do provedor.
    // 2. Cole o código do <iframe> ou <script> dentro da div "Grid" abaixo.
    // 3. Remova o map do MOCK_INSTAGRAM_FEED.

    const [displayPosts, setDisplayPosts] = useState(MOCK_INSTAGRAM_FEED.slice(0, 4));
    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsFading(true); // Start fade out

            setTimeout(() => {
                // Shuffle and pick 4 unique posts
                const shuffled = [...MOCK_INSTAGRAM_FEED].sort(() => 0.5 - Math.random());
                setDisplayPosts(shuffled.slice(0, 4));
                setIsFading(false); // Start fade in
            }, 500); // Wait for half transition

        }, 10000); // 10 seconds

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
