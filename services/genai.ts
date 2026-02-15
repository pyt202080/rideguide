import { RouteOption } from "../types";

export const generateRoutes = async (
  start: string,
  destination: string,
  startCoords?: { lat: number; lng: number },
  destCoords?: { lat: number; lng: number }
): Promise<RouteOption[]> => {
  if (!start || !destination) return [];

  try {
    const res = await fetch("/api/generate-routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start, destination, startCoords, destCoords })
    });

    if (!res.ok) {
      const text = await res.text();
      let msg = "경로 API 호출이 실패했습니다.";
      try {
        const parsed = JSON.parse(text);
        if (parsed?.error) {
          msg = parsed.error;
          if (parsed?.detail) msg += ` (${parsed.detail})`;
        }
      } catch {
        if (text?.trim()) msg = text.trim();
      }
      console.error("Route API error:", msg);
      throw new Error(msg);
    }

    const data = await res.json();
    if (!Array.isArray(data?.routes)) {
      throw new Error("API 응답 형식이 올바르지 않습니다.");
    }
    return data.routes as RouteOption[];
  } catch (error) {
    console.error("Route API request failed:", error);
    throw error instanceof Error ? error : new Error("경로 API 요청 중 오류가 발생했습니다.");
  }
};

