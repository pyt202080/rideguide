import fs from "node:fs";
import path from "node:path";

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
  premiumyn?: string;
}

interface ExpresswayRestRow {
  svarCd?: string;
  svarNm?: string;
  routeNm?: string;
  updownNm?: string;
  svarGsstClssCd?: string;
  svarGsstClssNm?: string;
}

interface LocalRestIndexFile {
  generatedAt?: string;
  restRows?: ExpresswayRestRow[];
  foodRows?: ExpresswayFoodRow[];
  popularRows?: PopularMenuRow[];
  restAreas?: ExpresswayRestRow[];
  foods?: ExpresswayFoodRow[];
}

interface PopularMenuRow {
  restName?: string;
  itemName?: string;
  rank?: number;
}

interface OfficialRestMeta {
  displayName: string;
  routeNames: Set<string>;
}

interface FoodMeta {
  foods: string[];
  description: string;
}

interface RawKakaoRoute {
  route: any;
  priority: "RECOMMEND" | "TIME" | "DISTANCE";
}

interface CandidateStop {
  stop: RouteStop;
  order: number;
  distanceToPath: number;
}

const KAKAO_MOBILITY_BASE = "https://apis-navi.kakaomobility.com/v1/directions";
const KAKAO_KEYWORD_BASE = "https://dapi.kakao.com/v2/local/search/keyword.json";
const KAKAO_ADDRESS_BASE = "https://dapi.kakao.com/v2/local/search/address.json";
const EX_BEST_FOOD_URL = "https://data.ex.co.kr/openapi/restinfo/restBestfoodList";
const EX_REST_INFO_URL = "https://data.ex.co.kr/openapi/restinfo/hiwaySvarInfoList";
const LOCAL_REST_INDEX_PATH = path.join(process.cwd(), "data", "rest-index.json");
const LOCAL_REST_INDEX_CACHE_TTL_MS = 5 * 60 * 1000;
let localRestIndexCache:
  | {
      loadedAt: number;
      data: { foodRows: ExpresswayFoodRow[]; restRows: ExpresswayRestRow[]; popularRows: PopularMenuRow[] };
    }
  | null = null;

