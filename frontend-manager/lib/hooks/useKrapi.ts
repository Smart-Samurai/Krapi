import { useMemo } from 'react';
import { KrapiClient } from '@krapi/sdk';
import config from '@/lib/config';
import { useAuth } from '@/contexts/AuthContext';

export function useKrapi(): KrapiClient {
  const { token } = useAuth();
  
  const krapi = useMemo(() => {
    return new KrapiClient({
      baseURL: config.api.baseUrl,
      authToken: token || undefined,
    });
  }, [token]);

  return krapi;
}