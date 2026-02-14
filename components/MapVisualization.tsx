import React, { useEffect, useRef, useState, useMemo } from 'react';
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
  const [useDemoMode, setUseDemoMode] = useState(false);
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
          setUseDemoMode(false);
        } catch (err) {
          console.error("Kakao Map initialization failed:", err);
          setUseDemoMode(true);
        }
      });
    };

    if (mapInstance.current) return;
    
    if (typeof window.kakao !== 'undefined' && window.kakao.maps) {
      initMap();
    } else if (retryCount < 20) {
      const timer = setTimeout(() => setRetryCount(prev => prev + 1), 500);
      return () => clearTimeout(timer);
    } else {
      setUseDemoMode(true);
    }
  }, [retryCount, onMapClick]);

  useEffect(() => {
    if (!isApiLoaded || !mapInstance.current) return;
    const map = mapInstance.current;
    const kakao = window.kakao;

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
        new kakao.maps.Marker({ position: pos, map: map });
        bounds.extend(pos);
        hasPoints = true;
    }
    if (endPoint) {
        const pos = new kakao.maps.LatLng(endPoint.lat, endPoint.lng);
        new kakao.maps.Marker({ position: pos, map: map });
        bounds.extend(pos);
        hasPoints = true;
    }

    if (hasPoints) {
      map.setBounds(bounds);
    }
    
    setTimeout(() => map.relayout(), 100);
  }, [isApiLoaded, route, stops, selectedStopId, startPoint, endPoint]);

  const demoPathData = useMemo(() => {
    if (!useDemoMode || !route?.path?.length) return null;
    const lats = route.path.map(p => p.lat);
    const lngs = route.path.map(p => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const scale = (val: number, min: number, max: number) => {
      const range = max - min || 1;
      return ((val - min) / range) * 80 + 10;
    };
    const points = route.path.map(p => ({
      x: scale(p.lng, minLng, maxLng),
      y: 100 - scale(p.lat, minLat, maxLat)
    }));
    const pathString = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    return { pathString };
  }, [useDemoMode, route]);

  if (useDemoMode) {
    return (
      <div className="w-full h-full bg-neutral-100 flex items-center justify-center p-8 text-center">
        <div className="max-w-md bg-white p-10 rounded-[40px] shadow-premium border border-black/[0.03]">
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-neutral-900 mb-3 tracking-tight">지도 API 연결 안내</h3>
            <p className="text-neutral-500 text-sm mb-6 leading-relaxed break-keep font-medium">
                카카오 개발자 콘솔의 <strong>[플랫폼 > Web]</strong> 메뉴에서<br/>
                <span className="text-primary font-bold">https://rideguide.vercel.app</span> 를<br/>
                '사이트 도메인'에 정확히 등록했는지 확인해 주세요.
            </p>
            {demoPathData && (
                <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200">
                    <p className="text-[11px] font-black text-neutral-400 uppercase mb-2">경로 미리보기 (데모)</p>
                    <svg viewBox="0 0 100 100" className="w-32 h-32 mx-auto">
                        <path d={demoPathData.pathString} fill="none" stroke="#FF5C00" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </div>
            )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden">
      <div ref={mapContainer} className="w-full h-full bg-neutral-200" />
      {!isApiLoaded && !useDemoMode && (
        <div className="absolute inset-0 bg-neutral-100 flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-neutral-400 font-black text-sm tracking-tight">지도를 불러오고 있습니다...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapVisualization;