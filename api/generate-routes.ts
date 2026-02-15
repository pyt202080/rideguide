interface GenerateRoutesRequest {
  start?: string;
  destination?: string;
  startCoords?: { lat: number; lng: number };
  destCoords?: { lat: number; lng: number };
}

interface Coordinates {
  lat: number;
  lng: number;
}

interface GroundingSource {
  title: string;
  uri: string;
}

interface RouteStop {
  stopId: string;
  type: "highway_rest_area" | "local_restaurant";
  name: string;
  location: Coordinates;
  topItems: string[];
  description: string;
  rating: number;
  imageUrl: string;
  searchLinks: { naver: string; google: string; kakao: string };
}

interface RouteOption {
  routeId: string;
  summary: string;
  distanceKm: number;
  durationMin: number;
  toll: boolean;
  path: Coordinates[];
  stops: RouteStop[];
  sources?: GroundingSource[];
}

const KAKAO_MOBILITY_BASE = "https://apis-navi.kakaomobility.com/v1/directions";
const KAKAO_KEYWORD_BASE = "https://dapi.kakao.com/v2/local/search/keyword.json";
const KAKAO_ADDRESS_BASE = "https://dapi.kakao.com/v2/local/search/address.json";
const REST_AREA_QUERY = "\uD734\uAC8C\uC18C";

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

const authHeaders = (restKey: string) => ({
  Authorization: `KakaoAK ${restKey}`,
  "Content-Type": "application/json"
});

const fetchJson = async (url: string, restKey: string) => {
  const response = await fetch(url, { method: "GET", headers: authHeaders(restKey) });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Kakao API error (${response.status}): ${detail}`);
  }
  return response.json();
};

const toCoordinates = (x: string | number, y: string | number): Coordinates => ({
  lng: Number(x),
  lat: Number(y)
});

const resolveCoordinates = async (query: string, restKey: string): Promise<Coordinates> => {
  const keywordUrl = `${KAKAO_KEYWORD_BASE}?query=${encodeURIComponent(query)}&size=1&sort=accuracy`;
  const keywordData: any = await fetchJson(keywordUrl, restKey);
  if (Array.isArray(keywordData?.documents) && keywordData.documents.length > 0) {
    return toCoordinates(keywordData.documents[0].x, keywordData.documents[0].y);
  }

  const addressUrl = `${KAKAO_ADDRESS_BASE}?query=${encodeURIComponent(query)}&size=1`;
  const addressData: any = await fetchJson(addressUrl, restKey);
  if (Array.isArray(addressData?.documents) && addressData.documents.length > 0) {
    return toCoordinates(addressData.documents[0].x, addressData.documents[0].y);
  }

  throw new Error(`Could not resolve coordinates for: ${query}`);
};

const samplePath = (path: Coordinates[], maxPoints: number): Coordinates[] => {
  if (path.length <= maxPoints) return path;
  const step = Math.ceil(path.length / maxPoints);
  const sampled = path.filter((_, index) => index % step === 0);
  const last = path[path.length - 1];
  if (sampled[sampled.length - 1] !== last) sampled.push(last);
  return sampled;
};

const extractPathFromRoute = (route: any): Coordinates[] => {
  const points: Coordinates[] = [];
  const sections = Array.isArray(route?.sections) ? route.sections : [];
  sections.forEach((section: any) => {
    const roads = Array.isArray(section?.roads) ? section.roads : [];
    roads.forEach((road: any) => {
      const vertexes = Array.isArray(road?.vertexes) ? road.vertexes : [];
      for (let index = 0; index < vertexes.length - 1; index += 2) {
        points.push({ lng: Number(vertexes[index]), lat: Number(vertexes[index + 1]) });
      }
    });
  });
  return samplePath(points, 160);
};

const samplePointsForStopSearch = (path: Coordinates[], count: number): Coordinates[] => {
  if (path.length === 0) return [];
  if (path.length <= count) return path;
  const lastIndex = path.length - 1;
  const points: Coordinates[] = [];
  for (let i = 0; i < count; i++) {
    const index = Math.floor((i * lastIndex) / (count - 1));
    points.push(path[index]);
  }
  return points;
};

const mapKakaoPlaceToStop = (doc: any, index: number): RouteStop => {
  const name = String(doc.place_name || `Rest Area ${index + 1}`);
  return {
    stopId: String(doc.id || `${name}_${index}`),
    type: "highway_rest_area",
    name,
    location: { lat: Number(doc.y), lng: Number(doc.x) },
    topItems: [],
    description: String(doc.road_address_name || doc.address_name || "Route nearby rest area"),
    rating: 4.2,
    imageUrl: `https://picsum.photos/400/300?restarea&sig=kakao_${index}`,
    searchLinks: {
      naver: `https://map.naver.com/v5/search/${encodeURIComponent(name)}`,
      google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`,
      kakao: `https://map.kakao.com/link/search/${encodeURIComponent(name)}`
    }
  };
};

