import React, { useState, useEffect } from 'react';
import { RouteOption, SearchState, Stop } from '../types';
import { Clock, Navigation, ChevronDown, ChevronUp, Sparkles, Star, Info, ArrowLeft, MapPin, Search } from 'lucide-react';
import { generateRoutes } from '../services/genai';
import MapVisualization from './MapVisualization';

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

const RestAreaListItem: React.FC<{ stop: Stop; isSelected: boolean; onClick: () => void }> = ({ stop, isSelected, onClick }) => (
    <div 
        onClick={onClick}
        className={`relative pl-8 pb-6 border-l-2 last:pb-0 transition-all cursor-pointer ${isSelected ? 'border-primary' : 'border-neutral-200 hover:border-neutral-300'}`}
    >
        {/* Timeline Dot */}
        <div className={`absolute left-[-9px] top-1 w-4 h-4 rounded-full border-2 bg-white transition-all ${isSelected ? 'border-primary scale-125' : 'border-neutral-300'}`}></div>
        
        <div className={`p-4 rounded-2xl transition-all ${isSelected ? 'bg-primary/5 shadow-sm' : 'hover:bg-neutral-50'}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-black text-[15px] tracking-tight ${isSelected ? 'text-primary' : 'text-neutral-900'}`}>{stop.name}</h4>
                        <div className="flex items-center gap-0.5 bg-amber-400/10 px-1.5 py-0.5 rounded text-[10px] font-black text-amber-600">
                            <Star className="w-2.5 h-2.5 fill-amber-500" />
                            {stop.rating}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {stop.topItems.map((item, i) => (
                            <span key={i} className="text-[10px] font-bold text-neutral-500">#{item}</span>
                        ))}
                    </div>
                </div>
                {stop.imageUrl && (
                  <img src={stop.imageUrl} alt={stop.name} className="w-16 h-16 rounded-xl object-cover flex-none bg-neutral-100" />
                )}
            </div>

            {isSelected && (
                <div className="mt-4 animate-fade-in-up">
                    <p className="text-xs text-neutral-500 font-medium leading-relaxed mb-4">{stop.description}</p>
                    <div className="flex gap-2">
                        <a href={stop.searchLinks.kakao} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="flex-1 flex items-center justify-center py-2 bg-[#FAE100] text-[#3C1E1E] text-[10px] font-black rounded-lg">카카오</a>
                        <a href={stop.searchLinks.naver} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="flex-1 flex items-center justify-center py-2 bg-[#03C75A] text-white text-[10px] font-black rounded-lg">네이버</a>
                        <a href={stop.searchLinks.google} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="flex-1 flex items-center justify-center py-2 bg-neutral-900 text-white text-[10px] font-black rounded-lg">구글</a>
                    </div>
                </div>
            )}
        </div>
    </div>
);

const Step2_Routes: React.FC<Step2Props> = ({ searchData, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [msgIndex, setMsgIndex] = useState(0);
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

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
        if (data.length > 0) setExpandedRouteId(data[0].routeId);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchRoutes();
  }, [searchData]);

  const activeRoute = routes.find(r => r.routeId === expandedRouteId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-neutral-50">
        <div className="relative mb-10">
            <div className="w-16 h-16 border-[4px] border-neutral-200 border-t-primary rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            </div>
        </div>
        <h3 className="text-lg font-black text-neutral-900 mb-2">{LOADING_MESSAGES[msgIndex]}</h3>
        <p className="text-xs text-neutral-400 font-bold max-w-xs text-center break-keep">
            최대 수십 개의 휴게소 정보를 하나씩 분석하고 있습니다.<br/>잠시만 기다려주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-full bg-neutral-50 overflow-hidden">
      {/* Sidebar - High Density List */}
      <div className="w-full md:w-[400px] flex flex-col h-[50%] md:h-full bg-white border-r border-black/[0.03] z-20 shadow-xl">
        <div className="flex-none p-4 bg-white border-b border-black/[0.03] flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-400">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">Navigation Path</p>
                <div className="flex items-center gap-1.5 text-sm font-black text-neutral-900 truncate">
                    <span>{searchData.start}</span>
                    <span className="text-primary text-[10px]">▶</span>
                    <span>{searchData.destination}</span>
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
            {routes.map((route) => {
                const isExpanded = expandedRouteId === route.routeId;
                return (
                    <div key={route.routeId} className={`mb-4 rounded-2xl transition-all ${isExpanded ? 'bg-white' : 'bg-neutral-50 hover:bg-neutral-100'}`}>
                        <div 
                            onClick={() => setExpandedRouteId(isExpanded ? null : route.routeId)}
                            className="p-4 cursor-pointer flex items-center justify-between"
                        >
                            <div className="flex-1">
                                <h3 className={`font-black text-base ${isExpanded ? 'text-primary' : 'text-neutral-900'}`}>{route.summary}</h3>
                                <div className="flex items-center gap-3 mt-1 text-[11px] font-bold text-neutral-500">
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.floor(route.durationMin / 60)}시간 {route.durationMin % 60}분</span>
                                    <span className="flex items-center gap-1"><Navigation className="w-3 h-3" /> {route.distanceKm}km</span>
                                </div>
                            </div>
                            {isExpanded ? <ChevronUp className="w-5 h-5 text-primary" /> : <ChevronDown className="w-5 h-5 text-neutral-300" />}
                        </div>

                        {isExpanded && (
                            <div className="px-5 pb-6 pt-2 animate-fade-in-up">
                                <div className="flex items-center gap-2 mb-8 p-3 bg-neutral-50 rounded-xl">
                                    <Info className="w-3.5 h-3.5 text-primary" />
                                    <p className="text-[11px] font-black text-neutral-600">이 경로에서 <span className="text-primary">{route.stops.length}개</span>의 장소를 발견했습니다.</p>
                                </div>
                                
                                <div className="relative">
                                    {route.stops.map(stop => (
                                        <RestAreaListItem 
                                            key={stop.stopId} 
                                            stop={stop} 
                                            isSelected={selectedStopId === stop.stopId}
                                            onClick={() => setSelectedStopId(stop.stopId)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
      </div>

      {/* Map Content */}
      <div className="flex-1 relative h-[50%] md:h-full">
        <MapVisualization 
          route={activeRoute} 
          stops={activeRoute?.stops}
          selectedStopId={selectedStopId}
          startPoint={searchData.startCoordinates}
          endPoint={searchData.destinationCoordinates}
        />
        
        {/* Floating Controls */}
        <div className="absolute top-4 left-4 z-10 hidden md:block">
            <div className="glass px-4 py-3 rounded-2xl shadow-xl border border-white/50">
                <p className="text-[10px] font-black text-primary uppercase tracking-tighter mb-0.5">Selected Route</p>
                <p className="text-sm font-black text-neutral-900">{activeRoute?.summary || '탐색 완료'}</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Step2_Routes;