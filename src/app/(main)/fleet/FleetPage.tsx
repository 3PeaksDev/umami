'use client';
import { AlertBanner, Column, DataColumn, DataTable, Grid, Row, Text } from '@umami/react-zen';
import { useMemo } from 'react';
import { ExternalLink } from '@/components/common/ExternalLink';
import { PageBody } from '@/components/common/PageBody';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { useFleetQuery, useLoginQuery, useMessages } from '@/components/hooks';
import { WebsiteDateFilter } from '@/components/input/WebsiteDateFilter';
import { MetricCard } from '@/components/metrics/MetricCard';
import { MetricsBar } from '@/components/metrics/MetricsBar';
import { ROLES } from '@/lib/constants';
import { formatNumber } from '@/lib/format';

const CONVERSION_LABELS: Record<string, string> = {
  phone_call: 'Phone calls',
  form_submit: 'Form submissions',
};

interface ChannelConversionRow {
  channel: string;
  phone_call: number;
  form_submit: number;
  total: number;
}

export function FleetPage() {
  const { user } = useLoginQuery();
  const { t, labels } = useMessages();
  const { data, isLoading, error } = useFleetQuery();

  const isAdmin = user?.isAdmin || user?.role === ROLES.admin;

  const channelLabel = (channel: string) =>
    labels[channel] ? t(labels[channel]) : channel || t(labels.direct);

  const conversionsByChannel = useMemo<ChannelConversionRow[]>(() => {
    const rows = new Map<string, ChannelConversionRow>();

    for (const { channel, eventName, conversions } of data?.conversions.byChannel ?? []) {
      const row = rows.get(channel) ?? {
        channel,
        phone_call: 0,
        form_submit: 0,
        total: 0,
      };
      if (eventName === 'phone_call') row.phone_call += conversions;
      if (eventName === 'form_submit') row.form_submit += conversions;
      row.total += conversions;
      rows.set(channel, row);
    }

    return [...rows.values()].sort((a, b) => b.total - a.total);
  }, [data]);

  const topReferrers = useMemo(() => {
    const rows = new Map<string, { referrerDomain: string; channel: string; total: number }>();

    for (const { referrerDomain, channel, conversions } of data?.conversions.byReferrer ?? []) {
      const row = rows.get(referrerDomain) ?? { referrerDomain, channel, total: 0 };
      row.total += conversions;
      rows.set(referrerDomain, row);
    }

    return [...rows.values()].sort((a, b) => b.total - a.total).slice(0, 25);
  }, [data]);

  if (user && !isAdmin) {
    return (
      <PageBody>
        <AlertBanner title="The fleet view is restricted to administrators." variant="error" />
      </PageBody>
    );
  }

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
        </MetricsBar>

        <Grid columns={{ base: '1fr', lg: '1fr 1fr' }} gap="6">
          <Panel title={t(labels.channels)}>
            <DataTable data={data?.channels ?? []}>
              <DataColumn id="channel" label={t(labels.channel)}>
                {({ channel }: any) => channelLabel(channel)}
              </DataColumn>
              <DataColumn id="visitors" label={t(labels.visitors)} align="end">
                {({ visitors }: any) => formatNumber(visitors)}
              </DataColumn>
            </DataTable>
          </Panel>

          <Panel title={t(labels.referrers)}>
            <DataTable data={topReferrers}>
              <DataColumn id="referrerDomain" label={t(labels.referrer)}>
                {({ referrerDomain }: any) => referrerDomain}
              </DataColumn>
              <DataColumn id="channel" label={t(labels.channel)}>
                {({ channel }: any) => channelLabel(channel)}
              </DataColumn>
              <DataColumn id="total" label={t(labels.conversion)} align="end">
                {({ total }: any) => formatNumber(total)}
              </DataColumn>
            </DataTable>
          </Panel>
        </Grid>

        <Panel title="Conversions by source">
          <DataTable data={conversionsByChannel}>
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
          <DataTable data={data?.topSites ?? []}>
            <DataColumn id="name" label={t(labels.name)}>
              {({ name, domain }: any) => (
                <Column gap="1">
                  <Text weight="bold">{name}</Text>
                  {domain && (
                    <Row alignItems="center" gap="1">
                      <ExternalLink href={`https://${domain}`} prefetch={false}>
                        {domain}
                      </ExternalLink>
                    </Row>
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
              {({ conversions }: any) => formatNumber(conversions)}
            </DataColumn>
          </DataTable>
        </Panel>
      </Column>
    </PageBody>
  );
}
