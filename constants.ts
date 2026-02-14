import { RouteOption, StopType } from './types';

// Major Korean Cities with Coordinates for Map Pinning
export const CITIES_DATA: { name: string; lat: number; lng: number }[] = [
  { name: "인천", lat: 37.4563, lng: 126.7052 },
  { name: "안동", lat: 36.5684, lng: 128.7294 },
  { name: "서울", lat: 37.5665, lng: 126.9780 },
  { name: "부산", lat: 35.1796, lng: 129.0756 },
  { name: "대전", lat: 36.3504, lng: 127.3845 },
  { name: "대구", lat: 35.8714, lng: 128.6014 },
];

export const KOREAN_CITIES = CITIES_DATA.map(c => c.name);

// 인천 -> 안동 (중부내륙 중심)
const PATH_ANDONG = [
  { lat: 37.4563, lng: 126.7052 }, // 인천
  { lat: 37.387, lng: 126.864 },  // 시흥
  { lat: 37.210, lng: 127.388 },  // 덕평
  { lat: 37.050, lng: 127.810 },  // 충주
  { lat: 36.640, lng: 128.140 },  // 문경
  { lat: 36.5684, lng: 128.7294 }, // 안동
];

// 서울 -> 부산 (경부 중심)
const PATH_BUSAN = [
  { lat: 37.5665, lng: 126.9780 },
  { lat: 37.060, lng: 127.150 },
  { lat: 36.3504, lng: 127.3845 },
  { lat: 35.1796, lng: 129.0756 },
];

