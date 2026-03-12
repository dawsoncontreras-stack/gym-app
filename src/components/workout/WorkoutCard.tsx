import { View, Text, Image, Pressable } from 'react-native';
import type { Workout } from '../../lib/types';
import { formatEstimatedMinutes } from '../../utils/formatters';

const DIFFICULTY_COLORS = {
  beginner: 'bg-success',
  intermediate: 'bg-warning',
  advanced: 'bg-error',
} as const;

type WorkoutCardProps = {
  workout: Workout;
  onPress: () => void;
  variant?: 'grid' | 'horizontal';
};

export default function WorkoutCard({ workout, onPress, variant = 'grid' }: WorkoutCardProps) {
  const isHorizontal = variant === 'horizontal';

  return (
    <Pressable
      onPress={onPress}
      className={`overflow-hidden rounded-lg bg-surface shadow-card ${
        isHorizontal ? 'w-40 mr-3' : 'flex-1'
      }`}
    >
      <View className={isHorizontal ? 'h-28' : 'aspect-[4/3]'}>
        {workout.thumbnail_url ? (
          <Image
            source={{ uri: workout.thumbnail_url }}
            className="h-full w-full"
            resizeMode="cover"
          />
        ) : (
          <View className="h-full w-full items-center justify-center bg-surface-tertiary">
            <Text className="text-3xl">💪</Text>
          </View>
        )}
        <View className="absolute bottom-2 left-2 flex-row items-center gap-1">
          <View className={`rounded px-1.5 py-0.5 ${DIFFICULTY_COLORS[workout.difficulty]}`}>
            <Text className="text-2xs font-semibold capitalize text-white">
              {workout.difficulty}
            </Text>
          </View>
        </View>
      </View>

      <View className="px-3 py-2.5">
        <Text className="text-sm font-semibold text-ink" numberOfLines={2}>
          {workout.title}
        </Text>
        <View className="mt-1 flex-row items-center gap-1.5">
          <Text className="text-xs text-ink-secondary">
            {formatEstimatedMinutes(workout.estimated_minutes)}
          </Text>
          {workout.equipment_needed.length > 0 && (
            <>
              <Text className="text-xs text-ink-muted">{'\u00B7'}</Text>
              <Text className="flex-1 text-xs text-ink-muted" numberOfLines={1}>
                {workout.equipment_needed.join(', ')}
              </Text>
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
}
