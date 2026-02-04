
import { supabase } from '../supabase';

const SESSION_KEY = 'goparaty_analytics_session';

export type AnalyticsEvent =
    | 'page_view'
    | 'business_click'
    | 'directions_click'
    | 'search'
    | 'filter_category';

interface TrackParams {
    eventType: AnalyticsEvent;
    resourceId?: string;
    category?: string;
    query?: string;
    metadata?: Record<string, any>;
}

// Generate or get persistent session ID
const getSessionId = (): string => {
    let sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
};

export const analytics = {
    track: async (params: TrackParams) => {
        try {
            const { error } = await supabase
                .from('analytics_events')
                .insert([{
                    event_type: params.eventType,
                    session_id: getSessionId(),
                    resource_id: params.resourceId,
                    category: params.category,
                    query: params.query,
                    metadata: params.metadata || {}
                }]);

            if (error) {
                // Silently fail to not interrupt user experience
                console.warn('Analytics log failed:', error);
            }
        } catch (e) {
            console.warn('Analytics unexpected error:', e);
        }
    },

    // Specific helpers for cleaner code
    trackPageView: (page: string, params?: Record<string, any>) =>
        analytics.track({ eventType: 'page_view', category: page, metadata: params }),

    trackBusinessClick: (businessId: string, source: string) =>
        analytics.track({ eventType: 'business_click', resourceId: businessId, metadata: { source } }),

    trackDirections: (businessId: string) =>
        analytics.track({ eventType: 'directions_click', resourceId: businessId }),

    trackSearch: (query: string) =>
        analytics.track({ eventType: 'search', query }),

    trackFilter: (category: string) =>
        analytics.track({ eventType: 'filter_category', category })
};
