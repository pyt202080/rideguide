import React from 'react';
import { StopType } from '../types';
import { Coffee, Utensils, ArrowLeft } from 'lucide-react';

interface Step3Props {
  onSelectType: (type: StopType) => void;
  onBack: () => void;
}

const Step3_Type: React.FC<Step3Props> = ({ onSelectType, onBack }) => {
  return (
    <div className="flex flex-col h-full bg-gray-50">
        <div className="p-6">
            <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-800 mb-4 flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" /> 경로 선택으로 돌아가기
            </button>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">어떤 곳을 원하시나요?</h2>
            <p className="text-gray-500">이동 중에 들르고 싶은 장소의 유형을 선택해주세요.</p>
        </div>

        <div className="flex-1 p-6 grid grid-rows-2 gap-6 pb-12">
            <button
                onClick={() => onSelectType(StopType.HIGHWAY_REST_AREA)}
                className="relative group bg-white rounded-3xl shadow-md hover:shadow-2xl border-2 border-transparent hover:border-blue-500 transition-all p-8 flex flex-col justify-center items-center text-center overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10 bg-blue-100 p-5 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Coffee className="w-12 h-12 text-blue-600" />
                </div>
                <h3 className="relative z-10 text-2xl font-bold text-gray-800 mb-2">고속도로 휴게소</h3>
                <p className="relative z-10 text-gray-500 px-4 break-keep">
                    소떡소떡, 우동 등 대표 간식과 빠른 식사. 고속도로 위에서 해결하세요.
                </p>
            </button>

            <button
                onClick={() => onSelectType(StopType.LOCAL_RESTAURANT)}
                className="relative group bg-white rounded-3xl shadow-md hover:shadow-2xl border-2 border-transparent hover:border-primary transition-all p-8 flex flex-col justify-center items-center text-center overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10 bg-orange-100 p-5 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Utensils className="w-12 h-12 text-primary" />
                </div>
                <h3 className="relative z-10 text-2xl font-bold text-gray-800 mb-2">IC 근처 찐맛집</h3>
                <p className="relative z-10 text-gray-500 px-4 break-keep">
                    잠시 고속도로를 빠져나가(IC 인근), 지역 특산물과 진짜 맛집을 경험하세요.
                </p>
            </button>
        </div>
    </div>
  );
};

export default Step3_Type;
