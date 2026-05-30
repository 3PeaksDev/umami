import { useApi } from '../useApi';
import { useDateParameters } from '../useDateParameters';

export interface FleetGeoDatum {
  x: string;
  y: number;
}

export interface FleetData {
  summary: {
    pageviews: number;
    visitors: number;
    visits: number;
    websites: number;
  };
  channels: { channel: string; visitors: number; visits: number }[];
  channelReferrers: { channel: string; referrerDomain: string; visitors: number }[];
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
    visits: number;
  }[];
  trend: { date: string; pageviews: number; visitors: number; visits: number }[];
  geo: {
    visitsByCountry: FleetGeoDatum[];
    conversionsByCountry: FleetGeoDatum[];
  };
  devices: {
    browser: FleetGeoDatum[];
    os: FleetGeoDatum[];
    device: FleetGeoDatum[];
  };
}

export function useFleetQuery() {
  const { get, useQuery } = useApi();
  const { startAt, endAt, unit, timezone } = useDateParameters();

  return useQuery<FleetData>({
    queryKey: ['fleet', { startAt, endAt, unit, timezone }],
    queryFn: () => get('/fleet', { startAt, endAt, unit, timezone }),
  });
}
