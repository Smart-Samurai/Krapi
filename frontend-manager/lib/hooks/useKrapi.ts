/**
 * useKrapi Hook
 * 
 * Hook for accessing KRAPI SDK instance in client components.
 * Uses dynamic import to avoid bundling server-only dependencies.
 * 
 * SDK-FIRST ARCHITECTURE: All API calls must go through frontend API routes which use SDK.
 * This hook provides SDK access for client-side operations that need direct SDK access.
 * 
 * @module lib/hooks/useKrapi
 * @example
 * const { krapi, loading } = useKrapi();
 * if (krapi) {
 *   await krapi.projects.getAll();
 * }
 */

import type { KrapiWrapper } from "@smartsamurai/krapi-sdk";
import { useState, useEffect } from "react";

export function useKrapi() {
  const [krapi, setKrapi] = useState<KrapiWrapper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadKrapi() {
      try {
        // Dynamic import to avoid bundling server-only dependencies
        const { krapi: krapiInstance } = await import("@smartsamurai/krapi-sdk");
        
        if (mounted) {
          setKrapi(krapiInstance);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error("Failed to load KRAPI SDK"));
          setLoading(false);
        }
      }
    }

    loadKrapi();

    return () => {
      mounted = false;
    };
  }, []);

  return { krapi, loading, error };
}

