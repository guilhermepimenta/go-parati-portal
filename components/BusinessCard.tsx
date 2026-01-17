
import React from 'react';
// Added Compass to the imported icons
import { Star, MapPin, ArrowRight, Compass, Navigation } from 'lucide-react';
import { Business, UserLocation } from '../types';
import { calculateDistance, formatDistance, getPriceLevelString } from '../utils';

interface BusinessCardProps {
  business: Business;
  userLocation: UserLocation | null;
  onClick: (id: string) => void;
}

const BusinessCard: React.FC<BusinessCardProps> = ({ business, userLocation, onClick }) => {
  const distance = userLocation
    ? calculateDistance(userLocation.lat, userLocation.lng, business.location.lat, business.location.lng)
    : null;

  return (
    <div
      onClick={() => onClick(business.id)}
      className="group bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-sky-500/10 transition-all duration-300 cursor-pointer"
    >
      <div className="relative h-56 overflow-hidden">
        <img
          src={business.image_url}
          alt={business.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-4 left-4 flex gap-2">
          <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-slate-900 text-xs font-bold rounded-full shadow-sm">
            {business.category}
          </span>
          {business.is_featured && (
            <span className="px-3 py-1 bg-amber-400 text-white text-xs font-bold rounded-full shadow-sm">
              Destaque
            </span>
          )}
        </div>
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          <span className="text-xs font-bold text-slate-800">{business.rating}</span>
        </div>
      </div>

      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-1">
            {business.name}
          </h3>
          <span className="text-sm font-medium text-slate-400">
            {getPriceLevelString(business.price_level)}
          </span>
        </div>

        <p className="text-sm text-slate-500 line-clamp-2 mb-4">
          {business.description}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
          <div className="flex items-center text-slate-400 text-xs">
            <MapPin className="w-3 h-3 mr-1 text-sky-500" />
            <span className="line-clamp-1 max-w-[120px]">{business.location.address}</span>
          </div>

          {distance !== null ? (
            <div className="flex items-center gap-1 bg-sky-50 text-sky-700 px-2 py-1 rounded-md text-[10px] font-bold">
              <Compass className="w-3 h-3" />
              {formatDistance(distance)}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-slate-400 text-[10px] font-medium">
              Ver distância
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(`https://www.google.com/maps/dir/?api=1&destination=${business.location.lat},${business.location.lng}`, '_blank');
            }}
            className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md text-[10px] font-bold hover:bg-emerald-100 transition-colors ml-auto"
          >
            <Navigation className="w-3 h-3" />
            Rota
          </button>
        </div>
      </div>
    </div>
  );
};

export default BusinessCard;
