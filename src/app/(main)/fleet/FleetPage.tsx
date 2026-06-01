'use client';
import {
  AlertBanner,
  Column,
  DataColumn,
  DataTable,
  Grid,
  Icon,
  Row,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
} from '@umami/react-zen';
import { useMemo, useState } from 'react';
import { ExternalLink } from '@/components/common/ExternalLink';
import Link from '@/components/common/Link';
import { PageBody } from '@/components/common/PageBody';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import {
  useDateRange,
  useFleetQuery,
  useLoginQuery,
  useMessages,
  useMobile,
  useNavigation,
  useTimezone,
} from '@/components/hooks';
import type { FleetData } from '@/components/hooks/queries/useFleetQuery';
import { ChevronDown, ChevronRight } from '@/components/icons';
import { WebsiteDateFilter } from '@/components/input/WebsiteDateFilter';
import { MetricCard } from '@/components/metrics/MetricCard';
import { MetricsBar } from '@/components/metrics/MetricsBar';
import { PageviewsChart } from '@/components/metrics/PageviewsChart';
import { UsaMap } from '@/components/metrics/UsaMap';
import { WorldMap } from '@/components/metrics/WorldMap';
import { ROLES } from '@/lib/constants';
import { formatNumber } from '@/lib/format';

const CONVERSION_LABELS: Record<string, string> = {
  phone_call: 'Phone calls',
  form_submit: 'Form submissions',
};

function formatRate(num: number, den: number) {
  if (!den) return '-';
  const pct = (num / den) * 100;
  return `${pct.toFixed(pct < 10 ? 2 : 1)}%`;
}

interface ChannelConversionRow {
  channel: string;
  phone_call: number;
  form_submit: number;
  total: number;
}

