import { useMemo } from 'react';
import { createKrapi, KrapiPackage } from '@/lib/krapi/factory';
import config from '@/lib/config';

export function useKrapi(): KrapiPackage {
  const krapi = useMemo(() => {
    return createKrapi({
      endpoint: config.api.baseUrl,
      timeout: config.api.timeout,
    });
  }, []);

  return krapi;
}