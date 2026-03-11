import { View, Text, Pressable } from 'react-native';
import type { UserWorkoutExercise } from '../types';

interface ExerciseCardProps {
  exercise: UserWorkoutExercise;
  index: number;
  weight: number | undefined;
  onMenuOpen: () => void;
  drag?: () => void;
  isActive?: boolean;
}

const MOVEMENT_LABELS: Record<string, string> = {
  horizontal_push: 'Horizontal Push',
  horizontal_pull: 'Horizontal Pull',
  vertical_push: 'Vertical Push',
  vertical_pull: 'Vertical Pull',
  squat: 'Squat',
  hinge: 'Hinge',
  lunge: 'Lunge',
  carry: 'Carry',
  isolation: 'Isolation',
  core: 'Core',
  cardio: 'Cardio',
  plyometric: 'Plyometric',
};

export function ExerciseCard({
  exercise,
  index,
  weight,
  onMenuOpen,
  drag,
  isActive,
}: ExerciseCardProps) {
  const ex = exercise.exercises;

  const hasWeight = weight != null && weight > 0;
  const movementLabel = MOVEMENT_LABELS[ex.movement_pattern] ?? ex.movement_pattern;

  return (
    <View
      className={`bg-white rounded-2xl p-4 shadow-sm mb-3 ${isActive ? 'shadow-lg opacity-90' : ''}`}
      style={isActive ? { transform: [{ scale: 1.03 }] } : undefined}
    >
      <View className="flex-row items-start">
        {/* Drag handle */}
        {drag && (
          <Pressable
            onLongPress={drag}
            delayLongPress={150}
            className="justify-center pr-3 -ml-1"
          >
            <Text className="text-gray-300 text-lg leading-none">⠿</Text>
          </Pressable>
        )}

        {/* Card content — tap to open menu */}
        <Pressable className="flex-1" onPress={onMenuOpen}>
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900">
                {index + 1}. {ex.name}
              </Text>
              <Text className="text-sm text-gray-500 mt-1">
                {exercise.sets_prescribed} x {exercise.rep_range_low}-{exercise.rep_range_high} reps{hasWeight ? ` · ${weight} lbs` : ''}
              </Text>
              <View className="flex-row mt-2 gap-2">
                <View className="bg-blue-50 rounded-full px-2 py-0.5">
                  <Text className="text-xs text-blue-700">{movementLabel}</Text>
                </View>
                <View className="bg-gray-100 rounded-full px-2 py-0.5">
                  <Text className="text-xs text-gray-600">{ex.exercise_type}</Text>
                </View>
              </View>
            </View>
            <Text className="text-gray-400 text-lg ml-2">···</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}