export function FleetPage() {
  const { user } = useLoginQuery();
  const { t, labels } = useMessages();
  const { isMobile } = useMobile();
  const { timezone } = useTimezone();
  const { dateRange } = useDateRange({ timezone });
  const { renderUrl } = useNavigation();
  const { data, isLoading, error } = useFleetQuery();

  const isAdmin = user?.isAdmin || user?.role === ROLES.admin;

  const channelLabel = (channel: string) =>
    labels[channel] ? t(labels[channel]) : channel || t(labels.direct);

  const conversionsByChannel = useMemo<ChannelConversionRow[]>(() => {
    const rows = new Map<string, ChannelConversionRow>();
    for (const { channel, eventName, conversions } of data?.conversions.byChannel ?? []) {
      const row = rows.get(channel) ?? { channel, phone_call: 0, form_submit: 0, total: 0 };
      if (eventName === 'phone_call') row.phone_call += conversions;
      if (eventName === 'form_submit') row.form_submit += conversions;
      row.total += conversions;
      rows.set(channel, row);
    }
    return [...rows.values()].sort((a, b) => b.total - a.total);
  }, [data]);

  // conversions total per channel, for the conversion-rate column on the channels table
  const channelConversionTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of conversionsByChannel) map.set(r.channel, r.total);
    return map;
  }, [conversionsByChannel]);

  const chartData = useMemo(() => {
    const trend = data?.trend ?? [];
    return {
      pageviews: trend.map(d => ({ x: d.date, y: d.pageviews })),
      sessions: trend.map(d => ({ x: d.date, y: d.visitors })),
    };
  }, [data]);

  if (user && !isAdmin) {
    return (
      <PageBody>
        <AlertBanner title="The fleet view is restricted to administrators." variant="error" />
      </PageBody>
    );
  }

  const conversionsTotal = conversionsByChannel.reduce((s, r) => s + r.total, 0);

  return (
    <PageBody isLoading={isLoading && !data} error={error}>
      <PageHeader title={t(labels.fleet)} description="Aggregated analytics across all sites">
        <WebsiteDateFilter />
      </PageHeader>

      <Column gap="6">
        <MetricsBar>
          <MetricCard label={t(labels.visitors)} value={data?.summary.visitors ?? 0} />
          <MetricCard label={t(labels.views)} value={data?.summary.pageviews ?? 0} />
          <MetricCard label={t(labels.visits)} value={data?.summary.visits ?? 0} />
          <MetricCard label={t(labels.websites)} value={data?.summary.websites ?? 0} />
          <MetricCard label={t(labels.conversion)} value={conversionsTotal} />
        </MetricsBar>

        <Panel title={t(labels.traffic)}>
          <PageviewsChart
            data={chartData}
            unit={dateRange.unit}
            minDate={dateRange.startDate}
            maxDate={dateRange.endDate}
          />
        </Panel>

        <Grid columns={{ base: '1fr', lg: '1fr 1fr' }} gap="6">
          <Panel title="Visitors by state">
            <UsaMap data={data?.geo.visitsByRegion ?? []} />
          </Panel>
          <Panel title="Conversions by state">
            <UsaMap data={data?.geo.conversionsByRegion ?? []} />
          </Panel>
        </Grid>

        <Panel title={t(labels.channels)}>
          <ChannelsDrilldown
            channels={data?.channels ?? []}
            channelReferrers={data?.channelReferrers ?? []}
            conversionTotals={channelConversionTotals}
            channelLabel={channelLabel}
            isMobile={isMobile}
          />
        </Panel>

        <Panel title="Conversions by source">
          <DataTable data={conversionsByChannel} displayMode={isMobile ? 'cards' : 'table'}>
            <DataColumn id="channel" label={t(labels.channel)}>
              {({ channel }: any) => channelLabel(channel)}
            </DataColumn>
            <DataColumn id="phone_call" label={CONVERSION_LABELS.phone_call} align="end">
              {({ phone_call }: any) => formatNumber(phone_call)}
            </DataColumn>
            <DataColumn id="form_submit" label={CONVERSION_LABELS.form_submit} align="end">
              {({ form_submit }: any) => formatNumber(form_submit)}
            </DataColumn>
            <DataColumn id="total" label={t(labels.conversion)} align="end">
              {({ total }: any) => formatNumber(total)}
            </DataColumn>
          </DataTable>
        </Panel>

        <Panel title="Top converting sites">
          <DataTable data={data?.topSites ?? []} displayMode={isMobile ? 'cards' : 'table'}>
            <DataColumn id="name" label={t(labels.name)}>
              {({ websiteId, name, domain }: any) => (
                <Column gap="1">
                  <Link href={renderUrl(`/websites/${websiteId}`)}>
                    <Text weight="bold">{name}</Text>
                  </Link>
                  {domain && (
                    <ExternalLink href={`https://${domain}`} prefetch={false}>
                      {domain}
                    </ExternalLink>
                  )}
                </Column>
              )}
            </DataColumn>
            <DataColumn id="phoneCall" label={CONVERSION_LABELS.phone_call} align="end">
              {({ phoneCall }: any) => formatNumber(phoneCall)}
            </DataColumn>
            <DataColumn id="formSubmit" label={CONVERSION_LABELS.form_submit} align="end">
              {({ formSubmit }: any) => formatNumber(formSubmit)}
            </DataColumn>
            <DataColumn id="conversions" label={t(labels.conversion)} align="end">
              {({ websiteId, conversions }: any) =>
                conversions > 0 ? (
                  <Link href={renderUrl(`/websites/${websiteId}/events`)}>
                    {formatNumber(conversions)}
                  </Link>
                ) : (
                  formatNumber(conversions)
                )
              }
            </DataColumn>
            <DataColumn id="rate" label={t(labels.conversionRate)} align="end">
              {({ conversions, visits }: any) => formatRate(conversions, visits)}
            </DataColumn>
          </DataTable>
        </Panel>

        <Panel title={t(labels.devices)}>
          <DevicesTabs devices={data?.devices} isMobile={isMobile} t={t} labels={labels} />
        </Panel>

        <Grid columns={{ base: '1fr', lg: '1fr 1fr' }} gap="6">
          <Panel title={`${t(labels.visitors)} (worldwide)`}>
            <WorldMap data={data?.geo.visitsByCountry ?? []} />
          </Panel>
          <Panel title={`${t(labels.conversion)} (worldwide)`}>
            <WorldMap data={data?.geo.conversionsByCountry ?? []} />
          </Panel>
        </Grid>
      </Column>
    </PageBody>
  );
}

