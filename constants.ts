
import { RouteOption, StopType } from './types';

// Major Korean Cities with Coordinates for Map Pinning
export const CITIES_DATA: { name: string; lat: number; lng: number }[] = [
  { name: "서울", lat: 37.5665, lng: 126.9780 },
  { name: "부산", lat: 35.1796, lng: 129.0756 },
  { name: "대구", lat: 35.8714, lng: 128.6014 },
  { name: "인천", lat: 37.4563, lng: 126.7052 },
  { name: "광주", lat: 35.1595, lng: 126.8526 },
  { name: "대전", lat: 36.3504, lng: 127.3845 },
  { name: "울산", lat: 35.5384, lng: 129.3114 },
  { name: "세종", lat: 36.4800, lng: 127.2890 },
  { name: "수원", lat: 37.2636, lng: 127.0286 },
  { name: "성남", lat: 37.4200, lng: 127.1265 },
  { name: "의정부", lat: 37.7381, lng: 127.0337 },
  { name: "청주", lat: 36.6356, lng: 127.4913 },
  { name: "춘천", lat: 37.8813, lng: 127.7298 },
  { name: "강릉", lat: 37.7519, lng: 128.8760 },
  { name: "원주", lat: 37.3422, lng: 127.9202 },
  { name: "속초", lat: 38.2070, lng: 128.5918 },
  { name: "천안", lat: 36.8151, lng: 127.1139 },
  { name: "전주", lat: 35.8242, lng: 127.1480 },
  { name: "여수", lat: 34.7604, lng: 127.6622 },
  { name: "목포", lat: 34.8118, lng: 126.3922 },
  { name: "포항", lat: 36.0190, lng: 129.3435 },
  { name: "경주", lat: 35.8562, lng: 129.2247 },
  { name: "창원", lat: 35.2279, lng: 128.6811 },
  { name: "진주", lat: 35.1799, lng: 128.1076 },
  { name: "제주", lat: 33.4996, lng: 126.5312 },
  { name: "서귀포", lat: 33.2541, lng: 126.5601 },
  { name: "안동", lat: 36.5684, lng: 128.7294 },
  { name: "구미", lat: 36.1195, lng: 128.3446 },
  { name: "파주", lat: 37.7590, lng: 126.7800 },
  { name: "이천", lat: 37.2810, lng: 127.4350 },
  { name: "통영", lat: 34.8544, lng: 128.4332 },
  { name: "거제", lat: 34.8806, lng: 128.6211 }
];

// Fallback list for autocomplete (including names without specific coords in the simplified list above)
export const KOREAN_CITIES = CITIES_DATA.map(c => c.name);

// Coordinates for mock path (Simplified Seoul -> Busan)
const PATH_A_COORDS = [
  { lat: 37.5665, lng: 126.9780 }, // Seoul
  { lat: 37.3948, lng: 127.1111 },
  { lat: 36.6356, lng: 127.4913 }, // Cheongju
  { lat: 36.3504, lng: 127.3845 }, // Daejeon
  { lat: 35.8714, lng: 128.6014 }, // Daegu
  { lat: 35.1796, lng: 129.0756 }, // Busan
];

const PATH_B_COORDS = [
  { lat: 37.5665, lng: 126.9780 }, // Seoul
  { lat: 37.2636, lng: 127.0286 }, // Suwon
  { lat: 36.8065, lng: 127.1522 }, // Cheonan
  { lat: 35.8242, lng: 127.1480 }, // Jeonju (Detour)
  { lat: 35.1595, lng: 126.8526 }, // Gwangju
  { lat: 35.1796, lng: 129.0756 }, // Busan
];

