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
    let locationContext = `Plan 2 distinct driving routes from "${start}" to "${destination}" in South Korea.`;
    
    if (startCoords && destCoords) {
        locationContext += ` Coordinates - Start:(${startCoords.lat}, ${startCoords.lng}), Dest:(${destCoords.lat}, ${destCoords.lng})`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `${locationContext}
      
      [CRITICAL TASK: EXHAUSTIVE HIGHWAY TRAVERSAL]
      1. **DATABASE COMPLETENESS:** You must act as a precise highway database. Identify the expressways used (e.g., Gyeongbu Expressway Line 1).
      2. **ZERO OMISSION:** List EVERY single official rest area (휴게소) along the route in correct order. If there are 30 rest areas, list all 30. Never use "etc", "and others", or summarize.
      3. **IC DINING:** Include top-rated local restaurants within 2km of major IC exits if there are gaps between rest areas.
      4. **LANGUAGE:** All 'name', 'topItems', 'description', and 'summary' MUST be in Korean.
      5. **DATA RICHNESS:** For every stop, provide accurate signature dishes and a 4.0-5.0 rating based on common reputation.
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