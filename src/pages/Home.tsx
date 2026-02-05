import React, { useState, useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation, Trans } from 'react-i18next';
import { Search, MapPin, ChevronUp, Clock, X, Ticket, Compass, Sparkles, CalendarPlus } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BusinessCard from '../components/BusinessCard';
import { BusinessCardSkeleton } from '../components/ui/Skeleton';
import { Business, UserLocation, FeaturedEvent, SiteSettings, User } from '../types';
import { CATEGORIES, DEFAULT_IMAGES } from '../config/constants';
import { calculateDistance, checkIsOpen } from '../utils';
import { api } from '../services/api';
import { analytics } from '../services/analytics';
import EmergencyBanner from '../components/EmergencyBanner';
import PatyAgent from '../components/PatyAgent';

// Lazy load heavy components
const TotemFinder = React.lazy(() => import('../components/TotemFinder'));
const LiveFeed = React.lazy(() => import('../components/LiveFeed'));
const MapModal = React.lazy(() => import('../components/MapModal'));
const ScheduleModal = React.lazy(() => import('../components/ScheduleModal'));
const GoogleCalendarModal = React.lazy(() => import('../components/GoogleCalendarModal'));

interface HomeProps {
    userLocation: UserLocation | null;
    onRequestLocation: () => void;
    currentUser: User | null;
    onNavigate: (view: string) => void;
    onLoginClick: () => void;
    initialView?: string;
}

