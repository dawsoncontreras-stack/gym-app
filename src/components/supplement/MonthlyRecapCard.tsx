import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { formatVolume } from '../../utils/formatters';
import type { MonthlyRecap } from '../../lib/types';

type MonthlyRecapCardProps = {
  recap: MonthlyRecap;
};

function AdherenceBar({ productName, daysLogged, totalDays }: {
  productName: string;
  daysLogged: number;
  totalDays: number;
}) {
  const pct = Math.round((daysLogged / totalDays) * 100);
  const barColor = pct >= 80 ? 'bg-success' : pct >= 50 ? 'bg-warning' : 'bg-error';

  return (
    <View className="mt-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-ink-secondary" numberOfLines={1}>{productName}</Text>
        <Text className="text-xs font-semibold text-ink">{pct}%</Text>
      </View>
      <View className="mt-1 h-2 rounded-full bg-surface-tertiary overflow-hidden">
        <View
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </View>
    </View>
  );
}

export default function MonthlyRecapCard({ recap }: MonthlyRecapCardProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const volumeChange = recap.volumeChangePercent;
  const changeLabel =
    volumeChange != null
      ? volumeChange >= 0
        ? `+${volumeChange}% vs last month`
        : `${volumeChange}% vs last month`
      : null;
  const changeColor =
    volumeChange != null && volumeChange >= 0
      ? 'text-success'
      : 'text-error';

  return (
    <View className="mx-4 mb-4 rounded-xl bg-surface-secondary p-4">
      {/* Header */}
      <View className="flex-row items-start justify-between mb-3">
        <View>
          <Text className="text-xs font-semibold text-accent uppercase">{recap.month} Recap</Text>
          <Text className="mt-0.5 text-sm font-bold text-ink">Your month in review</Text>
        </View>
        <Pressable onPress={() => setDismissed(true)} className="p-1" hitSlop={8}>
          <Text className="text-sm text-ink-muted">✕</Text>
        </Pressable>
      </View>

      {/* Workout stats */}
      <View className="flex-row gap-3 mb-3">
        <View className="flex-1 rounded-lg bg-surface p-3 items-center">
          <Text className="text-xl font-bold text-ink">{recap.workoutCount}</Text>
          <Text className="text-2xs text-ink-muted">Workouts</Text>
        </View>
        <View className="flex-1 rounded-lg bg-surface p-3 items-center">
          <Text className="text-xl font-bold text-ink">{formatVolume(recap.totalVolume)}</Text>
          <Text className="text-2xs text-ink-muted">Volume</Text>
          {changeLabel && (
            <Text className={`text-2xs font-semibold ${changeColor} mt-0.5`}>{changeLabel}</Text>
          )}
        </View>
      </View>

      {/* Supplement adherence */}
      {recap.supplementAdherence.length > 0 && (
        <View className="mb-2">
          <Text className="text-xs font-semibold text-ink mb-0.5">Supplement Consistency</Text>
          {recap.supplementAdherence.map((item) => (
            <AdherenceBar
              key={item.productName}
              productName={item.productName}
              daysLogged={item.daysLogged}
              totalDays={item.totalDays}
            />
          ))}
        </View>
      )}

      {/* Longest streak */}
      {recap.longestStack && (
        <View className="mt-2 rounded-lg bg-success/10 px-3 py-2">
          <Text className="text-xs text-success font-semibold">
            {recap.longestStack.productName} — {recap.longestStack.weeks} week
            {recap.longestStack.weeks !== 1 ? 's' : ''} and counting
          </Text>
        </View>
      )}
    </View>
  );
}
