import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { formatFiat, satsToFiat } from '../currencies';

export function useBTCPrice() {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: api.settings.get,
  });

  const currency = settings?.fiat_currency ?? 'USD';

  const { data, isLoading } = useQuery({
    queryKey: ['btc-price', currency],
    queryFn: async () => {
      const res = await fetch(`/api/price?currency=${currency}`);
      if (!res.ok) throw new Error('Price fetch failed');
      return res.json() as Promise<{ currency: string; price: number; stale?: boolean }>;
    },
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
    enabled: !!currency,
  });

  const price = data?.price ?? null;

  return {
    price,
    currency,
    isLoading,
    /** Convert sats to formatted fiat string e.g. "$3,921.42" */
    toFiat: (sats: number): string | null => {
      if (!price) return null;
      return formatFiat(satsToFiat(sats, price), currency);
    },
    /** Convert sats to raw fiat number */
    toFiatNumber: (sats: number): number | null => {
      if (!price) return null;
      return satsToFiat(sats, price);
    },
  };
}
