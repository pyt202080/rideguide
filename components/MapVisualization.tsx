import React, { useEffect, useRef, useState } from 'react';
import { RouteOption, Stop, Coordinates } from '../types';
import { AlertCircle } from 'lucide-react';

interface MapVisualizationProps {
  route?: RouteOption;
  stops?: Stop[];
  selectedStopId?: string | null;
  startPoint?: Coordinates | null;
  endPoint?: Coordinates | null;
  onMapClick?: (coords: Coordinates) => void;
  selectionMode?: 'start' | 'destination' | null;
}

declare global {
  interface Window {
    kakao: any;
  }
}

const MapVisualization: React.FC<MapVisualizationProps> = ({
  route,
  stops,
  selectedStopId,
  startPoint,
  endPoint,
  onMapClick,
  selectionMode
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markers = useRef<any[]>([]);
  const overlays = useRef<any[]>([]);
  const polyline = useRef<any>(null);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [hasMapError, setHasMapError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const initMap = () => {
      if (!mapContainer.current || !window.kakao || !window.kakao.maps) {
        return;
      }

      window.kakao.maps.load(() => {
        try {
          const options = {
            center: new window.kakao.maps.LatLng(36.5, 127.5),
            level: 12
          };
          const map = new window.kakao.maps.Map(mapContainer.current, options);
          mapInstance.current = map;

          window.kakao.maps.event.addListener(map, 'click', (mouseEvent: any) => {
            if (onMapClick) {
              const latlng = mouseEvent.latLng;
              onMapClick({ lat: latlng.getLat(), lng: latlng.getLng() });
            }
          });

          setIsApiLoaded(true);
          setHasMapError(false);
        } catch (err) {
          console.error("Kakao Map initialization failed:", err);
          setHasMapError(true);
        }
      });
    };

    if (selectionMode) {
      setHasMapError(false);
    }

    if (mapInstance.current) return;

    if (typeof window.kakao !== 'undefined' && window.kakao.maps) {
      initMap();
    } else if (retryCount < 20) {
      const timer = setTimeout(() => setRetryCount(prev => prev + 1), 500);
      return () => clearTimeout(timer);
    } else {
      setHasMapError(true);
    }
  }, [retryCount, onMapClick, hasMapError, selectionMode]);

  useEffect(() => {
    if (!isApiLoaded || !mapInstance.current) return;
    const map = mapInstance.current;
    const kakao = window.kakao;

    // Clear existing elements
    markers.current.forEach(m => m.setMap(null));
    overlays.current.forEach(o => o.setMap(null));
    if (polyline.current) polyline.current.setMap(null);
    markers.current = [];
    overlays.current = [];

    const bounds = new kakao.maps.LatLngBounds();
    let hasPoints = false;

    if (route?.path?.length) {
      const linePath = route.path.map(p => new kakao.maps.LatLng(p.lat, p.lng));
      polyline.current = new kakao.maps.Polyline({
        path: linePath, strokeWeight: 6, strokeColor: '#FF5C00', strokeOpacity: 0.8
      });
      polyline.current.setMap(map);
      linePath.forEach(p => bounds.extend(p));
      hasPoints = true;
    }

    if (stops) {
      stops.forEach(stop => {
        const pos = new kakao.maps.LatLng(stop.location.lat, stop.location.lng);
        const marker = new kakao.maps.Marker({ position: pos, map: map });
        const isSelected = stop.stopId === selectedStopId;
        const overlay = new kakao.maps.CustomOverlay({
          position: pos,
          content: `<div class="kakao-label ${isSelected ? 'selected animate-bounce' : ''}">${stop.name}</div>`,
          yAnchor: 2.3
        });
        overlay.setMap(map);
        markers.current.push(marker);
        overlays.current.push(overlay);
        bounds.extend(pos);
        hasPoints = true;
      });
    }

    if (startPoint) {
        const pos = new kakao.maps.LatLng(startPoint.lat, startPoint.lng);
        const marker = new kakao.maps.Marker({ position: pos, map: map });
        markers.current.push(marker);
        bounds.extend(pos);
        hasPoints = true;
    }
    if (endPoint) {
        const pos = new kakao.maps.LatLng(endPoint.lat, endPoint.lng);
        const marker = new kakao.maps.Marker({ position: pos, map: map });
        markers.current.push(marker);
        bounds.extend(pos);
        hasPoints = true;
    }

    if (hasPoints) {
      map.setBounds(bounds);
    }

    setTimeout(() => map.relayout(), 100);
  }, [isApiLoaded, route, stops, selectedStopId, startPoint, endPoint]);

  const retryMapLoad = () => {
    setHasMapError(false);
    setIsApiLoaded(false);
    setRetryCount(0);
    mapInstance.current = null;
    markers.current = [];
    overlays.current = [];
    polyline.current = null;
  };

  if (hasMapError) {
    return (
      <div className="w-full h-full bg-neutral-100 flex items-center justify-center p-8 text-center">
        <div className="max-w-md bg-white p-10 rounded-[40px] shadow-premium border border-black/[0.03]">
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-neutral-900 mb-3 tracking-tight">지도를 불러오지 못했습니다</h3>
            <div className="text-neutral-500 text-sm mb-6 leading-relaxed break-keep font-medium">
              카카오맵 SDK 로딩이 실패했습니다. 네트워크 제한, 광고 차단기, CSP 설정, 지도 앱키 또는 스크립트 로드 환경을 확인해 주세요.<br/>
              <span className="text-primary font-bold">좌표 입력 기반 검색은 정상 동작합니다.</span>
            </div>
            <button
              type="button"
              onClick={retryMapLoad}
              className="px-6 py-3 bg-primary text-white rounded-2xl font-black text-sm shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
            >
              지도 재시도
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden">
      <div ref={mapContainer} className="w-full h-full bg-neutral-200" />
      {!isApiLoaded && !hasMapError && (
        <div className="absolute inset-0 bg-neutral-100 flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-neutral-400 font-black text-sm tracking-tight">지도 API 로딩 중...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapVisualization;
