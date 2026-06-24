import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Don't retry on rate limit errors - just fail gracefully
        if (error.message?.includes('rate limit') || error.message?.includes('429')) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => {
        // Exponential backoff: 1s, 2s, 4s
        return Math.min(1000 * 2 ** attemptIndex, 5000);
      },
    },
    mutations: {
      retry: (failureCount, error) => {
        if (error.message?.includes('rate limit') || error.message?.includes('429')) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    },
  },
});