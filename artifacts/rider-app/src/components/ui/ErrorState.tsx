import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  subtitle?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  subtitle = "Check your connection and try again.",
  onRetry,
  retryLabel = "Try Again",
  className = "",
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center px-6 py-16 text-center ${className}`}
    >
      {/* Icon ring — amber/gold tint; neutral enough for both light and dark surfaces */}
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-amber-200/60 bg-amber-50 dark:border-[#F0B90B]/20 dark:bg-[#F0B90B]/[0.07]">
        <AlertCircle size={28} className="text-amber-500 dark:text-[#F0B90B]" />
      </div>

      <p className="text-base font-bold text-gray-700 dark:text-white/80">{title}</p>

      {subtitle && (
        <p className="mt-1 text-sm leading-relaxed text-gray-400 dark:text-white/40">{subtitle}</p>
      )}

      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 flex items-center gap-2 rounded-2xl bg-[#F0B90B] px-5 py-2.5 text-sm font-bold text-gray-900 shadow-sm shadow-amber-200/50 transition-all hover:bg-amber-400 active:scale-[0.98] dark:shadow-none"
        >
          <RefreshCw size={13} />
          {retryLabel}
        </button>
      )}
    </div>
  );
}
