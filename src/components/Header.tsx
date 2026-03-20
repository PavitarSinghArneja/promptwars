"use client";

/**
 * Aegis Bridge — Site Header
 * Glassmorphism nav bar with semantic landmark, ARIA, keyboard nav
 */
import { ShieldAlert, Activity, LogIn } from "lucide-react";
import Link from "next/link";

const navLinks = [
  { href: "#triage", label: "Triage" },
  { href: "#hospital-map", label: "Hospital Map" },
  { href: "#history", label: "History" },
];

export default function Header() {
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
            <span aria-hidden="true" className="flex items-center justify-center">
              <ShieldAlert
                size={28}
                strokeWidth={2.5}
                style={{ color: "var(--color-critical)" }}
                aria-hidden="true"
              />
            </span>
            <span className="text-lg font-800 tracking-tight" style={{ color: "var(--color-text-primary)" }}>
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

          {/* Live status indicator + sign-in */}
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
              <span>System Operational</span>
            </div>

            <button
              type="button"
              aria-label="Sign in with Google"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 active:scale-95"
              style={{
                background: "var(--color-critical)",
                color: "#fff",
              }}
            >
              <LogIn size={14} aria-hidden="true" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
