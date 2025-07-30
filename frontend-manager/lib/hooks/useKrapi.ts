import { KrapiClient } from '@krapi/sdk';
import { useAuth } from '@/contexts/AuthContext';

export function useKrapi(): KrapiClient {
  const { krapiClient } = useAuth();
  return krapiClient;
}