function ChannelsDrilldown({
  channels,
  channelReferrers,
  conversionTotals,
  channelLabel,
  isMobile,
}: {
  channels: FleetData['channels'];
  channelReferrers: FleetData['channelReferrers'];
  conversionTotals: Map<string, number>;
  channelLabel: (c: string) => string;
  isMobile: boolean;
}) {
  const { t, labels } = useMessages();
  const [expanded, setExpanded] = useState<string | null>(null);

  const referrersByChannel = useMemo(() => {
    const map = new Map<string, { referrerDomain: string; visitors: number }[]>();
    for (const { channel, referrerDomain, visitors } of channelReferrers) {
      const list = map.get(channel) ?? [];
      list.push({ referrerDomain, visitors });
      map.set(channel, list);
    }
    for (const list of map.values()) list.sort((a, b) => b.visitors - a.visitors);
    return map;
  }, [channelReferrers]);

  return (
    <Column>
      {!isMobile && (
        <Row paddingY="2" paddingX="3" gap="3" alignItems="center" border="bottom">
          <Text color="muted" weight="bold" style={{ flex: 1 }}>
            {t(labels.channel)}
          </Text>
          <Text color="muted" weight="bold" style={{ width: 100, textAlign: 'right' }}>
            {t(labels.visitors)}
          </Text>
          <Text color="muted" weight="bold" style={{ width: 120, textAlign: 'right' }}>
            {t(labels.conversionRate)}
          </Text>
        </Row>
      )}
      {channels.map(({ channel, visitors, visits }) => {
        const referrers = referrersByChannel.get(channel) ?? [];
        const canExpand = referrers.length > 0 && channel !== 'direct';
        const isOpen = expanded === channel;
        const conversions = conversionTotals.get(channel) ?? 0;

        return (
          <Column key={channel} border="bottom">
            {isMobile ? (
              <Column
                paddingY="3"
                paddingX="3"
                gap="2"
                hover={canExpand ? { backgroundColor: 'surface-sunken' } : undefined}
                style={{ cursor: canExpand ? 'pointer' : 'default' }}
                onClick={() => canExpand && setExpanded(isOpen ? null : channel)}
              >
                <Row alignItems="center" gap="2">
                  {canExpand ? (
                    <Icon size="sm" color="muted">
                      {isOpen ? <ChevronDown /> : <ChevronRight />}
                    </Icon>
                  ) : (
                    <span style={{ width: 16, display: 'inline-block' }} />
                  )}
                  <Text weight="bold" style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
                    {channelLabel(channel)}
                  </Text>
                </Row>
                <Row
                  gap="4"
                  style={{
                    paddingLeft: 24,
                    flexWrap: 'wrap',
                  }}
                >
                  <Row gap="1" alignItems="center">
                    <Text color="muted">{t(labels.visitors)}</Text>
                    <Text>{formatNumber(visitors)}</Text>
                  </Row>
                  <Row gap="1" alignItems="center">
                    <Text color="muted">{t(labels.conversionRate)}</Text>
                    <Text>{formatRate(conversions, visits)}</Text>
                  </Row>
                </Row>
              </Column>
            ) : (
              <Row
                paddingY="2"
                paddingX="3"
                gap="3"
                alignItems="center"
                hover={canExpand ? { backgroundColor: 'surface-sunken' } : undefined}
                style={{ cursor: canExpand ? 'pointer' : 'default' }}
                onClick={() => canExpand && setExpanded(isOpen ? null : channel)}
              >
                <Row alignItems="center" gap="2" style={{ flex: 1, minWidth: 0 }}>
                  {canExpand ? (
                    <Icon size="sm" color="muted">
                      {isOpen ? <ChevronDown /> : <ChevronRight />}
                    </Icon>
                  ) : (
                    <span style={{ width: 16, display: 'inline-block' }} />
                  )}
                  <Text truncate>{channelLabel(channel)}</Text>
                </Row>
                <Text style={{ width: 100, textAlign: 'right' }}>{formatNumber(visitors)}</Text>
                <Text style={{ width: 120, textAlign: 'right' }}>
                  {formatRate(conversions, visits)}
                </Text>
              </Row>
            )}
            {isOpen && (
              <Column backgroundColor="surface-sunken" paddingY="2">
                {referrers.slice(0, 15).map(({ referrerDomain, visitors: rv }) => (
                  <Row
                    key={referrerDomain}
                    paddingY={isMobile ? '2' : '1'}
                    paddingX="3"
                    gap="3"
                    alignItems="center"
                    style={{ paddingLeft: isMobile ? 32 : 40 }}
                  >
                    <Text
                      color="muted"
                      truncate={isMobile ? undefined : true}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        overflowWrap: isMobile ? 'anywhere' : undefined,
                      }}
                    >
                      {referrerDomain}
                    </Text>
                    <Text color="muted" style={{ width: isMobile ? 72 : 100, textAlign: 'right' }}>
                      {formatNumber(rv)}
                    </Text>
                    {!isMobile && <span style={{ width: 120 }} />}
                  </Row>
                ))}
              </Column>
            )}
          </Column>
        );
      })}
      {channels.length === 0 && (
        <Row paddingY="4" justifyContent="center">
          <Text color="muted">No data</Text>
        </Row>
      )}
    </Column>
  );
}

function DevicesTabs({
  devices,
  isMobile,
  t,
  labels,
}: {
  devices?: FleetData['devices'];
  isMobile: boolean;
  t: (s: string) => string;
  labels: Record<string, string>;
}) {
  const renderTable = (rows: { x: string; y: number }[]) => (
    <DataTable data={rows ?? []} displayMode={isMobile ? 'cards' : 'table'}>
      <DataColumn id="x" label={t(labels.name)}>
        {({ x }: any) => x}
      </DataColumn>
      <DataColumn id="y" label={t(labels.visitors)} align="end">
        {({ y }: any) => formatNumber(y)}
      </DataColumn>
    </DataTable>
  );

  return (
    <Tabs>
      <TabList>
        <Tab id="browser">{t(labels.browser)}</Tab>
        <Tab id="os">{t(labels.os)}</Tab>
        <Tab id="device">{t(labels.device)}</Tab>
      </TabList>
      <TabPanel id="browser">{renderTable(devices?.browser ?? [])}</TabPanel>
      <TabPanel id="os">{renderTable(devices?.os ?? [])}</TabPanel>
      <TabPanel id="device">{renderTable(devices?.device ?? [])}</TabPanel>
    </Tabs>
  );
}
