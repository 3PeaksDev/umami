import { notImplemented, runQuery } from '@/lib/db';
import prisma from '@/lib/prisma';
import type { FleetDateRange } from './getFleetSummary';

export interface FleetGeoDatum {
  x: string;
  y: number;
}

export type FleetGeoMetric = 'visits' | 'conversions';

/**
 * Fleet-wide visitor geography by country (ISO-2), for either traffic (visits)
 * or conversions. This is visitor-IP geo from the session table, not site
 * location. Returns the `{ x, y }` shape expected by WorldMap's `data` prop.
 */
export async function getFleetGeo(
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
    select session.country as x, ${countExpr} as y
    from website_event
    inner join session on website_event.session_id = session.session_id
    where website_event.created_at between {{startDate}} and {{endDate}}
      and session.country is not null
      and session.country != ''
      ${eventFilter}
    group by 1
    order by 2 desc
    `,
    { startDate, endDate },
    `getFleetGeo.${metric}`,
  ).then(results => results.map((item: any) => ({ x: item.x, y: Number(item.y) })));
}
