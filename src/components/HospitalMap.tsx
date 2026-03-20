"use client";

/**
 * Aegis Bridge — Hospital Routing Map
 * Geolocation → /api/hospitals → Google Maps embed with nearest results
 * a11y: loading state, error state, list fallback alongside map
 */
import { useState, useEffect, useCallback } from "react";
import { MapPin, Navigation, Star, Clock, AlertCircle, Loader2, ExternalLink } from "lucide-react";

interface Hospital {
  placeId: string;
  name: string;
  vicinity: string;
  rating: number | null;
  openNow: boolean | null;
  location: { lat: number; lng: number };
}

interface HospitalMapProps {
  /** Preferred specialty from triage output — falls back to General Emergency */
  specialty?: string;
}

function getDirectionsUrl(lat: number, lng: number, destLat: number, destLng: number): string {
  return `https://www.google.com/maps/dir/${lat},${lng}/${destLat},${destLng}`;
}

function getEmbedUrl(
  userLat: number,
  userLng: number,
  hospital: Hospital,
  apiKey: string
): string {
  return (
    `https://www.google.com/maps/embed/v1/directions` +
    `?key=${encodeURIComponent(apiKey)}` +
    `&origin=${userLat},${userLng}` +
    `&destination=place_id:${encodeURIComponent(hospital.placeId)}` +
    `&mode=driving`
  );
}

export default function HospitalMap({ specialty = "General Emergency" }: HospitalMapProps) {
  const [state, setState] = useState<"idle" | "locating" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selected, setSelected] = useState<Hospital | null>(null);

  const fetchHospitals = useCallback(async (lat: number, lng: number) => {
    setState("loading");
    try {
      const res = await fetch(`/api/hospitals?lat=${lat}&lng=${lng}&specialty=${encodeURIComponent(specialty)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Server error ${res.status}`);
      }
      const data = await res.json();
      setHospitals(data.hospitals ?? []);
      setSelected(data.hospitals?.[0] ?? null);
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load hospitals.");
      setState("error");
    }
  }, [specialty]);

  const startLocating = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setState("error");
      return;
    }
    setState("locating");
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserLocation({ lat, lng });
        fetchHospitals(lat, lng);
      },
      (err) => {
        setError(`Location error: ${err.message}. Enable location access and try again.`);
        setState("error");
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }, [fetchHospitals]);

  // Auto-start locating on mount
  useEffect(() => {
    startLocating();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "";

  return (
    <section aria-labelledby="map-section-title" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 id="map-section-title" className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Nearest Hospitals
          {specialty !== "General Emergency" && (
            <span className="ml-2 text-xs font-normal" style={{ color: "var(--color-accent)" }}>
              ({specialty})
            </span>
          )}
        </h2>

        {(state === "ready" || state === "error") && (
          <button
            type="button"
            onClick={startLocating}
            aria-label="Refresh hospital search using current location"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.06)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}
          >
            <Navigation size={12} aria-hidden="true" />
            Refresh
          </button>
        )}
      </div>

      {/* Loading states */}
      {(state === "idle" || state === "locating" || state === "loading") && (
        <div
          role="status"
          aria-label={state === "locating" ? "Getting your location" : "Loading nearby hospitals"}
          aria-live="polite"
          className="glass flex flex-col items-center justify-center gap-3 py-16 text-center rounded-xl"
        >
          <Loader2 size={28} className="animate-spin" style={{ color: "var(--color-accent)" }} aria-hidden="true" />
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {state === "locating" ? "Getting your location…" : "Finding nearby hospitals…"}
          </p>
        </div>
      )}

      {/* Error */}
      {state === "error" && (
        <div
          role="alert"
          className="glass flex flex-col items-center justify-center gap-3 py-12 text-center rounded-xl"
        >
          <AlertCircle size={28} style={{ color: "var(--color-critical)" }} aria-hidden="true" />
          <p className="text-sm max-w-xs" style={{ color: "var(--color-text-secondary)" }}>{error}</p>
          <button
            type="button"
            onClick={startLocating}
            className="text-sm px-4 py-2 rounded-lg transition-all hover:opacity-90"
            style={{ background: "var(--color-critical)", color: "#fff" }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Map + hospital list */}
      {state === "ready" && (
        <div className="flex flex-col gap-4">
          {/* Google Maps embed (directions) */}
          {selected && userLocation && mapsApiKey && (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
              <iframe
                title={`Directions to ${selected.name}`}
                aria-label={`Map showing directions from your location to ${selected.name}`}
                src={getEmbedUrl(userLocation.lat, userLocation.lng, selected, mapsApiKey)}
                width="100%"
                height="320"
                style={{ border: 0, display: "block" }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}

          {/* Hospital list */}
          {hospitals.length > 0 ? (
            <ul role="list" aria-label="Nearby hospitals" className="flex flex-col gap-3">
              {hospitals.map((h, idx) => {
                const isSelected = selected?.placeId === h.placeId;
                return (
                  <li key={h.placeId} role="listitem">
                    <button
                      type="button"
                      onClick={() => setSelected(h)}
                      aria-pressed={isSelected}
                      aria-label={`${idx + 1}. ${h.name} — ${h.vicinity}${h.openNow ? " — Open now" : ""}. ${isSelected ? "Currently shown on map." : "Click to show on map."}`}
                      className="w-full text-left glass rounded-xl p-4 transition-all hover:bg-white/[0.06]"
                      style={{
                        border: isSelected ? "1px solid var(--color-accent)" : "1px solid var(--color-border)",
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 text-sm font-bold"
                          aria-hidden="true"
                          style={{
                            background: isSelected ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.06)",
                            color: isSelected ? "var(--color-accent)" : "var(--color-text-muted)",
                          }}
                        >
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate" style={{ color: "var(--color-text-primary)" }}>
                            {h.name}
                          </p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="flex items-center gap-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                              <MapPin size={10} aria-hidden="true" />
                              {h.vicinity}
                            </span>
                            {h.rating && (
                              <span className="flex items-center gap-1 text-xs" style={{ color: "var(--color-standard)" }}>
                                <Star size={10} aria-hidden="true" />
                                {h.rating.toFixed(1)}
                              </span>
                            )}
                            {h.openNow !== null && (
                              <span
                                className="flex items-center gap-1 text-xs"
                                style={{ color: h.openNow ? "var(--color-minor)" : "var(--color-critical)" }}
                              >
                                <Clock size={10} aria-hidden="true" />
                                {h.openNow ? "Open" : "Closed"}
                              </span>
                            )}
                          </div>
                        </div>
                        {userLocation && (
                          <a
                            href={getDirectionsUrl(userLocation.lat, userLocation.lng, h.location.lat, h.location.lng)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Get driving directions to ${h.name} in Google Maps (opens new tab)`}
                            className="shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all hover:opacity-80"
                            style={{ background: "rgba(99,102,241,0.12)", color: "var(--color-accent)" }}
                          >
                            <ExternalLink size={10} aria-hidden="true" />
                            Go
                          </a>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-center py-8" style={{ color: "var(--color-text-muted)" }}>
              No hospitals found within 15km. Try adjusting your location or check your connection.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
