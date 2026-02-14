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

  return (
    <div className="w-full h-full bg-neutral-50 flex flex-col font-sans">
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