const Home: React.FC<HomeProps> = ({
    userLocation,
    onRequestLocation,
    currentUser,
    onNavigate,
    onLoginClick,
    initialView = 'home'
}) => {
    const { t } = useTranslation();
    // Local State
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [featuredEvent, setFeaturedEvent] = useState<FeaturedEvent | null>(null);
    const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // UI State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(initialView === 'totems' ? 'totem' : 'all');
    const [isTotemExpanded, setIsTotemExpanded] = useState(initialView === 'totems');
    const [showOpenOnly, setShowOpenOnly] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [isGoogleCalendarModalOpen, setIsGoogleCalendarModalOpen] = useState(false);
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [mapDestination, setMapDestination] = useState<{ lat: number; lng: number } | null>(null);

    // Fetch Data
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [fetchedBusinesses, fetchedEvent, fetchedSettings] = await Promise.all([
                    api.getBusinesses(),
                    api.getFeaturedEvent(),
                    api.getSiteSettings()
                ]);
                setBusinesses(fetchedBusinesses);
                setFeaturedEvent(fetchedEvent);
                if (fetchedSettings) setSiteSettings(fetchedSettings);
            } catch (error) {
                console.error("Failed to load home data", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // Update logic based on props
    // Update logic based on props
    useEffect(() => {
        if (initialView === 'totems') {
            setSelectedCategory('totem');
            setIsTotemExpanded(true);
        } else if (initialView === 'home') {
            // RESET STATE WHEN RETURNING TO HOME
            setSelectedCategory('all');
            setIsTotemExpanded(false);
            setSearchQuery('');
        } else if (['explore', 'history', 'adventure'].includes(initialView)) {
            // Maps views to category filters if needed, or handles scroll
            // For now, keep simple
        }
    }, [initialView]);


    // Helper to normalize category keys (remove accents, lowercase)
    const normalizeCategoryKey = (id: string) => {
        return id.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    const filteredData = useMemo(() => {
        let data = [...businesses];

        const matchesCategory = (itemCat: string, filterCat: string) => {
            // Normalize both for comparison
            const cleanItem = normalizeCategoryKey(itemCat || '');
            const cleanFilter = normalizeCategoryKey(filterCat || '');
            return cleanItem === cleanFilter;
        };

        if (initialView === 'history') {
            // 'História' -> 'historia'
            data = data.filter(b => matchesCategory(b.category, 'História') || matchesCategory(b.category, 'historia'));
        } else if (initialView === 'adventure') {
            data = data.filter(b => matchesCategory(b.category, 'Aventura') || matchesCategory(b.category, 'aventura'));
        }

        if (selectedCategory !== 'all' && selectedCategory !== 'totem') {
            data = data.filter(b => matchesCategory(b.category, selectedCategory));
        }

        if (showOpenOnly) {
            data = data.filter(b => checkIsOpen(b.opening_hours));
        }

        if (searchQuery) {
            const lowerQuery = normalizeCategoryKey(searchQuery);
            data = data.filter(b =>
                normalizeCategoryKey(b.name).includes(lowerQuery) ||
                normalizeCategoryKey(b.description).includes(lowerQuery) ||
                normalizeCategoryKey(b.category || '').includes(lowerQuery)
            );
        }
        // ... (keep existing sorting logic)


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
    }, [selectedCategory, searchQuery, initialView, businesses, userLocation, showOpenOnly]);

    // Dynamic Greeting Logic
    const [greetingType, setGreetingType] = useState('morning'); // 'morning' | 'afternoon' | 'evening'

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) {
            setGreetingType('morning');
        } else if (hour >= 12 && hour < 18) {
            setGreetingType('afternoon');
        } else {
            setGreetingType('evening');
        }
    }, []);

    // Get gradient based on type (Translations handled in render)
    const getGradient = (type: string) => {
        switch (type) {
            case 'morning': return 'from-amber-400 via-orange-400 to-rose-400';
            case 'afternoon': return 'from-sky-400 via-blue-500 to-teal-400';
            case 'evening': return 'from-indigo-400 via-purple-500 to-pink-500';
            default: return 'from-coral via-amber-500 to-sky-500';
        }
    };

    // SEO Data
    const seoTitle = useMemo(() => {
        if (selectedCategory === 'totem' || initialView === 'totems') return `${t('totems.title')} - Go Parati`;
        if (selectedCategory !== 'all') {
            const catLabel = t(`categories.${normalizeCategoryKey(selectedCategory)}`);
            return `${catLabel} em Paraty - Go Parati`;
        }
        if (initialView === 'history') return `História e Cultura em Paraty - Go Parati`;
        if (initialView === 'adventure') return `Aventura e Natureza em Paraty - Go Parati`;
        return t('hero.curator_title');
    }, [selectedCategory, initialView, t]);

    const seoDesc = useMemo(() => {
        if (selectedCategory === 'totem' || initialView === 'totems') return t('totems.desc');
        return t('hero.curator_desc');
    }, [selectedCategory, initialView, t]);

    // JSON-LD Structured Data
    const structuredData = useMemo(() => {
        return {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "itemListElement": filteredData.slice(0, 10).map((b, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "url": `${window.location.origin}/business/${b.id}`,
                "name": b.name,
                "image": b.image_url,
                "description": b.description
            }))
        };
    }, [filteredData]);

    // Track view and queries
    useEffect(() => {
        analytics.trackPageView('home', { view: initialView });
    }, [initialView]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (searchQuery) analytics.trackSearch(searchQuery);
        }, 2000); // Debounce search tracking
        return () => clearTimeout(timeout);
    }, [searchQuery]);

    return (
        <div className="min-h-screen bg-surface-sand pt-24 sm:pt-28 md:pt-32">
            <Helmet>
                <title>{seoTitle}</title>
                <meta name="description" content={seoDesc} />
                <meta property="og:title" content={seoTitle} />
                <meta property="og:description" content={seoDesc} />
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            </Helmet>
            <Navbar
                onNavigate={onNavigate}
                currentView={initialView}
                hasLocation={!!userLocation}
                onRequestLocation={onRequestLocation}
                onLoginClick={onLoginClick}
                isAuthenticated={!!currentUser}
            />

            {/* AUTOMATED EMERGENCY ALERT BANNER (Fixed Top) */}
            <EmergencyBanner />

            {initialView === 'home' && (
                <section className="relative min-h-screen lg:min-h-[800px] xl:min-h-[900px] flex items-center justify-center -mt-24 sm:-mt-28 md:-mt-32 pt-24 sm:pt-32">
                    <div className="absolute inset-0 z-0">
                        {isLoading ? (
                            <div className="w-full h-full bg-slate-900/50 animate-pulse" />
                        ) : (
                            <img
                                src={siteSettings?.hero_background_url || DEFAULT_IMAGES.HERO}
                                alt="Paraty Histórica"
                                className="w-full h-full object-cover animate-in fade-in duration-700"
                                fetchPriority="high"
                                decoding="async"
                            />
                        )}
                        {/* Darker Overlay for Contrast */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-surface/95"></div>
                    </div>

                    <div className="relative z-10 text-center px-6 max-w-5xl mx-auto pt-4 md:pt-8 flex flex-col items-center">
                        <span className="px-5 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white text-[10px] md:text-xs font-bold tracking-widest uppercase mb-4 md:mb-6 inline-block shadow-lg font-sans">
                            {t('hero.curator_title')}
                        </span>

                        {/* High Contrast Heading */}
                        <h1 className="text-4xl lg:text-6xl xl:text-7xl font-black text-white mb-6 leading-[1.05] drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] font-serif tracking-tight">
                            {t(`hero.greeting_${greetingType}`)}<br />
                            <span className={`text-transparent bg-clip-text bg-gradient-to-r ${getGradient(greetingType)} italic pr-4 py-2 drop-shadow-none inline-block leading-normal`}>
                                {t(`hero.sub_${greetingType}`)}
                            </span>
                        </h1>

                        {/* Readable Description */}
                        <p className="text-lg md:text-xl text-white/90 mb-10 max-w-xl mx-auto font-medium leading-relaxed font-sans drop-shadow-md">
                            <Trans i18nKey="hero.subtitle_2">
                                <span className="text-amber-300 font-serif italic font-bold">só os locais conhecem</span>
                            </Trans>
                        </p>

                        <div className="relative w-full max-w-2xl lg:max-w-3xl mx-auto group transition-all duration-300 focus-within:scale-[1.01]">
                            <div className="absolute -inset-1 bg-coral/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition duration-500"></div>
                            <div className="relative flex items-center bg-white/70 backdrop-blur-3xl border border-white/50 rounded-full p-1.5 md:p-2 shadow-2xl w-full">
                                <div className="flex-grow flex items-center pl-4 md:pl-8">
                                    <Search className="text-ink/40 w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3" />
                                    <input
                                        type="text"
                                        placeholder={t('hero.search_placeholder')}
                                        className="w-full bg-transparent text-ink placeholder-ink/50 focus:outline-none font-bold py-3 md:py-4 text-sm md:text-lg lg:text-xl truncate"
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
                                    className="px-6 py-3 md:px-12 md:py-5 bg-coral hover:bg-coral-hover text-white text-xs md:text-base lg:text-lg font-black rounded-full transition-all active:scale-95 shadow-xl shadow-coral/30 whitespace-nowrap"
                                >
                                    {t('hero.search_button')}
                                </button>
                            </div>
                        </div>
                        <div className="mt-12 opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
                            <p className="text-sm font-bold tracking-widest text-ink uppercase mb-2">{t('hero.curator_title')}</p>
                            <p className="text-ink-medium text-sm max-w-lg mx-auto leading-relaxed border-l-2 border-coral pl-4 bg-white/40 backdrop-blur-sm py-2 rounded-r-lg">
                                <Trans i18nKey="hero.curator_desc">
                                    Roteiros Inteligentes baseados em <span className="font-bold text-ink">Geolocalização</span> e <span className="font-bold text-ink">Clima Real</span>.
                                    Nós escolhemos o melhor momento para você.
                                </Trans>
                            </p>
                        </div>
                    </div>
                </section>
            )}

            <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12">

                {/* Totem Widget */}
                {(initialView === 'home' || initialView === 'totems' || selectedCategory === 'totem') && (
                    <div className="mb-12 md:mb-20 mt-2 md:mt-12">
                        <div
                            className={`bg-surface rounded-2xl overflow-hidden border border-border shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-500 ease-in-out ${isTotemExpanded ? 'pb-8' : 'p-6'}`}
                        >
                            <div className={`flex flex-col md:flex-row items-center justify-between gap-6 ${isTotemExpanded ? 'p-8 border-b border-border mb-8' : ''}`}>
                                <div className="flex items-center gap-5">
                                    <div className="flex-shrink-0">
                                        <img
                                            src="/paraty-rotativo.png"
                                            alt="Paraty Rotativo"
                                            className="w-16 h-16 object-contain drop-shadow-md hover:scale-105 transition-transform"
                                        />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-ink leading-tight font-sans">{t('totems.title', 'Evite Multas: Estacione Fácil')}</h2>
                                        <p className="text-ink-light text-sm font-medium">{t('totems.desc')}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {!isTotemExpanded ? (
                                        <button
                                            onClick={() => setIsTotemExpanded(true)}
                                            className="px-6 py-3 bg-ink text-white font-bold rounded-full shadow-lg hover:bg-ink/90 transition-all flex items-center gap-2 active:scale-95"
                                        >
                                            <MapPin className="w-4 h-4" /> {t('totems.button_locate')}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                if (initialView === 'totems') onNavigate('home');
                                                setIsTotemExpanded(false);
                                            }}
                                            className="px-6 py-3 bg-canvas text-ink-light font-bold rounded-full hover:bg-black/5 transition-all flex items-center gap-2 active:scale-95"
                                        >
                                            <ChevronUp className="w-4 h-4" /> {t('totems.button_collapse')}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {isTotemExpanded && (
                                <div className="px-8 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <React.Suspense fallback={<div className="h-[400px] w-full bg-slate-50 animate-pulse rounded-3xl" />}>
                                        <TotemFinder userLocation={userLocation} onRequestLocation={onRequestLocation} />
                                    </React.Suspense>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Featured Event & Live Feed */}
                {initialView === 'home' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
                        <div className="lg:col-span-9">
                            {featuredEvent && featuredEvent.isActive && (
                                <div className="bg-white rounded-[32px] overflow-hidden shadow-xl shadow-colonial-coffee/5 border border-colonial-stone flex flex-col md:flex-row animate-in fade-in slide-in-from-bottom-6 duration-700 h-full">
                                    <div className="md:w-2/5 h-[300px] md:h-auto relative">
                                        <img
                                            src={featuredEvent.imageUrl}
                                            className="w-full h-full object-cover"
                                            alt={featuredEvent.title}
                                        />
                                        <div className="absolute top-6 left-6">
                                            <span className="px-3 py-1 bg-coral text-white text-[10px] font-bold rounded-full shadow-lg tracking-wide uppercase">Destaque</span>
                                        </div>
                                    </div>
                                    <div className="md:w-3/5 p-8 flex flex-col justify-center">
                                        <h3 className="text-2xl md:text-3xl font-extrabold text-ink mb-4 leading-tight font-serif italic">{featuredEvent.title}</h3>
                                        <p className="text-slate-500 mb-6 leading-relaxed line-clamp-3">
                                            {featuredEvent.description}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <button
                                                onClick={() => setIsScheduleModalOpen(true)}
                                                className="flex-1 px-6 py-3 bg-ink text-white font-bold rounded-xl hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-black/10 flex items-center justify-center gap-2"
                                            >
                                                {featuredEvent.buttonText}
                                                <Sparkles className="w-4 h-4 text-amber-400" />
                                            </button>
                                            <button
                                                onClick={() => setIsGoogleCalendarModalOpen(true)}
                                                className="p-3 bg-surface-sand text-slate-400 hover:text-emerald-500 rounded-xl border-2 border-border hover:border-emerald-500 hover:bg-white transition-all active:scale-95 shadow-sm"
                                                title="Adicionar ao Calendário"
                                            >
                                                <CalendarPlus className="w-6 h-6" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="lg:col-span-3">
                            <React.Suspense fallback={<div className="h-full min-h-[400px] bg-white rounded-[32px] animate-pulse" />}>
                                <LiveFeed />
                            </React.Suspense>
                        </div>
                    </div>
                )}

                {/* Filters and List */}
                {initialView !== 'totems' && selectedCategory !== 'totem' && (
                    <>
                        {/* Filter Section */}
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                            <div>
                                <h2 className="text-3xl font-extrabold text-ink mb-2 font-serif">
                                    {initialView === 'home' && t('filters.title_home')}
                                    {initialView === 'explore' && t('filters.title_explore')}
                                    {initialView === 'history' && (selectedCategory === 'all' ? t('filters.title_history') : t(`categories.${normalizeCategoryKey(selectedCategory)}`))}
                                    {initialView === 'adventure' && (selectedCategory === 'all' ? t('filters.title_adventure') : t(`categories.${normalizeCategoryKey(selectedCategory)}`))}
                                </h2>
                                <p className="text-slate-500 font-sans">
                                    {t('filters.count_text', { count: filteredData.length })} {userLocation ? t('filters.near_me') : ''}
                                </p>
                            </div>

                            <div className="relative group">
                                {/* Left Gradient/Arrow */}
                                <div className="absolute left-0 top-0 bottom-4 w-12 bg-gradient-to-r from-surface-sand via-surface-sand/80 to-transparent z-10 pointer-events-none md:hidden flex items-center justify-start pl-1">
                                    <div className="animate-pulse bg-white/80 p-1 rounded-full shadow-sm backdrop-blur-sm pointer-events-none">
                                        <ChevronUp className="w-4 h-4 text-ink -rotate-90 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Right Gradient/Arrow */}
                                <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-surface-sand via-surface-sand/80 to-transparent z-10 pointer-events-none md:hidden flex items-center justify-end pr-1">
                                    <div className="animate-pulse bg-white/80 p-1 rounded-full shadow-sm backdrop-blur-sm pointer-events-none">
                                        <ChevronUp className="w-4 h-4 text-ink rotate-90 pointer-events-none" />
                                    </div>
                                </div>

                                <div
                                    className="flex overflow-x-auto pb-4 gap-2 snap-x no-scrollbar -mx-4 px-12 md:mx-0 md:px-0 md:flex-wrap mobile-scroll-container scroll-smooth"
                                    id="category-scroll-container"
                                >
                                    {CATEGORIES.map((cat) => (
                                        <button
                                            key={cat.id}
                                            id={`cat-btn-${cat.id}`}
                                            onClick={() => {
                                                if (cat.id === 'totem') onNavigate('totems');
                                                else {
                                                    const newCat = selectedCategory === cat.id ? 'all' : cat.id;
                                                    setSelectedCategory(newCat);
                                                    if (newCat !== 'all') analytics.trackFilter(newCat);

                                                    // Robust Scroll to Center Logic
                                                    const container = document.getElementById('category-scroll-container');
                                                    const btnId = `cat-btn-${cat.id}`;

                                                    // Small timeout to allow state update/rendering if needed, though usually stable
                                                    setTimeout(() => {
                                                        const btn = document.getElementById(btnId);
                                                        if (container && btn) {
                                                            const containerWidth = container.offsetWidth;
                                                            // const btnLeft = btn.offsetLeft;
                                                            // const btnWidth = btn.offsetWidth;

                                                            // Safer Approach:
                                                            const containerRect = container.getBoundingClientRect();
                                                            const btnRect = btn.getBoundingClientRect();

                                                            // Center = Current Scroll + (Button Left - Container Left) - (Container Width / 2) + (Button Width / 2)
                                                            // We add container.scrollLeft to get absolute position in scrollable content
                                                            const offset = btnRect.left - containerRect.left;
                                                            const scrollPos = container.scrollLeft + offset - (containerWidth / 2) + (btnRect.width / 2);

                                                            container.scrollTo({ left: scrollPos, behavior: 'smooth' });
                                                        }
                                                    }, 50);
                                                }
                                            }}
                                            className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all flex-shrink-0 flex items-center gap-2 snap-center ${selectedCategory === cat.id
                                                ? 'bg-ink text-white shadow-lg shadow-black/20 scale-105'
                                                : 'bg-white text-slate-600 border border-border hover:border-coral hover:text-coral'
                                                }`}
                                        >
                                            {cat.id === 'totem' && <Ticket className="w-4 h-4" />}
                                            {t(`categories.${normalizeCategoryKey(cat.id)}`)}
                                            {selectedCategory === cat.id && <X className="w-3 h-3 ml-1 text-white/70 hover:text-white" />}
                                        </button>
                                    ))}

                                    <button
                                        onClick={() => setShowOpenOnly(!showOpenOnly)}
                                        className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all flex-shrink-0 flex items-center gap-2 border snap-center ${showOpenOnly
                                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                                            : 'bg-white text-slate-600 border-border hover:border-emerald-500 hover:text-emerald-500'
                                            }`}
                                    >
                                        <Clock className="w-4 h-4" />
                                        {t('filters.open_now')}
                                        {showOpenOnly && <X className="w-3 h-3 ml-1" />}
                                    </button>

                                    {(selectedCategory !== 'all' || showOpenOnly) && (
                                        <button
                                            onClick={() => {
                                                setSelectedCategory('all');
                                                setShowOpenOnly(false);
                                                setSearchQuery('');
                                            }}
                                            className="px-5 py-2.5 rounded-2xl text-sm font-bold transition-all flex-shrink-0 flex items-center gap-2 bg-surface-sand text-slate-500 hover:bg-colonial-stone hover:text-slate-700 animate-in fade-in snap-center"
                                            title={t('filters.clear_all')}
                                        >
                                            <X className="w-4 h-4" />
                                            {t('filters.clear_filters')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {isLoading
                                ? Array.from({ length: 8 }).map((_, i) => <BusinessCardSkeleton key={i} />)
                                : filteredData.map(business => (
                                    <BusinessCard
                                        key={business.id}
                                        business={business}
                                        userLocation={userLocation}
                                        onClick={(id) => onNavigate(`business/${id}`)}
                                        onRouteClick={(loc) => {
                                            setMapDestination(loc);
                                            setIsMapModalOpen(true);
                                        }}
                                    />
                                ))
                            }
                        </div>

                        {filteredData.length === 0 && (
                            <div className="py-20 text-center bg-white rounded-[32px] border border-slate-100">
                                <div className="inline-flex items-center justify-center p-6 bg-slate-50 rounded-full mb-6">
                                    <Compass className="w-12 h-12 text-slate-300" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">{t('filters.no_results')}</h3>
                                <p className="text-slate-500">{t('filters.no_results_desc')}</p>
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSelectedCategory('all');
                                        setShowOpenOnly(false);
                                    }}
                                    className="mt-6 text-sky-600 font-bold hover:underline"
                                >
                                    {t('filters.clear_all')}
                                </button>
                            </div>
                        )}
                    </>
                )}

                {!userLocation && (
                    <div className="mt-20 bg-slate-900 rounded-[40px] p-8 md:p-16 flex flex-col md:flex-row items-center gap-12 overflow-hidden relative border border-white/5">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
                        <div className="relative z-10 md:w-1/2">
                            <h3 className="text-3xl font-extrabold text-white mb-6">{t('hero.location_title')}</h3>
                            <p className="text-slate-400 text-lg mb-10 leading-relaxed">
                                {t('hero.location_desc')}
                            </p>
                            <button
                                onClick={onRequestLocation}
                                className="px-8 py-4 bg-sky-500 text-white font-bold rounded-2xl shadow-lg shadow-sky-500/40 hover:bg-sky-400 transition-all active:scale-95"
                            >
                                {t('hero.location_button')}
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

            <Footer
                onNavigate={onNavigate}
                currentUser={currentUser}
                onLogin={onLoginClick}
                onOpenMap={() => {
                    setMapDestination(null);
                    setIsMapModalOpen(true);
                }}
            />

            {/* Lazy Modals */}
            <React.Suspense fallback={null}>
                {featuredEvent && (
                    <GoogleCalendarModal
                        isOpen={isGoogleCalendarModalOpen}
                        onClose={() => setIsGoogleCalendarModalOpen(false)}
                        event={featuredEvent}
                    />
                )}

                {featuredEvent && (
                    <ScheduleModal
                        isOpen={isScheduleModalOpen}
                        onClose={() => setIsScheduleModalOpen(false)}
                        event={featuredEvent}
                    />
                )}

                <MapModal
                    isOpen={isMapModalOpen}
                    onClose={() => setIsMapModalOpen(false)}
                    destination={mapDestination}
                />
            </React.Suspense>

            {/* Mobile Agents */}
            <PatyAgent />

        </div>
    );
};

export default Home;
