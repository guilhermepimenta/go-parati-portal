
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Navigation, Info, Ticket, CheckCircle2, XCircle, Compass, Zap, ZapOff, WifiOff, Play, Square } from 'lucide-react';
import { UserLocation, Totem } from '../types';
import { TOTEM_DATA } from '../config/constants';
import { calculateDistance, formatDistance } from '../utils';
import { supabase } from '../supabase';
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
  NavigationRouteData,
} from '../lib/navigation';

// Fix for default markers in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface TotemFinderProps {
  userLocation: UserLocation | null;
  onRequestLocation: () => void;
}

const CACHE_KEY = 'goparaty_totems_cache';

const TotemFinder: React.FC<TotemFinderProps> = ({ userLocation, onRequestLocation }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const routingControlRef = useRef<any>(null);
  const fallbackRouteRef = useRef<L.Polyline | null>(null);
  const pendingRouteTotemRef = useRef<Totem | null>(null);
  const lastRerouteAtRef = useRef(0);
  const totemMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [totems, setTotems] = useState<Totem[]>([]);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeRouteTotem, setActiveRouteTotem] = useState<Totem | null>(null);
  const [selectedTotem, setSelectedTotem] = useState<Totem | null>(null);
  const [activeRouteData, setActiveRouteData] = useState<NavigationRouteData | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [remainingDistance, setRemainingDistance] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [nextInstruction, setNextInstruction] = useState('Siga pela rota destacada');

  // Persistence and Sync Logic
  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    const fetchTotems = async () => {
      try {

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const response = await fetch(`${supabaseUrl}/rest/v1/totems?select=*`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
        const data = await response.json();

        // Map DB flat structure to Totem interface
        const mappedData: Totem[] = data.map((t: any) => ({
          id: t.id,
          name: t.name,
          location: {
            lat: t.lat,
            lng: t.lng,
            address: t.address
          },
          status: t.status, // 'online' | 'offline'
          lastMaintenance: t.updated_at
        })).filter((t: Totem) => t.location && t.location.lat && t.location.lng);

        setTotems(mappedData);

        // Update Cache
        localStorage.setItem(CACHE_KEY, JSON.stringify(mappedData));
      } catch (error) {
        console.error('Error fetching totems:', error);
        // Fallback to cache/mock
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          setTotems(JSON.parse(cachedData));
          setIsUsingCache(true);
        } else {
          setTotems(TOTEM_DATA);
        }
      }
    };

    fetchTotems();

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  const sortedTotems = useMemo(() => {
    if (!userLocation) return totems;
    return [...totems].sort((a, b) => {
      const distA = calculateDistance(userLocation.lat, userLocation.lng, a.location.lat, a.location.lng);
      const distB = calculateDistance(userLocation.lat, userLocation.lng, b.location.lat, b.location.lng);
      return distA - distB;
    });
  }, [userLocation, totems]);

  const nearestTotem = sortedTotems[0];

  const drawApproximateRoute = useCallback((from: L.LatLngExpression, to: L.LatLngExpression) => {
    if (!mapInstance.current) return;

    if (fallbackRouteRef.current) {
      mapInstance.current.removeLayer(fallbackRouteRef.current);
      fallbackRouteRef.current = null;
    }

    fallbackRouteRef.current = L.polyline([from, to], {
      color: '#0284c7',
      weight: 5,
      opacity: 0.9,
      dashArray: '8, 10'
    }).addTo(mapInstance.current);
  }, []);

  const clearActiveRoute = useCallback(() => {
    if (!mapInstance.current) return;

    if (routingControlRef.current) {
      mapInstance.current.removeControl(routingControlRef.current);
      routingControlRef.current = null;
    }

    if (fallbackRouteRef.current) {
      mapInstance.current.removeLayer(fallbackRouteRef.current);
      fallbackRouteRef.current = null;
    }

    setActiveRouteData(null);
    setRemainingDistance(null);
    setRemainingTime(null);
    setNextInstruction('Siga pela rota destacada');
  }, []);

  const drawRouteToTotem = useCallback((totem: Totem) => {
    if (!mapInstance.current) return;

    if (!userLocation) {
      pendingRouteTotemRef.current = totem;
      onRequestLocation();
      return;
    }

    pendingRouteTotemRef.current = null;
    setSelectedTotem(totem);
    setIsNavigating(false);
    setActiveRouteTotem(totem);

    const map = mapInstance.current;
    clearActiveRoute();

    const from = L.latLng(userLocation.lat, userLocation.lng);
    const to = L.latLng(totem.location.lat, totem.location.lng);

    // Always render an internal route immediately; if OSRM succeeds, this is replaced.
    drawApproximateRoute(from, to);
    map.fitBounds([from, to], { padding: [40, 40] });

    const routing = (L as any).Routing;
    if (!routing?.control) {
      console.error('Leaflet Routing Machine not loaded');
      return;
    }

    ensurePtBrRoutingLocale(routing);

    routingControlRef.current = routing.control({
      waypoints: [
        from,
        to
      ],
      router: routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
        timeout: 8000
      }),
      routeWhileDragging: false,
      showAlternatives: true,
      lineOptions: {
        styles: [{ color: '#0284c7', opacity: 0.95, weight: 6 }]
      },
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      show: true,
      collapsible: false,
      createMarker: function () { return null; },
      language: 'pt-BR'
    }).addTo(map);

    routingControlRef.current.on('routesfound', (event: any) => {
      const route = event.routes?.[0];
      if (!route) return;

      if (mapInstance.current && fallbackRouteRef.current) {
        mapInstance.current.removeLayer(fallbackRouteRef.current);
        fallbackRouteRef.current = null;
      }

      setActiveRouteData({
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

    routingControlRef.current.on('routingerror', (error: any) => {
      console.warn('Routing error:', error);
      drawApproximateRoute(from, to);
      map.fitBounds([from, to], { padding: [40, 40] });
    });

    if (mapRef.current) {
      mapRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [clearActiveRoute, drawApproximateRoute, onRequestLocation, userLocation]);

  useEffect(() => {
    if (!isNavigating || !userLocation || !activeRouteData || !activeRouteTotem || !mapInstance.current) return;

    const currentPoint = { lat: userLocation.lat, lng: userLocation.lng };
    const closestIndex = getClosestRoutePointIndex(activeRouteData.coordinates, currentPoint);
    const remainingDistanceMeters = getRemainingDistanceMeters(activeRouteData.coordinates, closestIndex);
    const progressRatio = activeRouteData.totalDistanceMeters > 0
      ? Math.min(1, Math.max(0, 1 - remainingDistanceMeters / activeRouteData.totalDistanceMeters))
      : 0;

    setRemainingDistance(remainingDistanceMeters);
    setRemainingTime(activeRouteData.totalTimeSeconds * (1 - progressRatio));
    setNextInstruction(getNextInstruction(activeRouteData.instructions, closestIndex));
    mapInstance.current.panTo([userLocation.lat, userLocation.lng], { animate: true });

    if (remainingDistanceMeters < 35) {
      setIsNavigating(false);
      setNextInstruction('Voce chegou ao totem');
      return;
    }

    const distanceFromRoute = getDistanceFromRouteMeters(activeRouteData.coordinates, currentPoint);
    const now = Date.now();
    if (distanceFromRoute > 80 && now - lastRerouteAtRef.current > 8000) {
      lastRerouteAtRef.current = now;
      drawRouteToTotem(activeRouteTotem);
    }
  }, [activeRouteData, activeRouteTotem, drawRouteToTotem, isNavigating, userLocation]);

  useEffect(() => {
    if (!userLocation || !pendingRouteTotemRef.current) return;
    drawRouteToTotem(pendingRouteTotemRef.current);
  }, [drawRouteToTotem, userLocation]);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([-23.22, -44.71], 15);

    mapInstance.current = map;
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
    totemMarkersLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      clearActiveRoute();
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      totemMarkersLayerRef.current = null;
      userMarkerRef.current = null;
    };
  }, [clearActiveRoute]);

  useEffect(() => {
    if (!mapInstance.current || !totemMarkersLayerRef.current) return;

    const markersLayer = totemMarkersLayerRef.current;
    markersLayer.clearLayers();

    totems.forEach(totem => {
      const isOnlineStatus = totem.status === 'online';
      const statusColor = isOnlineStatus ? '#10b981' : '#f43f5e';

      const totemIcon = L.divIcon({
        className: 'custom-totem-icon',
        html: `<div style="
                background-color: ${isOnlineStatus ? '#0284c7' : '#64748b'}; 
                width: 36px; 
                height: 36px; 
                border-radius: 10px; 
                border: 3px solid white; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                color: white; 
                box-shadow: 0 4px 12px ${isOnlineStatus ? 'rgba(2, 132, 199, 0.4)' : 'rgba(0,0,0,0.1)'};
                position: relative;
              ">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                <div style="
                  position: absolute; 
                  top: -4px; 
                  right: -4px; 
                  width: 12px; 
                  height: 12px; 
                  background-color: ${statusColor}; 
                  border: 2px solid white; 
                  border-radius: 50%;
                  ${isOnlineStatus ? 'box-shadow: 0 0 8px #10b981;' : ''}
                "></div>
              </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const marker = L.marker([totem.location.lat, totem.location.lng], { icon: totemIcon }).addTo(markersLayer);
      marker.bindPopup(`
        <div style="font-family: 'Inter', sans-serif; padding: 8px; min-width: 160px;">
          <strong style="display: block; margin-bottom: 4px; font-size: 14px; color: #0f172a;">${totem.name}</strong>
          <span style="font-size: 11px; color: #64748b; display: block; margin-bottom: 12px;">${totem.location.address}</span>
          <div style="
            display: flex; 
            align-items: center; 
            gap: 6px; 
            padding: 4px 10px; 
            background: ${isOnlineStatus ? '#f0fdf4' : '#fff1f2'}; 
            border-radius: 6px;
            width: fit-content;
          ">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${statusColor}; ${isOnlineStatus ? 'box-shadow: 0 0 6px #10b981;' : ''}"></span>
            <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: ${isOnlineStatus ? '#166534' : '#9f1239'};">
              ${isOnlineStatus ? 'Em Operação' : 'Indisponível'}
            </span>
          </div>
        </div>
      `);
    });
  }, [totems]);

  useEffect(() => {
    if (!mapInstance.current) return;

    if (!userLocation) {
      if (userMarkerRef.current) {
        mapInstance.current.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      return;
    }

    const userIcon = L.divIcon({
      className: 'user-marker',
      html: `<div style="background-color: white; width: 16px; height: 16px; border-radius: 50%; border: 3px solid #0284c7; box-shadow: 0 0 15px rgba(2, 132, 199, 0.5);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    const userLatLng: L.LatLngExpression = [userLocation.lat, userLocation.lng];
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(userLatLng);
    } else {
      userMarkerRef.current = L.marker(userLatLng, { icon: userIcon }).addTo(mapInstance.current);
    }

    if (!activeRouteTotem && !activeRouteData) {
      mapInstance.current.setView([userLocation.lat, userLocation.lng], 16);
    }
  }, [activeRouteData, activeRouteTotem, userLocation]);

  const handleFocusTotem = (totem: Totem) => {
    setSelectedTotem(totem);
    if (mapInstance.current) {
      mapInstance.current.setView([totem.location.lat, totem.location.lng], 18);
    }
  };

  const openDirections = (e: React.MouseEvent, totem: Totem) => {
    e.stopPropagation();
    setSelectedTotem(totem);
    drawRouteToTotem(totem);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-2xl shadow-sky-900/5 border border-slate-100">
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="lg:w-1/2 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-sky-50 text-sky-700 text-[10px] font-black uppercase tracking-[0.2em] rounded-full">
                  <Ticket className="w-3 h-3" /> Paraty Rotativo
                </div>
                {isUsingCache && (
                  <div className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-600 text-[9px] font-bold uppercase rounded-full border border-amber-100">
                    <WifiOff className="w-3 h-3" /> Modo Offline (Cache)
                  </div>
                )}
              </div>
              <h2 className="text-4xl font-black text-slate-900 leading-tight">Totens de Autoatendimento</h2>
              <p className="text-slate-500 font-medium leading-relaxed">
                Localize e navegue até o totem mais próximo para regularizar seu estacionamento com facilidade.
              </p>
            </div>

            {!userLocation ? (
              <div className="p-8 bg-amber-50 rounded-3xl border border-amber-100">
                <div className="flex gap-4">
                  <div className="p-3 bg-white rounded-2xl shadow-sm text-amber-500">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">Localização Necessária</h4>
                    <p className="text-sm text-slate-600 mb-4">Ative sua localização para calcularmos qual totem está mais perto de você agora.</p>
                    <button
                      onClick={onRequestLocation}
                      className="px-6 py-2.5 bg-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all active:scale-95 text-sm"
                    >
                      Ativar GPS
                    </button>
                  </div>
                </div>
              </div>
            ) : (activeRouteTotem ?? selectedTotem ?? nearestTotem) && (() => {
              const cardTotem = (activeRouteTotem ?? selectedTotem ?? nearestTotem)!;
              return (
              <div key={cardTotem.id} className={`p-8 rounded-3xl shadow-xl text-white relative overflow-hidden group transition-all duration-500 ${cardTotem.status === 'online' ? 'bg-sky-600 shadow-sky-600/20' : 'bg-slate-600 shadow-slate-600/20'}`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-colors" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl">
                      {cardTotem.status === 'online' ? <Zap className="w-6 h-6 fill-current" /> : <ZapOff className="w-6 h-6" />}
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full backdrop-blur-md border ${cardTotem.status === 'online' ? 'bg-emerald-500/20 border-emerald-400/30' : 'bg-rose-500/20 border-rose-400/30'}`}>
                      <div className={`w-2 h-2 rounded-full ${cardTotem.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></div>
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {cardTotem.status === 'online' ? 'Operacional' : 'Em Manutenção'}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-1">{cardTotem.name}</h3>
                  <p className="text-white/80 text-sm mb-6 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {cardTotem.location.address}
                  </p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-white/60 mb-1 tracking-tighter">Distância Estimada</p>
                      <p className="text-2xl md:text-4xl font-black tracking-tighter">{formatDistance(calculateDistance(userLocation.lat, userLocation.lng, cardTotem.location.lat, cardTotem.location.lng))}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          drawRouteToTotem(cardTotem);
                        }}
                        className="px-4 py-2 bg-white text-sky-600 font-bold rounded-xl shadow-lg hover:bg-sky-50 transition-all active:scale-90 flex items-center gap-2"
                      >
                        <Navigation className="w-4 h-4" /> Traçar Rota
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              );
            })()}



            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Pontos de Atendimento</h4>
              <div className="space-y-3">
                {sortedTotems.map(totem => {
                  const isOnlineStatus = totem.status === 'online';
                  return (
                    <div
                      key={totem.id}
                      onClick={() => handleFocusTotem(totem)}
                      className="w-full flex items-center justify-between p-3 md:p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:border-sky-200 hover:shadow-lg hover:shadow-sky-500/5 transition-all group"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`p-2.5 rounded-xl transition-colors duration-300 flex-shrink-0 ${isOnlineStatus ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100' : 'bg-rose-50 text-rose-500 group-hover:bg-rose-100'}`}>
                          {isOnlineStatus ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        </div>
                        <div className="text-left min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-slate-900 group-hover:text-sky-600 transition-colors truncate">
                              {totem.name}
                            </p>
                            {!isOnlineStatus && <span className="text-[8px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter whitespace-nowrap">Offline</span>}
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium truncate">{totem.location.address}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end gap-1">
                          {userLocation && (
                            <span className="text-xs font-black text-slate-900">
                              {formatDistance(calculateDistance(userLocation.lat, userLocation.lng, totem.location.lat, totem.location.lng))}
                            </span>
                          )}
                          <span className={`text-[8px] font-black uppercase tracking-tighter ${isOnlineStatus ? 'text-emerald-500' : 'text-rose-400'}`}>
                            {isOnlineStatus ? 'Operacional' : 'Manutenção'}
                          </span>
                        </div>

                        <button
                          onClick={(e) => openDirections(e, totem)}
                          className="p-3 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-600 hover:text-white transition-all active:scale-90"
                          title="Traçar rota no mapa"
                        >
                          <Navigation className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:w-1/2 min-h-[600px] lg:min-h-auto flex flex-col">
            <div className="totem-map bg-slate-100 rounded-[32px] overflow-hidden shadow-inner border border-slate-200 h-[400px] lg:h-auto lg:flex-1" style={{ minHeight: '400px' }}>
              <div ref={mapRef} className="w-full h-[400px] lg:h-full" />
            </div>
            
            {activeRouteTotem && userLocation && (
              <div className="w-full bg-white border-t border-slate-200 shadow-2xl z-[1000] p-5 max-h-[28vh] overflow-y-auto">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex-1">
                    <p className="text-[10px] uppercase font-black tracking-[0.18em] text-sky-600">Navegacao ativa</p>
                    <h4 className="text-lg font-bold text-slate-900 leading-tight">{activeRouteTotem.name}</h4>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border whitespace-nowrap ${isNavigating ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {isNavigating ? 'Em trajeto' : 'Pronto'}
                  </span>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed min-h-[42px]">{nextInstruction}</p>

                <div className="grid grid-cols-2 gap-3 mt-4 mb-4">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 border border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Restante</p>
                    <p className="text-sm font-bold text-slate-900">{remainingDistance !== null ? formatRemainingDistance(remainingDistance) : formatDistance(calculateDistance(userLocation.lat, userLocation.lng, activeRouteTotem.location.lat, activeRouteTotem.location.lng))}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 border border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tempo</p>
                    <p className="text-sm font-bold text-slate-900">{remainingTime !== null ? formatRemainingTime(remainingTime) : 'Estimando'}</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsNavigating((currentValue) => !currentValue)}
                  className={`w-full px-5 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${isNavigating ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-sky-600 text-white hover:bg-sky-700'}`}
                >
                  {isNavigating ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                  {isNavigating ? 'Parar trajeto' : 'Iniciar trajeto'}
                </button>
              </div>
            )}
            
            {!activeRouteTotem && (
              <div className="w-full bg-white border-t border-slate-200 shadow-lg z-[1000] p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-sky-600 rounded-xl text-white flex-shrink-0">
                    <Compass className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status da Rede</p>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                      <p className="text-sm font-extrabold text-slate-900 truncate">{isOnline ? 'Rede de Totens Ativa' : 'Exibindo dados em cache'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600 mb-6">
            <Info className="w-6 h-6" />
          </div>
          <h4 className="text-lg font-bold text-slate-900 mb-3">Estacionamento Rotativo</h4>
          <p className="text-sm text-slate-500 leading-relaxed">Gerencia vagas públicas em áreas de grande fluxo para garantir rotatividade e acesso a todos os visitantes.</p>
        </div>
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-6">
            <Ticket className="w-6 h-6" />
          </div>
          <h4 className="text-lg font-bold text-slate-900 mb-3">Praticidade no Totem</h4>
          <p className="text-sm text-slate-500 leading-relaxed">Pague com Cartão ou PIX em segundos. Digite sua placa, escolha o tempo e receba o comprovante digital.</p>
        </div>
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-6">
            <Navigation className="w-6 h-6" />
          </div>
          <h4 className="text-lg font-bold text-slate-900 mb-3">Tolerância e Isenção</h4>
          <p className="text-sm text-slate-500 leading-relaxed">15 minutos de tolerância gratuita. Vagas para idosos e PCDs devem ser utilizadas respeitando a sinalização local.</p>
        </div>
      </div>
    </div>
  );
};

export default TotemFinder;