export const MOCK_ROUTES: RouteOption[] = [
  {
    routeId: 'route_andong_full',
    summary: '중부내륙 고속도로 (인천-안동 전수조사)',
    distanceKm: 242,
    durationMin: 185,
    toll: true,
    path: PATH_ANDONG,
    stops: [
      {
        stopId: 's1', type: StopType.HIGHWAY_REST_AREA, name: '시흥하늘휴게소',
        location: { lat: 37.387, lng: 126.864 }, topItems: ['소고기 국밥', '전복 김밥'],
        description: '국내 최초 브릿지형 휴게소. 고속도로 위에서 즐기는 맛집.',
        imageUrl: 'https://picsum.photos/400/300?random=101', rating: 4.6,
        searchLinks: { naver: 'https://map.naver.com/v5/search/시흥하늘휴게소', google: '#', kakao: 'https://map.kakao.com/link/search/시흥하늘휴게소' }
      },
      {
        stopId: 's2', type: StopType.HIGHWAY_REST_AREA, name: '의왕청계휴게소',
        location: { lat: 37.391, lng: 127.024 }, topItems: ['옛날 핫도그', '순두부찌개'],
        description: '수도권 제1순환선의 알찬 휴게소.',
        imageUrl: 'https://picsum.photos/400/300?random=102', rating: 4.1,
        searchLinks: { naver: 'https://map.naver.com/v5/search/의왕청계휴게소', google: '#', kakao: 'https://map.kakao.com/link/search/의왕청계휴게소' }
      },
      {
        stopId: 's3', type: StopType.HIGHWAY_REST_AREA, name: '용인휴게소',
        location: { lat: 37.240, lng: 127.228 }, topItems: ['맥적구이 비빔밥'],
        description: '영동고속도로 초입의 맛집 휴게소.',
        imageUrl: 'https://picsum.photos/400/300?random=103', rating: 4.3,
        searchLinks: { naver: 'https://map.naver.com/v5/search/용인휴게소', google: '#', kakao: 'https://map.kakao.com/link/search/용인휴게소' }
      },
      {
        stopId: 's4', type: StopType.HIGHWAY_REST_AREA, name: '덕평자연휴게소',
        location: { lat: 37.210, lng: 127.388 }, topItems: ['덕평 소고기국밥'],
        description: '전국 판매 1위 국밥이 있는 테마파크형 휴게소.',
        imageUrl: 'https://picsum.photos/400/300?random=104', rating: 4.9,
        searchLinks: { naver: 'https://map.naver.com/v5/search/덕평자연휴게소', google: '#', kakao: 'https://map.kakao.com/link/search/덕평자연휴게소' }
      },
      {
        stopId: 's5', type: StopType.HIGHWAY_REST_AREA, name: '여주휴게소',
        location: { lat: 37.243, lng: 127.568 }, topItems: ['여주 쌀밥 정식'],
        description: '쌀과 도자기의 고장 여주의 맛을 담은 곳.',
        imageUrl: 'https://picsum.photos/400/300?random=105', rating: 4.5,
        searchLinks: { naver: 'https://map.naver.com/v5/search/여주휴게소', google: '#', kakao: 'https://map.kakao.com/link/search/여주휴게소' }
      },
      {
        stopId: 's6', type: StopType.HIGHWAY_REST_AREA, name: '서여주휴게소',
        location: { lat: 37.258, lng: 127.618 }, topItems: ['영양 돌솥밥'],
        description: '중부내륙선 진입 직후 만나는 정갈한 휴게소.',
        imageUrl: 'https://picsum.photos/400/300?random=106', rating: 4.2,
        searchLinks: { naver: 'https://map.naver.com/v5/search/서여주휴게소', google: '#', kakao: 'https://map.kakao.com/link/search/서여주휴게소' }
      },
      {
        stopId: 's7', type: StopType.HIGHWAY_REST_AREA, name: '충주휴게소',
        location: { lat: 37.050, lng: 127.810 }, topItems: ['사과 돈가스'],
        description: '충주 사과의 달콤함을 담은 이색 메뉴.',
        imageUrl: 'https://picsum.photos/400/300?random=107', rating: 4.4,
        searchLinks: { naver: 'https://map.naver.com/v5/search/충주휴게소', google: '#', kakao: 'https://map.kakao.com/link/search/충주휴게소' }
      },
      {
        stopId: 's8', type: StopType.HIGHWAY_REST_AREA, name: '괴산휴게소',
        location: { lat: 36.800, lng: 127.940 }, topItems: ['올갱이 국밥'],
        description: '속 풀리는 시원한 올갱이 국밥의 성지.',
        imageUrl: 'https://picsum.photos/400/300?random=108', rating: 4.3,
        searchLinks: { naver: 'https://map.naver.com/v5/search/괴산휴게소', google: '#', kakao: 'https://map.kakao.com/link/search/괴산휴게소' }
      },
      {
        stopId: 's9', type: StopType.HIGHWAY_REST_AREA, name: '문경휴게소',
        location: { lat: 36.640, lng: 128.140 }, topItems: ['문경약돌돼지 제육'],
        description: '약돌돼지의 쫄깃한 식감을 느낄 수 있는 곳.',
        imageUrl: 'https://picsum.photos/400/300?random=109', rating: 4.7,
        searchLinks: { naver: 'https://map.naver.com/v5/search/문경휴게소', google: '#', kakao: 'https://map.kakao.com/link/search/문경휴게소' }
      },
      {
        stopId: 's10', type: StopType.HIGHWAY_REST_AREA, name: '상주휴게소',
        location: { lat: 36.350, lng: 128.180 }, topItems: ['한우 가마솥 국밥'],
        description: '진한 국물 맛이 일품인 가마솥 국밥.',
        imageUrl: 'https://picsum.photos/400/300?random=110', rating: 4.5,
        searchLinks: { naver: 'https://map.naver.com/v5/search/상주휴게소', google: '#', kakao: 'https://map.kakao.com/link/search/상주휴게소' }
      },
      {
        stopId: 's11', type: StopType.HIGHWAY_REST_AREA, name: '의성휴게소',
        location: { lat: 36.420, lng: 128.520 }, topItems: ['의성마늘 돈가스'],
        description: '마늘의 풍미가 살아있는 돈가스 맛집.',
        imageUrl: 'https://picsum.photos/400/300?random=111', rating: 4.2,
        searchLinks: { naver: 'https://map.naver.com/v5/search/의성휴게소', google: '#', kakao: 'https://map.kakao.com/link/search/의성휴게소' }
      },
      {
        stopId: 's12', type: StopType.HIGHWAY_REST_AREA, name: '안동휴게소',
        location: { lat: 36.568, lng: 128.620 }, topItems: ['안동 간고등어 정식'],
        description: '도착 전 마지막 코스, 안동의 명물을 맛보세요.',
        imageUrl: 'https://picsum.photos/400/300?random=112', rating: 4.8,
        searchLinks: { naver: 'https://map.naver.com/v5/search/안동휴게소', google: '#', kakao: 'https://map.kakao.com/link/search/안동휴게소' }
      }
    ]
  },
  {
    routeId: 'route_busan_sample',
    summary: '경부 고속도로 중심 (서울-부산)',
    distanceKm: 395,
    durationMin: 280,
    toll: true,
    path: PATH_BUSAN,
    stops: [
      {
        stopId: 'b1', type: StopType.HIGHWAY_REST_AREA, name: '안성휴게소',
        location: { lat: 37.060, lng: 127.150 }, topItems: ['소떡소떡'],
        description: '전설의 소떡소떡 탄생지.',
        imageUrl: 'https://picsum.photos/400/300?random=201', rating: 4.5,
        searchLinks: { naver: 'https://map.naver.com/v5/search/안성휴게소', google: '#', kakao: 'https://map.kakao.com/link/search/안성휴게소' }
      },
      {
        stopId: 'b2', type: StopType.HIGHWAY_REST_AREA, name: '금강휴게소',
        location: { lat: 36.270, lng: 127.660 }, topItems: ['도리뱅뱅'],
        description: '금강의 절경을 바라보며 먹는 도리뱅뱅.',
        imageUrl: 'https://picsum.photos/400/300?random=202', rating: 4.7,
        searchLinks: { naver: 'https://map.naver.com/v5/search/금강휴게소', google: '#', kakao: 'https://map.kakao.com/link/search/금강휴게소' }
      },
      {
        stopId: 'b3', type: StopType.HIGHWAY_REST_AREA, name: '칠곡휴게소',
        location: { lat: 36.010, lng: 128.420 }, topItems: ['수제 돈가스'],
        description: '경부선 하행의 든든한 한 끼를 책임지는 곳.',
        imageUrl: 'https://picsum.photos/400/300?random=203', rating: 4.4,
        searchLinks: { naver: 'https://map.naver.com/v5/search/칠곡휴게소', google: '#', kakao: 'https://map.kakao.com/link/search/칠곡휴게소' }
      }
    ]
  }
];