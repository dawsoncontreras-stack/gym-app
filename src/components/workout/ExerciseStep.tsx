import { View, Text, Image } from 'react-native';
import type { WorkoutSectionExercise, Exercise } from '../../lib/types';
import { formatSetsReps } from '../../utils/formatters';

type ExerciseStepProps = {
  item: WorkoutSectionExercise & { exercise: Exercise };
  index: number;
};

export default function ExerciseStep({ item, index }: ExerciseStepProps) {
  const trackingType = item.tracking_type ?? item.exercise.default_tracking_type;

  const detail = (() => {
    if (trackingType === 'timed' && item.duration_sec) {
      return `${item.duration_sec}s`;
    }
    if (trackingType === 'weighted' && item.sets && item.reps) {
      const base = formatSetsReps(item.sets, item.reps);
      return item.weight_lbs ? `${base} @ ${item.weight_lbs} lbs` : base;
    }
    if (trackingType === 'reps' && item.sets && item.reps) {
      return formatSetsReps(item.sets, item.reps);
    }
    return null;
  })();

  return (
    <View className="flex-row items-center rounded-lg bg-surface-secondary px-3 py-3">
      <View className="mr-3 h-11 w-11 items-center justify-center overflow-hidden rounded-lg">
        {item.exercise.thumbnail_url ? (
          <Image
            source={{ uri: item.exercise.thumbnail_url }}
            className="h-full w-full"
            resizeMode="cover"
          />
        ) : (
          <View className="h-full w-full items-center justify-center bg-brand-50">
            <Text className="text-xs font-medium text-brand-500">{index + 1}</Text>
          </View>
        )}
      </View>

      <View className="flex-1">
        <Text className="text-sm font-medium text-ink">{item.exercise.name}</Text>
        <View className="mt-0.5 flex-row items-center gap-2">
          {detail && <Text className="text-xs text-ink-secondary">{detail}</Text>}
          {item.rest_after_sec && (
            <Text className="text-xs text-ink-muted">{item.rest_after_sec}s rest</Text>
          )}
        </View>
      </View>
    </View>
  );
}
