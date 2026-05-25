import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      networkMode: "offlineFirst",
      /* Prevent background refetches from firing on every render while the
         device is online.  Individual queries override this where tighter
         freshness is needed (e.g. live ride requests use per-tier intervals). */
      staleTime: 10_000,
    },
  },
});
