import { KrapiClient } from '@krapi/sdk';
import { useAuth } from '@/contexts/auth-context';

export function useKrapi(): KrapiClient | null {
  const { krapi } = useAuth();
  return krapi;
}

export function useKrapiClient(): KrapiClient {
  const { krapi } = useAuth();
  if (!krapi) {
    throw new Error('Krapi client not initialized. Make sure you are authenticated.');
  }
  return krapi;
}