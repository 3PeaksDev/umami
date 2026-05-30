import { notImplemented, runQuery } from '@/lib/db';
import prisma from '@/lib/prisma';
import type { FleetDateRange } from './getFleetSummary';

export interface FleetTrendDatum {
  date: string;
  pageviews: number;
  visitors: number;
  visits: number;
}

/**
 * Fleet-wide traffic over time, bucketed by `unit` (day by default), across all
 * sites. Mirrors getPageviewStats but without the website_id filter.
 */
export async function getFleetTrend(
  filters: FleetDateRange & { unit?: string; timezone?: string },
): Promise<FleetTrendDatum[]> {
  return runQuery({
    prisma: () => relationalQuery(filters),
    clickhouse: () => notImplemented(),
  });
}

async function relationalQuery({
  startDate,
  endDate,
  unit = 'day',
  timezone = 'utc',
}: FleetDateRange & { unit?: string; timezone?: string }): Promise<FleetTrendDatum[]> {
  const { getDateSQL, rawQuery } = prisma;

  return rawQuery(
    `
    select
      ${getDateSQL('website_event.created_at', unit, timezone)} as date,
      count(*) as pageviews,
      count(distinct website_event.session_id) as visitors,
      count(distinct website_event.visit_id) as visits
    from website_event
    where website_event.created_at between {{startDate}} and {{endDate}}
      and website_event.event_type NOT IN (2, 5)
    group by 1
    order by 1
    `,
    { startDate, endDate },
    'getFleetTrend',
  ).then(results =>
    results.map((item: any) => ({
      date: item.date,
      pageviews: Number(item.pageviews),
      visitors: Number(item.visitors),
      visits: Number(item.visits),
    })),
  );
}
