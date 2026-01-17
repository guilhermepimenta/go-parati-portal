import React, { useEffect, useRef, useState } from 'react';
import { X, Navigation, MapPin, Loader2 } from 'lucide-react';

declare const L: any;

interface MapModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const MapModal: React.FC<MapModalProps> = ({ isOpen, onClose }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const userMarkerRef = useRef<any>(null);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);

    // Initialize Map
    useEffect(() => {
        if (!isOpen || !mapRef.current || mapInstance.current) return;

        // Default to Paraty center
        const map = L.map(mapRef.current, {
            zoomControl: false
        }).setView([-23.2204, -44.7197], 14);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            maxZoom: 19
        }).addTo(map);

        L.control.zoom({
            position: 'bottomright'
        }).addTo(map);

        mapInstance.current = map;

        // Auto locate on open
        handleLocateMe();

        // Cleanup
        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
                userMarkerRef.current = null;
            }
        };
    }, [isOpen]);

    // Handle locating user
    const handleLocateMe = () => {
        if (!mapInstance.current) return;

        setIsLoadingLocation(true);

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const latLng = [latitude, longitude];

                    // Center map
                    mapInstance.current.flyTo(latLng, 16);

                    // Add/Update Marker
                    if (userMarkerRef.current) {
                        userMarkerRef.current.setLatLng(latLng);
                    } else {
                        const userIcon = L.divIcon({
                            className: 'custom-user-icon',
                            html: `<div style="background-color: #0ea5e9; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.2); position: relative;">
                                    <div style="position: absolute; top: -30px; left: 50%; transform: translateX(-50%); background: #0f172a; color: white; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: bold; white-space: nowrap; pointer-events: none;">Você está aqui</div>
                                   </div>`,
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        });

                        userMarkerRef.current = L.marker(latLng, { icon: userIcon })
                            .addTo(mapInstance.current)
                            .bindPopup('Sua localização atual');
                    }

                    setIsLoadingLocation(false);
                },
                (error) => {
                    console.error("Error getting location", error);
                    setIsLoadingLocation(false);
                    // Could show toast error here
                },
                { enableHighAccuracy: true }
            );
        } else {
            setIsLoadingLocation(false);
            alert('Geolocalização não suportada pelo seu navegador');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[32px] w-full max-w-4xl h-[80vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col relative">

                {/* Header */}
                <div className="absolute top-0 left-0 right-0 p-6 z-[1000] pointer-events-none flex justify-between items-start">
                    <div className="bg-white/90 backdrop-blur shadow-lg border border-slate-100 px-4 py-3 rounded-2xl pointer-events-auto">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-sky-500" />
                            <div>
                                <h3 className="font-bold text-slate-800 leading-tight">Mapa Interativo</h3>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Explore Paraty</p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="bg-white/90 hover:bg-white backdrop-blur shadow-lg border border-slate-100 p-3 rounded-full text-slate-400 hover:text-slate-600 transition-all active:scale-95 pointer-events-auto"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Map Container */}
                <div ref={mapRef} className="w-full h-full bg-slate-100 z-0" />

                {/* Floating Action Button */}
                <div className="absolute bottom-6 right-6 z-[1000] flex flex-col gap-3">
                    <button
                        onClick={handleLocateMe}
                        className="bg-sky-500 hover:bg-sky-600 text-white shadow-xl shadow-sky-500/30 p-4 rounded-2xl transition-all active:scale-95 flex items-center gap-2 font-bold"
                    >
                        {isLoadingLocation ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Navigation className="w-5 h-5 fill-current" />
                        )}
                        <span className="hidden md:inline">{isLoadingLocation ? 'Localizando...' : 'Minha Localização'}</span>
                    </button>
                </div>

            </div>
        </div>
    );
};

export default MapModal;
