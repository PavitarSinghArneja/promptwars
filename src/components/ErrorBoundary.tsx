"use client";

/**
 * Aegis Bridge — Error Boundary
 * Catches React render errors and shows a user-friendly fallback.
 * a11y: role="alert", descriptive error message
 */
import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  override componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="flex flex-col items-center justify-center gap-4 py-16 text-center px-6"
        >
          <div
            className="flex items-center justify-center w-16 h-16 rounded-2xl"
            aria-hidden="true"
            style={{ background: "rgba(239,68,68,0.12)" }}
          >
            <AlertTriangle size={28} style={{ color: "var(--color-critical)" }} />
          </div>
          <div>
            <p className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {this.props.fallbackMessage ?? "Something went wrong"}
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
              {this.state.message || "An unexpected error occurred. Please refresh and try again."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, message: "" })}
            aria-label="Retry — dismiss error and try again"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
            style={{ background: "var(--color-critical)", color: "#fff" }}
          >
            <RefreshCw size={14} aria-hidden="true" />
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
