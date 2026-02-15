import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Map as MapIcon, Crosshair, ArrowLeft, ArrowUpDown } from 'lucide-react';
import { SearchState, Coordinates, PlaceResult } from '../types';
import { searchAddress, reverseGeocode } from '../services/mapService';
import MapVisualization from './MapVisualization';

interface Step1Props {
  onSearch: (data: SearchState) => void;
  initialData: SearchState;
}

const AutocompleteInput: React.FC<{
  value: string;
  onChange: (val: string, coords?: Coordinates) => void;
  placeholder: string;
  icon: React.ElementType;
  iconColorClass?: string;
  label: string;
  onMapSelectToggle: () => void;
  isMapSelectMode: boolean;
}> = ({ value, onChange, placeholder, icon: Icon, iconColorClass = "text-neutral-400", label, onMapSelectToggle, isMapSelectMode }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length > 1) {
      setLoading(true);
      debounceRef.current = setTimeout(async () => {
        const results = await searchAddress(val);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setLoading(false);
      }, 500);
    } else {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="flex justify-between items-end mb-1.5 px-1">
          <label className="text-[11px] font-black text-neutral-400 uppercase tracking-wider">{label}</label>
          <button type="button" onClick={onMapSelectToggle} className="text-[11px] font-bold text-primary hover:underline transition-all">지도에서 선택</button>
      </div>
      <div className="relative group">
        <Icon className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${iconColorClass} transition-colors group-focus-within:text-primary z-10`} />
        <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={handleInputChange}
            disabled={isMapSelectMode}
            className="w-full pl-11 pr-10 py-3.5 bg-neutral-100/50 border border-transparent focus:border-primary/30 focus:bg-white rounded-2xl outline-none text-[15px] font-medium transition-all shadow-inner"
        />
        {loading && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>}
        
        {showSuggestions && (
            <div className="absolute left-0 right-0 top-full mt-2 glass rounded-2xl shadow-premium border border-black/[0.03] overflow-hidden z-[100] max-h-60 overflow-y-auto animate-fade-in-up">
                {suggestions.map((place, idx) => (
                    <div key={idx} onClick={() => { onChange(place.display_name.split(',')[0], { lat: parseFloat(place.lat), lng: parseFloat(place.lon) }); setShowSuggestions(false); }} className="px-5 py-3.5 hover:bg-primary/5 cursor-pointer flex items-start gap-3 border-b border-black/[0.02] last:border-0 transition-colors">
                        <MapIcon className="w-4 h-4 text-neutral-300 mt-1" />
                        <div className="flex flex-col">
                            <span className="font-bold text-neutral-800 text-sm">{place.display_name.split(',')[0]}</span>
                            <span className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1">{place.display_name}</span>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

const Step1_Search: React.FC<Step1Props> = ({ onSearch, initialData }) => {
  const [start, setStart] = useState(initialData.start);
  const [destination, setDestination] = useState(initialData.destination);
  const [startCoords, setStartCoords] = useState<Coordinates | undefined>(initialData.startCoordinates);
  const [destCoords, setDestCoords] = useState<Coordinates | undefined>(initialData.destinationCoordinates);
  const [mapSelectionMode, setMapSelectionMode] = useState<'start' | 'destination' | null>(null);

  const swapPlaces = () => {
    setStart(destination);
    setDestination(start);
    setStartCoords(destCoords);
    setDestCoords(startCoords);
  };

  const isReady = start.trim() && destination.trim();

  return (
    <div className="flex flex-col h-full w-full bg-neutral-50 relative">
      {/* Step 1 Header */}
      <header className="flex-none h-16 glass border-b border-black/[0.03] flex items-center justify-between px-6 z-[100]">
        <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-primary flex items-center justify-center text-white rounded-xl shadow-lg shadow-primary/20">
                <span className="font-black text-lg">뭐</span>
            </div>
            <div className="flex flex-col -space-y-1">
                <span className="font-black text-xl tracking-tight text-neutral-900">뭐 <span className="text-primary">무까?</span></span>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Highway Guide</span>
            </div>
        </div>
      </header>

      {/* Search Overlay Panel */}
      <div className={`absolute top-24 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] md:w-[420px] md:left-10 md:translate-x-0 glass rounded-[32px] p-6 md:p-8 z-30 shadow-premium border border-white/50 transition-all duration-500 ${mapSelectionMode ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
          <div className="mb-8">
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight leading-tight mb-2">어디로 가시나요?</h1>
            <p className="text-sm text-neutral-500 font-medium">실시간 경로와 휴게소 맛집을 찾아드릴게요.</p>
          </div>
          
          <div className="relative space-y-4">
              <AutocompleteInput 
                label="출발" value={start} placeholder="어디서 출발할까요?" icon={MapPin} iconColorClass="text-emerald-500"
                onChange={(v, c) => {setStart(v); if(c) setStartCoords(c);}}
                onMapSelectToggle={() => setMapSelectionMode('start')}
                isMapSelectMode={!!mapSelectionMode}
              />
              
              <div className="relative h-2 flex justify-center items-center">
                <button onClick={swapPlaces} className="absolute z-10 p-2 bg-white border border-neutral-100 rounded-full shadow-soft hover:shadow-md hover:scale-110 transition-all text-neutral-400 hover:text-primary">
                    <ArrowUpDown className="w-4 h-4" />
                </button>
                <div className="w-[1px] h-8 bg-neutral-200"></div>
              </div>

              <AutocompleteInput 
                label="도착" value={destination} placeholder="어디로 갈까요?" icon={MapPin} iconColorClass="text-rose-500"
                onChange={(v, c) => {setDestination(v); if(c) setDestCoords(c);}}
                onMapSelectToggle={() => setMapSelectionMode('destination')}
                isMapSelectMode={!!mapSelectionMode}
              />

              <button 
                onClick={() => isReady && onSearch({ start, destination, startCoordinates: startCoords, destinationCoordinates: destCoords })}
                disabled={!isReady}
                className={`w-full mt-6 py-4 rounded-2xl font-black text-lg shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${isReady ? 'bg-primary text-white shadow-primary/30 hover:bg-primary-dark hover:-translate-y-0.5' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'}`}
              >
                <Search className="w-5 h-5" />
                맛집 경로 탐색하기
              </button>
          </div>
      </div>

      {/* Map Content */}
      <div className="flex-1 relative z-10">
        <MapVisualization 
          startPoint={startCoords} 
          endPoint={destCoords} 
          onMapClick={async (coords) => {
            if (!mapSelectionMode) return;
            const addr = await reverseGeocode(coords);
            if (mapSelectionMode === 'start') { setStart(addr); setStartCoords(coords); }
            else { setDestination(addr); setDestCoords(coords); }
            setMapSelectionMode(null);
          }} 
          selectionMode={mapSelectionMode} 
        />
        
        {mapSelectionMode && (
            <div className="absolute top-10 left-1/2 -translate-x-1/2 glass px-8 py-4 rounded-full shadow-premium border border-primary/20 flex items-center gap-3 z-50 animate-bounce">
                <MapPin className={`w-5 h-5 ${mapSelectionMode === 'start' ? 'text-emerald-500' : 'text-rose-500'}`} />
                <span className="font-black text-neutral-900">{mapSelectionMode === 'start' ? '출발지' : '목적지'} 위치를 선택해주세요</span>
            </div>
        )}
      </div>
    </div>
  );
};

export default Step1_Search;
