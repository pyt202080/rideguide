import { GoogleGenAI, Type } from "@google/genai";
import { RouteOption, StopType } from "../types";
import { MOCK_ROUTES } from "../constants";

export const generateRoutes = async (start: string, destination: string, startCoords?: {lat: number, lng: number}, destCoords?: {lat: number, lng: number}): Promise<RouteOption[]> => {
  const hasKey = !!process.env.API_KEY;

  // API 키가 없으면 어쩔 수 없이 MOCK 데이터를 반환하지만, 
  // API 키가 있다면 반드시 사용자 입력(start, destination)을 기반으로 생성합니다.
  if (!hasKey || !start || !destination) {
    return new Promise(resolve => setTimeout(() => resolve(MOCK_ROUTES), 800));
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const locationContext = `Plan driving routes from "${start}" to "${destination}" in South Korea. 
    Coordinates Context: Start(${startCoords?.lat}, ${startCoords?.lng}) to Destination(${destCoords?.lat}, ${destCoords?.lng}).`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `${locationContext}
      
      [CRITICAL DIRECTIVE: ACTUAL ROUTE GENERATION]
      1. **NO DEFAULTS:** Do not default to Busan unless the user searched for Busan. Generate a path specifically for "${start}" to "${destination}".
      2. **EXHAUSTIVE LIST:** Identify EVERY single official expressway rest area (휴게소) on this specific path. If there are 15-30 rest areas, list them all.
      3. **SEQUENCE:** Arrange stops in strict driving order from start to destination.
      4. **PATH ACCURACY:** Provide a realistic 'path' array of coordinates that connects "${start}" to "${destination}".
      5. **IC DINING:** If there are long stretches without rest areas, include famous local restaurants within 2km of major IC exits.
      6. **KOREAN ONLY:** All 'name', 'topItems', 'description', and 'summary' MUST be in Korean.
      7. **STOPS DATA:** For each stop: Give 2-3 signature dishes (topItems), a concise description, and a 4.0-5.0 rating.
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