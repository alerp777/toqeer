import { createLogger } from "@/lib/logger";
import { useQueryClient } from "@tanstack/react-query";
import { Component, useCallback, type ReactNode } from "react";
import { reportError } from "../lib/error-reporter";

const log = createLogger("[ErrorBoundary]");

type FallbackFn = (reset: () => void, error: Error | null) => ReactNode;

/* ── Branded Default Fallback ────────────────────────────────────────────────
   Functional component so it can call useQueryClient().
   On retry: clears React Query cache first so stale queries don't cause a
   crash loop when the boundary resets and child components re-fetch.        */
function DefaultFallback({ reset, error }: { reset: () => void; error: Error | null }) {
  const qc = useQueryClient();

  const handleRetry = useCallback(() => {
    /* Flush stale cache — prevents the re-mounted tree from immediately
       re-throwing due to a cached error response from the failed request. */
    qc.clear();
    reset();
  }, [qc, reset]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        background: "#0b0e11",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 340 }}>
        {/* Gold icon ring */}
        <div
          style={{
            margin: "0 auto 20px",
            width: 64,
            height: 64,
            borderRadius: 18,
            background: "rgba(240,185,11,0.1)",
            border: "1px solid rgba(240,185,11,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#F0B90B"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        {/* Title */}
        <h1
          style={{
            margin: "0 0 8px",
            fontSize: 18,
            fontWeight: 700,
            color: "#E8E9EF",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          Something went wrong
        </h1>

        {/* Error message */}
        <p
          style={{
            margin: "0 0 24px",
            fontSize: 13,
            lineHeight: 1.6,
            color: "#6B7280",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          {error?.message || "An unexpected error occurred. Please try again."}
        </p>

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Primary — gold branded retry */}
          <button
            onClick={handleRetry}
            style={{
              width: "100%",
              height: 48,
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, #F0B90B, #D97706)",
              color: "#0B0E11",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "Inter, system-ui, sans-serif",
              transition: "opacity 0.15s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = "0.9")}
            onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Retry
          </button>

          {/* Secondary — reload */}
          <button
            onClick={() => window.location.reload()}
            style={{
              width: "100%",
              height: 48,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
              color: "#9CA3AF",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "Inter, system-ui, sans-serif",
              transition: "background 0.15s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
          >
            Reload App
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── ErrorBoundaryCore — class component (internal) ─────────────────────────
   Must be a class to use getDerivedStateFromError + componentDidCatch.
   Accepts an optional FallbackFn; the public ErrorBoundary wrapper always
   supplies DefaultFallback when the caller does not provide their own.      */
interface CoreProps {
  children: ReactNode;
  fallback: FallbackFn;
}
interface CoreState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryCore extends Component<CoreProps, CoreState> {
  constructor(props: CoreProps) {
    super(props);
    this.state = { hasError: false, error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error: Error): CoreState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    log.error("caught:", error, info);
    reportError({
      errorType: "frontend_crash",
      errorMessage: error.message || "Component crash",
      stackTrace: error.stack || info.componentStack,
      componentName: info.componentStack?.split("\n")[1]?.trim() || undefined,
    });
  }

  reset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback(this.reset, this.state.error);
    }
    return this.props.children;
  }
}

/* ── ErrorBoundary — public functional wrapper ───────────────────────────────
   Functional so it can call useQueryClient() and pass DefaultFallback.
   Callers may supply their own fallback (ReactNode or FallbackFn) to override.

   Global Re-use:
     App.tsx — wraps every lazy-loaded page (14 usages, zero prop changes)
     Any future page can wrap its own subtree with <ErrorBoundary>          */
interface Props {
  children: ReactNode;
  fallback?: ReactNode | FallbackFn;
}

export function ErrorBoundary({ children, fallback }: Props) {
  const qc = useQueryClient();

  /* Stable fallback function: if caller passes a ReactNode, wrap it;
     if they pass a FallbackFn, use it directly; otherwise DefaultFallback.  */
  const resolvedFallback = useCallback<FallbackFn>(
    (reset, error) => {
      if (typeof fallback === "function") {
        return (fallback as FallbackFn)(reset, error);
      }
      if (fallback != null) {
        return fallback as ReactNode;
      }
      return <DefaultFallback reset={reset} error={error} />;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fallback, qc]
  );

  return (
    <ErrorBoundaryCore fallback={resolvedFallback}>
      {children}
    </ErrorBoundaryCore>
  );
}
