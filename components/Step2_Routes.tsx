import React, { useState, useEffect } from 'react';
import { RouteOption, SearchState, Stop } from '../types';
import { Clock, Navigation, Sparkles, Star, ArrowLeft, MapPin, ChevronRight, Map, Info, ExternalLink } from 'lucide-react';
import { generateRoutes } from '../services/genai';

interface Step2Props {
  searchData: SearchState;
  onBack: () => void;
}

const LOADING_MESSAGES = [
  "구글 검색을 통해 실시간 고속도로 정보를 수집 중입니다",
  "경로상 모든 휴게소와 현재 인기 메뉴를 대조하고 있습니다",
  "실제 여행자들의 최신 리뷰와 평점을 분석 중입니다",
  "누락된 휴게소가 없는지 전수 조사를 진행하고 있습니다"
];

const StopRow: React.FC<{ stop: Stop; index: number }> = ({ stop, index }) => (
  <div className="group relative flex items-start gap-4 py-8 border-b border-black/[0.03] hover:bg-neutral-50/80 transition-all px-6 -mx-6 rounded-2xl">
    <div className="flex flex-col items-center flex-none w-10">
      <div className="w-8 h-8 rounded-full bg-white border-2 border-neutral-100 flex items-center justify-center text-[11px] font-black text-neutral-400 group-hover:border-primary group-hover:text-primary group-hover:scale-110 transition-all z-10 shadow-sm">
        {index + 1}
      </div>
      <div className="w-[1.5px] h-full bg-neutral-100 mt-2 group-last:hidden"></div>
    </div>

    <div className="flex-1 min-w-0 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-10">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <h4 className="font-black text-[18px] text-neutral-900 tracking-tight">{stop.name}</h4>
          <div className="flex items-center gap-0.5 bg-amber-400/10 px-2 py-0.5 rounded-lg text-[11px] font-black text-amber-600 border border-amber-400/20">
            <Star className="w-3 h-3 fill-amber-500" />
            {stop.rating}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-1.5 mb-3">
          {stop.topItems.map((item, i) => (
            <span key={i} className="text-[11px] font-bold text-primary bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
              {item}
            </span>
          ))}
        </div>
        <p className="text-[13.5px] text-neutral-500 font-medium leading-relaxed line-clamp-2">{stop.description}</p>
      </div>

      <div className="flex flex-row lg:flex-col gap-2 flex-none lg:min-w-[130px]">
        <a 
          href={stop.searchLinks.kakao} 
          target="_blank" 
          rel="noreferrer" 
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-[#FAE100] text-[#3C1E1E] text-[12px] font-black rounded-xl hover:brightness-95 transition-all shadow-sm active:scale-95"
        >
          카카오맵
        </a>
        <a 
          href={stop.searchLinks.naver} 
          target="_blank" 
          rel="noreferrer" 
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-[#03C75A] text-white text-[12px] font-black rounded-xl hover:brightness-95 transition-all shadow-sm active:scale-95"
        >
          네이버
        </a>
      </div>
    </div>
    
    <div className="hidden xl:block flex-none w-32 h-20 rounded-2xl overflow-hidden bg-neutral-100 ml-4 border border-black/[0.05] shadow-inner">
      <img src={stop.imageUrl} alt={stop.name} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
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
    if (loading) msgInterval = setInterval(() => setMsgIndex(prev => (prev + 1) % LOADING_MESSAGES.length), 3000);
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
  const formatName = (name: string) => name.split('(')[0].split(',')[0].trim();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-white animate-fade-in-up">
        <div className="relative mb-12">
          <div className="w-20 h-20 border-[5px] border-neutral-100 border-t-primary rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
          </div>
        </div>
        <h3 className="text-2xl font-black text-neutral-900 mb-3 tracking-tight">{LOADING_MESSAGES[msgIndex]}</h3>
        <p className="text-[15px] text-neutral-400 font-bold max-w-sm text-center break-keep leading-relaxed px-6">
          실시간 웹 검색을 결합하여<br/>"{formatName(searchData.start)} → {formatName(searchData.destination)}" 경로의 최신 시설 정보를 수집하고 있습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-neutral-50/30 overflow-hidden">
      <div className="flex-none bg-white border-b border-black/[0.03] shadow-sm z-20">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={onBack} className="p-2.5 bg-neutral-100 hover:bg-neutral-200 rounded-full transition-all text-neutral-500 active:scale-90">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-neutral-50 rounded-2xl border border-black/[0.03] shadow-inner">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10"></div>
                <span className="text-[13px] font-black text-neutral-800 max-w-[100px] md:max-w-[200px] truncate">{formatName(searchData.start)}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-300 mx-1" />
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-rose-500/10"></div>
                <span className="text-[13px] font-black text-neutral-800 max-w-[100px] md:max-w-[200px] truncate">{formatName(searchData.destination)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-3xl font-black text-neutral-900 tracking-tighter leading-[1.1] mb-2 drop-shadow-sm">
                {activeRoute?.summary || '탐색 완료'}
              </h2>
              <div className="flex items-center gap-2 text-neutral-400 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Google Search로 수집한 실시간 고속도로 정보입니다.</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 flex-none">
              <div className="px-5 py-3.5 bg-white rounded-2xl border border-neutral-100 shadow-soft flex flex-col min-w-[110px]">
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">예상 시간</span>
                <span className="text-xl font-black text-neutral-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  {activeRoute && `${Math.floor(activeRoute.durationMin / 60)}h ${activeRoute.durationMin % 60}m`}
                </span>
              </div>
              <div className="px-5 py-3.5 bg-white rounded-2xl border border-neutral-100 shadow-soft flex flex-col min-w-[110px]">
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">총 거리</span>
                <span className="text-xl font-black text-neutral-900 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-emerald-500" />
                  {activeRoute?.distanceKm}km
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 flex items-center gap-2 overflow-x-auto no-scrollbar pb-4 -mt-2">
          {routes.map((route) => (
            <button
              key={route.routeId}
              onClick={() => setActiveRouteId(route.routeId)}
              className={`px-6 py-3 text-[14px] font-black whitespace-nowrap rounded-2xl transition-all flex items-center gap-2 border ${
                activeRouteId === route.routeId 
                  ? 'bg-neutral-900 text-white border-neutral-900 shadow-lg shadow-neutral-900/20 translate-y-[-2px]' 
                  : 'bg-white text-neutral-400 border-neutral-100 hover:border-neutral-200 hover:text-neutral-600'
              }`}
            >
              {activeRouteId === route.routeId && <Sparkles className="w-3.5 h-3.5 text-primary" />}
              {route.summary.split('(')[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pt-8 pb-20">
        <div className="max-w-5xl mx-auto px-6">
          
          <div className="flex justify-center md:justify-start mb-10">
            <div className="inline-flex items-center gap-3 px-6 py-3.5 bg-primary/5 rounded-2xl border border-primary/10 shadow-sm animate-fade-in-up">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <p className="text-[14px] font-black text-neutral-800 tracking-tight">
                실시간 검색 결과 <span className="text-primary text-base px-0.5">{activeRoute?.stops.length}곳</span>의 시설을 발견했습니다.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-[40px] p-8 md:p-14 shadow-premium border border-black/[0.02] relative overflow-hidden transition-all">
            <div className="absolute top-0 left-[4.8rem] bottom-0 w-[2px] bg-neutral-100 hidden md:block"></div>
            
            <div className="flex items-center gap-4 mb-12 relative z-10 group">
              <div className="w-11 h-11 rounded-full bg-emerald-500 border-4 border-white shadow-xl flex items-center justify-center text-white ring-4 ring-emerald-500/5 group-hover:scale-110 transition-transform">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Departure</span>
                <span className="text-[17px] font-black text-neutral-900 tracking-tight">{searchData.start}</span>
              </div>
            </div>

            <div className="space-y-0 relative z-10">
              {activeRoute?.stops.map((stop, idx) => (
                <StopRow 
                  key={stop.stopId} 
                  stop={stop} 
                  index={idx}
                />
              ))}
            </div>

            <div className="flex items-center gap-4 mt-12 relative z-10 group">
              <div className="w-11 h-11 rounded-full bg-rose-500 border-4 border-white shadow-xl flex items-center justify-center text-white ring-4 ring-rose-500/5 group-hover:scale-110 transition-transform">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-0.5">Arrival</span>
                <span className="text-[17px] font-black text-neutral-900 tracking-tight">{searchData.destination}</span>
              </div>
            </div>
          </div>

          {/* Data Sources Section */}
          {activeRoute?.sources && activeRoute.sources.length > 0 && (
            <div className="mt-12 bg-white rounded-3xl p-8 border border-black/[0.03] shadow-soft">
              <div className="flex items-center gap-2 mb-6">
                <Info className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-black text-neutral-800 uppercase tracking-wider">데이터 출처 및 참고 문헌</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeRoute.sources.map((source, idx) => (
                  <a 
                    key={idx} 
                    href={source.uri} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors group"
                  >
                    <span className="text-[13px] font-bold text-neutral-600 truncate max-w-[80%]">{source.title}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-neutral-300 group-hover:text-primary transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-12 flex flex-col items-center gap-2">
            <div className="w-12 h-1 bg-neutral-200 rounded-full mb-2"></div>
            <p className="text-center text-[12px] font-bold text-neutral-300 max-w-sm break-keep leading-relaxed">
              본 정보는 구글 실시간 검색 결과를 바탕으로 생성되었습니다. 실제 도로 상황에 따라 차이가 있을 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step2_Routes;