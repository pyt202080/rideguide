import React, { useState, useEffect } from 'react';
import { RouteOption, SearchState, Stop } from '../types';
import { Clock, Navigation, Sparkles, Star, Info, ArrowLeft, ExternalLink, MapPin, ChevronRight } from 'lucide-react';
import { generateRoutes } from '../services/genai';

interface Step2Props {
  searchData: SearchState;
  onBack: () => void;
}

const LOADING_MESSAGES = [
  "최적의 경로를 생성하고 있습니다",
  "경로상의 모든 휴게소를 전수 조사 중입니다",
  "시그니처 메뉴와 리뷰를 분석하고 있습니다",
  "실시간 교통 정보를 반영 중입니다"
];

const SlimStopRow: React.FC<{ stop: Stop; index: number }> = ({ stop, index }) => (
    <div className="group relative flex items-start gap-4 py-5 border-b border-black/[0.03] hover:bg-neutral-50/80 transition-all px-4 -mx-4">
        {/* Index & Timeline */}
        <div className="flex flex-col items-center flex-none w-8">
            <div className="w-7 h-7 rounded-full bg-white border-2 border-neutral-100 flex items-center justify-center text-[10px] font-black text-neutral-400 group-hover:border-primary group-hover:text-primary transition-colors z-10">
                {index + 1}
            </div>
            <div className="w-[1.5px] h-full bg-neutral-100 mt-2 group-last:hidden"></div>
        </div>

        {/* Info Section */}
        <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-black text-[16px] text-neutral-900 tracking-tight">{stop.name}</h4>
                    <div className="flex items-center gap-0.5 bg-amber-400/10 px-1.5 py-0.5 rounded text-[10px] font-black text-amber-600">
                        <Star className="w-2.5 h-2.5 fill-amber-500" />
                        {stop.rating}
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {stop.topItems.map((item, i) => (
                        <span key={i} className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded">
                            {item}
                        </span>
                    ))}
                </div>
                <p className="text-[12px] text-neutral-500 font-medium line-clamp-1">{stop.description}</p>
            </div>

            {/* Link Buttons - Compact */}
            <div className="flex flex-row md:flex-col gap-1.5 flex-none min-w-[140px]">
                <div className="flex gap-1.5 w-full">
                    <a 
                        href={stop.searchLinks.kakao} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="flex-1 flex items-center justify-center py-2 px-3 bg-[#FAE100] text-[#3C1E1E] text-[10px] font-black rounded-lg hover:brightness-95 transition-all"
                    >
                        카카오
                    </a>
                    <a 
                        href={stop.searchLinks.naver} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="flex-1 flex items-center justify-center py-2 px-3 bg-[#03C75A] text-white text-[10px] font-black rounded-lg hover:brightness-95 transition-all"
                    >
                        네이버
                    </a>
                </div>
            </div>
        </div>
        
        {/* Very Subtle Image Thumbnail */}
        <div className="hidden sm:block flex-none w-16 h-12 rounded-lg overflow-hidden bg-neutral-100 ml-2">
            <img src={stop.imageUrl} alt={stop.name} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
        </div>
    </div>
);

