import { GoogleGenAI, Type } from "@google/genai";
import { StopType, GroundingSource, RouteOption } from "../types";

interface GenerateRoutesRequest {
  start?: string;
  destination?: string;
  startCoords?: { lat: number; lng: number };
  destCoords?: { lat: number; lng: number };
}

const normalizeOutput = (rawData: any, sources: GroundingSource[]): RouteOption[] => {
  if (!Array.isArray(rawData)) return [];

  return rawData.map((route: any, i: number) => ({
    ...route,
    routeId: `route_${Date.now()}_${i}`,
    sources,
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
};

const parseModelJson = (text: string): any => {
  let rawText = text || "[]";
  if (rawText.includes("```json")) {
    rawText = rawText.split("```json")[1].split("```")[0];
  } else if (rawText.includes("```")) {
    rawText = rawText.split("```")[1].split("```")[0];
  }
  return JSON.parse(rawText.trim());
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = (process.env.API_KEY || "").trim();
  if (!apiKey) {
    return res.status(500).json({ error: "Server API_KEY is not configured" });
  }

  const body: GenerateRoutesRequest =
    typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const start = (body.start || "").trim();
  const destination = (body.destination || "").trim();

  if (!start || !destination) {
    return res.status(400).json({ error: "start and destination are required" });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const locationContext = `출발지: "${start}", 목적지: "${destination}" (대한민국 고속도로 경로)`;

    const prompt = `${locationContext}

      [필수 작업: 실시간 데이터 위주 조사]
      1. Google Search Grounding을 사용하여 실제 고속도로 경로와 경로상의 공식 휴게소를 찾으세요.
      2. 각 휴게소별 대표 메뉴와 리뷰 기반 특징을 간단히 요약하세요.
      3. 거리(km), 소요시간(분), 경로 요약을 포함하세요.
      4. 아래 JSON 스키마를 엄격히 준수하세요.
      `;

    const config = {
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
    };

    const modelCandidates = ["gemini-2.5-flash", "gemini-3-pro-preview", "gemini-2.0-flash"];
    let response: any = null;
    let lastError: any = null;

    for (const model of modelCandidates) {
      try {
        response = await ai.models.generateContent({ model, contents: prompt, config });
        break;
      } catch (e: any) {
        lastError = e;
      }
    }

    if (!response) {
      try {
        // Grounding quota가 막힌 경우를 대비해 tools 없이 한 번 더 시도한다.
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `${prompt}\n\n[주의] 도구 사용이 불가능하면, 일반 지식 기반 추정값으로 JSON만 정확히 생성하세요.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: config.responseSchema
          }
        });
      } catch (e: any) {
        lastError = e;
      }
    }

    if (!response) {
      throw lastError || new Error("No model response");
    }

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || "웹 검색 결과",
        uri: chunk.web.uri
      }));

    const rawData = parseModelJson(response.text || "[]");
    const routes = normalizeOutput(rawData, sources);

    return res.status(200).json({ routes });
  } catch (error) {
    console.error("Route generation failed:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: "Failed to generate routes", detail });
  }
}

