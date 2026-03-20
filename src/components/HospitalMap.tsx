"use client";

/**
 * Aegis Bridge — Hospital Routing Map
 * Side-by-side list + interactive Google Maps JS API
 * Numbered pins per hospital; clicking pin or list item opens
 * Google Maps directions (current location → hospital) ready to press Start.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { MapPin, Navigation, Star, Clock, AlertCircle, Loader2 } from "lucide-react";

interface Hospital {
  placeId: string;
  name: string;
  vicinity: string;
  rating: number | null;
  openNow: boolean | null;
  location: { lat: number; lng: number };
}

interface HospitalMapProps {
  specialty?: string;
}

function directionsUrl(userLat: number, userLng: number, destLat: number, destLng: number) {
  return `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${destLat},${destLng}&travelmode=driving`;
}

function loadMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") { reject(); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).google?.maps) { resolve(); return; }
    const existing = document.getElementById("gmaps-script");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject());
      return;
    }
    const script = document.createElement("script");
    script.id = "gmaps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(script);
  });
}

// Dark theme style for the map
const DARK_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#12121e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8b8fa8" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#12121e" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2a3e" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#6b6b8a" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a3a55" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a1628" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d5a7a" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#2a2a3e" }] },
];

export default function HospitalMap({ specialty = "General Emergency" }: HospitalMapProps) {
  const [state, setState] = useState<"idle" | "locating" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selected, setSelected] = useState<Hospital | null>(null);

  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  // ── Rebuild markers whenever hospitals or selection changes ──────────────
  const rebuildMarkers = useCallback(
    (map: google.maps.Map, list: Hospital[], sel: Hospital | null, uLat: number, uLng: number) => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];

      list.forEach((h, idx) => {
        const isSel = sel?.placeId === h.placeId;
        const marker = new google.maps.Marker({
          position: h.location,
          map,
          title: h.name,
          zIndex: isSel ? 100 : idx + 1,
          label: {
            text: String(idx + 1),
            color: "#ffffff",
            fontSize: "12px",
            fontWeight: "bold",
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: isSel ? 18 : 14,
            fillColor: isSel ? "#ef4444" : "#6366f1",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });

        marker.addListener("click", () => {
          window.open(directionsUrl(uLat, uLng, h.location.lat, h.location.lng), "_blank");
        });

        markersRef.current.push(marker);
      });
    },
    []
  );

  // ── Init map once hospitals are loaded ───────────────────────────────────
  const initMap = useCallback(
    async (list: Hospital[], uLat: number, uLng: number) => {
      if (!mapDivRef.current || !apiKey) return;
      try {
        await loadMapsScript(apiKey);
      } catch {
        return; // Map unavailable — list still works
      }

      const map = new google.maps.Map(mapDivRef.current, {
        center: { lat: uLat, lng: uLng },
        zoom: 13,
        mapTypeControl: false,
        fullscreenControl: true,
        streetViewControl: false,
        zoomControl: true,
        styles: DARK_STYLES,
      });

      // Green dot for user location
      new google.maps.Marker({
        position: { lat: uLat, lng: uLng },
        map,
        title: "Your location",
        zIndex: 200,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#22c55e",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });

      mapRef.current = map;
      rebuildMarkers(map, list, list[0] ?? null, uLat, uLng);
    },
    [apiKey, rebuildMarkers]
  );

  // Sync markers when selected changes after map is ready
  useEffect(() => {
    if (mapRef.current && userLocation && hospitals.length > 0) {
      rebuildMarkers(mapRef.current, hospitals, selected, userLocation.lat, userLocation.lng);
      if (selected) mapRef.current.panTo(selected.location);
    }
  }, [selected, hospitals, userLocation, rebuildMarkers]);

  // ── Fetch hospitals ──────────────────────────────────────────────────────
  const fetchHospitals = useCallback(
    async (lat: number, lng: number) => {
      setState("loading");
      try {
        const res = await fetch(
          `/api/hospitals?lat=${lat}&lng=${lng}&specialty=${encodeURIComponent(specialty)}`
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? `Server error ${res.status}`);
        }
        const data = await res.json() as { hospitals?: Hospital[] };
        const list = data.hospitals ?? [];
        setHospitals(list);
        setSelected(list[0] ?? null);
        setState("ready");
        // initMap runs after DOM has the map div
        setTimeout(() => initMap(list, lat, lng), 30);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load hospitals.");
        setState("error");
      }
    },
    [specialty, initMap]
  );

  // ── Geolocate ────────────────────────────────────────────────────────────
  const startLocating = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setState("error");
      return;
    }
    setState("locating");
    setError(null);
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    mapRef.current = null;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
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

  useEffect(() => {
    startLocating();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <section aria-labelledby="map-section-title" className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2
          id="map-section-title"
          className="text-lg font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
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
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
            }}
          >
            <Navigation size={12} aria-hidden="true" />
            Refresh
          </button>
        )}
      </div>

      {/* Loading */}
      {(state === "idle" || state === "locating" || state === "loading") && (
        <div
          role="status"
          aria-live="polite"
          aria-label={state === "locating" ? "Getting your location" : "Loading nearby hospitals"}
          className="glass flex flex-col items-center justify-center gap-3 py-16 text-center rounded-xl"
        >
          <Loader2
            size={28}
            className="animate-spin"
            style={{ color: "var(--color-accent)" }}
            aria-hidden="true"
          />
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
          <p className="text-sm max-w-xs" style={{ color: "var(--color-text-secondary)" }}>
            {error}
          </p>
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

      {/* ── Side-by-side: List (left) + Map (right) ── */}
      {state === "ready" && (
        <div className="flex flex-col lg:flex-row gap-4 items-start">

          {/* Hospital list */}
          <div className="w-full lg:w-1/2 flex flex-col gap-2">
            {hospitals.length === 0 ? (
              <p className="text-sm py-8 text-center" style={{ color: "var(--color-text-muted)" }}>
                No hospitals found within 15 km. Try adjusting your location.
              </p>
            ) : (
              <ul role="list" aria-label="Nearby hospitals sorted by distance" className="flex flex-col gap-2">
                {hospitals.map((h, idx) => {
                  const isSel = selected?.placeId === h.placeId;
                  const url = userLocation
                    ? directionsUrl(userLocation.lat, userLocation.lng, h.location.lat, h.location.lng)
                    : null;
                  return (
                    <li key={h.placeId}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelected(h)}
                        onKeyDown={(e) => e.key === "Enter" && setSelected(h)}
                        aria-pressed={isSel}
                        aria-label={`${idx + 1}. ${h.name}${h.openNow ? " — Open" : ""}`}
                        className="glass rounded-xl p-4 cursor-pointer transition-all hover:bg-white/[0.06]"
                        style={{
                          border: isSel
                            ? "1px solid var(--color-accent)"
                            : "1px solid var(--color-border)",
                        }}
                      >
                        <div className="flex items-start gap-3">
                          {/* Numbered badge */}
                          <div
                            className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 text-sm font-bold"
                            aria-hidden="true"
                            style={{
                              background: isSel
                                ? "rgba(239,68,68,0.18)"
                                : "rgba(99,102,241,0.15)",
                              color: isSel ? "var(--color-critical)" : "var(--color-accent)",
                            }}
                          >
                            {idx + 1}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p
                              className="font-semibold text-sm leading-snug"
                              style={{ color: "var(--color-text-primary)" }}
                            >
                              {h.name}
                            </p>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              <span
                                className="flex items-center gap-1 text-xs"
                                style={{ color: "var(--color-text-muted)" }}
                              >
                                <MapPin size={10} aria-hidden="true" />
                                {h.vicinity}
                              </span>
                              {h.rating != null && (
                                <span
                                  className="flex items-center gap-1 text-xs"
                                  style={{ color: "var(--color-standard)" }}
                                >
                                  <Star size={10} aria-hidden="true" />
                                  {h.rating.toFixed(1)}
                                </span>
                              )}
                              {h.openNow !== null && (
                                <span
                                  className="flex items-center gap-1 text-xs"
                                  style={{
                                    color: h.openNow
                                      ? "var(--color-minor)"
                                      : "var(--color-critical)",
                                  }}
                                >
                                  <Clock size={10} aria-hidden="true" />
                                  {h.openNow ? "Open" : "Closed"}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Go button — opens Google Maps navigation */}
                          {url && (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Open Google Maps navigation to ${h.name}`}
                              className="shrink-0 flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all hover:opacity-80"
                              style={{
                                background: "rgba(99,102,241,0.15)",
                                color: "var(--color-accent)",
                              }}
                            >
                              ↗ Go
                            </a>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Map */}
          <div
            className="w-full lg:w-1/2 rounded-xl overflow-hidden sticky top-20"
            style={{
              border: "1px solid var(--color-border)",
              minHeight: "460px",
              height: "460px",
            }}
          >
            {apiKey ? (
              <div
                ref={mapDivRef}
                style={{ width: "100%", height: "100%" }}
                aria-label="Interactive hospital map — click a numbered pin to open navigation"
              />
            ) : (
              <div
                className="flex items-center justify-center h-full text-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
                Map unavailable — Google Maps API key not configured.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
