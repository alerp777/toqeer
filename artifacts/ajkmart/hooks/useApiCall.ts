import { useCallback, useRef, useState } from "react";
import { useToast } from "@/context/ToastContext";

type ApiCallState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  retrying: boolean;
  retryCount: number;
  execute: (...args: any[]) => Promise<T | null>;
  retry: () => Promise<T | null>;
  reset: () => void;
};

const BACKOFF_BASE_MS = 1000;
const MAX_RETRIES = 3;

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function extractError(e: unknown): string {
  if (e instanceof Error) return e.message || "Something went wrong. Please try again.";
  if (typeof e === "object" && e !== null) {
    const obj = e as Record<string, unknown>;
    const response = obj["response"];
    if (typeof response === "object" && response !== null) {
      const data = (response as Record<string, unknown>)["data"];
      if (typeof data === "object" && data !== null) {
        const apiErr = (data as Record<string, unknown>)["error"];
        if (typeof apiErr === "string" && apiErr) return apiErr;
      }
    }
    const data = obj["data"];
    if (typeof data === "object" && data !== null) {
      const apiErr = (data as Record<string, unknown>)["error"];
      if (typeof apiErr === "string" && apiErr) return apiErr;
    }
    const msg = obj["message"];
    if (typeof msg === "string" && msg) return msg;
    const err = obj["error"];
    if (typeof err === "string" && err) return err;
  }
  if (typeof e === "string" && e) return e;
  return "Something went wrong. Please try again.";
}

export function useApiCall<T>(
  apiFn: (...args: any[]) => Promise<T>,
  options?: {
    showErrorToast?: boolean;
    maxRetries?: number;
    onSuccess?: (data: T) => void;
    onError?: (error: string) => void;
    retryMessage?: string;
  },
): ApiCallState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const lastArgsRef = useRef<any[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { showToast } = useToast();

  // Keep latest options and apiFn in refs so callbacks never go stale without
  // needing to be recreated on every render (avoids infinite re-render loops).
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const apiFnRef = useRef(apiFn);
  apiFnRef.current = apiFn;

  const callWithRetry = useCallback(
    async (args: any[], isRetry = false): Promise<T | null> => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const curOptions   = optionsRef.current;
      const showErr      = curOptions?.showErrorToast !== false;
      const maxRetries   = curOptions?.maxRetries ?? MAX_RETRIES;

      if (!isRetry) {
        setLoading(true);
        setError(null);
        setRetryCount(0);
      }

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (controller.signal.aborted) return null;

        if (attempt > 0) {
          setRetrying(true);
          setRetryCount(attempt);
          if (showErr) {
            showToast(
              optionsRef.current?.retryMessage || `Retrying... (${attempt}/${maxRetries})`,
              "warning",
            );
          }
          await delay(BACKOFF_BASE_MS * Math.pow(2, attempt - 1));
        }

        try {
          const result = await apiFnRef.current(...args);
          if (controller.signal.aborted) return null;
          setData(result);
          setLoading(false);
          setRetrying(false);
          setError(null);
          setRetryCount(0);
          optionsRef.current?.onSuccess?.(result);
          return result;
        } catch (e: unknown) {
          if (controller.signal.aborted) return null;
          const msg = extractError(e);
          if (attempt === maxRetries) {
            setError(msg);
            setLoading(false);
            setRetrying(false);
            if (showErr) {
              showToast(msg, "error");
            }
            optionsRef.current?.onError?.(msg);
            return null;
          }
        }
      }
      return null;
    },
    [showToast],
  );

  const execute = useCallback(
    async (...args: any[]) => {
      lastArgsRef.current = args;
      return callWithRetry(args, false);
    },
    [callWithRetry],
  );

  const retry = useCallback(async () => {
    return callWithRetry(lastArgsRef.current, true);
  }, [callWithRetry]);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setData(null);
    setLoading(false);
    setError(null);
    setRetrying(false);
    setRetryCount(0);
  }, []);

  return { data, loading, error, retrying, retryCount, execute, retry, reset };
}
