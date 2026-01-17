
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

export const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${(km * 1000).toFixed(0)}m`;
  }
  return `${km.toFixed(1)}km`;
};


export const getPriceLevelString = (level: number): string => {
  return '$'.repeat(level);
};

export const checkIsOpen = (openingHours?: Record<string, string>): boolean => {
  if (!openingHours) return false;

  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = days[now.getDay()];

  const hours = openingHours[currentDay];

  if (!hours || hours.toLowerCase() === 'closed' || hours.toLowerCase() === 'fechado') {
    return false;
  }

  if (hours.toLowerCase() === '24h' || hours.toLowerCase() === '24 hours') {
    return true;
  }

  // Expected format: "09:00-18:00"
  try {
    const [start, end] = hours.split('-');
    if (!start || !end) return false;

    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = start.split(':').map(Number);
    const startTime = startH * 60 + startM;

    const [endH, endM] = end.split(':').map(Number);
    const endTime = endH * 60 + endM;

    // Handle overnight hours (e.g. 18:00-02:00)
    if (endTime < startTime) {
      return currentTime >= startTime || currentTime <= endTime;
    }

    return currentTime >= startTime && currentTime <= endTime;
  } catch (e) {
    console.error('Error parsing hours:', hours, e);
    return false;
  }
};

export const generateGoogleCalendarUrl = (event: {
  title: string;
  description: string;
  location?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
  };

  const start = formatDate(event.startDate || new Date().toISOString());
  const end = formatDate(event.endDate || new Date(new Date().getTime() + 2 * 60 * 60 * 1000).toISOString()); // Default 2h duration

  const url = new URL('https://www.google.com/calendar/render');
  url.searchParams.append('action', 'TEMPLATE');
  url.searchParams.append('text', event.title);
  url.searchParams.append('details', event.description);
  url.searchParams.append('location', event.location || 'Paraty, RJ');
  url.searchParams.append('dates', `${start}/${end}`);

  return url.toString();
};
