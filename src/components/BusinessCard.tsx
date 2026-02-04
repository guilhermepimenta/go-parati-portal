
import React from 'react';
// Added Compass to the imported icons
import { Star, MapPin, ArrowRight, Compass, Navigation } from 'lucide-react';
import { Business, UserLocation } from '../types';
import { calculateDistance, formatDistance, getPriceLevelString } from '../utils';
import { analytics } from '../services/analytics';

import { useTranslation } from 'react-i18next';

interface BusinessCardProps {
  business: Business;
  userLocation: UserLocation | null;
  onClick: (id: string) => void;
  onRouteClick?: (location: { lat: number; lng: number }) => void;
}

const BusinessCard = React.memo(({ business, userLocation, onClick, onRouteClick }: BusinessCardProps) => {
  const { t } = useTranslation();

  const distance = userLocation
    ? calculateDistance(userLocation.lat, userLocation.lng, business.location.lat, business.location.lng)
    : null;

  // Helper to normalize keys
  const normalizeKey = (key: string) => key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const getCategoryStyle = (category: string) => {
    const key = normalizeKey(category);
    switch (key) {
      case 'gastronomia': return 'bg-orange-100/95 text-orange-800 border-orange-200';
      case 'historia': return 'bg-stone-100/95 text-stone-700 border-stone-200'; // Stone/Historic
      case 'aventura': return 'bg-emerald-100/95 text-emerald-800 border-emerald-200';
      case 'hospedagem': return 'bg-indigo-100/95 text-indigo-800 border-indigo-200';
      case 'comercio': return 'bg-purple-100/95 text-purple-800 border-purple-200';
      case 'servicos': return 'bg-slate-100/95 text-slate-800 border-slate-200';
      case 'eventos': return 'bg-rose-100/95 text-rose-800 border-rose-200';
      default: return 'bg-white/95 text-ink';
    }
  };

  return (
    <div
      onClick={() => {
        analytics.trackBusinessClick(business.id, 'card');
        onClick(business.id);
      }}
      className="group bg-surface rounded-2xl overflow-hidden border border-border shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_16px_32px_rgba(0,0,0,0.12)] hover:-translate-y-2 hover:scale-[1.01] transition-all duration-300 cursor-pointer flex flex-col h-full"
    >
      <div className="relative h-56 overflow-hidden">
        <img
          src={business.image_url}
          alt={business.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
          <span className={`px-3 py-1.5 text-xs font-bold rounded-full shadow-sm font-sans backdrop-blur-md border ${getCategoryStyle(business.category)}`}>
            {t(`categories.${normalizeKey(business.category)}`)}
          </span>
          {business.is_featured && (
            <span className="px-3 py-1.5 bg-coral text-white text-xs font-bold rounded-full shadow-lg font-sans flex items-center gap-1">
              <Star className="w-3 h-3 fill-white" /> Destaque
            </span>
          )}
        </div>

        <div className="absolute bottom-4 left-4 text-white">
          <div className="flex items-center gap-1 mb-1">
            <Star className="w-3 h-3 fill-coral text-coral" />
            <span className="text-xs font-bold">{business.rating}</span>
          </div>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-serif font-bold text-ink group-hover:text-coral transition-colors italic leading-tight">
            {business.name}
          </h3>
          <span className="text-xs font-bold text-ink-light bg-canvas px-2 py-1 rounded-lg border border-black/5">
            {getPriceLevelString(business.price_level)}
          </span>
        </div>

        <p className="text-sm text-ink-light line-clamp-2 mb-6 font-sans leading-relaxed">
          {business.description}
        </p>

        <div className="mt-auto pt-5 border-t border-border flex items-center justify-between">
          <div className="flex items-center text-ink-light text-xs font-medium">
            <MapPin className="w-3.5 h-3.5 mr-1.5 text-ocean" />
            <span className="line-clamp-1 max-w-[120px]">{business.location.address}</span>
          </div>

          <div className="flex items-center gap-3">
            {distance !== null && (
              <div className="flex items-center gap-1 text-ink-light text-[10px] font-bold uppercase tracking-wider">
                <Compass className="w-3 h-3" />
                {formatDistance(distance)}
              </div>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onRouteClick) {
                  onRouteClick(business.location);
                } else {
                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${business.location.lat},${business.location.lng}`, '_blank');
                }
              }}
              className="flex items-center gap-1.5 bg-ocean/10 text-ocean px-4 py-3 rounded-xl text-xs font-bold hover:bg-ocean hover:text-white active:scale-95 transition-all min-h-[44px]"
            >
              <Navigation className="w-3.5 h-3.5" />
              Leve-me lá
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default BusinessCard;