const REST_AREA_QUERIES = ["휴게소", "고속도로 휴게소"];
const PRIORITIES: Array<"RECOMMEND" | "TIME" | "DISTANCE"> = ["RECOMMEND", "TIME", "DISTANCE"];
const EXCLUDE_REST_AREA_KEYWORDS = [
  "동물",
  "애견",
  "카페",
  "보호센터",
  "주차장",
  "세차",
  "마트",
  "호텔",
  "모텔",
  "편의점",
  "놀이",
  "체험",
  "졸음쉼터",
  "쉼터"
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

const loadLocalRestIndex = (): {
  foodRows: ExpresswayFoodRow[];
  restRows: ExpresswayRestRow[];
  popularRows: PopularMenuRow[];
} | null => {
  const now = Date.now();
  if (localRestIndexCache && now - localRestIndexCache.loadedAt < LOCAL_REST_INDEX_CACHE_TTL_MS) {
    return localRestIndexCache.data;
  }

  try {
    if (!fs.existsSync(LOCAL_REST_INDEX_PATH)) return null;
    const raw = fs.readFileSync(LOCAL_REST_INDEX_PATH, "utf8");
    const parsed = JSON.parse(raw) as LocalRestIndexFile;
    const restRows = Array.isArray(parsed.restRows)
      ? parsed.restRows
      : Array.isArray(parsed.restAreas)
        ? parsed.restAreas
        : [];
    const foodRows = Array.isArray(parsed.foodRows)
      ? parsed.foodRows
      : Array.isArray(parsed.foods)
        ? parsed.foods
        : [];
    const popularRows = Array.isArray(parsed.popularRows) ? parsed.popularRows : [];

    if (restRows.length === 0 && foodRows.length === 0) return null;

    const data = { restRows, foodRows, popularRows };
    localRestIndexCache = { loadedAt: now, data };
    return data;
  } catch (error) {
    console.error("Failed to load local rest index:", error);
    return null;
  }
};

const toCoordinates = (x: string | number, y: string | number): Coordinates => ({
  lng: Number(x),
  lat: Number(y)
});

const normalizeRestName = (name: string): string =>
  String(name || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[·\-.]/g, "")
    .replace(/\s+/g, "")
    .replace(/고속도로/g, "")
    .replace(/휴게소/g, "")
    .replace(/졸음쉼터/g, "")
    .replace(/쉼터/g, "")
    .replace(/(상행|하행|양방향|양평방향|서울방향|부산방향|목포방향|대전방향|인천방향|강릉방향|춘천방향|통영방향|순천방향|논산방향|대구방향|울산방향|광주방향)/g, "")
    .replace(/[0-9]/g, "")
    .trim();

const normalizeRouteName = (name: string): string =>
  String(name || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[·\-.]/g, "")
    .replace(/\s+/g, "")
    .replace(/고속국도/g, "")
    .replace(/고속도로/g, "")
    .replace(/자동차전용도로/g, "")
    .replace(/국도/g, "")
    .replace(/선/g, "")
    .replace(/[0-9]/g, "")
    .trim();

const looksLikeHighwayRestArea = (doc: any): boolean => {
  const name = String(doc?.place_name || "");
  const category = String(doc?.category_name || "");
  const text = `${name} ${category}`;
  if (!text.includes("휴게소")) return false;
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
      for (let i = 0; i < vertexes.length - 1; i += 2) {
        points.push({ lng: Number(vertexes[i]), lat: Number(vertexes[i + 1]) });
      }
    });
  });
  return samplePath(points, 280);
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
  const cumulative: number[] = [0];
  for (let i = 1; i < path.length; i++) {
    cumulative.push(cumulative[i - 1] + distanceMeters(path[i - 1], path[i]));
  }
  const total = cumulative[cumulative.length - 1];
  if (!total) return path.slice(0, count);

  const result: Coordinates[] = [];
  for (let i = 0; i < count; i++) {
    const target = (total * i) / (count - 1);
    let idx = cumulative.findIndex((d) => d >= target);
    if (idx < 0) idx = cumulative.length - 1;
    result.push(path[idx]);
  }
  return result;
};

const nearestPathPoint = (
  point: Coordinates,
  path: Coordinates[]
): { index: number; distanceToPath: number } => {
  let bestIdx = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < path.length; i++) {
    const d = distanceMeters(point, path[i]);
    if (d < bestDistance) {
      bestDistance = d;
      bestIdx = i;
    }
  }
  return { index: bestIdx, distanceToPath: bestDistance };
};

const fetchExpresswayPaged = async <T>(baseUrl: string, apiKey: string): Promise<T[]> => {
  const pageSize = 500;
  const maxPages = 120;
  const merged: T[] = [];
  const seenPageSignatures = new Set<string>();

  for (let page = 1; page <= maxPages; page++) {
    const url =
      `${baseUrl}?key=${encodeURIComponent(apiKey)}&type=json` +
      `&numOfRows=${pageSize}&pageNo=${page}`;

    const data: any = await fetchJson(url);
    const list = Array.isArray(data?.list) ? (data.list as T[]) : [];
    if (list.length === 0) break;

    const first = JSON.stringify(list[0] ?? null);
    const last = JSON.stringify(list[list.length - 1] ?? null);
    const signature = `${list.length}|${first}|${last}`;
    if (seenPageSignatures.has(signature)) break;
    seenPageSignatures.add(signature);

    merged.push(...list);
  }

  if (merged.length > 0) return merged;

  const fallbackUrl = `${baseUrl}?key=${encodeURIComponent(apiKey)}&type=json`;
  const fallback: any = await fetchJson(fallbackUrl);
  return Array.isArray(fallback?.list) ? (fallback.list as T[]) : [];
};

const fetchExpresswayFoods = async (apiKey: string): Promise<ExpresswayFoodRow[]> => {
  return fetchExpresswayPaged<ExpresswayFoodRow>(EX_BEST_FOOD_URL, apiKey);
};

