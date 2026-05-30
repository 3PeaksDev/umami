import { notImplemented, runQuery } from '@/lib/db';
import prisma from '@/lib/prisma';
import { channelCaseSql } from './fleetChannel';
import type { FleetDateRange } from './getFleetSummary';

export interface FleetChannelData {
  channel: string;
  visitors: number;
}

export async function getFleetChannels(filters: FleetDateRange): Promise<FleetChannelData[]> {
  return runQuery({
    prisma: () => relationalQuery(filters),
    clickhouse: () => notImplemented(),
  });
}

async function relationalQuery({
  startDate,
  endDate,
}: FleetDateRange): Promise<FleetChannelData[]> {
  const { rawQuery } = prisma;

  return rawQuery(
    `
    with events as (
      select
        website_event.referrer_domain,
        website_event.url_query,
        website_event.utm_medium,
        website_event.utm_source,
        website_event.hostname,
        website_event.session_id
      from website_event
      where website_event.created_at between {{startDate}} and {{endDate}}
        and website_event.event_type NOT IN (2, 5)
    ),
    channels as (
      select ${channelCaseSql()} as channel, count(distinct session_id) as y
      from events
      group by 1
    )
    select channel, sum(y) as y
    from channels
    group by channel
    order by y desc
    `,
    { startDate, endDate },
    'getFleetChannels',
  ).then(results =>
    results.map((item: any) => ({ channel: item.channel, visitors: Number(item.y) })),
  );
}
