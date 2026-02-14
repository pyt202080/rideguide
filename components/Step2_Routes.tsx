import React, { useState, useEffect, useRef } from 'react';
import { RouteOption, SearchState, Stop } from '../types';
import { Clock, Navigation, Banknote, ChevronDown, ChevronUp, Sparkles, Star, Info, ExternalLink, ArrowLeft, Plus } from 'lucide-react';
import { generateRoutes } from '../services/genai';

interface Step2Props {
  searchData: SearchState;
  onBack: () => void;
}

const LOADING_MESSAGES = [
  "최적의 경로를 생성하고 있습니다",
  "휴게소 시그니처 메뉴를 분석 중입니다",
  "거리별 최적 방문 시점을 계산하고 있습니다",
  "거의 다 되었습니다. 잠시만요!"
];

const RestAreaItem: React.FC<{ stop: Stop }> = ({ stop }) => (
    <div className="group bg-white rounded-3xl overflow-hidden border border-black/[0.03] flex flex-col md:flex-row min-h-[10rem] mb-5 shadow-soft hover:shadow-premium transition-all duration-500 hover:-translate-y-1">
        <div className="w-full md:w-48 h-44 md:h-auto flex-none relative overflow-hidden">
            <img src={stop.imageUrl} alt={stop.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute top-3 left-3 glass px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-soft border border-white/50">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="text-xs font-black text-neutral-900">{stop.rating}</span>
            </div>
        </div>
        <div className="p-5 md:p-6 flex-1 flex flex-col justify-between min-w-0">
            <div>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-3">
                    <h4 className="font-black text-lg text-neutral-900 tracking-tight leading-tight">{stop.name}</h4>
                    <div className="flex flex-wrap gap-1.5">
                        {stop.topItems.slice(0, 2).map((item, i) => (
                            <span key={i} className="text-[10px] font-black text-primary bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10 tracking-tight">
                                {item}
                            </span>
                        ))}
                    </div>
                </div>
                <p className="text-[13px] text-neutral-500 font-medium leading-relaxed break-keep line-clamp-2 md:line-clamp-3">{stop.description}</p>
            </div>
            
            <div className="mt-5 grid grid-cols-3 gap-2">
                <a href={stop.searchLinks.kakao} target="_blank" rel="noreferrer" className="flex items-center justify-center py-2.5 bg-[#FAE100] hover:bg-[#EED500] text-[#3C1E1E] text-[11px] font-black rounded-xl transition-colors shadow-sm">카카오맵</a>
                <a href={stop.searchLinks.naver} target="_blank" rel="noreferrer" className="flex items-center justify-center py-2.5 bg-[#03C75A] hover:bg-[#02B351] text-white text-[11px] font-black rounded-xl transition-colors shadow-sm">네이버</a>
                <a href={stop.searchLinks.google} target="_blank" rel="noreferrer" className="flex items-center justify-center py-2.5 bg-neutral-900 hover:bg-black text-white text-[11px] font-black rounded-xl transition-colors shadow-sm gap-1">
                    Google <ExternalLink className="w-3 h-3" />
                </a>
            </div>
        </div>
    </div>
);

const Step2_Routes: React.FC<Step2Props> = ({ searchData, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [msgIndex, setMsgIndex] = useState(0);
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);
  const routeRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    let msgInterval: ReturnType<typeof setInterval>;
    if (loading) msgInterval = setInterval(() => setMsgIndex(prev => (prev + 1) % LOADING_MESSAGES.length), 2000);
    return () => clearInterval(msgInterval);
  }, [loading]);

  useEffect(() => {
    const fetchRoutes = async () => {
      setLoading(true);
      try {
        const data = await generateRoutes(searchData.start, searchData.destination, searchData.startCoordinates, searchData.destinationCoordinates);
        setRoutes(data);
        if (data.length > 0) setExpandedRouteId(data[0].routeId);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchRoutes();
  }, [searchData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-neutral-50">
        <div className="relative mb-10 scale-125">
            <div className="w-16 h-16 border-[5px] border-neutral-200 border-t-primary rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            </div>
        </div>
        <h3 className="text-xl font-black text-neutral-900 mb-2 animate-pulse">{LOADING_MESSAGES[msgIndex]}</h3>
        <p className="text-sm text-neutral-400 font-bold max-w-xs text-center break-keep leading-relaxed">
            {searchData.start}에서 {searchData.destination}까지의<br/>모든 맛집 정보를 취합하고 있습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-neutral-50 overflow-hidden relative">
      <div className="flex-none glass z-[120] border-b border-black/[0.03]">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-400 hover:text-neutral-900">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 text-sm font-black text-neutral-900 overflow-hidden">
                <span className="truncate">{searchData.start}</span>
                <span className="text-primary opacity-50">→</span>
                <span className="truncate">{searchData.destination}</span>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-12">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
            {routes.map((route, idx) => {
                const isExpanded = expandedRouteId === route.routeId;
                const displayedStops = route.stops.slice(0, visibleCount);
                return (
                    <div key={route.routeId} className="mb-6 rounded-[40px] overflow-hidden bg-white shadow-soft border border-black/[0.02] transition-all">
                        <div 
                            onClick={() => { setExpandedRouteId(isExpanded ? null : route.routeId); setVisibleCount(10); }}
                            className={`p-6 md:p-8 cursor-pointer transition-all ${isExpanded ? 'bg-primary/5' : 'hover:bg-neutral-50'}`}
                        >
                            <div className="flex items-center justify-between gap-6">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-3">
                                        <h3 className={`text-xl md:text-2xl font-black transition-colors ${isExpanded ? 'text-primary' : 'text-neutral-900'}`}>{route.summary}</h3>
                                        <span className="px-2 py-0.5 bg-neutral-100 text-[10px] font-black text-neutral-400 rounded-md">Route {idx + 1}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-4">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-500">
                                            <Clock className="w-3.5 h-3.5 text-primary" />
                                            {Math.floor(route.durationMin / 60)}시간 {route.durationMin % 60}분
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-500">
                                            <Navigation className="w-3.5 h-3.5 text-primary" />
                                            {route.distanceKm}km
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-500">
                                            <Banknote className="w-3.5 h-3.5 text-primary" />
                                            {route.toll ? '통행료 있음' : '무료 경로'}
                                        </div>
                                    </div>
                                </div>
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isExpanded ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-400'}`}>
                                    {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                                </div>
                            </div>
                        </div>

                        {isExpanded && (
                            <div className="px-6 md:px-8 pb-10 animate-fade-in-up">
                                <div className="flex items-center gap-3 p-4 bg-primary/[0.03] rounded-2xl border border-primary/10 mb-8">
                                    <Info className="w-4 h-4 text-primary" />
                                    <p className="text-[13px] font-bold text-neutral-600 break-keep">이 경로상의 모든 휴게소 <span className="text-primary underline underline-offset-4">{route.stops.length}곳</span>을 주행 순서대로 찾았습니다.</p>
                                </div>
                                
                                <div className="space-y-2">
                                    {displayedStops.map(stop => <RestAreaItem key={stop.stopId} stop={stop} />)}
                                </div>

                                {route.stops.length > visibleCount && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setVisibleCount(prev => prev + 10); }}
                                        className="w-full mt-6 py-4 flex items-center justify-center gap-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-500 font-black rounded-3xl border border-dashed border-neutral-200 transition-all active:scale-95"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>휴게소 {route.stops.length - visibleCount}개 더보기</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
      </div>
      
      <div className="flex-none py-4 glass border-t border-black/[0.03] text-center">
        <p className="text-[10px] font-black text-neutral-300 uppercase tracking-[0.4em]">MOU-MUKKA Premium Highway Guide</p>
      </div>
    </div>
  );
};

export default Step2_Routes;