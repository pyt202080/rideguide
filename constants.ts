// Major Korean Cities with Coordinates for UI reference
export const CITIES_DATA: { name: string; lat: number; lng: number }[] = [
  { name: "인천", lat: 37.4563, lng: 126.7052 },
  { name: "안동", lat: 36.5684, lng: 128.7294 },
  { name: "서울", lat: 37.5665, lng: 126.9780 },
  { name: "부산", lat: 35.1796, lng: 129.0756 },
  { name: "대전", lat: 36.3504, lng: 127.3845 },
  { name: "대구", lat: 35.8714, lng: 128.6014 },
];

export const KOREAN_CITIES = CITIES_DATA.map(c => c.name);

// All mock route data has been removed for production testing.
export const MOCK_ROUTES: any[] = [];
