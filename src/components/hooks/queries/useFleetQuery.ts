import { useApi } from '../useApi';
import { useDateParameters } from '../useDateParameters';

export interface FleetData {
  summary: {
    pageviews: number;
    visitors: number;
    visits: number;
    websites: number;
  };
  channels: { channel: string; visitors: number }[];
  conversions: {
    byChannel: { channel: string; eventName: string; conversions: number }[];
    byReferrer: {
      channel: string;
      referrerDomain: string;
      eventName: string;
      conversions: number;
    }[];
  };
  topSites: {
    websiteId: string;
    name: string;
    domain: string;
    phoneCall: number;
    formSubmit: number;
    conversions: number;
  }[];
}

export function useFleetQuery() {
  const { get, useQuery } = useApi();
  const { startAt, endAt, timezone } = useDateParameters();

  return useQuery<FleetData>({
    queryKey: ['fleet', { startAt, endAt, timezone }],
    queryFn: () => get('/fleet', { startAt, endAt, timezone }),
  });
}
