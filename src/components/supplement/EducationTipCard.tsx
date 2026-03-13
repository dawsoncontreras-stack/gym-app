import { View, Text, Pressable } from 'react-native';
import type { EducationTip } from '../../hooks/useEducationTips';

type EducationTipCardProps = {
  tip: EducationTip;
  onPress: () => void;
};

export default function EducationTipCard({ tip, onPress }: EducationTipCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="w-56 rounded-xl bg-surface-secondary p-3 mr-3"
    >
      <Text className="text-2xs font-semibold text-accent uppercase mb-1" numberOfLines={1}>
        {tip.productName}
      </Text>
      <Text className="text-sm font-bold text-ink" numberOfLines={1}>
        {tip.heading}
      </Text>
      <Text className="mt-1 text-xs text-ink-secondary leading-4" numberOfLines={3}>
        {tip.snippet}
      </Text>
      <Text className="mt-2 text-xs font-semibold text-accent">Read more →</Text>
    </Pressable>
  );
}
