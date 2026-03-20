/**
 * Aegis Bridge — GET /api/hospitals
 * Server-side proxy for Google Places API hospital search.
 * Security: API key never exposed to client, input validated server-side.
 */
import { NextRequest, NextResponse } from "next/server";

const MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Specialty → keyword mapping for Places search
const SPECIALTY_KEYWORDS: Record<string, string> = {
  "Trauma Surgery": "trauma center hospital",
  "Cardiology": "cardiac hospital",
  "Neurology": "neurology hospital",
  "Pediatrics": "children's hospital pediatric",
  "Orthopedics": "orthopedic hospital",
  "Burn Unit": "burn center hospital",
  "Toxicology": "poison control hospital",
  "Psychiatric": "psychiatric hospital",
  "Maternity": "maternity hospital obstetrics",
  "General Emergency": "emergency hospital",
};

function sanitizeFloat(val: unknown, min: number, max: number): number | null {
  const n = parseFloat(String(val));
  if (!isFinite(n) || n < min || n > max) return null;
  return n;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!MAPS_API_KEY) {
    return NextResponse.json({ error: "Maps API not configured." }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);

  const lat = sanitizeFloat(searchParams.get("lat"), -90, 90);
  const lng = sanitizeFloat(searchParams.get("lng"), -180, 180);

  if (lat === null || lng === null) {
    return NextResponse.json({ error: "Valid lat and lng required." }, { status: 400 });
  }

  const specialtyRaw = searchParams.get("specialty") ?? "General Emergency";
  // Sanitize specialty: only allow known keys or fall back to general
  const specialty = Object.keys(SPECIALTY_KEYWORDS).includes(specialtyRaw)
    ? specialtyRaw
    : "General Emergency";

  const keyword = SPECIALTY_KEYWORDS[specialty];
  const radius = 15000; // 15km search radius

  try {
    // Google Places Nearby Search (server-side)
    const placesUrl = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
    placesUrl.searchParams.set("location", `${lat},${lng}`);
    placesUrl.searchParams.set("radius", String(radius));
    placesUrl.searchParams.set("type", "hospital");
    placesUrl.searchParams.set("keyword", keyword);
    placesUrl.searchParams.set("key", MAPS_API_KEY);

    const placesRes = await fetch(placesUrl.toString(), { next: { revalidate: 300 } }); // 5-min cache
    if (!placesRes.ok) throw new Error(`Places API HTTP ${placesRes.status}`);

    const placesData = await placesRes.json();
    if (placesData.status !== "OK" && placesData.status !== "ZERO_RESULTS") {
      throw new Error(`Places API error: ${placesData.status}`);
    }

    // Return top 5 results with only the fields we need
    const hospitals = (placesData.results ?? []).slice(0, 5).map((p: Record<string, unknown>) => ({
      placeId: p.place_id,
      name: p.name,
      vicinity: p.vicinity,
      rating: p.rating ?? null,
      openNow: (p.opening_hours as Record<string, unknown> | undefined)?.open_now ?? null,
      location: {
        lat: (p.geometry as { location: { lat: number; lng: number } }).location.lat,
        lng: (p.geometry as { location: { lat: number; lng: number } }).location.lng,
      },
    }));

    return NextResponse.json({ hospitals, specialty, userLocation: { lat, lng } }, { status: 200 });
  } catch (err) {
    console.error("[/api/hospitals] error:", err);
    return NextResponse.json({ error: "Hospital search failed." }, { status: 502 });
  }
}
