import { GoogleGenAI, Type } from "@google/genai";

interface GenerateRoutesRequest {
  start?: string;
  destination?: string;
  startCoords?: { lat: number; lng: number };
  destCoords?: { lat: number; lng: number };
}

interface GroundingSource {
  title: string;
  uri: string;
}

interface RouteOption {
  routeId: string;
  summary: string;
  distanceKm: number;
  durationMin: number;
  toll: boolean;
  path: Array<{ lat: number; lng: number }>;
  stops: Array<{
    stopId: string;
    type: "highway_rest_area" | "local_restaurant";
    name: string;
    location: { lat: number; lng: number };
    topItems: string[];
    description: string;
    rating: number;
    imageUrl: string;
    searchLinks: { naver: string; google: string; kakao: string };
  }>;
  sources?: GroundingSource[];
}

const STOP_TYPES = ["highway_rest_area", "local_restaurant"] as const;

const normalizeOutput = (rawData: any, sources: GroundingSource[]): RouteOption[] => {
  if (!Array.isArray(rawData)) return [];

  return rawData.map((route: any, routeIndex: number) => ({
    ...route,
    routeId: `route_${Date.now()}_${routeIndex}`,
    sources,
    stops: (route.stops || []).map((stop: any, stopIndex: number) => ({
      ...stop,
      stopId: `stop_${Date.now()}_${routeIndex}_${stopIndex}`,
      imageUrl: `https://picsum.photos/400/300?restarea&sig=${routeIndex}${stopIndex}${Date.now()}`,
      searchLinks: {
        naver: `https://map.naver.com/v5/search/${encodeURIComponent(stop.name || "")}`,
        google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.name || "")}`,
        kakao: `https://map.kakao.com/link/search/${encodeURIComponent(stop.name || "")}`
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

const parseRequestBody = (body: unknown): GenerateRoutesRequest => {
  if (!body) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body || "{}");
    } catch {
      return {};
    }
  }
  if (typeof body === "object") return body as GenerateRoutesRequest;
  return {};
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = (process.env.API_KEY || "").trim();
  if (!apiKey) {
    return res.status(500).json({ error: "Server API_KEY is not configured" });
  }

  const body: GenerateRoutesRequest = parseRequestBody(req.body);
  const start = (body.start || "").trim();
  const destination = (body.destination || "").trim();

  if (!start || !destination) {
    return res.status(400).json({ error: "start and destination are required" });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const locationContext = `Start: "${start}", Destination: "${destination}" (South Korea highway route)`;

    const prompt = `${locationContext}

      Required tasks:
      1. Use Google Search grounding to find real highway route candidates and official rest areas on the route.
      2. Summarize signature menu items and review-based features for each stop.
      3. Include distance (km), duration (minutes), and a route summary.
      4. Follow the JSON schema strictly. Return only valid JSON.
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
                  type: { type: Type.STRING, enum: [...STOP_TYPES] },
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
      } catch (error: any) {
        lastError = error;
      }
    }

    if (!response) {
      try {
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `${prompt}\n\nIf tool use is unavailable, return best-effort JSON from general knowledge.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: config.responseSchema
          }
        });
      } catch (error: any) {
        lastError = error;
      }
    }

    if (!response) {
      throw lastError || new Error("No model response");
    }

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || "Web search result",
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
