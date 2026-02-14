import { GoogleGenAI, Type } from "@google/genai";
import { RouteOption, StopType, GroundingSource } from "../types";

export const generateRoutes = async (start: string, destination: string, startCoords?: {lat: number, lng: number}, destCoords?: {lat: number, lng: number}): Promise<RouteOption[]> => {
  const apiKey = process.env.API_KEY;

  if (!apiKey || !start || !destination) {
    console.error("API Key가 없거나 검색 매개변수가 부족합니다.");
    return [];
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const locationContext = `출발지: "${start}", 목적지: "${destination}" (대한민국 고속도로 경로)`;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `${locationContext}
      
      [필수 작업: 실시간 데이터 전수 조사]
      1. Google Search Grounding을 사용하여 이 경로의 '실제' 고속도로 노선과 경로상에 존재하는 '모든' 공식 휴게소(고속도로 휴게소)를 찾으세요.
      2. 요약하지 마세요. 발견된 모든 휴게소를 리스트에 포함하세요 (장거리의 경우 10~20개 수준).
      3. 각 휴게소별로 가장 최신 리뷰에서 언급되는 '실제' 시그니처 메뉴(예: 안성휴게소 소떡소떡, 금강휴게소 도리뱅뱅이 등)를 정확히 기재하세요.
      4. 실제 거리(km)와 예상 소요 시간(분)을 계산하세요.
      5. 결과는 반드시 한국어로 작성하며, 아래 정의된 JSON 스키마를 엄격히 준수하세요.
      `,
      config: {
        tools: [{ googleSearch: {} }],
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
                    lng: { type: Type.NUMBER } 
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
                        lng: { type: Type.NUMBER } 
                      }
                    },
                    topItems: { type: Type.ARRAY, items: { type: Type.STRING } },
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

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || "웹 검색 결과",
        uri: chunk.web.uri
      }));

    let rawText = response.text || '[]';
    // 마크다운 코드 블록 제거 로직
    if (rawText.includes('```json')) {
      rawText = rawText.split('```json')[1].split('```')[0];
    } else if (rawText.includes('```')) {
      rawText = rawText.split('```')[1].split('```')[0];
    }
    
    const rawData = JSON.parse(rawText.trim());
    
    if (!Array.isArray(rawData)) return [];

    return rawData.map((route: any, i: number) => ({
      ...route,
      routeId: `route_${Date.now()}_${i}`,
      sources: sources,
      stops: (route.stops || []).map((stop: any, j: number) => ({
        ...stop,
        stopId: `stop_${Date.now()}_${i}_${j}`,
        imageUrl: `https://picsum.photos/400/300?restarea&sig=${i}${j}${Date.now()}`,
        searchLinks: {
          naver: `https://map.naver.com/v5/search/${encodeURIComponent(stop.name)}`,
          google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.name)}`,
          kakao: `https://map.kakao.com/link/search/${encodeURIComponent(stop.name)}`
        }
      }))
    })) as RouteOption[];

  } catch (error) {
    console.error("Gemini API 호출 중 오류 발생:", error);
    return []; // 에러 시 빈 배열 반환하여 데모 데이터 노출 방지
  }
};