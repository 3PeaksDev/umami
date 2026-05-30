import { z } from 'zod';
import { getRequestDateRange, parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { withDateRange } from '@/lib/schema';
import {
  getFleetChannels,
  getFleetConversions,
  getFleetSummary,
  getFleetTopSites,
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

  const { startDate, endDate } = getRequestDateRange(query);
  const range = { startDate, endDate };

  const [summary, channels, conversions, topSites] = await Promise.all([
    getFleetSummary(range),
    getFleetChannels(range),
    getFleetConversions(range),
    getFleetTopSites({ ...range, limit: query.limit }),
  ]);

  return json({ summary, channels, conversions, topSites });
}