const fetchExpresswayRestAreas = async (apiKey: string): Promise<ExpresswayRestRow[]> => {
  return fetchExpresswayPaged<ExpresswayRestRow>(EX_REST_INFO_URL, apiKey);
};

const foodRowScore = (row: ExpresswayFoodRow): number => {
  let score = 0;
  if (String(row.bestfoodyn || "").toUpperCase() === "Y") score += 100;
  if (String(row.recommendyn || "").toUpperCase() === "Y") score += 50;
  if (String(row.premiumyn || "").toUpperCase() === "Y") score += 30;
  return score;
};

const buildIndexes = (
  foodRows: ExpresswayFoodRow[],
  restRows: ExpresswayRestRow[],
  popularRows: PopularMenuRow[]
) => {
  const foodByRest = new Map<
    string,
    {
      scoreByFood: Map<string, number>;
      bestFoods: Set<string>;
      recommendFoods: Set<string>;
      descriptionByFood: Map<string, string>;
      fallbackDescription: string;
    }
  >();
  foodRows.forEach((row) => {
    const norm = normalizeRestName(String(row.stdRestNm || ""));
    if (!norm) return;
    const current = foodByRest.get(norm) || {
      scoreByFood: new Map<string, number>(),
      bestFoods: new Set<string>(),
      recommendFoods: new Set<string>(),
      descriptionByFood: new Map<string, string>(),
      fallbackDescription: ""
    };
    const foodName = String(row.foodNm || "").trim();
    if (foodName) {
      const score = foodRowScore(row);
      const prev = current.scoreByFood.get(foodName) ?? Number.NEGATIVE_INFINITY;
      current.scoreByFood.set(foodName, Math.max(prev, score));
      if (String(row.bestfoodyn || "").toUpperCase() === "Y") current.bestFoods.add(foodName);
      if (String(row.recommendyn || "").toUpperCase() === "Y") current.recommendFoods.add(foodName);
      const etc = String(row.etc || "").trim();
      if (etc && !current.descriptionByFood.has(foodName)) {
        current.descriptionByFood.set(foodName, etc);
      }
    }
    if (!current.fallbackDescription && row.etc) current.fallbackDescription = String(row.etc).trim();
    foodByRest.set(norm, current);
  });

  popularRows.forEach((row) => {
    const restKey = normalizeRestName(String(row.restName || ""));
    const item = String(row.itemName || "").trim();
    if (!restKey || !item) return;
    const rankNum = Number(row.rank || 99);
    const bonus = Math.max(0, 10 - Math.min(rankNum, 10)) * 20;
    const current = foodByRest.get(restKey) || {
      scoreByFood: new Map<string, number>(),
      bestFoods: new Set<string>(),
      recommendFoods: new Set<string>(),
      descriptionByFood: new Map<string, string>(),
      fallbackDescription: ""
    };
    const prev = current.scoreByFood.get(item) ?? Number.NEGATIVE_INFINITY;
    current.scoreByFood.set(item, Math.max(prev, 120 + bonus));
    current.recommendFoods.add(item);
    foodByRest.set(restKey, current);
  });

  const rankedFoodByRest = new Map<string, FoodMeta>();
  foodByRest.forEach((value, key) => {
    const sorter = (a: string, b: string) =>
      (value.scoreByFood.get(b) || 0) - (value.scoreByFood.get(a) || 0);

    const best = Array.from(value.bestFoods).sort(sorter);
    const recommend = Array.from(value.recommendFoods)
      .filter((name) => !value.bestFoods.has(name))
      .sort(sorter);
    const othersByScore = Array.from(value.scoreByFood.keys())
      .filter((name) => !value.bestFoods.has(name) && !value.recommendFoods.has(name))
      .sort(sorter);

    const selected: Array<{ name: string }> = [];
    const used = new Set<string>();

    if (best.length > 0) {
      selected.push({ name: best[0] });
      used.add(best[0]);
    }
    if (recommend.length > 0) {
      selected.push({ name: recommend[0] });
      used.add(recommend[0]);
    }

    const fallbackPool = [
      ...best.filter((name) => !used.has(name)),
      ...recommend.filter((name) => !used.has(name)),
      ...othersByScore.filter((name) => !used.has(name))
    ];
    while (selected.length < 3 && fallbackPool.length > 0) {
      const name = fallbackPool.shift() as string;
      if (used.has(name)) continue;
      selected.push({ name });
      used.add(name);
    }

    const foods = selected.map((x) => x.name);
    const descCandidateName = selected[0]?.name || selected[1]?.name || selected[2]?.name || "";
    const description = value.descriptionByFood.get(descCandidateName) || value.fallbackDescription;

    rankedFoodByRest.set(key, {
      foods,
      description
    });
  });

  const restMetaByName = new Map<string, OfficialRestMeta>();
  restRows.forEach((row) => {
    const clsName = String(row.svarGsstClssNm || "");
    const clsCode = String(row.svarGsstClssCd || "");
    const rawName = String(row.svarNm || "").trim();
    if (!(clsName === "휴게소" || clsCode === "0")) return;
    if (!rawName || rawName.includes("졸음쉼터")) return;
    const norm = normalizeRestName(rawName);
    if (!norm) return;
    const routeNorm = normalizeRouteName(String(row.routeNm || ""));
    const current = restMetaByName.get(norm) || { displayName: rawName, routeNames: new Set<string>() };
    if (routeNorm) current.routeNames.add(routeNorm);
    restMetaByName.set(norm, current);
  });

  return { foodByRest: rankedFoodByRest, restMetaByName };
};

const findOfficialRestKey = (candidateNorm: string, knownKeys: string[]): string | null => {
  if (!candidateNorm) return null;
  if (knownKeys.includes(candidateNorm)) return candidateNorm;

  let best: string | null = null;
  let bestGap = Number.POSITIVE_INFINITY;
  for (const key of knownKeys) {
    if (candidateNorm.includes(key) || key.includes(candidateNorm)) {
      const gap = Math.abs(candidateNorm.length - key.length);
      if (gap < bestGap) {
        best = key;
        bestGap = gap;
      }
    }
  }
  return best;
};

const findFoodMeta = (
  officialKey: string,
  officialName: string,
  placeName: string,
  foodByRest: Map<string, FoodMeta>
): FoodMeta | undefined => {
  const keys = [officialKey, normalizeRestName(officialName), normalizeRestName(placeName)].filter(Boolean);

  for (const key of keys) {
    const exact = foodByRest.get(key);
    if (exact) return exact;
  }

  let best: FoodMeta | undefined;
  let bestGap = Number.POSITIVE_INFINITY;
  for (const [k, v] of foodByRest.entries()) {
    for (const target of keys) {
      if (k.includes(target) || target.includes(k)) {
        const gap = Math.abs(k.length - target.length);
        if (gap < bestGap) {
          best = v;
          bestGap = gap;
        }
      }
    }
  }
  return best;
};

const sharesRouteHint = (routeHints: Set<string>, officialRoutes: Set<string>): boolean => {
  if (routeHints.size === 0 || officialRoutes.size === 0) return true;
  for (const hint of routeHints) {
    for (const routeName of officialRoutes) {
      if (hint.includes(routeName) || routeName.includes(hint)) return true;
    }
  }
  return false;
};

const buildStop = (
  doc: any,
  officialName: string,
  officialKey: string,
  indexSeed: number,
  foodByRest: Map<string, FoodMeta>
): RouteStop => {
  const menuInfo = findFoodMeta(officialKey, officialName, String(doc.place_name || ""), foodByRest);
  const menuList = menuInfo?.foods.slice(0, 3) || [];
  const description =
    menuInfo?.description ||
    (menuList.length > 0
      ? `대표 메뉴: ${menuList.join(", ")}`
      : String(doc.road_address_name || doc.address_name || "경로 인근 휴게소"));

  return {
    stopId: String(doc.id || `${officialName}_${indexSeed}`),
    type: "highway_rest_area",
    name: officialName,
    location: { lat: Number(doc.y), lng: Number(doc.x) },
    topItems: menuList.length > 0 ? menuList : ["대표 메뉴 정보 준비 중"],
    description,
    rating: 4.2,
    imageUrl: `https://picsum.photos/400/300?restarea&sig=${encodeURIComponent(officialKey)}`,
    searchLinks: {
      naver: `https://map.naver.com/v5/search/${encodeURIComponent(officialName)}`,
      google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(officialName)}`,
      kakao: `https://map.kakao.com/link/search/${encodeURIComponent(officialName)}`
    }
  };
};

