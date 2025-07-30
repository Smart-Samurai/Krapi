import { useMemo } from 'react';
import { KrapiClient } from '@krapi/sdk';
import config from '@/lib/config';
import { useAuth } from '@/contexts/AuthContext';

export function useKrapi(): KrapiClient {
  const { token } = useAuth();
  
  const krapi = useMemo(() => {
    // Remove /krapi/k1 from the baseURL since SDK appends it
    const baseURL = config.api.baseUrl.replace(/\/krapi\/k1\/?$/, '');
    return new KrapiClient({
      baseURL,
      authToken: token || undefined,
    });
  }, [token]);

  return krapi;
}