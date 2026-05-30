import { notImplemented, runQuery } from '@/lib/db';
import prisma from '@/lib/prisma';
import { channelCaseSql } from './fleetChannel';
import type { FleetDateRange } from './getFleetSummary';

export interface FleetChannelReferrer {
  channel: string;
  referrerDomain: string;
  visitors: number;
}

/**
 * The referrer breakdown within each channel - the drill-down behind the
 * Channels table. Classifies each event into a channel (same stock CASE as
 * getFleetChannels) and groups by channel + referrer_domain, so e.g. the
 * organicSearch row can expand into google.com vs chatgpt.com. Uses distinct
 * session_id to line up with the Channels table's visitor counts.
 */
export async function getFleetChannelReferrers(
  filters: FleetDateRange,
): Promise<FleetChannelReferrer[]> {
  return runQuery({
    prisma: () => relationalQuery(filters),
    clickhouse: () => notImplemented(),
  });
}

async function relationalQuery({
  startDate,
  endDate,
}: FleetDateRange): Promise<FleetChannelReferrer[]> {
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
    classified as (
      select
        ${channelCaseSql()} as channel,
        case when referrer_domain = '' or referrer_domain is null then '(direct)' else referrer_domain end as referrer_domain,
        session_id
      from events
    )
    select channel, referrer_domain, count(distinct session_id) as y
    from classified
    group by 1, 2
    order by y desc
    `,
    { startDate, endDate },
    'getFleetChannelReferrers',
  ).then(results =>
    results.map((item: any) => ({
      channel: item.channel,
      referrerDomain: item.referrer_domain,
      visitors: Number(item.y),
    })),
  );
}
