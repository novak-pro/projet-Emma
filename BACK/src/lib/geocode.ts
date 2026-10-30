type CacheEntry = { expires: number; data: unknown };

const cache = new Map<string, CacheEntry>();
const TTL = 1000 * 60 * 60 * 24;
let lastCall = 0;

async function throttle() {
  const elapsed = Date.now() - lastCall;
  if (elapsed < 1100) {
    await new Promise((resolve) => setTimeout(resolve, 1100 - elapsed));
  }
  lastCall = Date.now();
}

async function fetchNominatim(path: string, params: Record<string, string>) {
  const url = new URL(`https://nominatim.openstreetmap.org/${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("accept-language", "fr");

  const key = url.toString();
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  await throttle();
  const response = await fetch(url, {
    headers: {
      "User-Agent": "ProjetEmma/1.0 (application de signalement routier; contact@projetemma.cm)",
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim ${response.status}`);
  }

  const data = await response.json();
  cache.set(key, { expires: Date.now() + TTL, data });
  return data;
}

type NominatimAddress = {
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  county?: string;
};

export async function reverseGeocode(lat: number, lng: number) {
  const data = (await fetchNominatim("reverse", {
    lat: String(lat),
    lon: String(lng),
    zoom: "14",
  })) as { display_name?: string; address?: NominatimAddress };

  const address = data.address ?? {};
  return {
    displayName: data.display_name ?? "",
    region: address.state ?? address.county ?? "",
    city: address.city ?? address.town ?? address.village ?? address.suburb ?? "",
    road: address.road ?? "",
  };
}

export async function searchPlaces(query: string) {
  const data = (await fetchNominatim("search", {
    q: query,
    countrycodes: "cm",
    limit: "5",
    addressdetails: "1",
  })) as Array<{ display_name: string; lat: string; lon: string }>;

  return data.map((item) => ({
    displayName: item.display_name,
    latitude: Number(item.lat),
    longitude: Number(item.lon),
  }));
}
