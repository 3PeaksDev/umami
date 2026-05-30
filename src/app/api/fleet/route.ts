import { z } from 'zod';
import { getRequestDateRange, parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { withDateRange } from '@/lib/schema';
import {
  getFleetChannelReferrers,
  getFleetChannels,
  getFleetConversions,
  getFleetDevices,
  getFleetGeo,
  getFleetRegion,
  getFleetSummary,
  getFleetTopSites,
  getFleetTrend,
} from '@/queries/sql';

export async function GET(request: Request) {
  const schema = withDateRange({
    limit: z.coerce.number().int().positive().optional(),
  });

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  // Fleet view aggregates across every website in the shared DB, so restrict it
  // to admins rather than per-website permission checks.
  if (!auth.user?.isAdmin) {
    return unauthorized();
  }

  const { startDate, endDate, unit, timezone } = getRequestDateRange(query);
  const range = { startDate, endDate };

  const [
    summary,
    channels,
    channelReferrers,
    conversions,
    topSites,
    trend,
    visitsByCountry,
    conversionsByCountry,
    visitsByRegion,
    conversionsByRegion,
    browser,
    os,
    device,
  ] = await Promise.all([
    getFleetSummary(range),
    getFleetChannels(range),
    getFleetChannelReferrers(range),
    getFleetConversions(range),
    getFleetTopSites({ ...range, limit: query.limit }),
    getFleetTrend({ ...range, unit, timezone }),
    getFleetGeo({ ...range, metric: 'visits' }),
    getFleetGeo({ ...range, metric: 'conversions' }),
    getFleetRegion({ ...range, metric: 'visits' }),
    getFleetRegion({ ...range, metric: 'conversions' }),
    getFleetDevices({ ...range, type: 'browser' }),
    getFleetDevices({ ...range, type: 'os' }),
    getFleetDevices({ ...range, type: 'device' }),
  ]);

  return json({
    summary,
    channels,
    channelReferrers,
    conversions,
    topSites,
    trend,
    geo: { visitsByCountry, conversionsByCountry, visitsByRegion, conversionsByRegion },
    devices: { browser, os, device },
  });
}
