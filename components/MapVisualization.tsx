import React, { useEffect, useRef, useState, useMemo } from 'react';
import { RouteOption, Stop, Coordinates } from '../types';
import { Map as MapIcon, Navigation, Info } from 'lucide-react';

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

  const initMap = () => {
    if (!mapContainer.current || !window.kakao || !window.kakao.maps) return;

    window.kakao.maps.load(() => {
      try {
        const options = {
          center: new window.kakao.maps.LatLng(36.5, 127.5),
          level: 10
        };
        const map = new window.kakao.maps.Map(mapContainer.current, options);
        mapInstance.current = map;
        setIsApiLoaded(true);
        setUseDemoMode(false);
      } catch (err) {
        setUseDemoMode(true);
      }
    });
  };

  useEffect(() => {
    if (mapInstance.current) return;
    if (typeof window.kakao !== 'undefined' && window.kakao.maps) {
      initMap();
    } else {
      if (retryCount < 5) { // Quicker fallback for better dev experience
        const timer = setTimeout(() => setRetryCount(prev => prev + 1), 300);
        return () => clearTimeout(timer);
      } else {
        setUseDemoMode(true);
      }
    }
  }, [retryCount]);

  // SVG Path Generator for Demo Mode
  const demoPathData = useMemo(() => {
    if (!useDemoMode || !route?.path?.length) return null;
    
    // Normalize coordinates to 0-100 range for SVG
    const lats = route.path.map(p => p.lat);
    const lngs = route.path.map(p => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    const scale = (val: number, min: number, max: number) => {
      const range = max - min || 1;
      return ((val - min) / range) * 80 + 10; // Keep 10% margin
    };

    const points = route.path.map(p => ({
      x: scale(p.lng, minLng, maxLng),
      y: 100 - scale(p.lat, minLat, maxLat) // SVG Y is inverted
    }));

    const pathString = `M ${points[0].x} ${points[0].y} ` + 
                      points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');

    const stopPoints = (stops || []).map(s => ({
      id: s.stopId,
      name: s.name,
      x: scale(s.location.lng, minLng, maxLng),
      y: 100 - scale(s.location.lat, minLat, maxLat)
    }));

    return { pathString, stopPoints };
  }, [useDemoMode, route, stops]);

  // Kakao Map Drawing Logic (Standard)
  useEffect(() => {
    if (!isApiLoaded || !mapInstance.current) return;
    const map = mapInstance.current;
    const kakao = window.kakao;

    markers.current.forEach(m => m.setMap(null));
    overlays.current.forEach(o => o.setMap(null));
    if (polyline.current) polyline.current.setMap(null);

    const bounds = new kakao.maps.LatLngBounds();
    let hasPoints = false;

    if (route?.path?.length) {
      const linePath = route.path.map(p => new kakao.maps.LatLng(p.lat, p.lng));
      polyline.current = new kakao.maps.Polyline({
        path: linePath, strokeWeight: 6, strokeColor: '#FF6B00', strokeOpacity: 0.8
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
          content: `<div class="kakao-label ${isSelected ? 'selected' : ''}">${stop.name}</div>`,
          yAnchor: 2.3
        });
        overlay.setMap(map);
        markers.current.push(marker);
        overlays.current.push(overlay);
        bounds.extend(pos);
        hasPoints = true;
      });
    }

    if (startPoint) bounds.extend(new kakao.maps.LatLng(startPoint.lat, startPoint.lng));
    if (endPoint) bounds.extend(new kakao.maps.LatLng(endPoint.lat, endPoint.lng));

    if (hasPoints) map.setBounds(bounds);
    map.relayout();
  }, [isApiLoaded, route, stops, selectedStopId, startPoint, endPoint]);

  // Demo Mode Placeholder View
  if (useDemoMode) {
    return (
      <div className="w-full h-full bg-[#fdfdfd] flex flex-col items-center justify-center relative overflow-hidden">
        {/* Abstract Grid Background */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        
        {/* Visual Content */}
        <div className="relative w-full h-full flex items-center justify-center p-12">
            {demoPathData ? (
                <div className="w-full h-full max-w-lg aspect-square relative bg-white rounded-[40px] shadow-2xl border border-gray-100 p-8 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Navigation className="w-5 h-5 text-primary" />
                            <span className="font-bold text-gray-800">{route?.summary} 경로 스키마</span>
                        </div>
                        <div className="px-3 py-1 bg-orange-100 text-primary text-[10px] font-black rounded-full">DEMO VIEW</div>
                    </div>
                    
                    <div className="flex-1 relative border-2 border-dashed border-gray-100 rounded-2xl overflow-hidden bg-gray-50/30">
                        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
                            <path d={demoPathData.pathString} fill="none" stroke="#FF6B00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-[dash_3s_ease-in-out_infinite]" style={{ strokeDasharray: '200', strokeDashoffset: '0' }} />
                            {demoPathData.stopPoints.map(p => (
                                <g key={p.id}>
                                    <circle cx={p.x} cy={p.y} r="1.5" fill="#1A202C" />
                                    {p.id === selectedStopId && (
                                        <circle cx={p.x} cy={p.y} r="3" fill="none" stroke="#FF6B00" strokeWidth="0.5">
                                            <animate attributeName="r" from="1.5" to="5" dur="1.5s" repeatCount="indefinite" />
                                            <animate attributeName="opacity" from="1" to="0" dur="1.5s" repeatCount="indefinite" />
                                        </circle>
                                    )}
                                </g>
                            ))}
                        </svg>
                        
                        {/* Overlay Labels for selected stop */}
                        {selectedStopId && (
                            <div className="absolute top-4 right-4 bg-primary text-white text-xs font-bold px-3 py-2 rounded-xl shadow-lg animate-bounce">
                                선택된 맛집: {stops?.find(s => s.stopId === selectedStopId)?.name}
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-4 flex items-center gap-2 text-gray-400 text-[10px] italic">
                        <Info className="w-3 h-3" />
                        API 키를 입력하면 실제 카카오 지도가 이 자리에 표시됩니다.
                    </div>
                </div>
            ) : (
                <div className="z-10 bg-white/90 backdrop-blur-md p-10 rounded-[40px] shadow-2xl border border-white max-w-sm text-center">
                    <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <MapIcon className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-800 mb-3 tracking-tight">RouteEats 테스트 모드</h3>
                    <p className="text-gray-500 text-sm mb-8 leading-relaxed break-keep font-medium">
                        현재 지도 API 키 없이 작동 중입니다.<br/>
                        <span className="text-primary font-bold">주소 검색 및 AI 맛집 추천 기능</span>은<br/>정상적으로 테스트하실 수 있습니다.
                    </p>
                    <div className="p-4 bg-gray-50 rounded-2xl text-left space-y-2 border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-xs font-bold text-gray-600">출발지 검색 가능</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <span className="text-xs font-bold text-gray-600">목적지 검색 가능</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-primary"></div>
                            <span className="text-xs font-bold text-gray-600">AI 맛집 리스트 생성 가능</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative z-0">
      <div ref={mapContainer} className="w-full h-full" />
      {!isApiLoaded && (
        <div className="absolute inset-0 bg-white flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 font-bold text-sm">지도 초기화 중...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapVisualization;