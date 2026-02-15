import fs from "node:fs";
import path from "node:path";

const EX_BEST_FOOD_URL = "https://data.ex.co.kr/openapi/restinfo/restBestfoodList";
const EX_REST_INFO_URL = "https://data.ex.co.kr/openapi/restinfo/hiwaySvarInfoList";
const OUTPUT_PATH = path.join(process.cwd(), "data", "rest-index.json");
const POPULAR_JSON_PATH = path.join(process.cwd(), "data", "r0-popular.json");

interface PopularMenuRow {
  restName?: string;
  itemName?: string;
  rank?: number;
}

const fetchJson = async (url: string) => {
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`API error (${response.status}): ${detail}`);
  }
  return response.json();
};

const fetchPaged = async <T>(baseUrl: string, apiKey: string): Promise<T[]> => {
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

  const fallback = `${baseUrl}?key=${encodeURIComponent(apiKey)}&type=json`;
  const data: any = await fetchJson(fallback);
  return Array.isArray(data?.list) ? (data.list as T[]) : [];
};

const main = async () => {
  const key =
    process.env.EXPRESSWAY_API_KEY ||
    process.env.KOREA_EXPRESSWAY_API_KEY ||
    process.argv[2] ||
    "";

  if (!key.trim()) {
    throw new Error("Missing expressway API key. Set EXPRESSWAY_API_KEY or pass key as first argument.");
  }

  const [restRows, foodRows] = await Promise.all([
    fetchPaged<any>(EX_REST_INFO_URL, key.trim()),
    fetchPaged<any>(EX_BEST_FOOD_URL, key.trim())
  ]);

  let popularRows: PopularMenuRow[] = [];
  if (fs.existsSync(POPULAR_JSON_PATH)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(POPULAR_JSON_PATH, "utf8"));
      if (Array.isArray(parsed)) popularRows = parsed;
    } catch (error) {
      console.error("Failed to parse data/r0-popular.json:", error);
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: {
      restInfo: EX_REST_INFO_URL,
      bestFood: EX_BEST_FOOD_URL
    },
    restRows,
    foodRows,
    popularRows
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2), "utf8");

  console.log(`Saved ${OUTPUT_PATH}`);
  console.log(`restRows=${restRows.length}, foodRows=${foodRows.length}, popularRows=${popularRows.length}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
