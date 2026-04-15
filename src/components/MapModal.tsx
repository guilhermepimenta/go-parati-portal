import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Navigation, MapPin, Loader2, Play, Square } from 'lucide-react';
import L from 'leaflet';
import 'leaflet-routing-machine';
import {
    ensurePtBrRoutingLocale,
    formatRemainingDistance,
    formatRemainingTime,
    getClosestRoutePointIndex,
    getDistanceFromRouteMeters,
    getNextInstruction,
    getRemainingDistanceMeters,
    isNavigationEligibleCategory,
    NavigationRouteData,
} from '../lib/navigation';

interface MapModalProps {
    isOpen: boolean;
    onClose: () => void;
    destination?: { lat: number; lng: number; name?: string; category?: string } | null;
}

const MapModal: React.FC<MapModalProps> = ({ isOpen, onClose, destination }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const userMarkerRef = useRef<any>(null);
    const destinationMarkerRef = useRef<any>(null);
    const routingControlRef = useRef<any>(null);
    const fallbackRouteRef = useRef<L.Polyline | null>(null);
    const watchIdRef = useRef<number | null>(null);
    const lastRerouteAtRef = useRef(0);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);
    const [routeData, setRouteData] = useState<NavigationRouteData | null>(null);
    const [isNavigating, setIsNavigating] = useState(false);
    const [remainingDistance, setRemainingDistance] = useState<number | null>(null);
    const [remainingTime, setRemainingTime] = useState<number | null>(null);
    const [nextInstruction, setNextInstruction] = useState('Siga pela rota destacada');

    const canStartNavigation = useMemo(() => {
        if (!destination) return false;
        return !destination.category || isNavigationEligibleCategory(destination.category);
    }, [destination]);

    const clearActiveRoute = useCallback(() => {
        if (!mapInstance.current) return;

        if (routingControlRef.current) {
            try {
                mapInstance.current.removeControl(routingControlRef.current);
            } catch (error) {
                console.warn('Error removing routing control', error);
            }
            routingControlRef.current = null;
        }

        if (fallbackRouteRef.current) {
            mapInstance.current.removeLayer(fallbackRouteRef.current);
            fallbackRouteRef.current = null;
        }
    }, []);

    const stopNavigation = useCallback(() => {
        if (watchIdRef.current !== null && 'geolocation' in navigator) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setIsNavigating(false);
    }, []);

    const updateUserMarker = useCallback((latLng: [number, number]) => {
        if (!mapInstance.current) return;

        if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng(latLng);
            return;
        }

        const userIcon = L.divIcon({
            className: 'custom-user-icon',
            html: `<div style="background-color: #0ea5e9; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.2); position: relative;">
                    <div style="position: absolute; top: -30px; left: 50%; transform: translateX(-50%); background: #0f172a; color: white; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: bold; white-space: nowrap; pointer-events: none;">Voce esta aqui</div>
                   </div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        userMarkerRef.current = L.marker(latLng, { icon: userIcon })
            .addTo(mapInstance.current)
            .bindPopup('Sua localizacao atual');
    }, []);

    const updateDestinationMarker = useCallback((latLng: [number, number]) => {
        if (!mapInstance.current) return;

        if (destinationMarkerRef.current) {
            destinationMarkerRef.current.setLatLng(latLng);
            return;
        }

        destinationMarkerRef.current = L.marker(latLng, {
            icon: L.divIcon({
                className: 'dest-marker',
                html: `<div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            })
        }).addTo(mapInstance.current);
    }, []);

    const drawApproximateRoute = useCallback((start: [number, number], end: [number, number]) => {
        if (!mapInstance.current) return;

        if (fallbackRouteRef.current) {
            mapInstance.current.removeLayer(fallbackRouteRef.current);
        }

        fallbackRouteRef.current = L.polyline([start, end], {
            color: '#0ea5e9',
            opacity: 0.85,
            weight: 5,
            dashArray: '8, 10'
        }).addTo(mapInstance.current);
    }, []);

    const drawRoute = useCallback((start: [number, number], end: [number, number]) => {
        if (!mapInstance.current) return;

        clearActiveRoute();
        updateDestinationMarker(end);
        drawApproximateRoute(start, end);
        mapInstance.current.fitBounds([start, end], { padding: [40, 40] });
        setRouteData(null);

        const routing = (L as any).Routing;
        if (!routing?.control) {
            return;
        }

        ensurePtBrRoutingLocale(routing);

        routingControlRef.current = routing.control({
            waypoints: [
                L.latLng(start[0], start[1]),
                L.latLng(end[0], end[1])
            ],
            router: routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1',
                timeout: 8000
            }),
            routeWhileDragging: false,
            showAlternatives: false,
            lineOptions: {
                styles: [{ color: '#0ea5e9', opacity: 0.9, weight: 6 }]
            },
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: true,
            language: 'pt-BR',
            show: true,
            collapsible: false,
            createMarker: function () { return null; }
        }).addTo(mapInstance.current);

        routingControlRef.current.on('routesfound', (event: any) => {
            const route = event.routes?.[0];
            if (!route) return;

            if (fallbackRouteRef.current && mapInstance.current) {
                mapInstance.current.removeLayer(fallbackRouteRef.current);
                fallbackRouteRef.current = null;
            }

            setRouteData({
                coordinates: (route.coordinates || []).map((coordinate: any) => ({ lat: coordinate.lat, lng: coordinate.lng })),
                instructions: (route.instructions || []).map((instruction: any) => ({
                    index: instruction.index,
                    text: instruction.text,
                    distance: instruction.distance,
                    time: instruction.time
                })),
                totalDistanceMeters: route.summary?.totalDistance || 0,
                totalTimeSeconds: route.summary?.totalTime || 0
            });
            setRemainingDistance(route.summary?.totalDistance || null);
            setRemainingTime(route.summary?.totalTime || null);
            setNextInstruction(route.instructions?.[0]?.text || 'Siga pela rota destacada');
        });

        routingControlRef.current.on('routingerror', () => {
            drawApproximateRoute(start, end);
            mapInstance.current?.fitBounds([start, end], { padding: [40, 40] });
        });
    }, [clearActiveRoute, drawApproximateRoute, updateDestinationMarker]);

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
            stopNavigation();
            clearActiveRoute();
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
                userMarkerRef.current = null;
                destinationMarkerRef.current = null;
                routingControlRef.current = null;
                fallbackRouteRef.current = null;
            }
        };
    }, [clearActiveRoute, isOpen, stopNavigation]);

    useEffect(() => {
        if (!isOpen) {
            stopNavigation();
            setRouteData(null);
            setCurrentPosition(null);
            setRemainingDistance(null);
            setRemainingTime(null);
            setNextInstruction('Siga pela rota destacada');
        }
    }, [isOpen, stopNavigation]);

    const handleLocateMe = useCallback(() => {
        if (!mapInstance.current) return;

        setIsLoadingLocation(true);

        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const latLng: [number, number] = [latitude, longitude];
                    setCurrentPosition(latLng);
                    updateUserMarker(latLng);

                    if (!destination) {
                        mapInstance.current.flyTo(latLng, 16);
                    } else {
                        drawRoute(latLng, [destination.lat, destination.lng]);
                    }

                    setIsLoadingLocation(false);
                },
                (error) => {
                    console.error('Error getting location', error);
                    setIsLoadingLocation(false);
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
            );
        } else {
            setIsLoadingLocation(false);
            alert('Geolocalização não suportada pelo seu navegador');
        }
    }, [destination, drawRoute, updateUserMarker]);

    const startNavigation = useCallback(() => {
        if (!destination || !canStartNavigation || !('geolocation' in navigator)) return;

        setIsNavigating(true);

        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const latLng: [number, number] = [position.coords.latitude, position.coords.longitude];
                setCurrentPosition(latLng);
                updateUserMarker(latLng);
                mapInstance.current?.panTo(latLng, { animate: true });
            },
            (error) => {
                console.error('Navigation watch error', error);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
        );
    }, [canStartNavigation, destination, updateUserMarker]);

    useEffect(() => {
        if (!isOpen || !currentPosition || !destination || routeData) return;

        drawRoute(currentPosition, [destination.lat, destination.lng]);
    }, [currentPosition, destination, drawRoute, isOpen, routeData]);

    useEffect(() => {
        if (!isNavigating || !currentPosition || !destination || !routeData) return;

        const currentPoint = { lat: currentPosition[0], lng: currentPosition[1] };
        const closestIndex = getClosestRoutePointIndex(routeData.coordinates, currentPoint);
        const remainingDistanceMeters = getRemainingDistanceMeters(routeData.coordinates, closestIndex);
        const progressRatio = routeData.totalDistanceMeters > 0
            ? Math.min(1, Math.max(0, 1 - remainingDistanceMeters / routeData.totalDistanceMeters))
            : 0;

        setRemainingDistance(remainingDistanceMeters);
        setRemainingTime(routeData.totalTimeSeconds * (1 - progressRatio));
        setNextInstruction(getNextInstruction(routeData.instructions, closestIndex));

        const distanceFromRoute = getDistanceFromRouteMeters(routeData.coordinates, currentPoint);
        const now = Date.now();
        if (distanceFromRoute > 80 && now - lastRerouteAtRef.current > 8000) {
            lastRerouteAtRef.current = now;
            drawRoute(currentPosition, [destination.lat, destination.lng]);
        }
    }, [currentPosition, destination, drawRoute, isNavigating, routeData]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[32px] w-full max-w-5xl h-[82vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col relative">

                {/* Header */}
                <div className="absolute top-0 left-0 right-0 p-6 z-[1000] pointer-events-none flex justify-between items-start">
                    <div className="bg-white/90 backdrop-blur shadow-lg border border-slate-100 px-4 py-3 rounded-2xl pointer-events-auto">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-sky-500" />
                            <div>
                                <h3 className="font-bold text-slate-800 leading-tight">Mapa Interativo</h3>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                    {destination?.name ? destination.name : destination ? 'Traçando Rota...' : 'Explore Paraty'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        title="Fechar"
                        aria-label="Fechar mapa"
                        className="bg-white/90 hover:bg-white backdrop-blur shadow-lg border border-slate-100 p-3 rounded-full text-slate-400 hover:text-slate-600 transition-all active:scale-95 pointer-events-auto"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Map Container - Flex grow */}
                <div ref={mapRef} className="navigation-modal-map flex-1 w-full bg-slate-100 z-0" />

                {/* Navigation Panel - Bottom fixed area */}
                {destination && (
                    <div className="w-full bg-white border-t border-slate-200 shadow-2xl z-[1000] p-5 max-h-[28vh] overflow-y-auto">
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex-1">
                                <p className="text-[10px] uppercase font-black tracking-[0.18em] text-sky-600">Rota ativa</p>
                                <h4 className="text-lg font-bold text-slate-900 leading-tight">{destination.name || 'Destino selecionado'}</h4>
                            </div>
                            {isNavigating ? (
                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-200 whitespace-nowrap">Em trajeto</span>
                            ) : (
                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap">Pronto</span>
                            )}
                        </div>

                        <p className="text-sm text-slate-600 leading-relaxed min-h-[42px]">{nextInstruction}</p>

                        <div className="grid grid-cols-2 gap-3 mt-4 mb-4">
                            <div className="rounded-2xl bg-slate-50 px-4 py-3 border border-slate-100">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Restante</p>
                                <p className="text-sm font-bold text-slate-900">{remainingDistance !== null ? formatRemainingDistance(remainingDistance) : 'Calculando'}</p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-4 py-3 border border-slate-100">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tempo</p>
                                <p className="text-sm font-bold text-slate-900">{remainingTime !== null ? formatRemainingTime(remainingTime) : 'Estimando'}</p>
                            </div>
                        </div>

                        {canStartNavigation && (
                            <button
                                onClick={isNavigating ? stopNavigation : startNavigation}
                                className={`w-full px-5 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${isNavigating ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-sky-600 text-white hover:bg-sky-700'}`}
                            >
                                {isNavigating ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                                {isNavigating ? 'Parar trajeto' : 'Iniciar trajeto'}
                            </button>
                        )}
                    </div>
                )}

                {/* Floating Action Button */}
                <div className="absolute bottom-6 right-6 z-[1001] flex flex-col gap-3">
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
