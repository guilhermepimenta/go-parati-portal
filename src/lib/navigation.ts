export interface NavigationPoint {
  lat: number;
  lng: number;
}

export interface NavigationInstruction {
  index: number;
  text: string;
  distance?: number;
  time?: number;
}

export interface NavigationRouteData {
  coordinates: NavigationPoint[];
  instructions: NavigationInstruction[];
  totalDistanceMeters: number;
  totalTimeSeconds: number;
}

const normalizeCategory = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const isNavigationEligibleCategory = (category?: string) => {
  if (!category) return false;
  const normalizedCategory = normalizeCategory(category);
  return normalizedCategory === 'gastronomia' || normalizedCategory === 'hospedagem';
};

export const metersBetween = (start: NavigationPoint, end: NavigationPoint) => {
  const earthRadiusMeters = 6371000;
  const latDelta = ((end.lat - start.lat) * Math.PI) / 180;
  const lngDelta = ((end.lng - start.lng) * Math.PI) / 180;
  const startLatRadians = (start.lat * Math.PI) / 180;
  const endLatRadians = (end.lat * Math.PI) / 180;

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(startLatRadians) * Math.cos(endLatRadians) * Math.sin(lngDelta / 2) * Math.sin(lngDelta / 2);

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const getClosestRoutePointIndex = (coordinates: NavigationPoint[], position: NavigationPoint) => {
  if (coordinates.length === 0) return -1;

  let closestIndex = 0;
  let smallestDistance = Number.POSITIVE_INFINITY;

  coordinates.forEach((coordinate, index) => {
    const distance = metersBetween(coordinate, position);
    if (distance < smallestDistance) {
      smallestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
};

export const getDistanceFromRouteMeters = (coordinates: NavigationPoint[], position: NavigationPoint) => {
  if (coordinates.length === 0) return Number.POSITIVE_INFINITY;

  return coordinates.reduce((smallestDistance, coordinate) => {
    const distance = metersBetween(coordinate, position);
    return Math.min(smallestDistance, distance);
  }, Number.POSITIVE_INFINITY);
};

export const getRemainingDistanceMeters = (coordinates: NavigationPoint[], closestIndex: number) => {
  if (coordinates.length < 2 || closestIndex < 0 || closestIndex >= coordinates.length) return 0;

  let totalDistance = 0;

  for (let index = closestIndex; index < coordinates.length - 1; index += 1) {
    totalDistance += metersBetween(coordinates[index], coordinates[index + 1]);
  }

  return totalDistance;
};

export const getNextInstruction = (instructions: NavigationInstruction[], closestIndex: number) => {
  return instructions.find((instruction) => instruction.index >= closestIndex)?.text ?? 'Siga pela rota destacada';
};

export const formatRemainingDistance = (meters: number) => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

export const formatRemainingTime = (seconds: number) => {
  if (seconds < 60) return 'menos de 1 min';

  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
};

export const ensurePtBrRoutingLocale = (routing: any) => {
  if (!routing?.Localization || routing.Localization['pt-BR']) return;

  routing.Localization['pt-BR'] = {
    directions: {
      N: 'norte',
      NE: 'nordeste',
      E: 'leste',
      SE: 'sudeste',
      S: 'sul',
      SW: 'sudoeste',
      W: 'oeste',
      NW: 'noroeste'
    },
    instructions: {
      Head: 'Siga para {dir}',
      Continue: 'Continue em {road}',
      SlightRight: 'Vire levemente a direita em {road}',
      Right: 'Vire a direita em {road}',
      SharpRight: 'Vire forte a direita em {road}',
      TurnAround: 'Retorne',
      SharpLeft: 'Vire forte a esquerda em {road}',
      Left: 'Vire a esquerda em {road}',
      SlightLeft: 'Vire levemente a esquerda em {road}',
      WaypointReached: 'Ponto intermediario alcancado',
      Roundabout: 'Na rotatoria, pegue a {exitStr}a saida em {road}',
      DestinationReached: 'Voce chegou ao destino'
    },
    formatOrder: (order: number) => `${order}`,
    ui: {
      startPlaceholder: 'Origem',
      viaPlaceholder: 'Via',
      endPlaceholder: 'Destino'
    },
    units: {
      meters: 'm',
      kilometers: 'km',
      yards: 'jardas',
      miles: 'mi'
    }
  };
};