import { View, Text, Pressable } from 'react-native';
import { NavigationModal } from './NavigationModal';

interface RemovalPromptModalProps {
  visible: boolean;
  exerciseName: string;
  isNeverRecommend: boolean;
  onAutoReplace: () => void;
  onManualReplace: () => void;
  onNoReplace: () => void;
  onCancel: () => void;
}

export function RemovalPromptModal({
  visible,
  exerciseName,
  isNeverRecommend,
  onAutoReplace,
  onManualReplace,
  onNoReplace,
  onCancel,
}: RemovalPromptModalProps) {
  return (
    <NavigationModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable
        className="flex-1 bg-black/40 justify-end"
        onPress={onCancel}
      >
        <Pressable className="bg-white rounded-t-3xl p-4 pb-8" onPress={() => {}}>
          <View className="w-10 h-1 bg-gray-300 rounded-full self-center mb-4" />

          <Text className="text-lg font-semibold text-gray-900 mb-1">
            {isNeverRecommend ? 'Exercise Hidden' : 'Exercise Removed'}
          </Text>
          <Text className="text-sm text-gray-500 mb-1">
            <Text className="font-medium text-gray-700">{exerciseName}</Text>
            {isNeverRecommend
              ? ' has been removed and won\'t be recommended again.'
              : ' has been removed from this workout.'}
          </Text>

          {isNeverRecommend && (
            <Text className="text-xs text-gray-400 mb-4">
              You can undo this in Settings → Don't Recommend Again.
            </Text>
          )}
          {!isNeverRecommend && <View className="mb-4" />}

          <Text className="text-sm font-medium text-gray-700 mb-3">
            Would you like to replace it?
          </Text>

          <Pressable
            className="bg-blue-600 rounded-xl py-3 px-4 mb-2 active:bg-blue-700"
            onPress={onAutoReplace}
          >
            <Text className="text-white font-semibold text-center text-base">Auto Replace</Text>
            <Text className="text-blue-200 text-center text-xs mt-0.5">
              Pick a similar exercise automatically
            </Text>
          </Pressable>

          <Pressable
            className="bg-white border border-gray-200 rounded-xl py-3 px-4 mb-2 active:bg-gray-50"
            onPress={onManualReplace}
          >
            <Text className="text-gray-900 font-semibold text-center text-base">Choose Replacement</Text>
            <Text className="text-gray-500 text-center text-xs mt-0.5">
              Browse and pick an exercise yourself
            </Text>
          </Pressable>

          <Pressable
            className="py-3 items-center"
            onPress={onNoReplace}
          >
            <Text className="text-base font-medium text-gray-500">No Replacement</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </NavigationModal>
  );
}
