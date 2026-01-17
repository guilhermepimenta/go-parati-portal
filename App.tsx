
import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import BusinessCard from './components/BusinessCard';
import BusinessDetail from './components/BusinessDetail';
import Dashboard from './components/Dashboard';
import AdminLogin from './components/AdminLogin';
import TotemFinder from './components/TotemFinder';
import Logo from './components/Logo';
import Footer from './components/Footer';
import { Advertise } from './components/Advertise';
import LiveFeed from './components/LiveFeed';
import { TermsOfUse, PrivacyPolicy, HelpCenter } from './components/LegalPages';


import { MOCK_DATA, CATEGORIES } from './constants.tsx';
import { authService } from './auth';
import { Business, UserLocation, FeaturedEvent, User, SiteSettings } from './types';

import { supabase } from './supabase';
import {
  Search,
  MapPin,
  Sparkles,
  History as HistoryIcon,
  Tent,
  Compass,
  Globe,
  LayoutDashboard,
  Instagram,
  Facebook,
  Youtube,
  Mail,
  Phone,
  ExternalLink,
  ShieldCheck,
  Award,
  Ticket,
  ChevronDown,
  ChevronUp,
  X,
  Calendar,
  Clock,
  CalendarPlus
} from 'lucide-react';

import { calculateDistance, checkIsOpen, generateGoogleCalendarUrl } from './utils'; // Added checkIsOpen and generateGoogleCalendarUrl
import GoogleCalendarModal from './components/GoogleCalendarModal'; // Added GoogleCalendarModal import
import ScheduleModal from './components/ScheduleModal';
import MapModal from './components/MapModal';

