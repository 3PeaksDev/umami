import { notImplemented, runQuery } from '@/lib/db';
import prisma from '@/lib/prisma';

export interface FleetDateRange {
  startDate: Date;
  endDate: Date;
}

export interface FleetSummaryData {
  pageviews: number;
  visitors: number;
  visits: number;
  websites: number;
}

export async function getFleetSummary(filters: FleetDateRange): Promise<FleetSummaryData> {
  return runQuery({
    prisma: () => relationalQuery(filters),
    clickhouse: () => notImplemented(),
  });
}

async function relationalQuery({ startDate, endDate }: FleetDateRange): Promise<FleetSummaryData> {
  const { rawQuery } = prisma;

  return rawQuery(
    `
    select
      cast(coalesce(sum(t.c), 0) as bigint) as "pageviews",
      count(distinct t.session_id) as "visitors",
      count(distinct t.visit_id) as "visits",
      count(distinct t.website_id) as "websites"
    from (
      select
        website_event.website_id,
        website_event.session_id,
        website_event.visit_id,
        count(*) as "c"
      from website_event
      where website_event.created_at between {{startDate}} and {{endDate}}
        and website_event.event_type NOT IN (2, 5)
      group by 1, 2, 3
    ) as t
    `,
    { startDate, endDate },
    'getFleetSummary',
  ).then(result => {
    const row = result?.[0] ?? {};
    return {
      pageviews: Number(row.pageviews ?? 0),
      visitors: Number(row.visitors ?? 0),
      visits: Number(row.visits ?? 0),
      websites: Number(row.websites ?? 0),
    };
  });
}
