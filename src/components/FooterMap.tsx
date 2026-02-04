import React, { useEffect, useRef } from 'react';
import { ExternalLink } from 'lucide-react';

// Declare Leaflet (L) as it is loaded via script tag
declare const L: any;

const FooterMap: React.FC<{ onOpenMap?: () => void }> = ({ onOpenMap }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);

    useEffect(() => {
        if (!mapRef.current) return;

        // Initialize map if not already done
        if (!mapInstance.current) {
            const map = L.map(mapRef.current, {
                zoomControl: false, // Minimalist look for footer
                attributionControl: false,
                dragging: false, // Static-like feel but interactive if needed
                scrollWheelZoom: false, // Prevent page scroll interruption
                doubleClickZoom: false,
                touchZoom: false,
            }).setView([-23.2204, -44.7197], 15); // Center on Paraty

            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                maxZoom: 19
            }).addTo(map);

            // Simple Marker
            const customIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: #0284c7; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                iconSize: [12, 12],
                iconAnchor: [6, 6]
            });

            L.marker([-23.2204, -44.7197], { icon: customIcon }).addTo(map);

            mapInstance.current = map;
        }

        return () => {
            // Optional cleanup if component unmounts quickly, though for Footer it's rare
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, []);

    return (
        <div
            className="relative w-full h-48 rounded-2xl overflow-hidden border border-white/10 group cursor-pointer"
            onClick={onOpenMap}
        >
            <div ref={mapRef} className="w-full h-full grayscale group-hover:grayscale-0 transition-all duration-500" />

            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-slate-900/50 group-hover:bg-slate-900/20 transition-all flex items-center justify-center">
                <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center gap-2 group-hover:scale-105 transition-transform">
                    <span className="text-white text-xs font-bold uppercase tracking-wider">Ver no Mapa</span>
                    <ExternalLink className="w-3 h-3 text-white" />
                </div>
            </div>
        </div>
    );
};

export default FooterMap;
