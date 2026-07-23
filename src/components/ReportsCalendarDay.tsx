import { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { DateData } from 'react-native-calendars';
import { useTheme } from '../contexts/ThemeContext';

export type ReportsDayMarking = {
  dots?: { key: string; color: string }[];
  selected?: boolean;
  weekBand?: 'start' | 'middle' | 'end' | 'none';
};

type Props = {
  date?: DateData;
  marking?: ReportsDayMarking;
  isToday?: boolean;
  otherMonth?: boolean;
  onPress?: (date?: DateData) => void;
};

function ReportsCalendarDayComponent({ date, marking, isToday, otherMonth, onPress }: Props) {
  const Colors = useTheme();
  if (!date) return null;

  const m = marking ?? {};
  const isSelected = !!m.selected;
  const band = m.weekBand ?? 'none';
  const dots = m.dots ?? [];

  const bandEdgeRadius =
    band === 'start' ? { borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }
    : band === 'end' ? { borderTopRightRadius: 8, borderBottomRightRadius: 8 }
    : {};

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={() => onPress?.(date)} style={{ alignItems: 'center' }}>
      <View
        style={{
          width: 34,
          paddingVertical: 6,
          alignItems: 'center',
          backgroundColor:
            band !== 'none' ? Colors.lowStockBackground
            : isSelected ? Colors.primary
            : 'transparent',
          borderWidth: isToday && !isSelected ? 1 : 0,
          borderColor: Colors.primary,
          borderRadius: band !== 'none' ? 0 : 8,
          ...bandEdgeRadius,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: isSelected || isToday ? '700' : '500',
            color: otherMonth
              ? Colors.textMuted
              : isSelected
              ? '#fff'
              : isToday
              ? Colors.primary
              : Colors.textPrimary,
          }}
        >
          {date.day}
        </Text>
        <View style={{ flexDirection: 'row', gap: 3, marginTop: 3, height: 6 }}>
          {dots.map((d) => (
            <View key={d.key} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: d.color }} />
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const ReportsCalendarDay = memo(ReportsCalendarDayComponent);