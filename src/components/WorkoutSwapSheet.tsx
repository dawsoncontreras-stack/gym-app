import { View, Text, Pressable } from 'react-native';
import { NavigationModal } from './NavigationModal';

interface SiblingWorkout {
  id: string;
  status: string;
  program_workouts: {
    id: string;
    name: string;
    day_number: number;
    sort_order: number;
  };
  exercise_count: number;
}

interface WorkoutSwapSheetProps {
  visible: boolean;
  onClose: () => void;
  currentWorkoutId: string;
  currentWorkout: {
    id: string;
    program_workouts: { name: string; day_number: number };
    exerciseCount: number;
  };
  siblingWorkouts: SiblingWorkout[];
  onSelect: (workoutId: string) => void;
}

export function WorkoutSwapSheet({
  visible,
  onClose,
  currentWorkoutId,
  currentWorkout,
  siblingWorkouts,
  onSelect,
}: WorkoutSwapSheetProps) {
  // Build a combined list with the current workout included, sorted by day_number
  const allWorkouts = [
    {
      id: currentWorkout.id,
      program_workouts: currentWorkout.program_workouts,
      exercise_count: currentWorkout.exerciseCount,
      isCurrent: true,
    },
    ...siblingWorkouts.map(sw => ({ ...sw, isCurrent: false })),
  ].sort((a, b) => a.program_workouts.day_number - b.program_workouts.day_number);

  return (
    <NavigationModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/40 justify-end"
        onPress={onClose}
      >
        <Pressable className="bg-white rounded-t-3xl p-4 pb-8 max-h-[70%]" onPress={() => {}}>
          <View className="w-10 h-1 bg-gray-300 rounded-full self-center mb-4" />
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Swap Workout
          </Text>

          {allWorkouts.map(sw => {
            const isSelected = sw.id === currentWorkoutId;
            return (
              <Pressable
                key={sw.id}
                className={`py-3 px-3 border-b border-gray-100 rounded-lg flex-row items-center justify-between ${
                  isSelected ? 'bg-blue-50' : 'active:bg-gray-50'
                }`}
                onPress={() => {
                  if (!isSelected) {
                    onSelect(sw.id);
                  }
                  onClose();
                }}
              >
                <View className="flex-1">
                  <Text className={`text-base font-medium ${isSelected ? 'text-blue-600' : 'text-gray-900'}`}>
                    Day {sw.program_workouts.day_number}: {sw.program_workouts.name}
                  </Text>
                  <Text className="text-sm text-gray-500 mt-0.5">
                    {sw.exercise_count} exercises
                  </Text>
                </View>
                {isSelected && (
                  <Text className="text-xs font-semibold text-blue-600 ml-2">CURRENT</Text>
                )}
              </Pressable>
            );
          })}

          <Pressable className="mt-4 py-3 items-center" onPress={onClose}>
            <Text className="text-base font-medium text-gray-500">Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </NavigationModal>
  );
}
