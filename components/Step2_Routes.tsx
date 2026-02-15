import React, { useState, useEffect } from 'react';
import { RouteOption, SearchState, Stop } from '../types';
import { Clock, Navigation, Sparkles, Star, ArrowLeft, MapPin, ChevronRight, Info, ExternalLink, AlertCircle, RefreshCcw } from 'lucide-react';
import { generateRoutes } from '../services/genai';

interface Step2Props {
  searchData: SearchState;
  onBack: () => void;
}

const LOADING_MESSAGES = [
  "카카오 길찾기 API로 경로를 계산하고 있습니다",
  "경로 주변 휴게소를 카카오 로컬 검색으로 수집 중입니다",
  "이동 거리와 예상 소요 시간을 정리하고 있습니다",
  "경로 데이터를 화면에 맞게 최적화하고 있습니다"
];
const STOPS_PAGE_SIZE = 10;

const StopRow: React.FC<{ stop: Stop; index: number }> = ({ stop, index }) => (
  <div className="group relative flex items-start gap-4 py-7 border-b border-black/[0.03] hover:bg-neutral-50/80 transition-all px-6 -mx-6 rounded-2xl">
    <div className="flex flex-col items-center flex-none w-10">
      <div className="w-8 h-8 rounded-full bg-white border-2 border-neutral-100 flex items-center justify-center text-[11px] font-black text-neutral-400 group-hover:border-primary group-hover:text-primary group-hover:scale-110 transition-all z-10 shadow-sm">
        {index + 1}
      </div>
      <div className="w-[1.5px] h-full bg-neutral-100 mt-2 group-last:hidden"></div>
    </div>

    <div className="flex-1 min-w-0 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
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
            <span key={i} className="inline-flex items-center text-[11px] font-bold px-3 py-1 rounded-full border text-neutral-700 bg-neutral-100 border-neutral-200">
              {item}
            </span>
          ))}
        </div>
        <p className="text-[13.5px] text-neutral-500 font-medium leading-relaxed line-clamp-2">{stop.description}</p>
      </div>

      <div className="flex flex-row lg:flex-col gap-2 flex-none lg:min-w-[120px]">
        <a 
          href={stop.searchLinks.kakao} 
          target="_blank" 
          rel="noreferrer" 
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#FAE100] text-[#3C1E1E] text-[12px] font-black rounded-xl hover:brightness-95 transition-all active:scale-95"
        >
          카카오맵
        </a>
        <a 
          href={stop.searchLinks.naver} 
          target="_blank" 
          rel="noreferrer" 
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#03C75A] text-white text-[12px] font-black rounded-xl hover:brightness-95 transition-all active:scale-95"
        >
          네이버
        </a>
      </div>
    </div>
  </div>
);

