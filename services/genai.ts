import { GoogleGenAI, Type } from "@google/genai";
import { RouteOption, StopType } from "../types";
import { MOCK_ROUTES } from "../constants";

export const generateRoutes = async (start: string, destination: string, startCoords?: {lat: number, lng: number}, destCoords?: {lat: number, lng: number}): Promise<RouteOption[]> => {
  const hasKey = !!process.env.API_KEY;

  if (!hasKey || !start || !destination) {
    return new Promise(resolve => setTimeout(() => resolve(MOCK_ROUTES), 800));
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    let locationContext = `Plan 2-3 distinct driving routes from "${start}" to "${destination}" in South Korea.`;
    
    if (startCoords && destCoords) {
        locationContext += ` Start:(${startCoords.lat}, ${startCoords.lng}), Dest:(${destCoords.lat}, ${destCoords.lng})`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `${locationContext}
      
      CRITICAL INSTRUCTION (KOREAN):
      1. **전수 조사(Exhaustive List) 수행:** 해당 경로상에 존재하는 **모든 정식 고속도로 휴게소와 간이 휴게소**를 단 하나도 빠짐없이 주행 순서대로 나열하세요. 
      2. **생략 금지:** AI는 장거리 노선(예: 인천-안동)에서 흔히 5~6개만 보여주고 요약하려 하지만, 이는 잘못된 응답입니다. 200km 이상의 경로는 보통 12~20개의 휴게소가 존재합니다. **절대로 요약하지 말고 모든 목록을 다 출력하세요.**
      3. **노선별 체크:** 영동고속도로, 중부내륙고속도로 등 각 고속도로 구간에 속한 모든 휴게소(예: 시흥하늘, 의왕청계, 용인, 덕평, 여주, 문막, 충주, 괴산, 문경, 선산, 상주, 의성 등)를 실제 지도 기반으로 전수 추출하세요.
      4. 여러 경로가 특정 고속도로 구간을 공유한다면, 해당 구간의 휴게소 목록은 모든 경로 리스트에 동일하게 중복 포함되어야 합니다.
      5. 각 휴게소별로 가장 유명한 메뉴 2개와 특징을 'break-keep' 스타일(단어 중심)로 상세히 작성하세요.
      `,
      config: {
        responseMimeType: "application/json",
        // thinkingBudget을 설정하지 않거나 조절하여 모델이 데이터를 더 잘 회상하도록 유도
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              routeId: { type: Type.STRING },
              summary: { type: Type.STRING },
              distanceKm: { type: Type.NUMBER },
              durationMin: { type: Type.NUMBER },
              toll: { type: Type.BOOLEAN },
              path: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    lat: { type: Type.NUMBER },
                    lng: { type: Type.NUMBER },
                  }
                }
              },
              stops: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    stopId: { type: Type.STRING },
                    type: { type: Type.STRING, enum: [StopType.HIGHWAY_REST_AREA] },
                    name: { type: Type.STRING },
                    location: {
                      type: Type.OBJECT,
                      properties: {
                        lat: { type: Type.NUMBER },
                        lng: { type: Type.NUMBER },
                      }
                    },
                    topItems: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    description: { type: Type.STRING },
                    rating: { type: Type.NUMBER }
                  }
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    const routes = JSON.parse(text || '[]') as any[];
    
    return routes.map((route, i) => ({
      ...route,
      routeId: `gen_route_${i}_${Date.now()}`,
      stops: route.stops.map((stop: any, j: number) => ({
        ...stop,
        stopId: `gen_stop_${i}_${j}`,
        imageUrl: `https://picsum.photos/400/300?random=${Math.floor(Math.random() * 1000) + j}`,
        searchLinks: {
          naver: `https://map.naver.com/v5/search/${encodeURIComponent(stop.name)}`,
          google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.name)}`,
          kakao: `https://map.kakao.com/link/search/${encodeURIComponent(stop.name)}`
        }
      }))
    })) as RouteOption[];

  } catch (error) {
    console.error("Gemini API Error:", error);
    return MOCK_ROUTES;
  }
};