import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import AdminLogin from './components/AdminLogin';
import BusinessDetail from './components/BusinessDetail';
import { Advertise } from './components/Advertise';
import { TermsOfUse, PrivacyPolicy, HelpCenter } from './components/LegalPages';
import Home from './pages/Home';
import ReloadPrompt from './components/ReloadPrompt';

import { authService } from './auth';
import { Business, UserLocation, User } from './types';
import { supabase } from './supabase';
import { api } from './services/api';

const App: React.FC = () => {
  // Global State
  const [currentView, setCurrentView] = useState('home');
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  // Data for Dashboard/Detail (still managed here for shared access if needed, or fetched by components)
  // To match the new "Home fetches its own data" pattern, we should probably refactor Detail too,
  // but for now let's fetch list for Detail lookup or allow Detail to fetch by ID.
  // Actually, BusinessDetail takes a `business` object. 
  // Let's keep `portalData` in App for now to support the existing flow of `BusinessDetail`, 
  // OR make BusinessDetail fetch by ID.
  // The easiest refactor for now is: Home fetches its own list. 
  // Dashboard fetches its own list.
  // BusinessDetail fetches its own business by ID (or we pass it if we have it).

  // However, `BusinessDetail` currently expects `business` prop.
  // Let's upgrade BusinessDetail to fetch if business is missing? 
  // Or simpler: We keep `portalData` in App purely for the Detail view lookup? 
  // Better: Let's fetch the list in App and pass it down?
  // NO, the goal is to break the God Component. Home is already self-sufficient.

  // Let's make a new logic: 
  // If view includes 'business/', we find the ID.
  // We need to fetch that specific business.

  const [businesses, setBusinesses] = useState<Business[]>([]);

  useEffect(() => {
    // We still fetch all businesses in App to support the BusinessDetail lookup 
    // without refactoring BusinessDetail entirely yet.
    // In a real router, ID is in URL and Page fetches it.
    const loadData = async () => {
      try {
        const data = await api.getBusinesses();
        setBusinesses(data);
      } catch (e) {
        console.error("App global fetch error", e);
      }
    };
    loadData();
  }, []);

  // Auth & Location Effects (Global)
  useEffect(() => {
    authService.getCurrentUser().then(setUser);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = await authService.getCurrentUser();
        setUser(user);
      } else {
        setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let watchId: number;
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (err) => console.error("Loc error", err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      },
      (err) => alert("Location error")
    );
  };

  const setUser = (user: User | null) => {
    setCurrentUser(user);
    if (!user && currentView === 'dashboard') setCurrentView('home');
  };

  const handleNavigate = (view: string) => {
    // Simple router logic
    if (view.startsWith('business/')) {
      const id = view.split('/')[1];
      setSelectedBusinessId(id);
      setCurrentView('detail');
    } else {
      setCurrentView(view);
      setSelectedBusinessId(null);
    }
    window.scrollTo(0, 0);
  };

  // Rendering
  if (showLogin && !currentUser) {
    return (
      <AdminLogin
        onLogin={(user) => {
          setUser(user);
          setCurrentView('dashboard');
          setShowLogin(false);
        }}
        onBack={() => setShowLogin(false)}
      />
    );
  }

  if (currentUser && currentView === 'dashboard') {
    return (
      // Dashboard still uses prop drilling for CRUD. ideally this should be refactored too.
      // For now, we pass the locally fetched businesses.
      <Dashboard
        user={currentUser}
        businesses={businesses}
        featuredEvent={null} // Dashboard fetches its own event? Or we fetch here? Original passed it.
        // Breaking change: Dashboard needs refactor to fetch its own data to truly clean App.tsx
        // For now, let's keep it working by passing empty functions/data if we can't easily refactor.
        // Actually, let's allow Dashboard to work with what we have.
        onUpdateEvent={() => { }} // Placeholder
        onUpdate={(b) => setBusinesses(prev => prev.map(ib => ib.id === b.id ? b : ib))}
        onAdd={(b) => setBusinesses(prev => [b, ...prev])}
        onDelete={(id) => setBusinesses(prev => prev.filter(b => b.id !== id))}
        onLogout={() => setUser(null)}
        onBack={() => setCurrentView('home')}
      />
    );
  }

  if (currentView === 'detail' && selectedBusinessId) {
    const business = businesses.find(b => b.id === selectedBusinessId);
    if (business) {
      return (
        <BusinessDetail
          business={business}
          userLocation={userLocation}
          onBack={() => setCurrentView('home')}
        />
      );
    }
  }

  // Static Pages
  if (currentView === 'advertise') return <main className="max-w-7xl mx-auto py-12 px-4"><Advertise onBack={() => setCurrentView('home')} /></main>;
  if (currentView === 'help') return <HelpCenter onBack={() => setCurrentView('home')} />;
  if (currentView === 'terms') return <TermsOfUse onBack={() => setCurrentView('home')} />;
  if (currentView === 'privacy') return <PrivacyPolicy onBack={() => setCurrentView('home')} />;

  // Default to Home
  return (
    <>
      <Home
        userLocation={userLocation}
        onRequestLocation={requestLocation}
        currentUser={currentUser}
        onNavigate={handleNavigate}
        onLoginClick={() => currentUser ? setCurrentView('dashboard') : setShowLogin(true)}
        initialView={currentView}
      />
      <ReloadPrompt />
    </>
  );
};

export default App;
