import { notImplemented, runQuery } from '@/lib/db';
import prisma from '@/lib/prisma';
import type { FleetDateRange } from './getFleetSummary';

export interface FleetDeviceDatum {
  x: string;
  y: number;
}

export type FleetDeviceType = 'browser' | 'os' | 'device';

const COLUMNS: Record<FleetDeviceType, string> = {
  browser: 'browser',
  os: 'os',
  device: 'device',
};

/**
 * Fleet-wide session breakdown by browser / os / device across all sites.
 */
export async function getFleetDevices(
  filters: FleetDateRange & { type: FleetDeviceType },
): Promise<FleetDeviceDatum[]> {
  return runQuery({
    prisma: () => relationalQuery(filters),
    clickhouse: () => notImplemented(),
  });
}

async function relationalQuery({
  startDate,
  endDate,
  type,
}: FleetDateRange & { type: FleetDeviceType }): Promise<FleetDeviceDatum[]> {
  const { rawQuery } = prisma;
  const column = COLUMNS[type] ?? 'browser';

  return rawQuery(
    `
    select session.${column} as x, count(distinct session.session_id) as y
    from session
    where session.created_at between {{startDate}} and {{endDate}}
      and session.${column} is not null
      and session.${column} != ''
    group by 1
    order by 2 desc
    `,
    { startDate, endDate },
    `getFleetDevices.${type}`,
  ).then(results => results.map((item: any) => ({ x: item.x, y: Number(item.y) })));
}
