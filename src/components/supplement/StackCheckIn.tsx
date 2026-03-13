import { View, Text, Pressable } from 'react-native';
import { useDoseLogMutation, useDoseLogDeleteMutation } from '../../hooks/useDoseLog';
import { useAuthStore } from '../../stores/authStore';
import type { StackStatusView, DoseSource } from '../../lib/types';

type StackCheckInProps = {
  items: StackStatusView[];
  source: DoseSource;
  hideHeader?: boolean;
};

/**
 * Row of tappable circles — one per active stack product.
 * Tapping toggles a dose for today with instant optimistic feedback.
 */
export default function StackCheckIn({ items, source, hideHeader }: StackCheckInProps) {
  const userId = useAuthStore((s) => s.user?.id);
  const logDose = useDoseLogMutation();
  const deleteDose = useDoseLogDeleteMutation();

  // Only show active/running_low items (not arriving or reorder)
  const loggableItems = items.filter(
    (item) => item.status === 'active' || item.status === 'running_low'
  );

  if (loggableItems.length === 0) return null;

  const handleTap = (item: StackStatusView) => {
    if (!userId) return;

    if (item.taken_today) {
      deleteDose.mutate({ userId, stackItemId: item.stack_item_id });
    } else {
      logDose.mutate({ userId, stackItemId: item.stack_item_id, source });
    }
  };

  return (
    <View className="px-4 py-3">
      {!hideHeader && <Text className="text-sm font-bold text-ink mb-2">Daily Check-In</Text>}
      <View className="flex-row flex-wrap gap-3">
        {loggableItems.map((item) => {
          const taken = item.taken_today;
          return (
            <Pressable
              key={item.stack_item_id}
              onPress={() => handleTap(item)}
              className="items-center"
            >
              {/* Circle */}
              <View
                className={`h-12 w-12 items-center justify-center rounded-full border-2 ${
                  taken
                    ? 'border-success bg-success'
                    : 'border-muted/40 bg-surface-secondary'
                }`}
              >
                {taken ? (
                  <Text className="text-base font-bold text-white">✓</Text>
                ) : (
                  <Text className="text-lg">💊</Text>
                )}
              </View>
              {/* Label */}
              <Text
                className={`mt-1 text-2xs font-medium text-center max-w-[56px] ${
                  taken ? 'text-success' : 'text-ink-muted'
                }`}
                numberOfLines={2}
              >
                {item.product_name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
