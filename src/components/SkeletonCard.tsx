/**
 * Aegis Bridge — Skeleton Loading Card
 * Animated placeholder while triage results are loading
 * a11y: aria-busy, aria-label
 */
export default function SkeletonCard() {
  return (
    <div
      role="status"
      aria-label="Loading triage results"
      aria-busy="true"
      className="glass rounded-2xl p-6 flex flex-col gap-4"
    >
      <span className="sr-only">Loading triage results, please wait…</span>

      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-6 w-40 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.08)" }} aria-hidden="true" />
        <div className="h-8 w-24 rounded-full animate-pulse" style={{ background: "rgba(239,68,68,0.12)" }} aria-hidden="true" />
      </div>

      {/* Content rows */}
      {[100, 80, 90, 70].map((w, i) => (
        <div
          key={i}
          className="h-4 rounded-md animate-pulse"
          style={{ background: "rgba(255,255,255,0.06)", width: `${w}%` }}
          aria-hidden="true"
        />
      ))}

      {/* Two-column grid */}
      <div className="grid grid-cols-2 gap-3 mt-2" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />
        ))}
      </div>
    </div>
  );
}
