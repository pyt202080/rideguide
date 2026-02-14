import { GoogleGenAI, Type } from "@google/genai";
import { RouteOption, StopType, GroundingSource } from "../types";
import { MOCK_ROUTES } from "../constants";

export const generateRoutes = async (start: string, destination: string, startCoords?: {lat: number, lng: number}, destCoords?: {lat: number, lng: number}): Promise<RouteOption[]> => {
  const hasKey = !!process.env.API_KEY;

  if (!hasKey || !start || !destination) {
    if (destination.includes('안동')) {
      return new Promise(resolve => setTimeout(() => resolve(MOCK_ROUTES), 800));
    } else {
      const reversed = [...MOCK_ROUTES].reverse();
      return new Promise(resolve => setTimeout(() => resolve(reversed), 800));
    }
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const locationContext = `Route: "${start}" to "${destination}" in South Korea.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // 복잡한 데이터 구성을 위해 Pro 모델 사용
      contents: `${locationContext}
      
      [TASK: REAL-WORLD DATA RETRIEVAL]
      1. Use Google Search Grounding to find the ACTUAL expressways and ALL official rest areas (고속도로 휴게소) on this route.
      2. Identify REAL signature dishes for each rest area (e.g., Anseong: Sotteok, Deokpyeong: Beef Soup).
      3. Verify the actual distance (km) and estimated driving time (min).
      4. Do NOT use fake or sample data. If you find real data, use it.
      5. Return EXACTLY 2 distinct route options in valid JSON format.
      6. All text should be in Korean.
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
                  properties: { lat: { type: Type.NUMBER }, lng: { type: Type.NUMBER } }
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
                      properties: { lat: { type: Type.NUMBER }, lng: { type: Type.NUMBER } }
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

    // Extract Grounding Sources
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || "웹 검색 결과",
        uri: chunk.web.uri
      }));

    // Robust JSON Parsing
    let rawText = response.text || '[]';
    // Remove markdown code blocks if present
    if (rawText.includes('```json')) {
      rawText = rawText.split('```json')[1].split('```')[0];
    } else if (rawText.includes('```')) {
      rawText = rawText.split('```')[1].split('```')[0];
    }
    
    const rawData = JSON.parse(rawText.trim());
    
    return rawData.map((route: any, i: number) => ({
      ...route,
      routeId: `real_route_${i}_${Date.now()}`,
      sources: sources,
      stops: (route.stops || []).map((stop: any, j: number) => ({
        ...stop,
        stopId: `real_stop_${i}_${j}`,
        imageUrl: `https://picsum.photos/400/300?restarea&sig=${i}${j}`,
        searchLinks: {
          naver: `https://map.naver.com/v5/search/${encodeURIComponent(stop.name)}`,
          google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.name)}`,
          kakao: `https://map.kakao.com/link/search/${encodeURIComponent(stop.name)}`
        }
      }))
    })) as RouteOption[];

  } catch (error) {
    console.error("Gemini API Error:", error);
    // Return mock data only on actual failure
    return MOCK_ROUTES;
  }
};