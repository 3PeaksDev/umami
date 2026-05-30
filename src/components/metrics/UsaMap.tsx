import { Box, Column, type ColumnProps, FloatingTooltip, useTheme } from '@umami/react-zen';
import { colord } from 'colord';
import { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { useLocale, useMessages } from '@/components/hooks';
import { getThemeColors } from '@/lib/colors';
import { USA_MAP_FILE, USA_STATES } from '@/lib/constants';
import { percentFilter } from '@/lib/filters';
import { formatLongNumber } from '@/lib/format';

export interface UsaMapProps extends ColumnProps {
  data?: { x: string; y: number }[];
}

export function UsaMap({ data, ...props }: UsaMapProps) {
  const [tooltip, setTooltipPopup] = useState<string | null>(null);
  const { theme } = useTheme();
  const { colors } = getThemeColors(theme);
  const { locale } = useLocale();
  const { t, labels } = useMessages();
  const visitorsLabel = t(labels.visitors).toLocaleLowerCase(locale);

  const metrics = useMemo(() => (data ? percentFilter(data as any[]) : []), [data]);

  const getFillColor = (code?: string) => {
    const state = code ? metrics?.find(({ x }) => x === code) : undefined;

    if (!state) {
      return colors.map.fillColor;
    }

    return colord(colors.map.baseColor)
      [theme === 'light' ? 'lighten' : 'darken'](0.4 * (1.0 - state.z / 100))
      .toHex();
  };

  const handleHover = (code: string | undefined, name: string) => {
    const state = code ? metrics?.find(({ x }) => x === code) : undefined;
    setTooltipPopup(`${name}: ${formatLongNumber(state?.y || 0)} ${visitorsLabel}`);
  };

  return (
    <Column {...props} style={{ margin: 'auto 0', overflow: 'hidden' }}>
      <ComposableMap projection="geoAlbersUsa">
        <Geographies geography={`${process.env.basePath || ''}${USA_MAP_FILE}`}>
          {({ geographies }) => {
            return geographies.map(geo => {
              const code = (USA_STATES as Record<string, string>)[geo.id];
              const name = geo.properties?.name ?? '';

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={getFillColor(code)}
                  stroke={colors.map.strokeColor}
                  style={{
                    default: { outline: 'none' },
                    hover: { outline: 'none', fill: colors.map.hoverColor },
                    pressed: { outline: 'none' },
                  }}
                  onMouseOver={() => handleHover(code, name)}
                  onMouseOut={() => setTooltipPopup(null)}
                />
              );
            });
          }}
        </Geographies>
      </ComposableMap>
      {tooltip && (
        <FloatingTooltip>
          <Box
            style={{ backgroundColor: 'rgba(0,0,0,0.8)', color: 'white' }}
            padding
            borderRadius="md"
          >
            {tooltip}
          </Box>
        </FloatingTooltip>
      )}
    </Column>
  );
}
