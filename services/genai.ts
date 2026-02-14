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
    Start Coords: (${startCoords?.lat}, ${startCoords?.lng}), Dest Coords: (${destCoords?.lat}, ${destCoords?.lng})`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `${locationContext}
      
      [CRITICAL DIRECTIVE: ABSOLUTE EXHAUSTIVE DATA RETRIEVAL - DO NOT SUMMARIZE]
      
      1. **YOUR ROLE:** You are a RAW DATA EXTRACTOR for South Korean Expressway infrastructure. 
      2. **ZERO-OMISSION POLICY:** Your primary mission is to identify and list EVERY SINGLE official expressway rest area (휴게소) that physically exists on the route. 
      3. **SUMMARIZATION IS FORBIDDEN:** Do not filter by popularity. Do not pick "top results". If the road has 25 rest areas, you MUST provide data for all 25. Omitting even one rest area to be "concise" is a failure of this task.
      4. **FULL INVENTORY:** Include all official 'Rest Areas' (휴게소) and 'Sleepy-driver Shelters' (졸음쉼터) that have food stalls or convenience stores.
      5. **STRICT SEQUENTIALITY:** List them in the exact order they appear along the driving direction.
      6. **IC GEMS:** Additionally, include 3-5 famous restaurants located within 2km of major Interchange (IC) exits along the path.
      7. **KOREAN DATA ONLY:** Ensure all 'name', 'topItems', 'description', and 'summary' fields are in Korean.
      8. **STOPS DATA FORMAT:** For each entry: 2-3 signature dishes (topItems), a factual 1-sentence description, and a realistic rating (4.0-5.0).
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