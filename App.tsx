import React, { useState } from 'react';
import { AppStep, SearchState } from './types';
import Step1_Search from './components/Step1_Search';
import Step2_Routes from './components/Step2_Routes';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(1);
  const [searchData, setSearchData] = useState<SearchState>({ start: '', destination: '' });

  const handleSearch = (data: SearchState) => {
    setSearchData(data);
    setStep(2);
  };

  const isAIActive = !!process.env.API_KEY;

  return (
    <div className="w-full h-full bg-neutral-50 flex flex-col font-sans">
      <header className="flex-none h-16 glass border-b border-black/[0.03] flex items-center justify-between px-6 z-[100] sticky top-0">
        <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => setStep(1)}>
            <div className="w-9 h-9 bg-primary flex items-center justify-center text-white rounded-xl shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                <span className="font-black text-lg">뭐</span>
            </div>
            <div className="flex flex-col -space-y-1">
                <span className="font-black text-xl tracking-tight text-neutral-900">뭐 <span className="text-primary">무까?</span></span>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Highway Guide</span>
            </div>
        </div>
        
        <div className="flex items-center gap-4">
            <div className={`text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-2 border ${isAIActive ? 'bg-orange-50 border-orange-100 text-primary' : 'bg-neutral-100 border-neutral-200 text-neutral-400'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isAIActive ? 'bg-primary animate-pulse' : 'bg-neutral-300'}`}></div>
                {isAIActive ? 'AI Smart Search' : 'Demo Mode'}
            </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative">
        {step === 1 && (
          <Step1_Search onSearch={handleSearch} initialData={searchData} />
        )}
        {step === 2 && (
          <Step2_Routes 
            searchData={searchData}
            onBack={() => setStep(1)} 
          />
        )}
      </main>
    </div>
  );
};

export default App;