const Step2_Routes: React.FC<Step2Props> = ({ searchData, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [msgIndex, setMsgIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [visibleStopsCount, setVisibleStopsCount] = useState(STOPS_PAGE_SIZE);

  useEffect(() => {
    let msgInterval: ReturnType<typeof setInterval>;
    if (loading) msgInterval = setInterval(() => setMsgIndex(prev => (prev + 1) % LOADING_MESSAGES.length), 3000);
    return () => clearInterval(msgInterval);
  }, [loading]);

  const fetchRoutes = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await generateRoutes(searchData.start, searchData.destination, searchData.startCoordinates, searchData.destinationCoordinates);
      setRoutes(data);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "경로를 불러오는 중 오류가 발생했습니다.";
      setErrorMessage(msg);
      setRoutes([]);
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, [searchData]);

  useEffect(() => {
    setVisibleStopsCount(STOPS_PAGE_SIZE);
  }, [routes]);

  const activeRoute = routes[0];
  const displayedStops = (activeRoute?.stops || []).slice(0, visibleStopsCount);
  const hasMoreStops = (activeRoute?.stops.length || 0) > visibleStopsCount;
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
          카카오 지도 데이터를 기반으로<br/>"{formatName(searchData.start)} → {formatName(searchData.destination)}" 경로를 계산하고 있습니다.
        </p>
      </div>
    );
  }

  if (routes.length === 0) {
    const isApiError = Boolean(errorMessage);
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-neutral-50 animate-fade-in-up">
        <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className={`w-10 h-10 ${isApiError ? 'text-amber-500' : 'text-neutral-400'}`} />
        </div>
        <h3 className="text-xl font-black text-neutral-900 mb-2 tracking-tight">검색 결과를 찾지 못했습니다</h3>
        <p className="text-sm text-neutral-500 font-medium mb-8 text-center break-keep max-w-xs">
          {isApiError
            ? `오류: ${errorMessage}`
            : "현재 조건에서 검색 가능한 경로 데이터가 없습니다. 입력지를 다시 확인해 주세요."}
        </p>
        {isApiError && (
          <p className="text-[12px] text-neutral-400 text-center mb-8 max-w-xs leading-relaxed">
            점검 필요: `KAKAO_REST_API_KEY` 설정, 서버 라우트(`/api/generate-routes`) 배포 상태, Vercel Function 로그를 확인해 주세요.
          </p>
        )}
        <div className="flex gap-3">
          <button onClick={onBack} className="px-6 py-3 bg-white border border-neutral-200 rounded-2xl font-black text-sm text-neutral-600 hover:bg-neutral-100 transition-all">
            이전으로
          </button>
          <button onClick={fetchRoutes} className="px-6 py-3 bg-primary text-white rounded-2xl font-black text-sm shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all flex items-center gap-2">
            <RefreshCcw className="w-4 h-4" /> 다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-neutral-50/30 overflow-y-auto">
      {/* 1. 최상단 브랜드 헤더 (스크롤 시 사라짐) */}
      <header className="flex-none h-14 bg-white border-b border-black/[0.03] flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
            <div className="w-7 h-7 bg-primary flex items-center justify-center text-white rounded-lg shadow-md">
                <span className="font-black text-sm">뭐</span>
            </div>
            <span className="font-black text-base tracking-tight text-neutral-900 underline decoration-primary/30 underline-offset-4 decoration-2">뭐 <span className="text-primary">무까?</span></span>
        </div>
      </header>

      {/* 2. 경로 정보 섹션 (스크롤 시 사라짐) */}
      <div className="flex-none bg-white">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={onBack} className="p-2 bg-neutral-100 hover:bg-neutral-200 rounded-full transition-all text-neutral-500 active:scale-90 flex-none">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-50 rounded-xl border border-black/[0.03] shadow-inner overflow-hidden flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-2 h-2 rounded-full bg-emerald-500 flex-none"></div>
                <span className="text-[12px] font-black text-neutral-800 truncate">{formatName(searchData.start)}</span>
              </div>
              <ChevronRight className="w-3 h-3 text-neutral-300 mx-0.5 flex-none" />
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-2 h-2 rounded-full bg-rose-500 flex-none"></div>
                <span className="text-[12px] font-black text-neutral-800 truncate">{formatName(searchData.destination)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-2xl font-black text-neutral-900 tracking-tighter leading-tight mb-1">
                {activeRoute?.summary || '탐색 완료'}
              </h2>
              <div className="flex items-center gap-1.5 text-neutral-400 font-bold text-[12px]">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>카카오 지도 경로 계산 완료</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-none">
              <div className="px-4 py-2 bg-neutral-50 rounded-xl border border-neutral-100 flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">Time</span>
                  <span className="text-[15px] font-black text-neutral-900 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    {activeRoute && `${Math.floor(activeRoute.durationMin / 60)}h ${activeRoute.durationMin % 60}m`}
                  </span>
                </div>
                <div className="w-[1px] h-6 bg-neutral-200"></div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">Dist</span>
                  <span className="text-[15px] font-black text-neutral-900 flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-emerald-500" />
                    {activeRoute?.distanceKm}km
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 본문 목록 */}
      <div className="flex-none pt-6 pb-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex justify-center md:justify-start mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-xl border border-primary/10 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <p className="text-[12px] font-black text-neutral-800 tracking-tight">
                경로상 <span className="text-primary text-[14px]">{activeRoute?.stops.length}곳</span>의 휴게소를 찾았습니다.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-[32px] p-6 md:p-10 shadow-premium border border-black/[0.02] relative overflow-hidden transition-all">
            <div className="absolute top-0 left-[3.8rem] bottom-0 w-[1.5px] bg-neutral-100 hidden md:block"></div>
            
            <div className="flex items-center gap-3 mb-10 relative z-10">
              <div className="w-9 h-9 rounded-full bg-emerald-500 border-4 border-white shadow-lg flex items-center justify-center text-white flex-none">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Start</span>
                <span className="text-[15px] font-black text-neutral-900 truncate max-w-[200px]">{searchData.start}</span>
              </div>
            </div>

            <div className="space-y-0 relative z-10">
              {displayedStops.map((stop, idx) => (
                <StopRow 
                  key={stop.stopId} 
                  stop={stop} 
                  index={idx}
                />
              ))}
            </div>

            {hasMoreStops && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setVisibleStopsCount(prev => prev + STOPS_PAGE_SIZE)}
                  className="px-5 py-3 rounded-xl bg-white border border-neutral-200 text-[13px] font-black text-neutral-700 hover:bg-neutral-50 transition-all"
                >
                  휴게소 10개 더보기
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 mt-10 relative z-10">
              <div className="w-9 h-9 rounded-full bg-rose-500 border-4 border-white shadow-lg flex items-center justify-center text-white flex-none">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">End</span>
                <span className="text-[15px] font-black text-neutral-900 truncate max-w-[200px]">{searchData.destination}</span>
              </div>
            </div>
          </div>

          {/* Data Sources Section */}
          {activeRoute?.sources && activeRoute.sources.length > 0 && (
            <div className="mt-8 bg-white rounded-2xl p-6 border border-black/[0.03] shadow-soft">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-3.5 h-3.5 text-primary" />
                <h3 className="text-[11px] font-black text-neutral-800 uppercase tracking-wider">검색 데이터 출처</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {activeRoute.sources.map((source, idx) => (
                  <a 
                    key={idx} 
                    href={source.uri} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors group"
                  >
                    <span className="text-[12px] font-bold text-neutral-500 truncate max-w-[85%]">{source.title}</span>
                    <ExternalLink className="w-3 h-3 text-neutral-300 group-hover:text-primary" />
                  </a>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-10 flex flex-col items-center gap-1.5 opacity-50">
            <div className="w-10 h-1 bg-neutral-200 rounded-full mb-1"></div>
            <p className="text-center text-[11px] font-bold text-neutral-400 max-w-sm break-keep leading-relaxed">
              본 정보는 카카오 지도/로컬 API 기반으로 생성되었습니다. 실제 상황은 차이가 있을 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step2_Routes;
