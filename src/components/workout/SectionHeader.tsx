import { View, Text } from 'react-native';
import type { WorkoutSection } from '../../lib/types';

type SectionHeaderProps = {
  section: WorkoutSection;
};

export default function SectionHeader({ section }: SectionHeaderProps) {
  return (
    <View className="mb-3 mt-6 border-l-2 border-brand-200 pl-3">
      {section.title && (
        <Text className="text-base font-bold text-ink">{section.title}</Text>
      )}
      <View className="mt-0.5 flex-row items-center gap-2">
        {section.section_type === 'circuit' && (
          <View className="rounded bg-brand-100 px-2 py-0.5">
            <Text className="text-2xs font-medium text-brand-700">
              Circuit {section.rounds > 1 ? `\u00B7 ${section.rounds} rounds` : ''}
            </Text>
          </View>
        )}
        {section.section_type === 'straight_set' && (
          <View className="rounded bg-surface-tertiary px-2 py-0.5">
            <Text className="text-2xs font-medium text-ink-secondary">Straight set</Text>
          </View>
        )}
      </View>
    </View>
  );
}
