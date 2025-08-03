import { KrapiSDK } from '@krapi/sdk';
import { useAuth } from '@/contexts/auth-context';

/**
 * Hook to get the authenticated KRAPI SDK instance
 * @returns The KRAPI SDK instance from the auth context
 */
export function useKrapi(): KrapiSDK | null {
  const { krapi } = useAuth();
  return krapi;
}

// Legacy function for backward compatibility
export function useKrapiClient(): KrapiSDK {
  const { krapi } = useAuth();
  if (!krapi) {
    throw new Error('Krapi client not initialized. Make sure you are authenticated.');
  }
  return krapi;
}