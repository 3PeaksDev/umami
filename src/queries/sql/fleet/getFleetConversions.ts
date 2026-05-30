import { notImplemented, runQuery } from '@/lib/db';
import prisma from '@/lib/prisma';
import { channelCaseSql } from './fleetChannel';
import type { FleetDateRange } from './getFleetSummary';

export interface FleetConversionByChannel {
  channel: string;
  eventName: string;
  conversions: number;
}

export interface FleetConversionByReferrer {
  channel: string;
  referrerDomain: string;
  eventName: string;
  conversions: number;
}

export interface FleetConversionsData {
  byChannel: FleetConversionByChannel[];
  byReferrer: FleetConversionByReferrer[];
}

const CONVERSION_EVENTS = ['phone_call', 'form_submit'];

export async function getFleetConversions(filters: FleetDateRange): Promise<FleetConversionsData> {
  return runQuery({
    prisma: () => relationalQuery(filters),
    clickhouse: () => notImplemented(),
  });
}

async function relationalQuery({
  startDate,
  endDate,
}: FleetDateRange): Promise<FleetConversionsData> {
  const { rawQuery } = prisma;

  // First-touch attribution: the earliest event within each visit determines the
  // channel that gets credit for any conversion fired later in that same visit.
  const firstTouchCte = `
    first_touch as (
      select distinct on (visit_id)
        visit_id,
        referrer_domain,
        url_query,
        utm_medium,
        utm_source,
        hostname
      from website_event
      where created_at between {{startDate}} and {{endDate}}
      order by visit_id, created_at asc
    ),
    conv as (
      select visit_id, event_name
      from website_event
      where event_type = 2
        and event_name in ('phone_call', 'form_submit')
        and created_at between {{startDate}} and {{endDate}}
    )`;

  const byChannel = await rawQuery(
    `
    with ${firstTouchCte}
    select ${channelCaseSql('ft.')} as channel, conv.event_name, count(*) as y
    from conv
    join first_touch ft using (visit_id)
    group by 1, 2
    order by y desc
    `,
    { startDate, endDate },
    'getFleetConversions.byChannel',
  ).then(results =>
    results.map((item: any) => ({
      channel: item.channel,
      eventName: item.event_name,
      conversions: Number(item.y),
    })),
  );

  const byReferrer = await rawQuery(
    `
    with ${firstTouchCte}
    select
      ${channelCaseSql('ft.')} as channel,
      case when ft.referrer_domain = '' or ft.referrer_domain is null then '(direct)' else ft.referrer_domain end as referrer_domain,
      conv.event_name,
      count(*) as y
    from conv
    join first_touch ft using (visit_id)
    group by 1, 2, 3
    order by y desc
    `,
    { startDate, endDate },
    'getFleetConversions.byReferrer',
  ).then(results =>
    results.map((item: any) => ({
      channel: item.channel,
      referrerDomain: item.referrer_domain,
      eventName: item.event_name,
      conversions: Number(item.y),
    })),
  );

  return { byChannel, byReferrer };
}

export { CONVERSION_EVENTS };
