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
    const locationContext = `Plan driving routes from "${start}" to "${destination}" in South Korea. 
    Start: (${startCoords?.lat}, ${startCoords?.lng}), Dest: (${destCoords?.lat}, ${destCoords?.lng})`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `${locationContext}
      
      [CRITICAL: RAW INFRASTRUCTURE DATABASE MODE]
      1. **OBJECTIVE:** Provide a 100% complete, non-summarized inventory of all highway service areas.
      2. **STRICT ZERO-SUMMARY POLICY:** Do not "recommend" or "curate". You are forbidden from choosing only popular stops. 
      3. **ENUMERATE EVERYTHING:** If there are 15 service areas along the route, you MUST return all 15. Omitting a single official rest area (휴게소) is a violation of this instruction. 
      4. **PATH:** Use main South Korean Expressways (Gyeongbu, Jungbu-Naeryuk, Yeongdong, etc.) that connect the points.
      5. **DATA DEPTH:** Include small-scale rest areas and 간이휴게소 as well.
      6. **IC DINING:** Add 2-3 extra local famous restaurants near major IC exits.
      7. **LANGUAGE:** Korean for 'name', 'topItems', 'description', 'summary'.
      8. **ORDER:** Perfect chronological order as encountered while driving.
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

    const routes = JSON.parse(response.text || '[]') as any[];
    
    return routes.map((route, i) => ({
      ...route,
      routeId: `gen_route_${i}_${Date.now()}`,
      stops: (route.stops || []).map((stop: any, j: number) => ({
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