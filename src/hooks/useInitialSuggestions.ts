import { useEffect, useState } from "react";

import type { Suggestion } from "@/lib/types";

interface UseInitialSuggestionsReturn {
  suggestions: Suggestion[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Custom hook to load initial suggestions from the API.
 * Fetches suggestions once on mount and handles loading/error states.
 *
 * @returns Object containing suggestions array, loading state, and error state
 */
export function useInitialSuggestions(): UseInitialSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadInitialSuggestions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/initial-suggestions");

        if (!response.ok) {
          throw new Error(
            `Failed to load initial suggestions: ${response.statusText}`,
          );
        }

        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        console.error("Error loading initial suggestions:", error);
        setError(error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialSuggestions();
  }, []);

  return {
    suggestions,
    isLoading,
    error,
  };
}
