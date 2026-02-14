import { Coordinates, PlaceResult } from '../types';

/**
 * 카카오 맵 SDK가 없는 경우 OpenStreetMap(OSM)을 사용하여 검색 서비스를 제공합니다.
 */

export const searchAddress = async (query: string): Promise<PlaceResult[]> => {
  if (!query || query.length < 2) return [];

  // Try Kakao First
  if (typeof window.kakao !== 'undefined' && window.kakao.maps && window.kakao.maps.services) {
    return new Promise((resolve) => {
      const ps = new window.kakao.maps.services.Places();
      ps.keywordSearch(query, (data: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const results = data.map((place: any) => ({
            display_name: place.address_name ? `${place.place_name} (${place.address_name})` : place.place_name,
            lat: place.y,
            lon: place.x
          }));
          resolve(results);
        } else {
          resolve(fetchOSMSearch(query));
        }
      });
    });
  }

  return fetchOSMSearch(query);
};

const fetchOSMSearch = async (query: string): Promise<PlaceResult[]> => {
  try {
    // Adding viewbox for South Korea to prioritize local results
    const viewbox = "124.5,33.0,131.0,38.9";
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=kr&viewbox=${viewbox}&bounded=1&limit=10`,
      {
        headers: {
          'Accept-Language': 'ko-KR,ko;q=0.9',
          'User-Agent': 'RouteEats-App'
        }
      }
    );
    const data = await response.json();
    return data.map((item: any) => ({
      display_name: item.display_name,
      lat: item.lat,
      lon: item.lon
    }));
  } catch (e) {
    console.error("Fallback search failed", e);
    return [];
  }
};

export const reverseGeocode = async (coords: Coordinates): Promise<string> => {
  if (typeof window.kakao !== 'undefined' && window.kakao.maps && window.kakao.maps.services) {
    return new Promise((resolve) => {
      const geocoder = new window.kakao.maps.services.Geocoder();
      const coord = new window.kakao.maps.LatLng(coords.lat, coords.lng);
      geocoder.coord2Address(coord.getLng(), coord.getLat(), (result: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const addr = result[0].road_address ? result[0].road_address.address_name : result[0].address.address_name;
          resolve(addr);
        } else {
          resolve(fetchOSMReverse(coords));
        }
      });
    });
  }

  return fetchOSMReverse(coords);
};

const fetchOSMReverse = async (coords: Coordinates): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`,
      {
        headers: {
          'Accept-Language': 'ko-KR,ko;q=0.9',
          'User-Agent': 'RouteEats-App'
        }
      }
    );
    const data = await response.json();
    // OSM often returns very long addresses, let's try to clean it
    const parts = data.display_name?.split(',') || [];
    return parts.length > 2 ? `${parts[0].trim()}, ${parts[1].trim()}` : data.display_name || '선택된 위치';
  } catch (e) {
    return '선택된 위치';
  }
};