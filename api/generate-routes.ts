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
const REST_AREA_QUERY = "\uACE0\uC18D\uB3C4\uB85C \uD734\uAC8C\uC18C";

const EXCLUDE_REST_AREA_KEYWORDS = [
  "\uB3D9\uBB3C",
  "\uC560\uACAC",
  "\uCE74\uD398",
  "\uBCF4\uD638\uC13C\uD130",
  "\uC8FC\uCC28\uC7A5",
  "\uC138\uCC28",
  "\uB9C8\uD2B8",
  "\uBAA8\UD154",
  "\uD638\UD154",
  "\uD3B8\uC758\uC810"
];

const REST_AREA_MENU_HINTS: Record<string, string[]> = {
  "\uB9DD\UD5A5\uD734\uAC8C\uC18C": ["\uD638\UB450\uACFC\uC790", "\uC789\uC5B4\uAD6D\uC218"],
  "\uB355\uD3C9\uD734\uAC8C\uC18C": ["\uC18C\uACE0\uAE30\uAD6D\uBC25", "\uB3C8\uAC00\uC2A4"],
  "\uC548\uC131\uD734\uAC8C\uC18C": ["\uD55C\uC6B0\uAD6D\uBC25", "\uC6B0\UB3D9"],
  "\uCE60\uACE1\uD734\uAC8C\uC18C": ["\uBBFC\UB4E4\uB808\uAD6D\uBC25", "\uB3C8\uAC00\uC2A4"],
  "\uBB38\uACBD\uD734\uAC8C\uC18C": ["\uC57D\uB3CC\uB3FC\uC9C0\uC815\uC2DD", "\uC789\uC5B4\uBE75"],
  "\uD589\uB2F4\uB3C4\uD734\uAC8C\uC18C": ["\uC5B4\uBB35\uC6B0\UB3D9", "\uD638\UB450\uACFC\uC790"],
  "\uCC9C\uC548\uC0BC\uAC70\uB9AC\uD734\uAC8C\uC18C": ["\uD638\UB450\uACFC\uC790", "\uC21C\uB300\uAD6D\uBC25"],
  "\uADFC\uC721\uD734\uAC8C\uC18C": ["\uC5B4\uBB35\uC6B0\UB3D9", "\uAE40\uBC25"]
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

const looksLikeHighwayRestArea = (doc: any): boolean => {
  const name = String(doc?.place_name || "");
  const category = String(doc?.category_name || "");
  const text = `${name} ${category}`;
  if (!text.includes("\uD734\uAC8C\uC18C")) return false;
  if (EXCLUDE_REST_AREA_KEYWORDS.some((keyword) => text.includes(keyword))) return false;
  return true;
};

const getMenuHints = (name: string): string[] => {
  for (const key of Object.keys(REST_AREA_MENU_HINTS)) {
    if (name.includes(key)) return REST_AREA_MENU_HINTS[key];
  }
  return ["\uB300\uD45C \uBA54\uB274 \uC815\uBCF4 \uC900\uBE44\uC911"];
};

const mapKakaoPlaceToStop = (doc: any, index: number): RouteStop => {
  const name = String(doc.place_name || `Rest Area ${index + 1}`);
  return {
    stopId: String(doc.id || `${name}_${index}`),
    type: "highway_rest_area",
    name,
    location: { lat: Number(doc.y), lng: Number(doc.x) },
    topItems: getMenuHints(name),
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
      `&x=${point.lng}&y=${point.lat}&radius=12000&size=8&sort=distance`;

    const data: any = await fetchJson(url, restKey);
    const docs = Array.isArray(data?.documents) ? data.documents : [];

    docs.forEach((doc: any) => {
      if (!looksLikeHighwayRestArea(doc)) return;
      const key = String(doc.id || doc.place_name || `${doc.x}_${doc.y}`);
      if (!dedupe.has(key)) dedupe.set(key, mapKakaoPlaceToStop(doc, dedupe.size));
    });

    if (dedupe.size >= 10) break;
  }

  return Array.from(dedupe.values()).slice(0, 10);
};

const toRouteSummary = (index: number, distanceKm: number, durationMin: number): string => {
  const hour = Math.floor(durationMin / 60);
  const min = durationMin % 60;
  return `경로 ${index + 1} · ${distanceKm}km · ${hour}h ${min}m`;
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
      alternatives: "true",
      road_details: "false",
      summary: "false"
    });
    const directionsUrl = `${KAKAO_MOBILITY_BASE}?${directionsParams.toString()}`;
    const directionsData: any = await fetchJson(directionsUrl, restKey);
    const routesRaw = Array.isArray(directionsData?.routes) ? directionsData.routes : [];
    if (routesRaw.length === 0) return res.status(200).json({ routes: [] });

    const routes: RouteOption[] = [];
    for (let i = 0; i < routesRaw.length; i++) {
      const rawRoute = routesRaw[i];
      const summary = rawRoute?.summary || {};
      const path = extractPathFromRoute(rawRoute);
      const stops = await fetchRestAreasAlongPath(path, restKey);
      const distanceKm = Math.round((Number(summary.distance || 0) / 1000) * 10) / 10;
      const durationMin = Math.round(Number(summary.duration || 0) / 60);

      routes.push({
        routeId: `kakao_route_${Date.now()}_${i}`,
        summary: toRouteSummary(i, distanceKm, durationMin),
        distanceKm,
        durationMin,
        toll: Number(summary?.fare?.toll || 0) > 0,
        path,
        stops,
        sources: [
          { title: "Kakao Mobility Directions API", uri: "https://developers.kakaomobility.com/docs/navi-api/directions/" },
          { title: "Kakao Local Search API", uri: "https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-keyword" }
        ]
      });
    }

    return res.status(200).json({ routes });
  } catch (error) {
    console.error("Kakao route generation failed:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: "Failed to generate routes", detail });
  }
}
