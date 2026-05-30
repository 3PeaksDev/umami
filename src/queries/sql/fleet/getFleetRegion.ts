import { notImplemented, runQuery } from '@/lib/db';
import prisma from '@/lib/prisma';
import type { FleetGeoDatum, FleetGeoMetric } from './getFleetGeo';
import type { FleetDateRange } from './getFleetSummary';

/**
 * Fleet-wide visitor geography by US state/region (ISO 3166-2, e.g. `US-CA`),
 * for either traffic (visits) or conversions. Filtered to country = 'US' since
 * the whole market is US-only and region codes are only meaningful per-country.
 * Returns the `{ x, y }` shape expected by UsaMap's `data` prop.
 */
export async function getFleetRegion(
  filters: FleetDateRange & { metric: FleetGeoMetric },
): Promise<FleetGeoDatum[]> {
  return runQuery({
    prisma: () => relationalQuery(filters),
    clickhouse: () => notImplemented(),
  });
}

async function relationalQuery({
  startDate,
  endDate,
  metric,
}: FleetDateRange & { metric: FleetGeoMetric }): Promise<FleetGeoDatum[]> {
  const { rawQuery } = prisma;

  const eventFilter =
    metric === 'conversions'
      ? `and website_event.event_type = 2 and website_event.event_name in ('phone_call', 'form_submit')`
      : `and website_event.event_type NOT IN (2, 5)`;

  const countExpr =
    metric === 'conversions' ? `count(*)` : `count(distinct website_event.visit_id)`;

  return rawQuery(
    `
    select session.region as x, ${countExpr} as y
    from website_event
    inner join session on website_event.session_id = session.session_id
    where website_event.created_at between {{startDate}} and {{endDate}}
      and session.country = 'US'
      and session.region is not null
      and session.region != ''
      ${eventFilter}
    group by 1
    order by 2 desc
    `,
    { startDate, endDate },
    `getFleetRegion.${metric}`,
  ).then(results => results.map((item: any) => ({ x: item.x, y: Number(item.y) })));
}
