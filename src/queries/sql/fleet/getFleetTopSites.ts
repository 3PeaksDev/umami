import { notImplemented, runQuery } from '@/lib/db';
import prisma from '@/lib/prisma';
import type { FleetDateRange } from './getFleetSummary';

export interface FleetTopSite {
  websiteId: string;
  name: string;
  domain: string;
  phoneCall: number;
  formSubmit: number;
  conversions: number;
}

export async function getFleetTopSites(
  filters: FleetDateRange & { limit?: number },
): Promise<FleetTopSite[]> {
  return runQuery({
    prisma: () => relationalQuery(filters),
    clickhouse: () => notImplemented(),
  });
}

async function relationalQuery({
  startDate,
  endDate,
  limit = 50,
}: FleetDateRange & { limit?: number }): Promise<FleetTopSite[]> {
  const { rawQuery } = prisma;
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 500);

  return rawQuery(
    `
    select
      website.website_id as "websiteId",
      website.name as "name",
      website.domain as "domain",
      coalesce(sum(case when website_event.event_name = 'phone_call' then 1 else 0 end), 0) as "phoneCall",
      coalesce(sum(case when website_event.event_name = 'form_submit' then 1 else 0 end), 0) as "formSubmit",
      count(*) as "conversions"
    from website_event
    join website on website.website_id = website_event.website_id
    where website_event.created_at between {{startDate}} and {{endDate}}
      and website_event.event_type = 2
      and website_event.event_name in ('phone_call', 'form_submit')
    group by 1, 2, 3
    order by "conversions" desc
    limit ${safeLimit}
    `,
    { startDate, endDate },
    'getFleetTopSites',
  ).then(results =>
    results.map((item: any) => ({
      websiteId: item.websiteId,
      name: item.name,
      domain: item.domain,
      phoneCall: Number(item.phoneCall),
      formSubmit: Number(item.formSubmit),
      conversions: Number(item.conversions),
    })),
  );
}
