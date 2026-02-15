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

interface ExpresswayFoodRow {
  stdRestCd?: string;
  stdRestNm?: string;
  routeNm?: string;
  foodNm?: string;
  foodCost?: string;
  etc?: string;
  recommendyn?: string;
  bestfoodyn?: string;
}

interface RawKakaoRoute {
  route: any;
  priority: "RECOMMEND" | "TIME" | "DISTANCE";
}

const KAKAO_MOBILITY_BASE = "https://apis-navi.kakaomobility.com/v1/directions";
const KAKAO_KEYWORD_BASE = "https://dapi.kakao.com/v2/local/search/keyword.json";
const KAKAO_ADDRESS_BASE = "https://dapi.kakao.com/v2/local/search/address.json";
const EX_BEST_FOOD_URL = "https://data.ex.co.kr/openapi/restinfo/restBestfoodList";

const REST_AREA_QUERIES = ["\uD734\uAC8C\uC18C", "\uACE0\uC18D\uB3C4\uB85C \uD734\uAC8C\uC18C"];
const PRIORITIES: Array<"RECOMMEND" | "TIME" | "DISTANCE"> = ["RECOMMEND", "TIME", "DISTANCE"];

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
  "\uD3B8\uC758\uC810",
  "\uC8F8\uC74C",
  "\uC26C\uD130"
];

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

const fetchJson = async (url: string, headers?: Record<string, string>) => {
  const response = await fetch(url, { method: "GET", headers });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`API error (${response.status}): ${detail}`);
  }
  return response.json();
};

const toCoordinates = (x: string | number, y: string | number): Coordinates => ({
  lng: Number(x),
  lat: Number(y)
});

const normalizeName = (name: string): string =>
  name
    .replace(/\(.*?\)/g, "")
    .replace(/\s+/g, "")
    .replace(/고속도로/g, "")
    .replace(/선/g, "")
    .trim()
    .toLowerCase();

const looksLikeHighwayRestArea = (doc: any): boolean => {
  const name = String(doc?.place_name || "");
  const category = String(doc?.category_name || "");
  const text = `${name} ${category}`;
  if (!text.includes("\uD734\uAC8C\uC18C")) return false;
  if (EXCLUDE_REST_AREA_KEYWORDS.some((keyword) => text.includes(keyword))) return false;
  return true;
};

const resolveCoordinates = async (query: string, restKey: string): Promise<Coordinates> => {
  const keywordUrl = `${KAKAO_KEYWORD_BASE}?query=${encodeURIComponent(query)}&size=1&sort=accuracy`;
  const keywordData: any = await fetchJson(keywordUrl, authHeaders(restKey));
  if (Array.isArray(keywordData?.documents) && keywordData.documents.length > 0) {
    return toCoordinates(keywordData.documents[0].x, keywordData.documents[0].y);
  }

  const addressUrl = `${KAKAO_ADDRESS_BASE}?query=${encodeURIComponent(query)}&size=1`;
  const addressData: any = await fetchJson(addressUrl, authHeaders(restKey));
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
  return samplePath(points, 220);
};

