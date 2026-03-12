import { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { formatTimer } from '../../utils/formatters';

type RestTimerProps = {
  seconds: number;
  label?: string;
  onTick: () => void;
  onSkip: () => void;
};

export default function RestTimer({ seconds, label, onTick, onSkip }: RestTimerProps) {
  useEffect(() => {
    if (seconds <= 0) return;
    const interval = setInterval(onTick, 1000);
    return () => clearInterval(interval);
  }, [seconds, onTick]);

  return (
    <View className="flex-1 items-center justify-center px-4">
      <Text className="mb-2 text-base font-medium text-ink-secondary">
        {label ?? 'Rest'}
      </Text>
      <Text className="text-6xl font-bold tracking-tight text-ink">{formatTimer(seconds)}</Text>
      <Pressable onPress={onSkip} className="mt-8 rounded-xl border border-surface-tertiary bg-surface-tertiary px-10 py-3">
        <Text className="text-sm font-semibold text-ink">Skip Rest</Text>
      </Pressable>
    </View>
  );
}
