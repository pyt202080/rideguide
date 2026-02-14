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

export const KOREAN_CITIES = CITIES_DATA.map(c => c.name);

const PATH_A_COORDS = [
  { lat: 37.4563, lng: 126.7052 }, // Incheon
  { lat: 37.3513, lng: 126.9502 },
  { lat: 37.1523, lng: 127.2000 },
  { lat: 36.8000, lng: 127.5000 },
  { lat: 36.5684, lng: 128.7294 }, // Andong
];

export const MOCK_ROUTES: RouteOption[] = [
  {
    routeId: 'route_full_exhaustive',
    summary: '중부내륙 고속도로 (최적 경로)',
    distanceKm: 242,
    durationMin: 185,
    toll: true,
    path: PATH_A_COORDS,
    stops: [
      {
        stopId: 'm1',
        type: StopType.HIGHWAY_REST_AREA,
        name: '시흥하늘휴게소',
        location: { lat: 37.387, lng: 126.864 },
        topItems: ['소고기 국밥', '전복 김밥'],
        description: '국내 최초 브릿지형 휴게소로 다양한 전문 식당가가 입점해 있습니다.',
        imageUrl: 'https://picsum.photos/400/300?random=11',
        rating: 4.6,
        searchLinks: { naver: 'https://map.naver.com/v5/search/시흥하늘휴게소', google: '#', kakao: 'https://map.kakao.com/link/search/시흥하늘휴게소' }
      },
      {
        stopId: 'm2',
        type: StopType.HIGHWAY_REST_AREA,
        name: '의왕청계휴게소',
        location: { lat: 37.391, lng: 127.024 },
        topItems: ['옛날 핫도그', '순두부찌개'],
        description: '수도권 순환 도로의 알짜배기 휴게소.',
        imageUrl: 'https://picsum.photos/400/300?random=12',
        rating: 4.1,
        searchLinks: { naver: 'https://map.naver.com/v5/search/의왕청계휴게소', google: '#', kakao: 'https://map.kakao.com/link/search/의왕청계휴게소' }
      },
      {
        stopId: 'm3',
        type: StopType.HIGHWAY_REST_AREA,
        name: '용인휴게소',
        location: { lat: 37.240, lng: 127.228 },
        topItems: ['맥적구이 비빔밥', '우동'],
        description: '용인의 명물 맥적구이를 맛볼 수 있는 깔끔한 휴게소.',
        imageUrl: 'https://picsum.photos/400/300?random=13',
        rating: 4.3,
        searchLinks: { naver: 'https://map.naver.com/v5/search/용인휴게소', google: '#', kakao: 'https://map.kakao.com/link/search/용인휴게소' }
      },
      {
        stopId: 'm4',
        type: StopType.HIGHWAY_REST_AREA,
        name: '덕평자연휴게소',
        location: { lat: 37.210, lng: 127.388 },
        topItems: ['덕평 소고기국밥', '비어드파파'],
        description: '전국 판매 1위 국밥과 산책로가 있는 최고의 테마 휴게소.',
        imageUrl: 'https://picsum.photos/400/300?random=14',
        rating: 4.9,
        searchLinks: { naver: 'https://map.naver.com/v5/search/덕평자연휴게소', google: '#', kakao: 'https://map.kakao.com/link/search/덕평자연휴게소' }
      },
      {
        stopId: 'm5',
        type: StopType.HIGHWAY_REST_AREA,
        name: '여주휴게소',
        location: { lat: 37.243, lng: 127.568 },
        topItems: ['여주 쌀밥 정식', '수제 돈가스'],
        description: '도자기와 쌀로 유명한 여주의 맛을 담은 대형 휴게소.',
        imageUrl: 'https://picsum.photos/400/300?random=15',
        rating: 4.5,
        searchLinks: { naver: 'https://map.naver.com/v5/search/여주휴게소', google: '#', kakao: 'https://map.kakao.com/link/search/여주휴게소' }
      },
      {
        stopId: 'm6',
        type: StopType.HIGHWAY_REST_AREA,
        name: '서여주휴게소',
        location: { lat: 37.258, lng: 127.618 },
        topItems: ['영양 돌솥밥', '돈가스'],
        description: '비교적 한산하지만 밥맛이 훌륭한 곳.',
        imageUrl: 'https://picsum.photos/400/300?random=16',
        rating: 4.2,
        searchLinks: { naver: 'https://map.naver.com/v5/search/서여주휴게소', google: '#', kakao: 'https://map.kakao.com/link/search/서여주휴게소' }
      },
      {
        stopId: 'm7',
        type: StopType.HIGHWAY_REST_AREA,
        name: '충주휴게소',
        location: { lat: 37.050, lng: 127.810 },
        topItems: ['사과 돈가스', '얼큰한 국밥'],
        description: '충주 사과를 활용한 다양한 메뉴와 간식이 일품입니다.',
        imageUrl: 'https://picsum.photos/400/300?random=17',
        rating: 4.4,
        searchLinks: { naver: 'https://map.naver.com/v5/search/충주휴게소', google: '#', kakao: 'https://map.kakao.com/link/search/충주휴게소' }
      },
      {
        stopId: 'm8',
        type: StopType.HIGHWAY_REST_AREA,
        name: '괴산휴게소',
        location: { lat: 36.800, lng: 127.940 },
        topItems: ['올갱이 국밥', '고추 정식'],
        description: '괴산 특산물인 올갱이로 끓인 시원한 국밥이 유명.',
        imageUrl: 'https://picsum.photos/400/300?random=18',
        rating: 4.3,
        searchLinks: { naver: 'https://map.naver.com/v5/search/괴산휴게소', google: '#', kakao: 'https://map.kakao.com/link/search/괴산휴게소' }
      },
      {
        stopId: 'm9',
        type: StopType.HIGHWAY_REST_AREA,
        name: '문경휴게소',
        location: { lat: 36.640, lng: 128.140 },
        topItems: ['문경약돌돼지 제육', '오미자 돈가스'],
        description: '문경의 특색을 살린 건강한 먹거리가 가득합니다.',
        imageUrl: 'https://picsum.photos/400/300?random=19',
        rating: 4.7,
        searchLinks: { naver: 'https://map.naver.com/v5/search/문경휴게소', google: '#', kakao: 'https://map.kakao.com/link/search/문경휴게소' }
      },
      {
        stopId: 'm10',
        type: StopType.HIGHWAY_REST_AREA,
        name: '상주휴게소',
        location: { lat: 36.350, lng: 128.180 },
        topItems: ['한우 가마솥 국밥', '상주 곶감 빵'],
        description: '깊은 맛의 국밥과 달콤한 곶감 디저트가 조화롭습니다.',
        imageUrl: 'https://picsum.photos/400/300?random=20',
        rating: 4.5,
        searchLinks: { naver: 'https://map.naver.com/v5/search/상주휴게소', google: '#', kakao: 'https://map.kakao.com/link/search/상주휴게소' }
      },
      {
        stopId: 'm11',
        type: StopType.HIGHWAY_REST_AREA,
        name: '의성휴게소',
        location: { lat: 36.420, lng: 128.520 },
        topItems: ['의성마늘 돈가스', '마늘 라면'],
        description: '알싸하고 풍미 깊은 마늘 요리의 끝판왕.',
        imageUrl: 'https://picsum.photos/400/300?random=21',
        rating: 4.2,
        searchLinks: { naver: 'https://map.naver.com/v5/search/의성휴게소', google: '#', kakao: 'https://map.kakao.com/link/search/의성휴게소' }
      },
      {
        stopId: 'm12',
        type: StopType.HIGHWAY_REST_AREA,
        name: '안동휴게소',
        location: { lat: 36.568, lng: 128.620 },
        topItems: ['안동 간고등어 정식', '소고기 국밥'],
        description: '목적지 직전, 안동의 명물 간고등어를 맛볼 수 있는 곳.',
        imageUrl: 'https://picsum.photos/400/300?random=22',
        rating: 4.8,
        searchLinks: { naver: 'https://map.naver.com/v5/search/안동휴게소', google: '#', kakao: 'https://map.kakao.com/link/search/안동휴게소' }
      }
    ]
  }
];