"use client";

/**
 * Aegis Bridge — Site Header
 * Anonymous-first: shows "Link Account" for anon users, avatar + sign-out for linked.
 */
import { ShieldAlert, Activity, LogIn, LogOut, Loader2, Link2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/AuthContext";

const navLinks = [
  { href: "#triage", label: "Triage" },
  { href: "#hospital-map", label: "Hospital Map" },
  { href: "#history", label: "History" },
];

export default function Header() {
  const { user, loading, authError, isAnonymous, linkWithGoogle, signOutUser } = useAuth();

  return (
    <header
      role="banner"
      aria-label="Aegis Bridge site header"
      className="sticky top-0 z-50 glass-bright"
      style={{ borderRadius: 0, borderTop: "none", borderLeft: "none", borderRight: "none" }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">

          {/* Logo / brand */}
          <Link
            href="/"
            aria-label="Aegis Bridge home"
            className="flex items-center gap-2 rounded-md p-1 transition-opacity hover:opacity-80"
          >
            <span aria-hidden="true">
              <ShieldAlert
                size={28}
                strokeWidth={2.5}
                style={{ color: "var(--color-critical)" }}
                aria-hidden="true"
              />
            </span>
            <span className="text-lg font-extrabold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
              Aegis{" "}
              <span style={{ color: "var(--color-critical)" }}>Bridge</span>
            </span>
          </Link>

          {/* Primary navigation */}
          <nav role="navigation" aria-label="Primary navigation">
            <ul className="hidden sm:flex items-center gap-1" role="list">
              {navLinks.map(({ href, label }) => (
                <li key={href}>
                  <a
                    href={href}
                    className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-white/10"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Status + auth */}
          <div className="flex items-center gap-3">
            <div
              className="hidden sm:flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full"
              style={{
                background: "rgba(34, 197, 94, 0.1)",
                color: "var(--color-minor)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
              }}
              aria-label="System status: operational"
              role="status"
            >
              <Activity size={12} aria-hidden="true" />
              <span>Operational</span>
            </div>

            {loading ? (
              <div aria-label="Loading authentication state" role="status">
                <Loader2 size={18} className="animate-spin" style={{ color: "var(--color-text-muted)" }} aria-hidden="true" />
              </div>

            ) : user && !isAnonymous ? (
              /* ── Linked Google account ── */
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photoURL}
                    alt={`${user.displayName ?? "User"} profile picture`}
                    className="w-8 h-8 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    aria-hidden="true"
                    style={{ background: "var(--color-accent)", color: "#fff" }}
                  >
                    {(user.displayName ?? "U")[0]}
                  </div>
                )}
                <button
                  type="button"
                  onClick={signOutUser}
                  aria-label="Sign out"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.08)", color: "var(--color-text-secondary)" }}
                >
                  <LogOut size={12} aria-hidden="true" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>

            ) : (
              /* ── Anonymous session — offer optional account link ── */
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <span
                    className="hidden sm:inline text-xs px-2 py-1 rounded-full"
                    style={{ background: "rgba(255,255,255,0.06)", color: "var(--color-text-muted)" }}
                    aria-label="Currently using anonymous session"
                  >
                    Guest
                  </span>
                  <button
                    type="button"
                    onClick={linkWithGoogle}
                    aria-label="Link Google account to save triage history and enable Drive access"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 active:scale-95"
                    style={{ background: "var(--color-accent)", color: "#fff" }}
                  >
                    <Link2 size={14} aria-hidden="true" />
                    <span className="hidden sm:inline">Link Account</span>
                    <LogIn size={14} className="sm:hidden" aria-hidden="true" />
                  </button>
                </div>
                {authError && (
                  <p
                    role="alert"
                    className="text-xs max-w-48 text-right"
                    style={{ color: "var(--color-urgent)" }}
                    title={authError}
                  >
                    {authError.includes("auth/") ? "Auth error — check Firebase console" : authError.slice(0, 60)}
                  </p>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
