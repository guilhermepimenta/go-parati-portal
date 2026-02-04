import React, { useEffect, useRef, useState } from 'react';
import { X, Navigation, MapPin, Loader2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet-routing-machine';

interface MapModalProps {
    isOpen: boolean;
    onClose: () => void;
    destination?: { lat: number; lng: number } | null;
}

const MapModal: React.FC<MapModalProps> = ({ isOpen, onClose, destination }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const userMarkerRef = useRef<any>(null);
    const routingControlRef = useRef<any>(null);
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
                routingControlRef.current = null;
            }
        };
    }, [isOpen]);

    // Cleanup routing control when closed
    useEffect(() => {
        if (!isOpen && routingControlRef.current && mapInstance.current) {
            try {
                mapInstance.current.removeControl(routingControlRef.current);
            } catch (e) {
                console.warn("Error removing routing control", e);
            }
            routingControlRef.current = null;
        }
    }, [isOpen]);


    // Handle locating user
    const handleLocateMe = () => {
        if (!mapInstance.current) return;

        setIsLoadingLocation(true);

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const latLng: [number, number] = [latitude, longitude];

                    // Center map if not routing
                    if (!destination) {
                        mapInstance.current.flyTo(latLng, 16);
                    }

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

                    // Draw Route if destination exists
                    if (destination) {
                        drawRoute(latLng, [destination.lat, destination.lng]);
                    }

                    setIsLoadingLocation(false);
                },
                (error) => {
                    console.error("Error getting location", error);
                    setIsLoadingLocation(false);
                },
                { enableHighAccuracy: true }
            );
        } else {
            setIsLoadingLocation(false);
            alert('Geolocalização não suportada pelo seu navegador');
        }
    };

    const drawRoute = (start: [number, number], end: [number, number]) => {
        if (!mapInstance.current) return;

        // Remove existing route
        if (routingControlRef.current) {
            try {
                mapInstance.current.removeControl(routingControlRef.current);
            } catch (e) { }
        }

        // @ts-ignore
        if (L.Routing) {
            // @ts-ignore
            routingControlRef.current = L.Routing.control({
                waypoints: [
                    L.latLng(start[0], start[1]),
                    L.latLng(end[0], end[1])
                ],
                routeWhileDragging: false,
                showAlternatives: false,
                lineOptions: {
                    styles: [{ color: '#0ea5e9', opacity: 0.8, weight: 6 }]
                },
                addWaypoints: false,
                draggableWaypoints: false,
                fitSelectedRoutes: true,
                language: 'pt-BR', // Translate instructions
                show: true, // Explicitly show instructions if user wants them, or keep false if previously hidden. 
                // Wait, if user provided screenshot WITH instructions, they probably want them but translated. 
                // The previous code had show: false. If effective, user wouldn't see text. 
                // If user sees text, show: false might be ineffective or user version different.
                // I will set language: 'pt-BR'. I will keep show: false if that was the intent, but user sees them...
                // Actually, let's just add language.
                createMarker: function () { return null; } // Avoid creating default markers on waypoints
            }).addTo(mapInstance.current);

            // Add destination marker explicitly
            L.marker(end, {
                icon: L.divIcon({
                    className: 'dest-marker',
                    html: `<div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                })
            }).addTo(mapInstance.current);
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
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                    {destination ? 'Traçando Rota...' : 'Explore Paraty'}
                                </p>
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
