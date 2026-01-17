
import React, { useState, useEffect } from 'react';
import {
  Store, Users, FileCheck, Calendar, Settings, LogOut,
  Plus, Search, Filter, MapPin, Star, Edit3, Trash2,
  UploadCloud, AlertCircle, X, Check, MoreVertical,
  ChevronRight, LayoutGrid, List, Bold, Image as ImageIcon
} from 'lucide-react';
import { supabase } from '../supabase';
import { authService } from '../auth';
import { Business, Category, CategoryItem, User, FeaturedEvent, SiteSettings, Totem } from '../types';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet Default Icon in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- Map Component Helpers ---
const LocationMarker = ({ position, setPosition }: { position: [number, number], setPosition: (lat: number, lng: number) => void }) => {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng.lat, e.latlng.lng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  // Only show marker if position isn't 0,0 (default for new) or show anyway but user might not see it if at 0,0
  const isValid = position[0] !== 0 || position[1] !== 0;

  return isValid ? (
    <Marker position={position} />
  ) : null;
};

const MapUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    // Only fly if valid coordinates (not 0,0 default unless intentional)
    if (center[0] !== 0 || center[1] !== 0) {
      map.setView(center, map.getZoom() > 10 ? map.getZoom() : 15);
    }
  }, [center, map]);
  return null;
};

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onUpdate: (business: Business) => void;
  onDelete: (id: string) => void;
  onBack?: () => void;
  // Extra props passed from App.tsx but seemingly unused or optional in current internal logic
  businesses?: Business[];
  featuredEvent?: FeaturedEvent | null;
  onUpdateEvent?: (event: FeaturedEvent | null) => void;
  onAdd?: (business: Business) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  user,
  onLogout,
  onUpdate,
  onDelete,
  onBack
}) => {
  const [activeMenu, setActiveMenu] = useState('businesses');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [pendingBusinesses, setPendingBusinesses] = useState<Business[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

  // -- Event Management State --
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);

  const [isLoading, setIsLoading] = useState(false); // Global loading state if needed
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // -- Totem Management State --
  const [totemsList, setTotemsList] = useState<Totem[]>([]);
  const [isAddingTotem, setIsAddingTotem] = useState(false);

  const [editingTotem, setEditingTotem] = useState<Totem | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {

  }, [activeMenu]);

  // Initial Data Fetch
  useEffect(() => {
    fetchBusinesses();
    fetchCategories();
    if (user.role === 'admin') {
      fetchUsers();
      fetchSiteSettings();
      fetchTotems();
    }
  }, [user]);

  // Search Filter Effect
  useEffect(() => {
    let filtered = businesses;


    if (searchQuery.trim()) {
      const lower = searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.name.toLowerCase().includes(lower) ||
        b.description.toLowerCase().includes(lower) ||
        b.category.toLowerCase().includes(lower)
      );
    }

    if (selectedCategory) {

      filtered = filtered.filter(b => {
        const busCat = (b.category || '').toLowerCase().trim();
        const selCat = selectedCategory.toLowerCase().trim();
        const match = busCat === selCat;

        return match;
      });
    }

    if (minRating > 0) {
      filtered = filtered.filter(b => (b.rating || 0) >= minRating);
    }


    setFilteredBusinesses(filtered);
  }, [searchQuery, businesses, selectedCategory]);

  const fetchCategories = async () => {
    try {

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const projectId = new URL(supabaseUrl).hostname.split('.')[0];
      const storageKey = `sb-${projectId}-auth-token`;
      const sessionStr = localStorage.getItem(storageKey);
      let token = supabaseKey;

      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session.access_token) token = session.access_token;
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/categories?select=*`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error(`Fetch categories failed: ${response.statusText}`);
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('[Dashboard] Error fetching categories:', error);
      // Fallback to default categories if fetch fails (or table doesn't exist yet)
      setCategories([
        { id: '1', name: 'Gastronomia', slug: 'gastronomia' },
        { id: '2', name: 'História', slug: 'historia' },
        { id: '3', name: 'Aventura', slug: 'aventura' },
        { id: '4', name: 'Hospedagem', slug: 'hospedagem' },
        { id: '5', name: 'Comércio', slug: 'comercio' },
        { id: '6', name: 'Eventos', slug: 'eventos' },
      ]);
    }
  };

  const fetchBusinesses = async () => {
    try {

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Get token from LocalStorage
      const projectId = new URL(supabaseUrl).hostname.split('.')[0];
      const storageKey = `sb-${projectId}-auth-token`;
      const sessionStr = localStorage.getItem(storageKey);
      let token = supabaseKey; // Default to anon key (public data)

      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session.access_token) {
          token = session.access_token;
        }
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/businesses?select=*`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);

      const data = await response.json();


      if (data) {
        // Split into published and pending
        const published = data.filter((b: any) => b.status === 'published' || !b.status || b.status === 'approved');
        const pending = data.filter((b: any) => b.status === 'pending_approval');

        setBusinesses(published);
        setFilteredBusinesses(published);
        setPendingBusinesses(pending);
      }
    } catch (error) {
      console.error('[Dashboard] Error fetching businesses:', error);
    }
  };

  const fetchUsers = async () => {
    const users = await authService.getUsers();
    setUsersList(users);
  };

  const fetchTotems = async () => {
    try {

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/rest/v1/totems?select=*&order=name.asc`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Map DB fields to Totem interface
        const mapped: Totem[] = data.map((t: any) => ({
          id: t.id,
          name: t.name,
          status: t.status,
          location: { lat: t.lat, lng: t.lng, address: t.address }
        }));
        setTotemsList(mapped);
      }
    } catch (error) {
      console.error('[Dashboard] Error fetching totems:', error);
    }
  };

  const handleSaveTotem = async () => {
    if (!editingTotem) return;
    setIsSaving(true);
    try {
      // Flatten for DB
      const payload = {
        name: editingTotem.name,
        address: editingTotem.location.address,
        lat: editingTotem.location.lat,
        lng: editingTotem.location.lng,
        status: editingTotem.status
      };

      if (editingTotem.id) {
        (payload as any).id = editingTotem.id;
      }

      const { error } = await supabase
        .from('totems')
        .upsert(payload);

      if (error) throw error;

      alert('Totem salvo com sucesso!');
      fetchTotems();
      setEditingTotem(null);
      setIsAddingTotem(false);
    } catch (err: any) {
      alert('Erro ao salvar totem: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTotem = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este totem?')) return;
    try {
      const { error } = await supabase.from('totems').delete().eq('id', id);
      if (error) throw error;
      fetchTotems();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const getEmptyBusiness = (): Business => ({
    id: '',
    name: '',
    category: 'Gastronomia',
    description: '',
    long_description: '',
    image_url: '',
    gallery: [],
    rating: 0,
    review_count: 0,
    price_level: 1,
    location: { lat: -23.220, lng: -44.720, address: 'Paraty, RJ' },
    status: 'published',
    amenities: [],
    opening_hours: {
      "Segunda a Sexta": "09:00 - 18:00",
      "Sábado e Domingo": "10:00 - 22:00"
    }
  });

  const handleAddNew = () => {
    setEditingBusiness(getEmptyBusiness());
    setIsAddingNew(true);
  };

  const handleSaveBusiness = async () => {
    if (!editingBusiness) return;

    try {
      const businessData = { ...editingBusiness };

      // If it's a new business (no ID or temp ID), remove ID to let DB generate it or generate UUID
      if (!businessData.id) delete (businessData as any).id;

      // If user is intern, set status to pending
      if (user.role === 'intern') {
        businessData.status = 'pending_approval';
      }

      const { data, error } = await supabase
        .from('businesses')
        .upsert(businessData)
        .select()
        .single();

      if (error) throw error;

      if (user.role === 'intern') {
        alert('Registro enviado para aprovação!');
      } else {
        onUpdate(data); // Notify parent to update global state if needed
      }

      fetchBusinesses();
      setEditingBusiness(null);
      setIsAddingNew(false);
    } catch (error: any) {
      alert('Erro ao salvar: ' + error.message);
    }
  };

  const handleFileUpload = async (files: FileList | null, field: 'image_url' | 'gallery') => {
    if (!files || files.length === 0 || !editingBusiness) return;
    setUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);


        uploadedUrls.push(publicUrl);
      }

      if (field === 'image_url') {
        setEditingBusiness({ ...editingBusiness, image_url: uploadedUrls[0] });
      } else {
        setEditingBusiness({
          ...editingBusiness,
          gallery: [...(editingBusiness.gallery || []), ...uploadedUrls]
        });
      }
    } catch (error: any) {
      console.error('Upload Error:', error);
      alert('Erro ao fazer upload. Verifique as permissões do bucket "images".');
    } finally {
      setUploading(false);
    }
  };

  // Helper for category CRUD
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const nameInput = form.elements.namedItem('name') as HTMLInputElement;
    const name = nameInput.value;
    const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const projectId = new URL(supabaseUrl).hostname.split('.')[0];
      const storageKey = `sb-${projectId}-auth-token`;
      const token = JSON.parse(localStorage.getItem(storageKey) || '{}').access_token || supabaseKey;

      const method = editingCategory ? 'PATCH' : 'POST';
      const url = editingCategory
        ? `${supabaseUrl}/rest/v1/categories?id=eq.${editingCategory.id}`
        : `${supabaseUrl}/rest/v1/categories`;

      const body = editingCategory ? { name, slug } : { name, slug };

      const response = await fetch(url, {
        method,
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new Error('Falha ao salvar categoria');

      await fetchCategories();
      setIsAddingCategory(false);
      setEditingCategory(null);
    } catch (error) {
      alert('Erro ao salvar categoria');
      console.error(error);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Tem certeza? Isso não afetará estabelecimentos já criados.')) return;
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const projectId = new URL(supabaseUrl).hostname.split('.')[0];
      const storageKey = `sb-${projectId}-auth-token`;
      const token = JSON.parse(localStorage.getItem(storageKey) || '{}').access_token || supabaseKey;

      await fetch(`${supabaseUrl}/rest/v1/categories?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      await fetchCategories();
    } catch (error) {
      console.error(error);
      alert('Erro ao deletar');
    }
  };



  // -- Event Management Logic --
  const fetchEvents = async () => {

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/rest/v1/events?select=*&order=created_at.desc`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('[Dashboard] Fetch Status:', response.status, errText);
        throw new Error(`Erro API: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      setEventsList(data || []);
      setFetchError(null);
    } catch (error: any) {
      console.error('[Dashboard] Error fetching events:', error);
      setFetchError(error.message || 'Erro desconhecido');
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const eventData = {
      title: formData.get('title'),
      description: formData.get('description'),
      image_url: formData.get('image_url'),
      button_text: formData.get('button_text'),
      button_link: formData.get('button_link'),
      schedule: formData.get('schedule'),
      is_active: formData.get('is_active') === 'on'
    };

    try {
      if (editingEvent?.id) {
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingEvent.id);

        if (error) throw error;
        alert('Evento atualizado!');
      } else {
        const { error } = await supabase
          .from('events')
          .insert([eventData]);

        if (error) throw error;
        alert('Evento criado!');
      }

      fetchEvents();
      setIsAddingEvent(false);
      setEditingEvent(null);
    } catch (error: any) {
      console.error('Save Event Error:', error);
      alert('Erro ao salvar evento: ' + (error.message || error));
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este evento?')) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchEvents();
    } catch (error: any) {
      console.error('Delete Event Error:', error);
      alert('Erro ao deletar evento: ' + (error.message || error));
    }
  };

  const fetchSiteSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "Resul set contains 0 rows"
        console.error('Error fetching site settings:', error);
      }

      if (data) {
        setSiteSettings(data);
      }
    } catch (error) {
      console.error('Unexpected error fetching settings:', error);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSaving(true);

    const settingsToSave = siteSettings || { hero_background_url: '' };

    try {
      // --- ATTEMPT 1: SUPABASE CLIENT ---


      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 3000));

      // Allow a bit of time for the standard way
      const sessionResult = await Promise.race([sessionPromise, timeoutPromise]) as any;
      const session = sessionResult.data?.session;

      if (!session) throw new Error('No session from client');

      const payload = {
        hero_background_url: settingsToSave.hero_background_url,
        ...(settingsToSave.id ? { id: settingsToSave.id } : {})
      };

      const upsertPromise = supabase.from('site_settings').upsert(payload).select().single();
      const dbTimeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), 3000));

      const { data, error } = await Promise.race([upsertPromise, dbTimeoutPromise]) as any;

      if (error) throw error;


      alert('Configurações salvas com sucesso!');
      if (data) setSiteSettings(data);

    } catch (primaryError) {


      try {
        // --- ATTEMPT 2: MANUAL REST FALLBACK ---


        // 1. Recover Token
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) throw new Error('Missing Env Vars');

        const projectId = new URL(supabaseUrl).hostname.split('.')[0];
        const localKey = `sb-${projectId}-auth-token`;
        const sessionStr = localStorage.getItem(localKey);

        if (!sessionStr) throw new Error('No local session found');
        const localSession = JSON.parse(sessionStr);
        const token = localSession.access_token;
        if (!token) throw new Error('No token in local storage');

        // 2. Direct Fetch
        const endpoint = `${supabaseUrl}/rest/v1/site_settings`;

        const payload = {
          hero_background_url: settingsToSave.hero_background_url,
          ...(settingsToSave.id ? { id: settingsToSave.id } : {})
        };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation,resolution=merge-duplicates'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const txt = await response.text();
          throw new Error(`REST Error: ${txt}`);
        }

        const resultData = await response.json();
        const savedItem = resultData && resultData.length > 0 ? resultData[0] : null;


        alert('Configurações salvas (Via Recuperação)!');
        if (savedItem) setSiteSettings(savedItem);

      } catch (fallbackError: any) {
        console.error('[Dashboard] Critical Failure:', fallbackError);
        alert(`Erro ao salvar: ${fallbackError.message || 'Falha de conexão'}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleEventFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !editingEvent) return;
    setUploading(true);

    try {
      const file = files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `events/${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);

      setEditingEvent({ ...editingEvent, image_url: publicUrl });
    } catch (error: any) {
      console.error('Event Upload Error:', error);
      alert('Erro ao fazer upload da imagem do evento.');
    } finally {
      setUploading(false);
    }
  };

  // Add fetch to effect
  useEffect(() => {
    if (activeMenu === 'events') {
      fetchEvents();
    }
  }, [activeMenu]);

  const renderEventManagement = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Eventos</h1>
          <p className="text-slate-400 font-medium text-lg">Gerencie os eventos em destaque na Home.</p>
        </div>

        <button
          onClick={() => {
            setIsAddingEvent(true);
            setEditingEvent({
              title: '',
              description: '',
              image_url: '',
              button_text: 'Saiba Mais',
              button_link: '#',
              schedule: '',
              is_active: false
            });
          }}
          className="px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Novo Evento
        </button>
      </div>

      {
        fetchError && (
          <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl mb-6 text-rose-400 font-bold">
            Erro ao carregar eventos: {fetchError}
          </div>
        )
      }

      {
        isAddingEvent && (
          <div className="bg-white rounded-[32px] p-8 mb-8 border border-slate-100 shadow-xl max-w-3xl">
            <h3 className="text-xl font-bold mb-6">{editingEvent?.id ? 'Editar Evento' : 'Novo Evento'}</h3>
            <form onSubmit={handleSaveEvent} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Título do Evento</label>
                <input
                  name="title"
                  className="w-full bg-slate-100 border-2 border-slate-300 focus:border-sky-500 focus:bg-white rounded-xl py-3 px-4 font-bold text-slate-700 transition-all"
                  defaultValue={editingEvent?.title}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Descrição</label>
                <textarea
                  name="description"
                  className="w-full bg-slate-100 border-2 border-slate-300 focus:border-sky-500 focus:bg-white rounded-xl py-3 px-4 text-slate-600 transition-all"
                  rows={3}
                  defaultValue={editingEvent?.description}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Programação (Texto do Modal)</label>
                <textarea
                  name="schedule"
                  className="w-full bg-slate-100 border-2 border-slate-300 focus:border-sky-500 focus:bg-white rounded-xl py-3 px-4 text-slate-600 transition-all font-mono text-sm"
                  rows={6}
                  defaultValue={editingEvent?.schedule || ''}
                  placeholder="Detalhes da programação, horários, atrações..."
                />
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <label className="block text-sm font-bold text-slate-700 mb-4">Imagem do Evento</label>

                <div className="flex gap-4 items-start mb-4">
                  {editingEvent?.image_url && (
                    <div className="relative w-32 h-20 rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-white">
                      <img src={editingEvent.image_url} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="flex-1">
                    <label className="cursor-pointer bg-white border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center text-slate-500 hover:border-sky-500 hover:text-sky-500 hover:bg-sky-50 transition-all group">
                      <UploadCloud className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-bold">{uploading ? 'Enviando...' : 'Clique para fazer upload da imagem'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleEventFileUpload(e.target.files)}
                        disabled={uploading}
                      />
                    </label>
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">URL</span>
                  <input
                    name="image_url"
                    className="w-full bg-white border border-slate-300 rounded-xl py-2 pl-12 pr-4 text-xs font-mono text-slate-500"
                    value={editingEvent?.image_url || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, image_url: e.target.value })}
                    placeholder="Ou cole uma URL externa aqui..."
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Texto do Botão</label>
                  <input
                    name="button_text"
                    className="w-full bg-slate-100 border-2 border-slate-300 focus:border-sky-500 focus:bg-white rounded-xl py-3 px-4 font-bold text-slate-700 transition-all"
                    defaultValue={editingEvent?.button_text || 'Saiba Mais'}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Link de Destino</label>
                  <input
                    name="button_link"
                    className="w-full bg-slate-100 border-2 border-slate-300 focus:border-sky-500 focus:bg-white rounded-xl py-3 px-4 font-mono text-sm text-slate-600 transition-all"
                    defaultValue={editingEvent?.button_link || '#'}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-sky-50 border border-sky-100 rounded-xl">
                <input
                  type="checkbox"
                  name="is_active"
                  id="is_active"
                  className="w-5 h-5 accent-sky-600 cursor-pointer"
                  defaultChecked={editingEvent?.is_active}
                />
                <label htmlFor="is_active" className="font-bold text-slate-700 cursor-pointer select-none">Evento Ativo (Exibir na Home)</label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => { setIsAddingEvent(false); setEditingEvent(null); }} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" disabled={uploading} className="px-8 py-3 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-500 shadow-lg shadow-sky-200 transition-all disabled:opacity-50">
                  {uploading ? 'Aguarde...' : 'Salvar Evento'}
                </button>
              </div>
            </form>
          </div>
        )
      }

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {eventsList.map(ev => (
          <div key={ev.id} className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden group">
            <div className="h-40 bg-slate-100 relative">
              <img src={ev.image_url} alt={ev.title} className="w-full h-full object-cover" />
              {ev.is_active && (
                <div className="absolute top-4 right-4 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                  Ativo
                </div>
              )}
            </div>
            <div className="p-6">
              <h3 className="font-bold text-lg text-slate-900 mb-2">{ev.title}</h3>
              <p className="text-sm text-slate-500 mb-4 line-clamp-2">{ev.description}</p>
              <div className="flex gap-2 border-t border-slate-50 pt-4">
                <button onClick={() => { setEditingEvent(ev); setIsAddingEvent(true); }} className="flex-1 py-2 bg-slate-50 text-slate-600 font-bold rounded-lg hover:bg-slate-100 text-xs flex items-center justify-center gap-2">
                  <Edit3 className="w-3 h-3" /> Editar
                </button>
                <button onClick={() => handleDeleteEvent(ev.id)} className="p-2 text-rose-500 bg-rose-50 rounded-lg hover:bg-rose-100">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div >
  );

  const handleGeocode = async () => {
    if (!editingBusiness?.location.address) return;

    // Add loading state feedback if desired, or just use simple alert flow
    try {
      const query = encodeURIComponent(editingBusiness.location.address);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setEditingBusiness({
          ...editingBusiness,
          location: {
            ...editingBusiness.location,
            lat: parseFloat(lat),
            lng: parseFloat(lon)
          }
        });
      } else {
        alert('Endereço não encontrado. Tente adicionar Cidade e Estado.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('Erro ao buscar coordenadas via GPS.');
    }
  };

  const handleApproveBusiness = async (business: Business) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const projectId = new URL(supabaseUrl).hostname.split('.')[0];
      const storageKey = `sb-${projectId}-auth-token`;
      const token = JSON.parse(localStorage.getItem(storageKey) || '{}').access_token || supabaseKey;

      const response = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${business.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ status: 'published' })
      });

      if (!response.ok) throw new Error('Falha ao aprovar');

      alert('Estabelecimento aprovado com sucesso!');
      fetchBusinesses();
    } catch (error) {
      console.error('Erro ao aprovar:', error);
      alert('Erro ao aprovar estabelecimento.');
    }
  };

  const handleDeleteBusiness = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este item?')) return;

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const projectId = new URL(supabaseUrl).hostname.split('.')[0];
      const storageKey = `sb-${projectId}-auth-token`;
      const token = JSON.parse(localStorage.getItem(storageKey) || '{}').access_token || supabaseKey;

      const response = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) throw new Error('Falha ao remover');

      fetchBusinesses();
    } catch (error) {
      console.error('Erro ao remover:', error);
      alert('Erro ao remover estabelecimento.');
    }
  };

  const handleTotemGeocode = async () => {
    if (!editingTotem?.location.address) return;
    try {
      const query = encodeURIComponent(editingTotem.location.address);
      // Limit to Paraty region for better accuracy if possible, but generic search works too
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setEditingTotem({
          ...editingTotem,
          location: {
            ...editingTotem.location,
            lat: parseFloat(lat),
            lng: parseFloat(lon)
          }
        });
        alert(`Coordenadas encontradas: ${lat}, ${lon}`);
      } else {
        alert('Endereço não encontrado. Tente ser mais específico (Rua, Número, Cidade).');
      }
    } catch (error) {
      console.error('Totem geocoding error:', error);
      alert('Erro ao buscar coordenadas.');
    }
  };

  const renderTotemsManagement = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Totens</h1>
          <p className="text-slate-400 font-medium text-lg">Gerencie os pontos de totens de autoatendimento.</p>
        </div>
        <button
          onClick={() => {
            setEditingTotem({ id: '', name: '', status: 'online', location: { lat: 0, lng: 0, address: '' } });
            setIsAddingTotem(true);
          }}
          className="px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Novo Totem
        </button>
      </div>

      {isAddingTotem && (
        <div className="bg-white rounded-[32px] p-8 mb-8 border border-slate-100 shadow-xl max-w-3xl">
          <h3 className="text-xl font-bold mb-6">{editingTotem?.id ? 'Editar Totem' : 'Novo Totem'}</h3>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">Nome do Ponto</label>
                <input
                  className="w-full bg-slate-50 border-2 border-slate-300 focus:border-sky-500 rounded-xl py-3 px-4 font-bold text-slate-900"
                  value={editingTotem?.name || ''}
                  onChange={(e) => setEditingTotem(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                  placeholder="Ex: Totem Praça da Matriz"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">Endereço Completo</label>
                <div className="flex gap-2">
                  <input
                    className="w-full bg-slate-50 border-2 border-slate-300 focus:border-sky-500 rounded-xl py-3 px-4 text-slate-600"
                    value={editingTotem?.location.address || ''}
                    onChange={(e) => setEditingTotem(prev => prev ? ({ ...prev, location: { ...prev.location, address: e.target.value } }) : null)}
                    placeholder="Ex: Rua Dona Geralda, 12, Centro Histórico, Paraty"
                  />
                  <button
                    onClick={handleTotemGeocode}
                    className="px-4 py-3 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-colors flex items-center gap-2 whitespace-nowrap"
                    title="Preencher Latitude/Longitude automaticamente via Endereço"
                  >
                    <MapPin className="w-4 h-4" /> Buscar GPS
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">
                  💡 Use "Buscar GPS" para localizar pelo endereço ou <strong>clique no mapa abaixo</strong> para posicionar o pin manualmente.
                </p>
              </div>

              {/* Map Integration */}
              <div className="col-span-2 h-64 w-full rounded-2xl overflow-hidden border-2 border-slate-200 relative z-0">
                {/* @ts-ignore */}
                <MapContainer
                  center={[editingTotem?.location.lat || -23.220, editingTotem?.location.lng || -44.710]}
                  zoom={15}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  />
                  <LocationMarker
                    position={[editingTotem?.location.lat || 0, editingTotem?.location.lng || 0]}
                    setPosition={(lat, lng) => {
                      setEditingTotem(prev => prev ? ({ ...prev, location: { ...prev.location, lat, lng } }) : null);
                    }}
                  />
                  <MapUpdater center={[editingTotem?.location.lat || -23.220, editingTotem?.location.lng || -44.710]} />
                </MapContainer>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Latitude</label>
                <input
                  type="number"
                  step="any"
                  className="w-full bg-slate-50 border-2 border-slate-300 focus:border-sky-500 rounded-xl py-3 px-4 font-mono text-sm"
                  value={editingTotem?.location.lat || ''}
                  onChange={(e) => setEditingTotem(prev => prev ? ({ ...prev, location: { ...prev.location, lat: parseFloat(e.target.value) } }) : null)}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Longitude</label>
                <input
                  type="number"
                  step="any"
                  className="w-full bg-slate-50 border-2 border-slate-300 focus:border-sky-500 rounded-xl py-3 px-4 font-mono text-sm"
                  value={editingTotem?.location.lng || ''}
                  onChange={(e) => setEditingTotem(prev => prev ? ({ ...prev, location: { ...prev.location, lng: parseFloat(e.target.value) } }) : null)}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Status</label>
                <select
                  className="w-full bg-slate-50 border-2 border-slate-300 focus:border-sky-500 rounded-xl py-3 px-4 font-bold"
                  value={editingTotem?.status || 'online'}
                  onChange={(e) => setEditingTotem(prev => prev ? ({ ...prev, status: e.target.value as 'online' | 'offline' }) : null)}
                >
                  <option value="online">Online (Operacional)</option>
                  <option value="offline">Offline (Manutenção)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => { setIsAddingTotem(false); setEditingTotem(null); }}
                className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTotem}
                disabled={isSaving}
                className="px-8 py-3 bg-sky-600 text-white font-bold rounded-xl shadow-lg hover:bg-sky-500 transition-all"
              >
                {isSaving ? 'Salvando...' : 'Salvar Totem'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {totemsList.map(item => (
          <div key={item.id} className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-sky-500 hover:shadow-md transition-all">
            <div className="mb-4">
              <div className="flex justify-between items-start mb-2">
                <div className={`px-2 py-1 rounded-md text-[10px] uppercase font-black tracking-widest ${item.status === 'online' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                  {item.status}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditingTotem(item); setIsAddingTotem(true); }} className="p-2 text-slate-400 hover:text-sky-600 bg-slate-50 hover:bg-sky-50 rounded-lg transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteTotem(item.id)} className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-lg text-slate-900 group-hover:text-sky-600 transition-colors mb-1">{item.name}</h3>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {item.location.address || 'Endereço não informado'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-[10px] font-mono text-slate-400">
              {(item.location?.lat || 0).toFixed(5)}, {(item.location?.lng || 0).toFixed(5)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  const menuItems = [
    { id: 'businesses', label: 'Estabelecimentos', icon: Store },
    { id: 'events', label: 'Eventos', icon: Calendar },
    { id: 'totems', label: 'Totens', icon: MapPin },
    { id: 'categories', label: 'Categorias', icon: List },
    ...(user.role === 'admin' ? [{ id: 'users', label: 'Usuários', icon: Users }] : []),
    ...(user.role === 'admin' ? [{ id: 'approvals', label: `Aprovações (${pendingBusinesses.length})`, icon: FileCheck }] : []),
    ...(user.role === 'admin' ? [{ id: 'settings', label: 'Configurações', icon: Settings }] : []),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-950 via-slate-900 to-slate-950 flex font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 flex flex-col fixed h-full z-20 hidden md:flex shadow-2xl">
        <div className="p-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="relative w-8 h-8 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="50" cy="50" r="48" fill="#0EA5E9" fillOpacity="0.1" stroke="#0EA5E9" strokeWidth="2" />
                <circle cx="70" cy="30" r="15" fill="#FBBF24" />
                <path d="M10 70 Q 30 60 50 70 T 90 70" fill="none" stroke="#2563EB" strokeWidth="4" strokeLinecap="round" />
                <path d="M75 75 Q 80 50 75 40" fill="none" stroke="#16A34A" strokeWidth="3" />
                <rect x="25" y="65" width="30" height="10" rx="2" fill="#DC2626" />
              </svg>
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">
              Go<span className="text-sky-500">Paraty</span>
            </span>
          </div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-10">Portal Admin</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveMenu(item.id); setIsAddingNew(false); setEditingBusiness(null); }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 group ${activeMenu === item.id
                ? 'bg-sky-600/20 text-sky-400 font-bold shadow-sm border border-sky-600/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white font-bold'
                }`}
            >
              <item.icon className={`w-5 h-5 ${activeMenu === item.id ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span className="tracking-wide">{item.label}</span>
              {item.id === 'approvals' && pendingBusinesses.length > 0 && (
                <span className="ml-auto bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {pendingBusinesses.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-800">
          <button
            onClick={onBack}
            className="w-full flex items-center justify-center gap-2 p-3 text-sky-400 hover:bg-sky-950/30 rounded-xl transition-colors font-bold text-sm mb-4 border border-sky-900/30"
          >
            <ChevronRight className="w-4 h-4 rotate-180" /> Ir para o Site
          </button>

          <div className="flex items-center gap-3 mb-4 p-3 bg-slate-800/50 rounded-xl border border-slate-800">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-lg">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-sm text-slate-200 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 capitalize">{user.role}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 p-3 text-rose-400 hover:bg-rose-950/30 rounded-xl transition-colors font-bold text-sm"
          >
            <LogOut className="w-4 h-4" /> Sair do Portal
          </button>
        </div>
      </aside >

      {/* Main Content */}
      < main className="flex-1 md:ml-72 p-4 md:p-12 overflow-x-hidden" >
        {/* Mobile Header */}
        < div className="md:hidden flex items-center justify-between mb-8" >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold">GP</div>
            <span className="font-bold text-slate-900">GoParati Admin</span>
          </div>
          <button onClick={onLogout} className="p-2 text-slate-400"><LogOut className="w-5 h-5" /></button>
        </div >
        {/* EDIT / ADD FORM MODE */}
        {
          (isAddingNew || editingBusiness) && editingBusiness ? (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <button
                      onClick={() => { setEditingBusiness(null); setIsAddingNew(false); }}
                      className="text-slate-400 hover:text-slate-600 flex items-center gap-2 mb-2 font-bold text-sm transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" /> Voltar para lista
                    </button>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                      {editingBusiness.id ? 'Editar Registro' : 'Novo Estabelecimento'}
                    </h1>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setEditingBusiness(null); setIsAddingNew(false); }}
                      className="px-6 py-3 bg-white text-slate-500 font-bold rounded-2xl hover:bg-slate-50 border border-slate-200 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveBusiness}
                      className="px-8 py-3 bg-sky-600 text-white font-bold rounded-2xl shadow-lg shadow-sky-200 hover:bg-sky-500 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                    >
                      <Check className="w-5 h-5" /> Salvar Alterações
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column: Basic Info */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 space-y-6">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest px-1">Informações Básicas</label>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2">
                          <label className="block text-sm font-bold text-slate-700 mb-2 px-1">Nome do Local</label>
                          <input
                            type="text"
                            value={editingBusiness.name}
                            onChange={(e) => setEditingBusiness({ ...editingBusiness, name: e.target.value })}
                            className="w-full bg-white border-2 border-slate-300 focus:border-sky-500 rounded-xl py-3 px-4 font-bold text-slate-900 outline-none transition-all placeholder:font-normal"
                            placeholder="Ex: Restaurante do Porto"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2 px-1">Categoria</label>
                          <select
                            value={editingBusiness.category}
                            onChange={(e) => setEditingBusiness({ ...editingBusiness, category: e.target.value as Category })}
                            className="w-full bg-white border-2 border-slate-300 focus:border-sky-500 rounded-xl py-3 px-4 font-bold text-slate-900 outline-none cursor-pointer appearance-none transition-all"
                          >
                            {categories.map(c => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2 px-1">Preço (1-4)</label>
                          <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-300">
                            {[1, 2, 3, 4].map((level) => (
                              <button
                                key={level}
                                onClick={() => setEditingBusiness({ ...editingBusiness, price_level: level })}
                                className={`flex-1 py-2 rounded-lg text-sm font-black transition-all ${editingBusiness.price_level === level
                                  ? 'bg-sky-600 text-white shadow-md'
                                  : 'text-slate-400 hover:text-slate-600'
                                  }`}
                              >
                                {'$'.repeat(level)}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-bold text-slate-700 mb-2 px-1">Breve Descrição</label>
                          <textarea
                            value={editingBusiness.description}
                            onChange={(e) => setEditingBusiness({ ...editingBusiness, description: e.target.value })}
                            className="w-full bg-white border-2 border-slate-300 focus:border-sky-500 rounded-xl py-3 px-4 font-medium text-slate-700 outline-none h-24 resize-none transition-all"
                            placeholder="Resumo curto para o card principal..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Location Section */}
                    <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 space-y-6">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest px-1">Localização</label>
                      <div className="grid grid-cols-2 gap-4">
                        {/* ... existing location inputs ... */}
                        <div className="col-span-2">
                          <label className="block text-sm font-bold text-slate-700 mb-2 px-1">Endereço Completo</label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input
                                type="text"
                                value={editingBusiness.location.address}
                                onChange={(e) => setEditingBusiness({
                                  ...editingBusiness,
                                  location: { ...editingBusiness.location, address: e.target.value }
                                })}
                                className="w-full bg-white border-2 border-slate-300 focus:border-sky-500 rounded-xl py-3 pl-12 pr-4 font-medium text-slate-700 outline-none transition-all placeholder:font-normal"
                                placeholder="Rua Principal, 123 - Centro Histórico"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={handleGeocode}
                              className="px-4 bg-sky-50 text-sky-600 border-2 border-sky-100 hover:bg-sky-100 hover:border-sky-200 rounded-xl font-bold text-xs flex items-center gap-2 transition-all"
                              title="Buscar Latitude/Longitude"
                            >
                              <Search className="w-4 h-4" /> Buscar
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-2 px-1">
                            💡 Dica: Digite o endereço e clique em "Buscar" para preencher Lat/Long automaticamente.
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2 px-1">Latitude</label>
                          <input
                            type="number"
                            step="any"
                            value={editingBusiness.location.lat}
                            onChange={(e) => setEditingBusiness({
                              ...editingBusiness,
                              location: { ...editingBusiness.location, lat: parseFloat(e.target.value) }
                            })}
                            className="w-full bg-white border-2 border-slate-300 focus:border-sky-500 rounded-xl py-3 px-4 font-mono text-xs font-bold text-slate-700 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2 px-1">Longitude</label>
                          <input
                            type="number"
                            step="any"
                            value={editingBusiness.location.lng}
                            onChange={(e) => setEditingBusiness({
                              ...editingBusiness,
                              location: { ...editingBusiness.location, lng: parseFloat(e.target.value) }
                            })}
                            className="w-full bg-white border-2 border-slate-300 focus:border-sky-500 rounded-xl py-3 px-4 font-mono text-xs font-bold text-slate-700 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Images & Extra */}
                  <div className="space-y-6">
                    {/* ... existing image inputs ... */}
                    <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 space-y-6">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest px-1">Imagens</label>

                      {/* Main Image Preview */}
                      {/* Main Image Preview */}
                      <div className="relative aspect-video rounded-3xl overflow-hidden shadow-inner bg-slate-100 mb-4 group flex items-center justify-center">
                        {editingBusiness.image_url ? (
                          <img
                            src={editingBusiness.image_url}
                            className="w-full h-full object-cover"
                            alt="Preview"
                            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.classList.add('bg-slate-200'); }}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400">
                            <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                            <span className="text-xs font-bold uppercase tracking-widest opacity-70">Sem Imagem</span>
                          </div>
                        )}
                        {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold">Enviando...</div>}
                      </div>

                      {/* Main Image Input */}
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 px-1">Imagem Principal</label>
                        <div className="flex gap-2">
                          <label className="flex-1 cursor-pointer bg-white border-2 border-dashed border-slate-300 rounded-xl py-3 px-4 text-center text-slate-500 hover:border-sky-500 hover:text-sky-500 hover:bg-sky-50 transition-all group">
                            <span className="text-sm font-bold flex items-center justify-center gap-2">
                              <UploadCloud className="w-4 h-4" /> Escolher Arquivo
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e.target.files, 'image_url')}
                              disabled={uploading}
                            />
                          </label>
                        </div>
                        <div className="text-center my-2 text-xs text-slate-400 font-bold uppercase">- OU -</div>
                        <input
                          type="text"
                          value={editingBusiness.image_url}
                          onChange={(e) => setEditingBusiness({ ...editingBusiness, image_url: e.target.value })}
                          className="w-full bg-white border-2 border-slate-300 focus:border-sky-500 rounded-xl py-3 px-4 font-mono text-xs font-bold text-slate-700 outline-none transition-all placeholder:font-normal"
                          placeholder="Cole uma URL externa aqui..."
                        />
                      </div>

                      {/* Gallery Input */}
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 px-1">Galeria de Fotos</label>
                        <div className="mb-4">
                          <label className="w-full block cursor-pointer bg-white border-2 border-dashed border-slate-300 rounded-xl py-4 text-center text-slate-500 hover:border-sky-500 hover:text-sky-500 hover:bg-sky-50 transition-all group">
                            <span className="text-sm font-bold flex items-center justify-center gap-2">
                              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" /> Adicionar Várias Fotos
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) => handleFileUpload(e.target.files, 'gallery')}
                              disabled={uploading}
                            />
                          </label>
                        </div>

                        <textarea
                          className="w-full bg-white border-2 border-slate-300 focus:border-sky-500 rounded-xl py-3 px-4 font-mono text-xs font-bold text-slate-700 outline-none min-h-[100px] whitespace-pre transition-all placeholder:font-normal"
                          value={editingBusiness.gallery?.join('\n') || ''}
                          onChange={(e) => setEditingBusiness({
                            ...editingBusiness,
                            gallery: e.target.value.split('\n').map(s => s.trim()).filter(Boolean)
                          })}
                          placeholder="As URLs aparecerão aqui automaticamente..."
                        />
                      </div>
                    </div>

                    <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[500px]">
                      <div className="px-8 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Descrição Completa</label>
                        <div className="flex items-center gap-1">
                          <button className="p-2 text-slate-400 hover:bg-white rounded-lg transition-colors"><Bold className="w-4 h-4" /></button>
                          <button className="p-2 text-slate-400 hover:bg-white rounded-lg transition-colors"><List className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <div className="p-8 flex-grow">
                        <textarea
                          className="w-full h-full bg-transparent text-slate-600 font-medium text-lg leading-relaxed focus:outline-none resize-none"
                          value={editingBusiness.long_description || editingBusiness.description}
                          onChange={(e) => setEditingBusiness({ ...editingBusiness, long_description: e.target.value })}
                          placeholder="Escreva todos os detalhes sobre o local aqui..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          ) : activeMenu === 'categories' ? (
            /* CATEGORIES MANAGEMENT */
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Categorias</h1>
                  <p className="text-slate-400 font-medium text-lg">Gerencie as categorias de estabelecimentos.</p>
                </div>
                <button
                  onClick={() => { setIsAddingCategory(true); setEditingCategory(null); }}
                  className="px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" /> Nova Categoria
                </button>
              </div>

              {isAddingCategory && (
                <div className="bg-white rounded-[32px] p-8 mb-8 border border-slate-100 shadow-xl max-w-2xl">
                  <h3 className="text-xl font-bold mb-6">{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</h3>
                  <form onSubmit={handleSaveCategory} className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-slate-700 mb-2">Nome</label>
                      <input
                        name="name"
                        className="w-full bg-white border-2 border-slate-300 focus:border-sky-500 rounded-xl py-3 px-4 font-bold text-slate-900"
                        placeholder="Ex: Vida Noturna"
                        defaultValue={editingCategory?.name}
                        required
                      />
                    </div>
                    <button type="button" onClick={() => { setIsAddingCategory(false); setEditingCategory(null); }} className="px-6 py-3 text-slate-500 font-bold">Cancelar</button>
                    <button type="submit" className="px-8 py-3 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-500">Salvar</button>
                  </form>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map(c => (
                  <div key={c.id} className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm flex items-center justify-between group hover:border-sky-500 hover:shadow-md transition-all">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 group-hover:text-sky-600 transition-colors">{c.name}</h3>
                      <p className="text-xs text-slate-500 font-bold font-mono mt-1 bg-slate-100 px-2 py-1 rounded-lg inline-block">{c.slug}</p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingCategory(c); setIsAddingCategory(true); }}
                        className="p-2 text-slate-400 hover:text-sky-600 bg-slate-50 hover:bg-sky-50 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(c.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeMenu === 'settings' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Configurações do Site</h1>
                  <p className="text-slate-400 font-medium text-lg">Personalize a aparência e definições globais.</p>
                </div>
              </div>

              <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl max-w-3xl">
                <form onSubmit={handleSaveSettings} className="space-y-8">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-6">Imagem de Fundo (Hero)</h3>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                      <div className="flex gap-4 items-start mb-4">
                        <div className="relative w-48 h-28 rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-white">
                          {siteSettings?.hero_background_url ? (
                            <img src={siteSettings.hero_background_url} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 font-bold text-xs uppercase">Sem Imagem</div>
                          )}
                        </div>
                        <div className="flex-1">
                          <label className="cursor-pointer bg-white border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center text-slate-500 hover:border-sky-500 hover:text-sky-500 hover:bg-sky-50 transition-all group">
                            <UploadCloud className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-bold">{uploading ? 'Enviando...' : 'Fazer Upload de Nova Imagem'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const files = e.target.files;
                                if (!files || files.length === 0) return;
                                setUploading(true);
                                try {
                                  const file = files[0];
                                  const fileExt = file.name.split('.').pop();
                                  const fileName = `settings/${Math.random().toString(36).substring(2)}.${fileExt}`;
                                  const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file);
                                  if (uploadError) throw uploadError;
                                  const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
                                  setSiteSettings(prev => prev ? ({ ...prev, hero_background_url: publicUrl }) : ({ id: '', hero_background_url: publicUrl }));
                                } catch (err) {
                                  console.error(err);
                                  alert('Erro no upload');
                                } finally {
                                  setUploading(false);
                                }
                              }}
                              disabled={uploading}
                            />
                          </label>
                        </div>
                      </div>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">URL</span>
                        <input
                          type="text"
                          value={siteSettings?.hero_background_url || ''}
                          onChange={(e) => setSiteSettings(prev => prev ? ({ ...prev, hero_background_url: e.target.value }) : ({ id: '', hero_background_url: e.target.value }))}
                          className="w-full bg-white border border-slate-300 rounded-xl py-2 pl-12 pr-4 text-xs font-mono text-slate-500"
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className={`px-8 py-3 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-500 shadow-lg shadow-sky-200 transition-all ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {isSaving ? 'Salvando...' : 'Salvar Configurações'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : activeMenu === 'events' ? (
            renderEventManagement()
          ) : activeMenu === 'totems' ? (
            renderTotemsManagement()
          ) : activeMenu === 'users' ? (
            /* USER MANAGEMENT (Admin Only) */
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Gerenciar Usuários</h1>
                  <p className="text-slate-400 font-medium text-lg">Controle de acesso e permissões.</p>
                </div>
                <button
                  onClick={() => setIsAddingUser(true)}
                  className="px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" /> Novo Usuário
                </button>
              </div>

              {isAddingUser && (
                <div className="bg-white rounded-[32px] p-8 mb-8 border border-slate-100 shadow-xl">
                  <h3 className="text-xl font-bold mb-6">{editingUser ? 'Editar Usuário' : 'Adicionar Novo Usuário'}</h3>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const name = (e.currentTarget.elements.namedItem('name') as HTMLInputElement).value;
                    const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value;
                    const role = (e.currentTarget.elements.namedItem('role') as HTMLSelectElement).value;
                    const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value;

                    if (editingUser) {
                      await authService.updateUser({
                        ...editingUser,
                        name,
                        email,
                        role: role as any,
                        password: password || editingUser.password // Keep old password if empty
                      });
                    } else {
                      await authService.createUser({
                        name, email, role: role as any, password: password || '123'
                      });
                    }

                    fetchUsers();
                    setIsAddingUser(false);
                    setEditingUser(null);
                  }}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <input name="name" placeholder="Nome" className="p-3 bg-slate-50 rounded-xl" required defaultValue={editingUser?.name} />
                      <input name="email" placeholder="Email" className="p-3 bg-slate-50 rounded-xl" required defaultValue={editingUser?.email} />
                      <select name="role" className="p-3 bg-slate-50 rounded-xl" defaultValue={editingUser?.role}>
                        <option value="user">Colaborador</option>
                        <option value="intern">Estagiário</option>
                        <option value="admin">Administrador</option>
                      </select>
                      <input
                        name="password"
                        type="password"
                        placeholder={editingUser ? "Senha (deixe vazio para manter)" : "Senha"}
                        className="p-3 bg-slate-50 rounded-xl"
                        required={!editingUser}
                      />
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <button type="button" onClick={() => { setIsAddingUser(false); setEditingUser(null); }} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
                      <button type="submit" className="px-6 py-2 bg-sky-600 text-white rounded-xl font-bold">{editingUser ? 'Atualizar' : 'Salvar'}</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr>
                      <th className="px-8 py-5 text-[10px] uppercase tracking-widest text-slate-400">Usuário</th>
                      <th className="px-8 py-5 text-[10px] uppercase tracking-widest text-slate-400">Email</th>
                      <th className="px-8 py-5 text-[10px] uppercase tracking-widest text-slate-400">Permissão</th>
                      <th className="px-8 py-5 text-right text-[10px] uppercase tracking-widest text-slate-400">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {usersList.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-8 py-5 font-bold text-slate-700">{u.name}</td>
                        <td className="px-8 py-5 text-slate-500">{u.email}</td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' :
                            u.role === 'intern' ? 'bg-amber-100 text-amber-600' :
                              'bg-sky-100 text-sky-600'
                            }`}>
                            {u.role === 'user' ? 'Colaborador' : u.role === 'intern' ? 'Estagiário' : 'Admin'}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => { setEditingUser(u); setIsAddingUser(true); }}
                              className="text-sky-500 hover:text-sky-600 font-bold text-xs"
                            >
                              Editar
                            </button>
                            {u.id !== user.id && (
                              <button onClick={async () => {
                                await authService.deleteUser(u.id);
                                fetchUsers();
                              }} className="text-rose-500 hover:text-rose-600 font-bold text-xs">
                                Remover
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeMenu === 'approvals' ? (
            /* PENDING APPROVALS LIST */
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Aprovações Pendentes</h1>
                  <p className="text-slate-400 font-medium text-lg">Conteúdo enviado por estagiários aguardando revisão.</p>
                </div>
              </div>

              {pendingBusinesses.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-[32px] border border-slate-100">
                  <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">Nenhum item pendente no momento.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pendingBusinesses.map(b => (
                    <div key={b.id} className="bg-white p-6 rounded-[32px] border border-amber-100 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4">
                        <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Revisão
                        </span>
                      </div>
                      <h3 className="font-bold text-lg mb-1">{b.name}</h3>
                      <p className="text-xs text-slate-400 mb-4 uppercase tracking-wider">{b.category}</p>

                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-50">
                        <button
                          onClick={() => handleApproveBusiness(b)}
                          className="flex-1 py-2 bg-emerald-50 text-emerald-600 font-bold rounded-xl hover:bg-emerald-100 transition-colors text-sm"
                        >
                          Aprovar
                        </button>
                        <button
                          onClick={() => {
                            setEditingBusiness(b);
                            setIsAddingNew(true); // Re-use the edit form
                          }}
                          className="flex-1 py-2 bg-slate-50 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-colors text-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteBusiness(b.id)}
                          className="p-2 text-rose-500 bg-rose-50 rounded-xl hover:bg-rose-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeMenu === 'events' ? (
            renderEventManagement()
          ) : (
            /* DEFAULT: BUSINESS LIST (Published) */
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">
                    {menuItems.find(m => m.id === activeMenu)?.label}
                  </h1>
                  <p className="text-slate-400 font-medium text-lg">Listagem de registros publicados no portal.</p>
                </div>
                <button
                  onClick={handleAddNew}
                  className="px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" /> Adicionar Novo
                </button>
              </div>

              <div className="bg-white rounded-[32px] shadow-lg border-2 border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
                  <div className="relative flex-grow max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Filtrar por nome..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl py-3 pl-12 pr-4 text-sm font-bold text-slate-900 focus:border-sky-500 outline-none transition-all placeholder:font-normal placeholder:text-slate-400"
                    />
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setIsFilterOpen(!isFilterOpen)}
                      className={`p-3 border-2 rounded-xl transition-all ${isFilterOpen || selectedCategory || minRating > 0 ? 'bg-sky-50 border-sky-500 text-sky-600' : 'bg-white border-slate-300 text-slate-600 hover:border-sky-500 hover:text-sky-600'}`}
                    >
                      <Filter className="w-4 h-4" />
                    </button>

                    {isFilterOpen && (
                      <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                        <div className="mb-4">
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Categoria</label>
                          <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-700 outline-none focus:border-sky-500"
                          >
                            <option value="">Todas</option>
                            {categories.map(c => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="mb-4">
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Avaliação Mínima</label>
                          <div className="flex bg-slate-50 rounded-lg p-1 border border-slate-200">
                            {[0, 3, 4, 4.5, 5].map((r) => (
                              <button
                                key={r}
                                onClick={() => setMinRating(r)}
                                className={`flex-1 py-1 rounded-md text-xs font-bold transition-all ${minRating === r ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                              >
                                {r === 0 ? 'Todas' : r}
                              </button>
                            ))}
                          </div>
                        </div>
                        {(selectedCategory || minRating > 0) && (
                          <button
                            onClick={() => { setSelectedCategory(''); setMinRating(0); setIsFilterOpen(false); }}
                            className="w-full py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            Limpar Filtros
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-separate border-spacing-y-3 -mt-3">
                    <thead>
                      <tr>
                        <th className="px-8 py-5 text-[11px] font-black text-slate-500 uppercase tracking-widest pl-8">Identificação do Local</th>
                        <th className="px-8 py-5 text-[11px] font-black text-slate-500 uppercase tracking-widest">Categoria</th>
                        <th className="px-8 py-5 text-[11px] font-black text-slate-500 uppercase tracking-widest">Rating</th>
                        <th className="px-8 py-5 text-[11px] font-black text-slate-500 uppercase tracking-widest text-right pr-8">Controles</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBusinesses.map((b) => (
                        <tr key={b.id} className="group shadow-sm hover:shadow-md transition-all">
                          <td className="bg-white group-even:bg-slate-100 px-8 py-5 rounded-l-2xl border-y border-l border-slate-200 group-hover:border-slate-300">
                            <div className="flex items-center gap-5">
                              <img src={b.image_url} className="w-14 h-14 rounded-2xl object-cover shadow-sm border border-slate-200" alt={b.name} />
                              <div>
                                <div className="font-extrabold text-slate-900 text-base">{b.name}</div>
                                <div className="text-xs text-slate-500 font-bold flex items-center gap-1 mt-1">
                                  <MapPin className="w-3 h-3 text-slate-400" /> {b.location.address}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="bg-white group-even:bg-slate-100 px-8 py-5 border-y border-slate-200 group-hover:border-slate-300">
                            <span className="px-3 py-1 bg-slate-50 border border-slate-200 text-slate-600 text-[9px] font-black rounded-full uppercase tracking-widest group-even:bg-white group-even:border-slate-300">
                              {b.category}
                            </span>
                          </td>
                          <td className="bg-white group-even:bg-slate-100 px-8 py-5 border-y border-slate-200 group-hover:border-slate-300">
                            <div className="flex items-center gap-1.5 text-amber-500 font-black text-sm">
                              <Star className="w-4 h-4 fill-current" />
                              {b.rating}
                            </div>
                          </td>
                          <td className="bg-white group-even:bg-slate-100 px-8 py-5 rounded-r-2xl border-y border-r border-slate-200 group-hover:border-slate-300 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => { setEditingBusiness(b); setIsAddingNew(false); }}
                                className="p-3 text-sky-600 bg-sky-50 rounded-xl hover:bg-sky-600 hover:text-white transition-all active:scale-90 group-even:bg-white"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onDelete(b.id)}
                                className="p-3 text-rose-500 bg-rose-50 rounded-xl hover:bg-rose-600 hover:text-white transition-all active:scale-90 group-even:bg-white"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredBusinesses.length === 0 && (
                  <div className="p-24 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                      <Store className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-1">Nada por aqui</h3>
                    <p className="text-slate-500">Tente buscar por outro termo ou limpe os filtros.</p>
                  </div>
                )}
              </div>
            </div>
          )
        }
      </main >
    </div >
  );
};

export default Dashboard;