const fetchRestAreasAlongPath = async (path: Coordinates[], restKey: string): Promise<RouteStop[]> => {
  const points = samplePointsForStopSearch(path, 7);
  const dedupe = new Map<string, RouteStop>();

  for (const point of points) {
    const url =
      `${KAKAO_KEYWORD_BASE}?query=${encodeURIComponent(REST_AREA_QUERY)}` +
      `&x=${point.lng}&y=${point.lat}&radius=15000&size=5&sort=distance`;

    const data: any = await fetchJson(url, restKey);
    const docs = Array.isArray(data?.documents) ? data.documents : [];
    docs.forEach((doc: any) => {
      const key = String(doc.id || doc.place_name || `${doc.x}_${doc.y}`);
      if (!dedupe.has(key)) {
        dedupe.set(key, mapKakaoPlaceToStop(doc, dedupe.size));
      }
    });
    if (dedupe.size >= 8) break;
  }

  return Array.from(dedupe.values()).slice(0, 8);
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const restKey = (process.env.KAKAO_REST_API_KEY || process.env.KAKAO_API_KEY || "").trim();
  if (!restKey) {
    return res.status(500).json({ error: "Server KAKAO_REST_API_KEY is not configured" });
  }

  const body = parseRequestBody(req.body);
  const start = (body.start || "").trim();
  const destination = (body.destination || "").trim();
  if (!start || !destination) {
    return res.status(400).json({ error: "start and destination are required" });
  }

  try {
    const origin = body.startCoords || (await resolveCoordinates(start, restKey));
    const target = body.destCoords || (await resolveCoordinates(destination, restKey));

    const directionsParams = new URLSearchParams({
      origin: `${origin.lng},${origin.lat}`,
      destination: `${target.lng},${target.lat}`,
      priority: "RECOMMEND",
      alternatives: "false",
      road_details: "false",
      summary: "false"
    });
    const directionsUrl = `${KAKAO_MOBILITY_BASE}?${directionsParams.toString()}`;
    const directionsData: any = await fetchJson(directionsUrl, restKey);
    const firstRoute = Array.isArray(directionsData?.routes) ? directionsData.routes[0] : null;
    if (!firstRoute) {
      return res.status(200).json({ routes: [] });
    }

    const path = extractPathFromRoute(firstRoute);
    const stops = await fetchRestAreasAlongPath(path, restKey);
    const summary = firstRoute?.summary || {};

    const route: RouteOption = {
      routeId: `kakao_route_${Date.now()}`,
      summary: "카카오 길찾기 추천 경로",
      distanceKm: Math.round((Number(summary.distance || 0) / 1000) * 10) / 10,
      durationMin: Math.round(Number(summary.duration || 0) / 60),
      toll: Number(summary?.fare?.toll || 0) > 0,
      path,
      stops,
      sources: [
        { title: "Kakao Mobility Directions API", uri: "https://developers.kakaomobility.com/docs/navi-api/directions/" },
        { title: "Kakao Local Search API", uri: "https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-keyword" }
      ]
    };

    return res.status(200).json({ routes: [route] });
  } catch (error) {
    console.error("Kakao route generation failed:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: "Failed to generate routes", detail });
  }
}