const extractRouteHints = (route: any): Set<string> => {
  const hints = new Set<string>();
  const sections = Array.isArray(route?.sections) ? route.sections : [];

  sections.forEach((section: any) => {
    const roads = Array.isArray(section?.roads) ? section.roads : [];
    roads.forEach((road: any) => {
      const name = String(road?.name || "");
      if (!name) return;
      if (!name.includes("고속") && !name.includes("선")) return;
      const normalized = normalizeRouteName(name);
      if (normalized.length >= 2) hints.add(normalized);
    });
  });

  return hints;
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
  routeHints: Set<string>,
  restKey: string,
  foodByRest: Map<string, FoodMeta>,
  restMetaByName: Map<string, OfficialRestMeta>
): Promise<RouteStop[]> => {
  const knownOfficialKeys = Array.from(restMetaByName.keys());
  const pathPointCount = path.length > 220 ? 22 : 16;
  const sampledPoints = samplePointsByDistance(path, pathPointCount);
  const strict = new Map<string, CandidateStop>();
  const relaxed = new Map<string, CandidateStop>();

  for (const point of sampledPoints) {
    for (const query of REST_AREA_QUERIES) {
      const url =
        `${KAKAO_KEYWORD_BASE}?query=${encodeURIComponent(query)}` +
        `&x=${point.lng}&y=${point.lat}&radius=12000&size=15&sort=distance`;

      const data: any = await fetchJson(url, authHeaders(restKey));
      const docs = Array.isArray(data?.documents) ? data.documents : [];

      docs.forEach((doc: any) => {
        if (!looksLikeHighwayRestArea(doc)) return;
        const candidateNorm = normalizeRestName(String(doc.place_name || ""));
        const officialKey = findOfficialRestKey(candidateNorm, knownOfficialKeys);
        if (!officialKey) return;

        const officialMeta = restMetaByName.get(officialKey);
        if (!officialMeta) return;

        const pointInfo = nearestPathPoint({ lat: Number(doc.y), lng: Number(doc.x) }, path);
        const routeMatch = sharesRouteHint(routeHints, officialMeta.routeNames);
        const stop = buildStop(doc, officialMeta.displayName, officialKey, strict.size + relaxed.size, foodByRest);

        const strictPass = routeMatch && pointInfo.distanceToPath <= 3500;
        const relaxedPass = pointInfo.distanceToPath <= 8000;
        if (!relaxedPass) return;

        const candidate: CandidateStop = {
          stop,
          order: pointInfo.index,
          distanceToPath: pointInfo.distanceToPath
        };

        const targetMap = strictPass ? strict : relaxed;
        const prev = targetMap.get(officialKey);
        if (
          !prev ||
          candidate.distanceToPath < prev.distanceToPath ||
          (candidate.distanceToPath === prev.distanceToPath && candidate.order < prev.order)
        ) {
          targetMap.set(officialKey, candidate);
        }
      });
    }
  }

  const merged = new Map<string, CandidateStop>(relaxed);
  strict.forEach((value, key) => {
    const prev = merged.get(key);
    if (
      !prev ||
      value.distanceToPath < prev.distanceToPath ||
      (value.distanceToPath === prev.distanceToPath && value.order < prev.order)
    ) {
      merged.set(key, value);
    }
  });

  return Array.from(merged.values())
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.stop);
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

    let foodRows: ExpresswayFoodRow[] = [];
    let restRows: ExpresswayRestRow[] = [];
    let popularRows: PopularMenuRow[] = [];
    const localIndex = loadLocalRestIndex();
    if (localIndex) {
      foodRows = localIndex.foodRows;
      restRows = localIndex.restRows;
      popularRows = localIndex.popularRows;
    } else {
      const exApiKey =
        (process.env.EXPRESSWAY_API_KEY || process.env.KOREA_EXPRESSWAY_API_KEY || "test").trim();
      [foodRows, restRows] = await Promise.all([
        fetchExpresswayFoods(exApiKey),
        fetchExpresswayRestAreas(exApiKey)
      ]);
    }
    const { foodByRest, restMetaByName } = buildIndexes(foodRows, restRows, popularRows);

    const evaluated = await Promise.all(
      routeCandidates.map(async ({ route: rawRoute, priority }) => {
        const summary = rawRoute?.summary || {};
        const path = extractPathFromRoute(rawRoute);
        const routeHints = extractRouteHints(rawRoute);
        const stops = await fetchRestAreasAlongPath(path, routeHints, kakaoRestKey, foodByRest, restMetaByName);
        const distanceKm = Math.round((Number(summary.distance || 0) / 1000) * 10) / 10;
        const durationMin = Math.round(Number(summary.duration || 0) / 60);
        return {
          priority,
          path,
          stops,
          distanceKm,
          durationMin,
          toll: Number(summary?.fare?.toll || 0) > 0
        };
      })
    );

    const primary =
      evaluated.find((r) => r.priority === "RECOMMEND") ||
      evaluated.slice().sort((a, b) => a.durationMin - b.durationMin)[0];
    const primaryPath = primary?.path || [];

    const unified = new Map<
      string,
      { stop: RouteStop; order: number; distanceToPath: number }
    >();

    evaluated.forEach((route) => {
      route.stops.forEach((stop) => {
        const key = normalizeRestName(stop.name);
        if (!key) return;
        const point = nearestPathPoint(stop.location, primaryPath.length > 0 ? primaryPath : route.path);
        const candidate = { stop, order: point.index, distanceToPath: point.distanceToPath };
        const prev = unified.get(key);
        if (
          !prev ||
          candidate.distanceToPath < prev.distanceToPath ||
          (candidate.distanceToPath === prev.distanceToPath && candidate.order < prev.order)
        ) {
          unified.set(key, candidate);
        }
      });
    });

    const unifiedStops = Array.from(unified.values())
      .sort((a, b) => a.order - b.order)
      .map((entry) => entry.stop);

    const route: RouteOption = {
      routeId: `kakao_unified_${Date.now()}`,
      summary: `전체 이동 구간 휴게소 · ${primary?.distanceKm ?? 0}km · ${Math.floor(
        (primary?.durationMin ?? 0) / 60
      )}h ${(primary?.durationMin ?? 0) % 60}m`,
      distanceKm: primary?.distanceKm ?? 0,
      durationMin: primary?.durationMin ?? 0,
      toll: Boolean(primary?.toll),
      path: primaryPath,
      stops: unifiedStops,
      sources: [
        {
          title: "Kakao Mobility Directions API",
          uri: "https://developers.kakaomobility.com/docs/navi-api/directions/"
        },
        {
          title: "Kakao Local Search API",
          uri: "https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-keyword"
        },
        {
          title: "한국도로공사 휴게소 정보 API (0317)",
          uri: "https://data.ex.co.kr/openapi/basicinfo/openApiInfoM?apiId=0317&serviceType=OPENAPI"
        },
        {
          title: "한국도로공사 대표메뉴 API (0502)",
          uri: "https://data.ex.co.kr/openapi/basicinfo/openApiInfoM?apiId=0502&serviceType=OPENAPI"
        }
      ]
    };

    return res.status(200).json({ routes: [route] });
  } catch (error) {
    console.error("Kakao route generation failed:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: "Failed to generate routes", detail });
  }
}