const distanceMeters = (a: Coordinates, b: Coordinates): number => {
  const r = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

const samplePointsByDistance = (path: Coordinates[], count: number): Coordinates[] => {
  if (path.length <= count) return path;
  const segmentDistances: number[] = [0];
  for (let i = 1; i < path.length; i++) {
    segmentDistances.push(segmentDistances[i - 1] + distanceMeters(path[i - 1], path[i]));
  }
  const total = segmentDistances[segmentDistances.length - 1];
  if (!total) return path.slice(0, count);

  const points: Coordinates[] = [];
  for (let i = 0; i < count; i++) {
    const target = (total * i) / (count - 1);
    let idx = segmentDistances.findIndex((d) => d >= target);
    if (idx < 0) idx = segmentDistances.length - 1;
    points.push(path[idx]);
  }
  return points;
};

const extractRoadNamesFromRoute = (route: any): Set<string> => {
  const sections = Array.isArray(route?.sections) ? route.sections : [];
  const names = new Set<string>();
  sections.forEach((section: any) => {
    const roads = Array.isArray(section?.roads) ? section.roads : [];
    roads.forEach((road: any) => {
      const name = normalizeName(String(road?.name || ""));
      if (name) names.add(name);
    });
  });
  return names;
};

const buildFoodIndex = (rows: ExpresswayFoodRow[], roadNames?: Set<string>) => {
  const byRestName = new Map<string, { foods: string[]; description: string }>();
  const officialRestNames = new Set<string>();

  rows.forEach((row) => {
    const restNameRaw = String(row.stdRestNm || "").trim();
    if (!restNameRaw) return;
    const restName = normalizeName(restNameRaw);
    if (!restName) return;

    if (roadNames && roadNames.size > 0) {
      const routeName = normalizeName(String(row.routeNm || ""));
      if (routeName && !Array.from(roadNames).some((road) => road.includes(routeName) || routeName.includes(road))) {
        return;
      }
    }

    officialRestNames.add(restName);
    const prev = byRestName.get(restName) || { foods: [], description: "" };
    const foodName = String(row.foodNm || "").trim();
    if (foodName && !prev.foods.includes(foodName)) prev.foods.push(foodName);
    if (!prev.description && row.etc) prev.description = String(row.etc).trim();
    byRestName.set(restName, prev);
  });

  return { byRestName, officialRestNames };
};

const fetchExpresswayFoods = async (apiKey: string): Promise<ExpresswayFoodRow[]> => {
  const url = `${EX_BEST_FOOD_URL}?key=${encodeURIComponent(apiKey)}&type=json`;
  const data: any = await fetchJson(url);
  if (!Array.isArray(data?.list)) return [];
  return data.list as ExpresswayFoodRow[];
};

const mapKakaoPlaceToStop = (
  doc: any,
  index: number,
  foodIndex: Map<string, { foods: string[]; description: string }>
): RouteStop => {
  const name = String(doc.place_name || `Rest Area ${index + 1}`);
  const norm = normalizeName(name);
  const foodInfo = foodIndex.get(norm);

  return {
    stopId: String(doc.id || `${name}_${index}`),
    type: "highway_rest_area",
    name,
    location: { lat: Number(doc.y), lng: Number(doc.x) },
    topItems: foodInfo?.foods?.slice(0, 3) || ["\uB300\uD45C \uBA54\uB274 \uC815\uBCF4 \uC5C5\uB370\uC774\uD2B8 \uC911"],
    description: foodInfo?.description || String(doc.road_address_name || doc.address_name || "Route nearby rest area"),
    rating: 4.2,
    imageUrl: `https://picsum.photos/400/300?restarea&sig=kakao_${index}`,
    searchLinks: {
      naver: `https://map.naver.com/v5/search/${encodeURIComponent(name)}`,
      google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`,
      kakao: `https://map.kakao.com/link/search/${encodeURIComponent(name)}`
    }
  };
};

const fetchRouteCandidates = async (
  origin: Coordinates,
  target: Coordinates,
  restKey: string
): Promise<RawKakaoRoute[]> => {
  const all: RawKakaoRoute[] = [];

  for (const priority of PRIORITIES) {
    const params = new URLSearchParams({
      origin: `${origin.lng},${origin.lat}`,
      destination: `${target.lng},${target.lat}`,
      priority,
      alternatives: "true",
      road_details: "false",
      summary: "false"
    });

    const url = `${KAKAO_MOBILITY_BASE}?${params.toString()}`;
    const data: any = await fetchJson(url, authHeaders(restKey));
    const routes = Array.isArray(data?.routes) ? data.routes : [];
    routes.forEach((route: any) => all.push({ route, priority }));
  }

  const deduped = new Map<string, RawKakaoRoute>();
  all.forEach((item) => {
    const summary = item.route?.summary || {};
    const key = `${summary.distance || 0}_${summary.duration || 0}_${summary?.fare?.toll || 0}`;
    if (!deduped.has(key)) deduped.set(key, item);
  });
  return Array.from(deduped.values());
};

const fetchRestAreasAlongPath = async (
  path: Coordinates[],
  restKey: string,
  foodIndex: Map<string, { foods: string[]; description: string }>,
  officialRestNames: Set<string>
): Promise<RouteStop[]> => {
  const points = samplePointsByDistance(path, 14);
  const dedupe = new Map<string, RouteStop>();

  for (const point of points) {
    for (const query of REST_AREA_QUERIES) {
      const url =
        `${KAKAO_KEYWORD_BASE}?query=${encodeURIComponent(query)}` +
        `&x=${point.lng}&y=${point.lat}&radius=18000&size=15&sort=distance`;

      const data: any = await fetchJson(url, authHeaders(restKey));
      const docs = Array.isArray(data?.documents) ? data.documents : [];

      docs.forEach((doc: any) => {
        if (!looksLikeHighwayRestArea(doc)) return;

        const norm = normalizeName(String(doc.place_name || ""));
        if (officialRestNames.size > 0) {
          const isOfficial = Array.from(officialRestNames).some(
            (official) => norm.includes(official) || official.includes(norm)
          );
          if (!isOfficial) return;
        }

        const key = String(doc.id || doc.place_name || `${doc.x}_${doc.y}`);
        if (!dedupe.has(key)) dedupe.set(key, mapKakaoPlaceToStop(doc, dedupe.size, foodIndex));
      });
    }
  }

  return Array.from(dedupe.values()).slice(0, 12);
};

const toRouteSummary = (
  index: number,
  priority: "RECOMMEND" | "TIME" | "DISTANCE",
  distanceKm: number,
  durationMin: number
): string => {
  const hour = Math.floor(durationMin / 60);
  const min = durationMin % 60;
  const label = priority === "RECOMMEND" ? "추천" : priority === "TIME" ? "최단시간" : "최단거리";
  return `${label} 경로 ${index + 1} · ${distanceKm}km · ${hour}h ${min}m`;
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const kakaoRestKey = (process.env.KAKAO_REST_API_KEY || process.env.KAKAO_API_KEY || "").trim();
  if (!kakaoRestKey) {
    return res.status(500).json({ error: "Server KAKAO_REST_API_KEY is not configured" });
  }

  const body = parseRequestBody(req.body);
  const start = (body.start || "").trim();
  const destination = (body.destination || "").trim();
  if (!start || !destination) {
    return res.status(400).json({ error: "start and destination are required" });
  }

  try {
    const origin = body.startCoords || (await resolveCoordinates(start, kakaoRestKey));
    const target = body.destCoords || (await resolveCoordinates(destination, kakaoRestKey));

    const routeCandidates = await fetchRouteCandidates(origin, target, kakaoRestKey);
    if (routeCandidates.length === 0) return res.status(200).json({ routes: [] });

    const exApiKey =
      (process.env.EXPRESSWAY_API_KEY || process.env.KOREA_EXPRESSWAY_API_KEY || "test").trim();
    const exRows = await fetchExpresswayFoods(exApiKey);

    const routes: RouteOption[] = [];
    for (let i = 0; i < routeCandidates.length; i++) {
      const { route: rawRoute, priority } = routeCandidates[i];
      const summary = rawRoute?.summary || {};
      const path = extractPathFromRoute(rawRoute);
      const roadNames = extractRoadNamesFromRoute(rawRoute);
      const { byRestName, officialRestNames } = buildFoodIndex(exRows, roadNames);
      const stops = await fetchRestAreasAlongPath(path, kakaoRestKey, byRestName, officialRestNames);
      const distanceKm = Math.round((Number(summary.distance || 0) / 1000) * 10) / 10;
      const durationMin = Math.round(Number(summary.duration || 0) / 60);

      routes.push({
        routeId: `kakao_route_${Date.now()}_${i}`,
        summary: toRouteSummary(i, priority, distanceKm, durationMin),
        distanceKm,
        durationMin,
        toll: Number(summary?.fare?.toll || 0) > 0,
        path,
        stops,
        sources: [
          { title: "Kakao Mobility Directions API", uri: "https://developers.kakaomobility.com/docs/navi-api/directions/" },
          { title: "Kakao Local Search API", uri: "https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-keyword" },
          { title: "Korea Expressway Corporation Rest Area API", uri: "https://data.ex.co.kr/openapi/" }
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
