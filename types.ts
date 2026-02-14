
// Add LOCAL_RESTAURANT to StopType enum to resolve property missing errors in constants and components
export enum StopType {
  HIGHWAY_REST_AREA = 'highway_rest_area',
  LOCAL_RESTAURANT = 'local_restaurant',
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Stop {
  stopId: string;
  type: StopType;
  name: string;
  location: Coordinates;
  topItems: string[];
  description: string;
  imageUrl: string;
  rating: number;
  searchLinks: {
    naver: string;
    google: string;
    kakao: string;
  };
}

export interface RouteOption {
  routeId: string;
  summary: string;
  distanceKm: number;
  durationMin: number;
  toll: boolean;
  path: Coordinates[];
  stops: Stop[];
}

export type AppStep = 1 | 2 | 3;

export interface SearchState {
  start: string;
  destination: string;
  startCoordinates?: Coordinates;
  destinationCoordinates?: Coordinates;
}

export interface PlaceResult {
  display_name: string;
  lat: string;
  lon: string;
}