export const MOCK_ROUTES: RouteOption[] = [
  {
    routeId: 'route_1',
    summary: '경부고속도로',
    distanceKm: 390,
    durationMin: 270, // 4h 30m
    toll: true,
    path: PATH_A_COORDS,
    stops: [
      {
        stopId: 's1',
        type: StopType.HIGHWAY_REST_AREA,
        name: '안성휴게소',
        location: { lat: 37.067, lng: 127.243 },
        topItems: ['소떡소떡', '안성국밥'],
        description: '국민 간식 소떡소떡의 성지이자 진한 국밥이 일품인 곳.',
        imageUrl: 'https://picsum.photos/400/300?random=1',
        rating: 4.5,
        // Fixed: added kakao search link
        searchLinks: { naver: '#', google: '#', kakao: '#' }
      },
      {
        stopId: 's2',
        type: StopType.HIGHWAY_REST_AREA,
        name: '금강휴게소',
        location: { lat: 36.278, lng: 127.671 },
        topItems: ['도리뱅뱅이', '우동'],
        description: '금강이 내려다보이는 환상적인 뷰와 도리뱅뱅이가 유명한 휴게소.',
        imageUrl: 'https://picsum.photos/400/300?random=2',
        rating: 4.8,
        // Fixed: added kakao search link
        searchLinks: { naver: '#', google: '#', kakao: '#' }
      },
      {
        stopId: 's3',
        type: StopType.LOCAL_RESTAURANT,
        name: '대전 얼큰이 칼국수',
        location: { lat: 36.3504, lng: 127.3845 },
        topItems: ['얼큰이 칼국수', '쭈꾸미 볶음'],
        description: '대전 IC에서 5분 거리, 현지인들이 줄 서서 먹는 매운 칼국수.',
        imageUrl: 'https://picsum.photos/400/300?random=3',
        rating: 4.7,
        // Fixed: added kakao search link
        searchLinks: { naver: '#', google: '#', kakao: '#' }
      },
      {
        stopId: 's4',
        type: StopType.HIGHWAY_REST_AREA,
        name: '칠곡휴게소',
        location: { lat: 35.945, lng: 128.523 },
        topItems: ['자율식당', '옛날 돈가스'],
        description: '원하는 반찬을 골라 먹는 재미가 있는 자율식당.',
        imageUrl: 'https://picsum.photos/400/300?random=4',
        rating: 4.2,
        // Fixed: added kakao search link
        searchLinks: { naver: '#', google: '#', kakao: '#' }
      }
    ]
  },
  {
    routeId: 'route_2',
    summary: '중부내륙고속도로',
    distanceKm: 405,
    durationMin: 290, // 4h 50m
    toll: true,
    path: PATH_B_COORDS,
    stops: [
      {
        stopId: 's5',
        type: StopType.HIGHWAY_REST_AREA,
        name: '마장 프리미엄 휴게소',
        location: { lat: 37.234, lng: 127.354 },
        topItems: ['이천 쌀밥 정식', '스타벅스'],
        description: '쇼핑몰과 다양한 먹거리가 있는 국내 최대 규모의 휴게소.',
        imageUrl: 'https://picsum.photos/400/300?random=5',
        rating: 4.6,
        // Fixed: added kakao search link
        searchLinks: { naver: '#', google: '#', kakao: '#' }
      },
      {
        stopId: 's6',
        type: StopType.LOCAL_RESTAURANT,
        name: '천안 원조 호두과자',
        location: { lat: 36.8065, lng: 127.1522 },
        topItems: ['호두과자'],
        description: '천안 IC 바로 앞, 갓 구워낸 따끈따끈한 원조 호두과자.',
        imageUrl: 'https://picsum.photos/400/300?random=6',
        rating: 4.9,
        // Fixed: added kakao search link
        searchLinks: { naver: '#', google: '#', kakao: '#' }
      },
      {
        stopId: 's7',
        type: StopType.LOCAL_RESTAURANT,
        name: '전주 비빔밥 고궁',
        location: { lat: 35.8242, lng: 127.1480 },
        topItems: ['전주비빔밥', '콩나물국밥'],
        description: '전주 IC 인근에서 맛보는 정통 전주비빔밥의 맛.',
        imageUrl: 'https://picsum.photos/400/300?random=7',
        rating: 4.8,
        // Fixed: added kakao search link
        searchLinks: { naver: '#', google: '#', kakao: '#' }
      }
    ]
  }
];