const App: React.FC = () => {
  // State
  const [currentView, setCurrentView] = useState('home');
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [isTotemExpanded, setIsTotemExpanded] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [showOpenOnly, setShowOpenOnly] = useState(false); // New state for Open Now filter

  // Data State
  const [portalData, setPortalData] = useState<Business[]>([]);
  const [isGoogleCalendarModalOpen, setIsGoogleCalendarModalOpen] = useState(false); // Added state
  const [isMapModalOpen, setIsMapModalOpen] = useState(false); // New Map Modal state
  const [featuredEvent, setFeaturedEvent] = useState<FeaturedEvent | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initial Data Fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const headers = {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        };

        // Fetch Businesses via REST
        const businessesRes = await fetch(`${supabaseUrl}/rest/v1/businesses?select=*`, { headers });
        if (!businessesRes.ok) throw new Error('Failed to fetch businesses');
        const businessData = await businessesRes.json();
        setPortalData(businessData as Business[]);

        // Fetch Featured Event via REST
        try {
          const eventRes = await fetch(`${supabaseUrl}/rest/v1/events?select=*&is_active=eq.true&order=created_at.desc&limit=1`, { headers });
          if (eventRes.ok) {
            const eventData = await eventRes.json();
            if (eventData && eventData.length > 0) {
              const raw = eventData[0];
              setFeaturedEvent({
                id: raw.id,
                title: raw.title,
                description: raw.description,
                imageUrl: raw.image_url,
                buttonText: raw.button_text,
                buttonLink: raw.button_link,
                isActive: raw.is_active,
                schedule: raw.schedule,
                startDate: new Date(Date.now() + 86400000).toISOString(), // Mock: Tomorrow
                endDate: new Date(Date.now() + 86400000 + 7200000).toISOString() // Mock: Tomorrow + 2h
              });
            }
          }
        } catch (eventError) {
          console.error('Error fetching event:', eventError);
        }

        // Fetch Site Settings via REST
        try {
          // Fix: Order by updated_at desc to match the refresh logic and get the latest
          const settingsRes = await fetch(`${supabaseUrl}/rest/v1/site_settings?select=*&order=updated_at.desc&limit=1`, { headers });
          if (settingsRes.ok) {
            const settingsData = await settingsRes.json();
            if (settingsData && settingsData.length > 0) {
              setSiteSettings(settingsData[0]);
            }
          }
        } catch (settingsError) {
          console.error('Error fetching settings:', settingsError);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Check Auth Session
    authService.getCurrentUser().then(user => setCurrentUser(user));
  }, []);

  // Separate effect to refresh settings when returning to home
  useEffect(() => {
    if (currentView === 'home') {
      const refreshSettings = async () => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        try {
          // Add ordering to get the LATEST setting if multiple rows exist
          const res = await fetch(`${supabaseUrl}/rest/v1/site_settings?select=*&order=updated_at.desc&limit=1`, {
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
              setSiteSettings(data[0]);
            }
          }
        } catch (e) {
          console.error('[Home] Silent settings refresh failed', e);
        }
      };
      refreshSettings();
    }
  }, [currentView]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = await authService.getCurrentUser();
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let watchId: number;

    const startWatching = () => {
      if ('geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            console.log('Location updated:', position.coords);
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => {
            console.error("Error getting location:", error);
            // Do NOT set a fallback location silently. User must know location failed.
            // Only set if you want a default center, but clear that it's not the user.
            if (error.code === 1) { // PERMISSION_DENIED
              // Alert suppressed to avoid annoying user on every reload if they denied it
            }
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }
    };

    startWatching();

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Backwards compatibility for prop interface
  const requestLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não é suportada pelo seu navegador.');
      return;
    }

    // Try to get current position immediately for the manual button click
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Manual location update:', position.coords);
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        console.error("Error getting location manually:", error);
        alert("Não foi possível obter sua localização. Verifique as permissões do navegador.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (currentView === 'totems') {
      setSelectedCategory('totem');
      setIsTotemExpanded(true);
    }
  }, [currentView]);

  const filteredData = useMemo(() => {
    let data = [...portalData];

    // Case insensitive filtering helper
    const matchesCategory = (itemCat: string, filterCat: string) =>
      (itemCat || '').toLowerCase().trim() === (filterCat || '').toLowerCase().trim();

    if (currentView === 'history') {
      data = data.filter(b => matchesCategory(b.category, 'História') || matchesCategory(b.category, 'historia'));
    } else if (currentView === 'adventure') {
      data = data.filter(b => matchesCategory(b.category, 'Aventura') || matchesCategory(b.category, 'aventura'));
    }

    if (selectedCategory !== 'all' && selectedCategory !== 'totem') {
      data = data.filter(b => matchesCategory(b.category, selectedCategory));
    }

    // "Open Now" Filter
    if (showOpenOnly) {
      data = data.filter(b => checkIsOpen(b.opening_hours));
    }

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      data = data.filter(b =>
        b.name.toLowerCase().includes(lowerQuery) ||
        b.description.toLowerCase().includes(lowerQuery) ||
        (b.category || '').toLowerCase().includes(lowerQuery)
      );
    }

    if (userLocation) {
      data.sort((a, b) => {
        const distA = calculateDistance(userLocation.lat, userLocation.lng, a.location.lat, a.location.lng);
        const distB = calculateDistance(userLocation.lat, userLocation.lng, b.location.lat, b.location.lng);
        return distA - distB;
      });
    } else {
      data.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
    }

    return data;
  }, [selectedCategory, searchQuery, currentView, portalData, userLocation, showOpenOnly]);

  const selectedBusiness = useMemo(() =>
    portalData.find(b => b.id === selectedBusinessId),
    [selectedBusinessId, portalData]);

  const handleNavigate = (view: string) => {
    setCurrentView(view);
    setSelectedBusinessId(null);
    if (view === 'totems') {
      setSelectedCategory('totem');
      setIsTotemExpanded(true);
    } else {
      setSelectedCategory('all');
      setIsTotemExpanded(false);
    }
    window.scrollTo(0, 0);
  };

  const handleBusinessClick = (id: string) => {
    setSelectedBusinessId(id);
    window.scrollTo(0, 0);
  };

  const handleUpdateBusiness = (updatedBusiness: Business) => {
    setPortalData(prev => prev.map(b => b.id === updatedBusiness.id ? updatedBusiness : b));
  };

  const handleAddBusiness = (newBusiness: Business) => {
    setPortalData(prev => [newBusiness, ...prev]);
  };

  const handleDeleteBusiness = (id: string) => {
    setPortalData(prev => prev.filter(b => b.id !== id));
  };

  if (showLogin && !currentUser) {
    return (
      <AdminLogin
        onLogin={(user) => {
          setCurrentUser(user);
          setCurrentView('dashboard');
          setShowLogin(false);
          // Explicitly set location to ensure effect triggers if needed
          window.scrollTo(0, 0);
        }}
        onBack={() => setShowLogin(false)}
      />
    );
  }

  if (currentUser && currentView === 'dashboard') {
    return (
      <Dashboard
        user={currentUser}
        businesses={portalData}
        featuredEvent={featuredEvent}
        onUpdateEvent={setFeaturedEvent}
        onUpdate={handleUpdateBusiness}
        onAdd={handleAddBusiness}
        onDelete={handleDeleteBusiness}
        onLogout={() => { setCurrentUser(null); setCurrentView('home'); }}
        onBack={() => setCurrentView('home')}
      />
    );
  }

  if (selectedBusiness) {
    return (
      <BusinessDetail
        business={selectedBusiness}
        userLocation={userLocation}
        onBack={() => setSelectedBusinessId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar
        onNavigate={handleNavigate}
        currentView={currentView}
        hasLocation={!!userLocation}
        onRequestLocation={requestLocation}
        onLoginClick={() => currentUser ? handleNavigate('dashboard') : setShowLogin(true)}
        isAuthenticated={!!currentUser}
      />

      {currentView === 'home' && (
        <section className="relative h-[700px] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            {isLoading ? (
              <div className="w-full h-full bg-slate-900/50 animate-pulse" />
            ) : (
              <img
                src={siteSettings?.hero_background_url || "https://images.unsplash.com/photo-1590001155093-a3c66ab0c3ff?q=80&w=2070&auto=format&fit=crop"}
                alt="Paraty Histórica"
                className="w-full h-full object-cover animate-in fade-in duration-700"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-50"></div>
          </div>

          <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
            <span className="px-5 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white text-xs font-black tracking-[0.3em] uppercase mb-8 inline-block shadow-xl">
              Descubra o Inesquecível
            </span>
            <h1 className="text-6xl md:text-8xl font-black text-white mb-6 leading-tight drop-shadow-2xl">
              Viva a Magia de<br />
              <span className="bg-gradient-to-r from-sky-400 via-emerald-300 to-amber-200 bg-clip-text text-transparent italic">
                Paraty
              </span>
            </h1>
            <p className="text-xl text-white/90 mb-12 max-w-2xl mx-auto font-medium leading-relaxed drop-shadow-lg">
              História preservada, natureza exuberante e gastronomia de classe mundial. Tudo o que você precisa em um só lugar.
            </p>

            <div className="relative max-w-2xl mx-auto group">
              <div className="absolute -inset-1 bg-sky-500/20 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative flex items-center bg-white/20 backdrop-blur-2xl border border-white/30 rounded-full p-2 shadow-2xl">
                <div className="flex-grow flex items-center pl-6">
                  <Search className="text-white/70 w-5 h-5 mr-3" />
                  <input
                    type="text"
                    placeholder="O que você deseja explorar?"
                    className="w-full bg-transparent text-white placeholder-white/60 focus:outline-none font-bold py-3 text-lg"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => {
                    const mainElement = document.getElementById('main-content');
                    if (mainElement) {
                      mainElement.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="px-10 py-4 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-full transition-all active:scale-95 shadow-xl shadow-sky-950/40"
                >
                  Explorar
                </button>
              </div>
            </div>


          </div>
        </section>
      )}

      {currentView === 'advertise' && (
        <main className="max-w-7xl mx-auto px-4 md:px-8 py-12">
          <Advertise onBack={() => handleNavigate('home')} />
        </main>
      )}

      {currentView === 'help' && (
        <HelpCenter onBack={() => handleNavigate('home')} />
      )}

      {currentView === 'terms' && (
        <TermsOfUse onBack={() => handleNavigate('home')} />
      )}

      {currentView === 'privacy' && (
        <PrivacyPolicy onBack={() => handleNavigate('home')} />
      )}


      {(currentView === 'home' || currentView === 'totems' || currentView === 'history' || currentView === 'adventure' || currentView === 'search') && (
        <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">



          {(currentView === 'home' || currentView === 'totems' || selectedCategory === 'totem') && (
            <div className="mb-20 mt-12"> {/* Added mt-12 to account for widget */}

              <div
                className={`bg-white rounded-[32px] overflow-hidden shadow-xl shadow-sky-900/5 border border-sky-100 transition-all duration-500 ease-in-out ${isTotemExpanded ? 'pb-8' : 'p-6'}`}
              >
                <div className={`flex flex-col md:flex-row items-center justify-between gap-6 ${isTotemExpanded ? 'p-8 border-b border-sky-50 mb-8' : ''}`}>
                  <div className="flex items-center gap-5">
                    <div className="flex-shrink-0">
                      <img
                        src="/paraty-rotativo.png"
                        alt="Paraty Rotativo"
                        className="w-16 h-16 object-contain drop-shadow-md hover:scale-105 transition-transform"
                      />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 leading-tight">Estacionamento Rotativo</h2>
                      <p className="text-slate-500 text-sm font-medium">Localize o totem de autoatendimento mais próximo agora.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {!isTotemExpanded ? (
                      <button
                        onClick={() => setIsTotemExpanded(true)}
                        className="px-6 py-3 bg-sky-600 text-white font-bold rounded-xl shadow-lg shadow-sky-600/20 hover:bg-sky-700 transition-all flex items-center gap-2 active:scale-95"
                      >
                        <MapPin className="w-4 h-4" /> Localizar Totem
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (currentView === 'totems') handleNavigate('home');
                          setIsTotemExpanded(false);
                        }}
                        className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2 active:scale-95"
                      >
                        <ChevronUp className="w-4 h-4" /> Recolher
                      </button>
                    )}
                  </div>
                </div>

                {isTotemExpanded && (
                  <div className="px-8 animate-in fade-in slide-in-from-top-4 duration-500">
                    <TotemFinder userLocation={userLocation} onRequestLocation={requestLocation} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Top Section: Highlights (Featured Event & Live Feed) */}
          {currentView === 'home' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
              {/* Featured Event (Col 9) */}
              <div className="lg:col-span-9">
                {featuredEvent && featuredEvent.isActive && (
                  <div className="bg-white rounded-[32px] overflow-hidden shadow-xl shadow-sky-900/5 border border-slate-100 flex flex-col md:flex-row animate-in fade-in slide-in-from-bottom-6 duration-700 h-full">
                    <div className="md:w-2/5 h-[300px] md:h-auto relative">
                      <img
                        src={featuredEvent.imageUrl}
                        className="w-full h-full object-cover"
                        alt={featuredEvent.title}
                      />
                      <div className="absolute top-6 left-6">
                        <span className="px-3 py-1 bg-amber-400 text-white text-[10px] font-bold rounded-full shadow-lg tracking-wide uppercase">Destaque</span>
                      </div>
                    </div>
                    <div className="md:w-3/5 p-8 flex flex-col justify-center">
                      <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4 leading-tight">{featuredEvent.title}</h3>
                      <p className="text-slate-500 mb-6 leading-relaxed line-clamp-3">
                        {featuredEvent.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => setIsScheduleModalOpen(true)}
                          className="flex-1 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2"
                        >
                          {featuredEvent.buttonText}
                          <Sparkles className="w-4 h-4 text-amber-400" />
                        </button>

                        <button
                          onClick={() => setIsGoogleCalendarModalOpen(true)}
                          className="p-3 bg-white text-slate-400 hover:text-sky-600 rounded-xl border-2 border-slate-100 hover:border-sky-100 hover:bg-sky-50 transition-all active:scale-95 shadow-sm"
                          title="Adicionar ao Calendário"
                        >
                          <CalendarPlus className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar / Live Feed (Col 3) */}
              <div className="lg:col-span-3">
                <LiveFeed />
              </div>
            </div>
          )}

          {currentView !== 'totems' && selectedCategory !== 'totem' && (
            <>
              {/* Filter Section (Now Middle) */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                  <h2 className="text-3xl font-extrabold text-slate-900 mb-2">
                    {currentView === 'home' && 'Onde ir em Paraty'}
                    {currentView === 'explore' && 'Explorar Tudo'}
                    {currentView === 'history' && 'Patrimônio Histórico'}
                    {currentView === 'adventure' && 'Aventura e Natureza'}
                  </h2>
                  <p className="text-slate-500">
                    {filteredData.length} resultados encontrados {userLocation ? 'perto de você' : ''}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        if (cat.id === 'totem') handleNavigate('totems');
                        else setSelectedCategory(selectedCategory === cat.id ? 'all' : cat.id);
                      }}
                      className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 ${selectedCategory === cat.id
                        ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-sky-200 hover:bg-sky-50'
                        }`}
                    >
                      {cat.id === 'totem' && <Ticket className="w-4 h-4" />}
                      {cat.name}
                      {selectedCategory === cat.id && <X className="w-3 h-3 ml-1 text-white/70 hover:text-white" />}
                    </button>
                  ))}

                  {/* Open Now Filter Button */}
                  <button
                    onClick={() => setShowOpenOnly(!showOpenOnly)}
                    className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 border ${showOpenOnly
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                  >
                    <Clock className="w-4 h-4" />
                    Aberto Agora
                    {showOpenOnly && <X className="w-3 h-3 ml-1" />}
                  </button>

                  {/* Clear All Filters Button */}
                  {(selectedCategory !== 'all' || showOpenOnly) && (
                    <button
                      onClick={() => {
                        setSelectedCategory('all');
                        setShowOpenOnly(false);
                        setSearchQuery('');
                      }}
                      className="px-5 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 animate-in fade-in"
                      title="Limpar todos os filtros"
                    >
                      <X className="w-4 h-4" />
                      Limpar Filtros
                    </button>
                  )}
                </div>
              </div>

              {/* Business Results Grid (Full Width now) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredData.map(business => (
                  <BusinessCard
                    key={business.id}
                    business={business}
                    userLocation={userLocation}
                    onClick={handleBusinessClick}
                  />
                ))}
              </div>

              {filteredData.length === 0 && (
                <div className="py-20 text-center bg-white rounded-[32px] border border-slate-100">
                  <div className="inline-flex items-center justify-center p-6 bg-slate-50 rounded-full mb-6">
                    <Compass className="w-12 h-12 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Nenhum resultado encontrado</h3>
                  <p className="text-slate-500">Tente ajustar seus filtros ou termos de pesquisa.</p>
                  <button
                    onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                    className="mt-6 text-sky-600 font-bold hover:underline"
                  >
                    Limpar todos os filtros
                  </button>
                </div>
              )}
            </>
          )}

          {!userLocation && (
            <div className="mt-20 bg-slate-900 rounded-[40px] p-8 md:p-16 flex flex-col md:flex-row items-center gap-12 overflow-hidden relative border border-white/5">
              <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
              <div className="relative z-10 md:w-1/2">
                <h3 className="text-3xl font-extrabold text-white mb-6">Descubra o que está ao seu redor</h3>
                <p className="text-slate-400 text-lg mb-10 leading-relaxed">
                  O Go Paraty utiliza sua geolocalização para sugerir as atrações e comércios mais próximos. Não perca tempo planejando rotas complexas.
                </p>
                <button
                  onClick={requestLocation}
                  className="px-8 py-4 bg-sky-500 text-white font-bold rounded-2xl shadow-lg shadow-sky-500/40 hover:bg-sky-400 transition-all active:scale-95"
                >
                  Ativar Localização
                </button>
              </div>
              <div className="relative z-10 md:w-1/2 flex justify-center">
                <div className="relative">
                  <img src="https://images.unsplash.com/photo-1548777123-e216912df7d8?auto=format&fit=crop&q=80&w=400" className="w-64 h-80 object-cover rounded-[32px] shadow-2xl rotate-3" />
                  <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-rose-50 rounded-xl">
                        <MapPin className="w-5 h-5 text-rose-500" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Distância</p>
                        <p className="text-sm font-bold text-slate-900">Calculada por GPS</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      <Footer
        onNavigate={handleNavigate}
        currentUser={currentUser}
        onLogin={() => setShowLogin(true)}
        onOpenMap={() => setIsMapModalOpen(true)}
      />

      {/* Google Calendar Modal */}
      {featuredEvent && (
        <GoogleCalendarModal
          isOpen={isGoogleCalendarModalOpen}
          onClose={() => setIsGoogleCalendarModalOpen(false)}
          event={featuredEvent}
        />
      )}

      {/* Schedule Modal */}
      {featuredEvent && (
        <ScheduleModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          event={featuredEvent}
        />
      )}

      {/* Map Modal */}
      <MapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
      />
    </div>
  );
};

export default App;