const Step2_Routes: React.FC<Step2Props> = ({ searchData, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [msgIndex, setMsgIndex] = useState(0);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);

  useEffect(() => {
    let msgInterval: ReturnType<typeof setInterval>;
    if (loading) msgInterval = setInterval(() => setMsgIndex(prev => (prev + 1) % LOADING_MESSAGES.length), 2500);
    return () => clearInterval(msgInterval);
  }, [loading]);

  useEffect(() => {
    const fetchRoutes = async () => {
      setLoading(true);
      try {
        const data = await generateRoutes(searchData.start, searchData.destination, searchData.startCoordinates, searchData.destinationCoordinates);
        setRoutes(data);
        if (data.length > 0) setActiveRouteId(data[0].routeId);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchRoutes();
  }, [searchData]);

  const activeRoute = routes.find(r => r.routeId === activeRouteId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-neutral-50 animate-fade-in-up">
        <div className="relative mb-8">
            <div className="w-14 h-14 border-[3px] border-neutral-200 border-t-primary rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-primary">
                <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
        </div>
        <h3 className="text-lg font-black text-neutral-900 mb-2">{LOADING_MESSAGES[msgIndex]}</h3>
        <p className="text-xs text-neutral-400 font-bold max-w-xs text-center break-keep leading-relaxed">
            "{searchData.start}"에서 "{searchData.destination}"까지의<br/>모든 고속도로 정보를 스캔하고 있습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Search Result Summary Header */}
      <div className="flex-none bg-white border-b border-black/[0.03] pt-6 pb-2 px-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 bg-neutral-50 hover:bg-neutral-100 rounded-full transition-colors text-neutral-400">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                    <div className="flex items-center gap-2 text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-0.5">
                        <span>{searchData.start}</span>
                        <ChevronRight className="w-2 h-2" />
                        <span>{searchData.destination}</span>
                    </div>
                    <h2 className="text-xl font-black text-neutral-900 tracking-tight">{activeRoute?.summary || '경로 탐색 완료'}</h2>
                </div>
            </div>
            
            <div className="flex items-center gap-6 pb-1">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-neutral-400 uppercase tracking-tighter">예상 시간</span>
                    <span className="text-sm font-black text-neutral-900 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        {activeRoute && `${Math.floor(activeRoute.durationMin / 60)}h ${activeRoute.durationMin % 60}m`}
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-neutral-400 uppercase tracking-tighter">총 거리</span>
                    <span className="text-sm font-black text-neutral-900 flex items-center gap-1">
                        <Navigation className="w-3.5 h-3.5 text-primary" />
                        {activeRoute?.distanceKm}km
                    </span>
                </div>
            </div>
        </div>
      </div>

      {/* Tabs for Multiple Routes */}
      <div className="flex-none bg-white border-b border-black/[0.03] px-6">
        <div className="max-w-4xl mx-auto flex items-center gap-8 overflow-x-auto no-scrollbar">
            {routes.map((route) => (
                <button
                    key={route.routeId}
                    onClick={() => setActiveRouteId(route.routeId)}
                    className={`py-3 text-[12px] font-black whitespace-nowrap border-b-2 transition-all ${activeRouteId === route.routeId ? 'border-primary text-primary' : 'border-transparent text-neutral-400 hover:text-neutral-600'}`}
                >
                    {route.summary}
                </button>
            ))}
        </div>
      </div>

      {/* Exhaustive List View */}
      <div className="flex-1 overflow-y-auto bg-neutral-50/20">
        <div className="max-w-4xl mx-auto px-6 py-8">
            {/* Info Summary */}
            <div className="flex items-center gap-2.5 mb-8 px-4 py-2.5 bg-primary/5 rounded-xl border border-primary/10">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <p className="text-[11px] font-black text-neutral-600">
                    경로상의 모든 휴게소 및 맛집 <span className="text-primary">{activeRoute?.stops.length}곳</span>을 발견했습니다.
                </p>
            </div>

            {/* Slim List Container */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-soft border border-black/[0.02]">
                {/* Start Point */}
                <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-black/[0.03]">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                        <MapPin className="w-3 h-3" />
                    </div>
                    <span className="text-[13px] font-black text-neutral-900">{searchData.start} 출발</span>
                </div>

                {/* The List */}
                <div className="space-y-0">
                    {activeRoute?.stops.map((stop, idx) => (
                        <SlimStopRow 
                            key={stop.stopId} 
                            stop={stop} 
                            index={idx}
                        />
                    ))}
                </div>

                {/* End Point */}
                <div className="flex items-center gap-2.5 mt-6 pt-4 border-t border-black/[0.03]">
                    <div className="w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center text-white">
                        <MapPin className="w-3 h-3" />
                    </div>
                    <span className="text-[13px] font-black text-neutral-900">{searchData.destination} 도착</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Step2_Routes;