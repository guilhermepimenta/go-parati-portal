
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Star, MapPin, Clock, Phone, Globe, Share2, Heart, ArrowLeft, CheckCircle2, Navigation, X, ChevronLeft, ChevronRight, WifiOff, ExternalLink, Mail, MessageSquare, Send, UserCircle, Calendar } from 'lucide-react';
import { Business, UserLocation } from '../types';
import { calculateDistance, formatDistance, getPriceLevelString } from '../utils';

// Declare Leaflet (L) as it is loaded via script tag in index.html
declare const L: any;

import { supabase } from '../supabase';

// ... (imports remain)

interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

// ... (BusinessDetailProps remain)

const BusinessDetail: React.FC<BusinessDetailProps> = ({ business, userLocation, onBack }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Reviews State
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewName, setNewReviewName] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Fetch Reviews from Supabase
  useEffect(() => {
    const fetchReviews = async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reviews:', error);
      } else if (data) {
        const mappedReviews: Review[] = data.map((r: any) => ({
          id: r.id,
          userName: r.user_name,
          rating: r.rating,
          comment: r.comment,
          date: new Date(r.created_at).toLocaleDateString('pt-BR')
        }));
        setReviews(mappedReviews);
      }
    };

    fetchReviews();
  }, [business.id]);

  // ... (rest of code) ...

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewComment.trim() || !newReviewName.trim()) return;

    setIsSubmittingReview(true);

    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert([
          {
            business_id: business.id,
            user_name: newReviewName,
            rating: newReviewRating,
            comment: newReviewComment
          }
        ])
        .select();

      if (error) throw error;

      if (data) {
        const newReview: Review = {
          id: data[0].id,
          userName: data[0].user_name,
          rating: data[0].rating,
          comment: data[0].comment,
          date: 'agora mesmo'
        };
        setReviews([newReview, ...reviews]);
        setNewReviewComment('');
        setNewReviewName('');
        setNewReviewRating(5);
      }
    } catch (error) {
      console.error('Error adding review:', error);
      alert('Erro ao enviar avaliação. Tente novamente.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleOpenExternalMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${business.location.lat},${business.location.lng}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="relative">
        <div className="grid grid-cols-1 md:grid-cols-4 h-[400px] md:h-[500px] gap-2 cursor-pointer" role="region" aria-label="Galeria de imagens">
          <div onClick={() => { setCurrentImageIndex(0); setIsLightboxOpen(true); }} className="md:col-span-2 relative group overflow-hidden">
            <img src={images[0]} alt={`${business.name} principal`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
          </div>
          <div className="hidden md:grid grid-rows-2 gap-2 md:col-span-1">
            <div onClick={() => { setCurrentImageIndex(1); setIsLightboxOpen(true); }} className="relative group overflow-hidden">
              <img src={images[1] || images[0]} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={`${business.name} galeria 1`} />
            </div>
            <div onClick={() => { setCurrentImageIndex(2); setIsLightboxOpen(true); }} className="relative group overflow-hidden">
              <img src={images[2] || images[0]} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={`${business.name} galeria 2`} />
            </div>
          </div>
          <div onClick={() => { setCurrentImageIndex(Math.min(3, images.length - 1)); setIsLightboxOpen(true); }} className="hidden md:block md:col-span-1 relative group overflow-hidden">
            <img src={images[3] || images[0]} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={`${business.name} galeria 3`} />
            <button className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-4 py-2 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2" aria-label={`Ver todas as ${images.length} fotos`}>
              Ver todas ({images.length})
            </button>
          </div>
        </div>

        <div className="absolute top-6 left-6 right-6 flex justify-between pointer-events-none z-20">
          <button onClick={onBack} className="p-3 bg-white/90 backdrop-blur rounded-full shadow-lg hover:bg-white transition-colors pointer-events-auto" aria-label="Voltar para a lista">
            <ArrowLeft className="w-5 h-5 text-slate-800" />
          </button>
          <div className="flex gap-2 pointer-events-auto">
            <button className="p-3 bg-white/90 backdrop-blur rounded-full shadow-lg hover:bg-white transition-colors" aria-label="Compartilhar"><Share2 className="w-5 h-5 text-slate-800" /></button>
            <button className="p-3 bg-white/90 backdrop-blur rounded-full shadow-lg hover:bg-white transition-colors" aria-label="Adicionar aos favoritos"><Heart className="w-5 h-5 text-slate-800" /></button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-[-60px] relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 bg-sky-50 text-sky-700 text-xs font-bold rounded-full uppercase tracking-wider">{business.category}</span>
                <span className="px-3 py-1 bg-slate-50 text-slate-600 text-xs font-bold rounded-full" aria-label={`Nível de preço ${business.price_level}`}>{getPriceLevelString(business.price_level)}</span>
                {isOffline && <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full flex items-center gap-1"><WifiOff className="w-3 h-3" /> Offline</span>}
              </div>

              <h1 className="text-4xl font-extrabold text-slate-900 mb-2">{business.name}</h1>
              <div className="flex items-center gap-6 text-sm text-slate-500 mb-8">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-slate-900">{business.rating}</span>
                  <span>({business.review_count} avaliações)</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-sky-500" />
                  <span>{business.location.address}</span>
                </div>
              </div>

              {/* Interaction Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                <a
                  href={`tel:${contactPhone.replace(/\D/g, '')}`}
                  className="flex flex-col items-center justify-center p-6 bg-sky-50/50 rounded-2xl border border-sky-100 hover:bg-sky-100 transition-all group focus:ring-2 focus:ring-sky-500 outline-none"
                  aria-label={`Ligar para ${business.name}`}
                >
                  <Phone className="w-6 h-6 text-sky-600 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] uppercase font-bold text-sky-400 tracking-widest mb-1">Ligar</span>
                  <span className="text-sm font-bold text-slate-800">{contactPhone}</span>
                </a>
                <a
                  href={`mailto:${contactEmail}`}
                  className="flex flex-col items-center justify-center p-6 bg-rose-50/50 rounded-2xl border border-rose-100 hover:bg-rose-100 transition-all group focus:ring-2 focus:ring-rose-500 outline-none"
                  aria-label={`Enviar e-mail para ${business.name}`}
                >
                  <Mail className="w-6 h-6 text-rose-600 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] uppercase font-bold text-rose-400 tracking-widest mb-1">E-mail</span>
                  <span className="text-sm font-bold text-slate-800 truncate w-full text-center px-2">{contactEmail}</span>
                </a>
                <a
                  href={`https://${contactWebsite}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100 hover:bg-emerald-100 transition-all group focus:ring-2 focus:ring-emerald-500 outline-none"
                  aria-label={`Visitar o site de ${business.name}`}
                >
                  <Globe className="w-6 h-6 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest mb-1">Visitar Site</span>
                  <span className="text-sm font-bold text-slate-800">{contactWebsite}</span>
                </a>
              </div>

              <div className="prose prose-slate max-w-none">
                <h3 className="text-xl font-bold text-slate-900 mb-4">Sobre {business.name}</h3>
                <p className="text-slate-600 leading-relaxed mb-6">{business.long_description || business.description}</p>
              </div>

              {business.amenities && (
                <div className="pt-8 border-t border-slate-100">
                  <h3 className="text-xl font-bold text-slate-900 mb-6">Comodidades</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {business.amenities.map(item => (
                      <div key={item} className="flex items-center gap-2 text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* OPENING HOURS SECTION */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-sky-50 rounded-2xl">
                    <Clock className="w-6 h-6 text-sky-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-slate-900">Horário de Funcionamento</h3>
                    <p className="text-slate-500 text-sm">Planeje sua visita</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="text-xs font-bold uppercase tracking-wider">Aberto Agora</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                {business.opening_hours ? (
                  Object.entries(business.opening_hours).map(([days, hours]) => (
                    <div key={days} className="flex items-center justify-between py-3 border-b border-slate-50 group hover:bg-slate-50 transition-colors px-2 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-slate-300 group-hover:text-sky-500 transition-colors" />
                        <span className="text-sm font-semibold text-slate-700">{days}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900">{hours}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-sm italic col-span-2">Consulte o estabelecimento para horários detalhados.</p>
                )}
              </div>

              <div className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                <div className="mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  Horários sujeitos a alteração em feriados locais e eventos especiais. Recomendamos ligar antes de se deslocar.
                </p>
              </div>
            </div>

            {/* REVIEWS SECTION */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-extrabold text-slate-900">Avaliações</h3>
                  <p className="text-slate-500 text-sm">O que os visitantes estão dizendo</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end text-amber-400 mb-1">
                    <Star className="w-6 h-6 fill-amber-400" />
                    <span className="text-3xl font-black text-slate-900">{business.rating}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Média Geral</span>
                </div>
              </div>

              <form onSubmit={handleAddReview} className="mb-12 p-6 bg-slate-50 rounded-2xl border border-slate-100" aria-label="Formulário de avaliação">
                <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-sky-600" />
                  Deixe sua avaliação
                </h4>

                <div className="mb-4">
                  <input
                    type="text"
                    value={newReviewName}
                    onChange={(e) => setNewReviewName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all"
                    required
                  />
                </div>

                <div className="flex gap-2 mb-4" role="radiogroup" aria-label="Classificação por estrelas">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewReviewRating(star)}
                      role="radio"
                      aria-checked={star === newReviewRating}
                      aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
                      className="focus:outline-none transition-transform active:scale-90"
                    >
                      <Star className={`w-6 h-6 ${star <= newReviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <textarea
                    value={newReviewComment}
                    onChange={(e) => setNewReviewComment(e.target.value)}
                    placeholder="Sua opinião nos ajuda muito..."
                    className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none min-h-[100px] transition-all"
                    required
                    aria-label="Comentário da avaliação"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="absolute bottom-4 right-4 p-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors shadow-lg"
                    aria-label="Enviar avaliação"
                  >
                    <Send className={`w-4 h-4 ${isSubmittingReview ? 'animate-pulse' : ''}`} />
                  </button>
                </div>
              </form>

              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review.id} className="flex gap-4 p-4 hover:bg-slate-50 rounded-xl transition-colors">
                    <div className="flex-shrink-0">
                      <UserCircle className="w-10 h-10 text-slate-300" aria-hidden="true" />
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="font-bold text-slate-900">{review.userName}</h5>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{review.date}</span>
                      </div>
                      <div className="flex gap-0.5 mb-2" aria-label={`Avaliação: ${review.rating} estrelas`}>
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                        ))}
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">{review.comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sticky Sidebar Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 sticky top-24">
              <div
                className="w-full h-56 bg-slate-100 rounded-2xl mb-6 relative overflow-hidden shadow-inner border border-slate-200"
                role="application"
                aria-label={`Mapa mostrando a localização de ${business.name}`}
              >
                <div ref={mapRef} id="interactive-map" className="w-full h-full focus:outline-none" tabIndex={0} />
              </div>

              {distance !== null && (
                <div className="mb-6 p-4 bg-sky-50 rounded-2xl flex items-center justify-between" role="status" aria-live="polite">
                  <div className="flex items-center gap-3">
                    <Navigation className="w-5 h-5 text-sky-600" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-sky-600 tracking-wider">Distância</p>
                      <p className="text-lg font-bold text-slate-900">{formatDistance(distance)}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <button
                  onClick={() => {
                    if (!userLocation) {
                      alert('Aguardando sua localização...');
                      return;
                    }

                    if (mapInstance.current) {
                      const map = mapInstance.current;

                      // @ts-ignore
                      if (L.Routing) {
                        // @ts-ignore
                        L.Routing.control({
                          waypoints: [
                            L.latLng(userLocation.lat, userLocation.lng),
                            L.latLng(business.location.lat, business.location.lng)
                          ],
                          routeWhileDragging: true,
                          showAlternatives: true,
                          lineOptions: {
                            styles: [{ color: '#0284c7', weight: 6 }]
                          },
                          addWaypoints: false,
                          draggableWaypoints: false,
                          fitSelectedRoutes: true,
                          show: false // Hide panel instructions for cleaner UI
                        }).addTo(map);

                        // Scroll map into view
                        if (mapRef.current) {
                          mapRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      } else {
                        console.error('Leaflet Routing Machine not loaded');
                        // Fallback just in case CDN fails
                        handleOpenExternalMaps();
                      }
                    }
                  }}
                  className="w-full py-4 bg-sky-600 text-white font-bold rounded-2xl shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 hover:bg-sky-700 transition-all active:scale-95 focus:ring-4 focus:ring-sky-500/50 outline-none"
                  aria-label="Traçar rota no Google Maps"
                >
                  <Navigation className="w-5 h-5" /> Traçar Rota no Mapa
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center select-none"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Visualizador de fotos"
        >
          <div className="absolute top-0 inset-x-0 p-6 flex items-center justify-between text-white z-50">
            <span className="text-sm font-bold text-sky-400 uppercase tracking-widest">{business.name} - Imagem {currentImageIndex + 1}</span>
            <button onClick={closeLightbox} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all" aria-label="Fechar visualizador">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="hidden md:flex absolute left-8 p-4 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors"
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="hidden md:flex absolute right-8 p-4 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors"
              aria-label="Próxima imagem"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
            <img
              src={images[currentImageIndex]}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
              alt={`${business.name} visualização ampliada ${currentImageIndex + 1}`}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessDetail;
