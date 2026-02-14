import React, { useState, useEffect } from 'react';
import { RouteOption, SearchState, Stop } from '../types';
import { Clock, Navigation, Sparkles, Star, ArrowLeft, MapPin, ChevronRight } from 'lucide-react';
import { generateRoutes } from '../services/genai';

interface Step2Props {
  searchData: SearchState;
  onBack: () => void;
}

const LOADING_MESSAGES = [
  "최적의 경로를 생성하고 있습니다",
  "경로상의 모든 휴게소를 전수 조사 중입니다",
  "시그니처 메뉴와 리뷰를 분석하고 있습니다",
  "실제 고속도로 데이터를 대조하고 있습니다"
];

const StopRow: React.FC<{ stop: Stop; index: number }> = ({ stop, index }) => (
    <div className="group relative flex items-start gap-4 py-6 border-b border-black/[0.03] hover:bg-neutral-50/50 transition-all px-4 -mx-4">
        {/* Timeline Index */}
        <div className="flex flex-col items-center flex-none w-10">
            <div className="w-8 h-8 rounded-full bg-white border-2 border-neutral-100 flex items-center justify-center text-[11px] font-black text-neutral-400 group-hover:border-primary group-hover:text-primary transition-colors z-10">
                {index + 1}
            </div>
            <div className="w-[1.5px] h-full bg-neutral-100 mt-2 group-last:hidden"></div>
        </div>

        {/* Info Content */}
        <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-4 md:gap-10">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                    <h4 className="font-black text-[17px] text-neutral-900 tracking-tight">{stop.name}</h4>
                    <div className="flex items-center gap-0.5 bg-amber-400/10 px-1.5 py-0.5 rounded text-[10px] font-black text-amber-600">
                        <Star className="w-2.5 h-2.5 fill-amber-500" />
                        {stop.rating}
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-2">
                    {stop.topItems.map((item, i) => (
                        <span key={i} className="text-[11px] font-bold text-primary bg-primary/5 px-2.5 py-0.5 rounded-md border border-primary/10">
                            {item}
                        </span>
                    ))}
                </div>
                <p className="text-[13px] text-neutral-500 font-medium line-clamp-1 leading-relaxed">{stop.description}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-row md:flex-col gap-2 flex-none md:min-w-[120px]">
                <a 
                    href={stop.searchLinks.kakao} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-[#FAE100] text-[#3C1E1E] text-[11px] font-black rounded-xl hover:brightness-95 transition-all shadow-sm"
                >
                    카카오맵
                </a>
                <a 
                    href={stop.searchLinks.naver} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-[#03C75A] text-white text-[11px] font-black rounded-xl hover:brightness-95 transition-all shadow-sm"
                >
                    네이버
                </a>
            </div>
        </div>
        
        {/* Minimal Thumbnail */}
        <div className="hidden lg:block flex-none w-24 h-16 rounded-xl overflow-hidden bg-neutral-100 ml-4 border border-black/[0.03]">
            <img src={stop.imageUrl} alt={stop.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
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
        <div className="relative mb-10">
            <div className="w-16 h-16 border-[4px] border-neutral-200 border-t-primary rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            </div>
        </div>
        <h3 className="text-xl font-black text-neutral-900 mb-2">{LOADING_MESSAGES[msgIndex]}</h3>
        <p className="text-sm text-neutral-400 font-bold max-w-sm text-center break-keep leading-relaxed">
            "{searchData.start} → {searchData.destination}" 경로의<br/>모든 휴게소와 맛집을 하나도 빠짐없이 스캔하고 있습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header Section */}
      <div className="flex-none bg-white border-b border-black/[0.03] pt-6 pb-2 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex items-start gap-4">
                <button onClick={onBack} className="mt-1 p-2.5 bg-neutral-50 hover:bg-neutral-100 rounded-full transition-colors text-neutral-400">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <div className="flex items-center gap-2 text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">
                        <span>{searchData.start}</span>
                        <ChevronRight className="w-2.5 h-2.5" />
                        <span>{searchData.destination}</span>
                    </div>
                    <h2 className="text-2xl font-black text-neutral-900 tracking-tight">{activeRoute?.summary || '탐색 완료'}</h2>
                </div>
            </div>
            
            <div className="flex items-center gap-8 border-l-0 md:border-l border-neutral-100 md:pl-8 pb-1">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-tighter mb-0.5">예상 시간</span>
                    <span className="text-sm font-black text-neutral-900 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-primary" />
                        {activeRoute && `${Math.floor(activeRoute.durationMin / 60)}시간 ${activeRoute.durationMin % 60}분`}
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-tighter mb-0.5">총 거리</span>
                    <span className="text-sm font-black text-neutral-900 flex items-center gap-1.5">
                        <Navigation className="w-4 h-4 text-primary" />
                        {activeRoute?.distanceKm}km
                    </span>
                </div>
            </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-none bg-white border-b border-black/[0.03] px-6">
        <div className="max-w-5xl mx-auto flex items-center gap-10 overflow-x-auto no-scrollbar">
            {routes.map((route) => (
                <button
                    key={route.routeId}
                    onClick={() => setActiveRouteId(route.routeId)}
                    className={`py-4 text-[13px] font-black whitespace-nowrap border-b-[3px] transition-all relative ${activeRouteId === route.routeId ? 'border-primary text-primary' : 'border-transparent text-neutral-400 hover:text-neutral-600'}`}
                >
                    {route.summary}
                </button>
            ))}
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto bg-neutral-50/20">
        <div className="max-w-5xl mx-auto px-6 py-10">
            <div className="inline-flex items-center gap-3 mb-10 px-5 py-2.5 bg-white rounded-full border border-black/[0.03] shadow-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <p className="text-[13px] font-black text-neutral-700">
                    경로상의 실제 장소 <span className="text-primary">{activeRoute?.stops.length}곳</span>을 발견했습니다.
                </p>
            </div>

            <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-soft border border-black/[0.02]">
                <div className="flex items-center gap-3 mb-8 pb-6 border-b border-black/[0.03]">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                        <MapPin className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-black text-neutral-900">{searchData.start} 출발</span>
                </div>

                <div className="space-y-0">
                    {activeRoute?.stops.map((stop, idx) => (
                        <StopRow 
                            key={stop.stopId} 
                            stop={stop} 
                            index={idx}
                        />
                    ))}
                </div>

                <div className="flex items-center gap-3 mt-10 pt-8 border-t border-black/[0.03]">
                    <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center text-white">
                        <MapPin className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-black text-neutral-900">{searchData.destination} 도착</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Step2_Routes;