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
      1. **전수 조사(Exhaustive List) 수행:** 해당 경로상에 존재하는 **모든 정식 고속도로 휴게소**를 주행 순서대로 나열하세요.
      2. **IC 인근 맛집 포함:** 고속도로 휴게소뿐만 아니라, 주요 IC(나들목)에서 5~10분 내로 접근 가능한 **유명 지역 맛집(local_restaurant)**도 경로 중간중간에 포함시키세요.
      3. **생략 금지:** 장거리 노선에서 리스트를 요약하지 마세요. 200km 이상의 경로는 휴게소와 IC 맛집을 합쳐 보통 15~25개의 지점이 존재해야 합니다.
      4. **상세 정보:** 각 지점별로 가장 유명한 메뉴 2개와 특징을 'break-keep' 스타일로 작성하세요.
      `,
      config: {
        responseMimeType: "application/json",
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
                    type: { type: Type.STRING, enum: [StopType.HIGHWAY_REST_AREA, StopType.LOCAL_RESTAURANT] },
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