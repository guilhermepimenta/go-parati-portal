import { Business, FeaturedEvent, SiteSettings } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
};

export const api = {
    getBusinesses: async (): Promise<Business[]> => {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/businesses?select=*`, { headers });
        if (!res.ok) throw new Error('Failed to fetch businesses');
        return await res.json();
    },

    getFeaturedEvent: async (): Promise<FeaturedEvent | null> => {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/events?select=*&is_active=eq.true&order=created_at.desc&limit=1`, { headers });
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                    const raw = data[0];
                    return {
                        id: raw.id,
                        title: raw.title,
                        description: raw.description,
                        imageUrl: raw.image_url,
                        buttonText: 'Quero Ir',
                        buttonLink: raw.button_link,
                        isActive: raw.is_active,
                        schedule: raw.schedule,
                        startDate: new Date(Date.now() + 86400000).toISOString(), // Mock: Tomorrow
                        endDate: new Date(Date.now() + 86400000 + 7200000).toISOString() // Mock: Tomorrow + 2h
                    };
                }
            }
        } catch (error) {
            console.error('Error fetching event:', error);
        }
        return null;
    },

    getSiteSettings: async (): Promise<SiteSettings | null> => {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?select=*&order=updated_at.desc&limit=1`, { headers });
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                    return data[0];
                }
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
        return null;
    }
};
