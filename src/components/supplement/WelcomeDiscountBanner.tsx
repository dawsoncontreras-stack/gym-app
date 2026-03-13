import { View, Text, Pressable } from 'react-native';

type WelcomeDiscountBannerProps = {
  code: string;
  onDismiss: () => void;
};

export default function WelcomeDiscountBanner({ code, onDismiss }: WelcomeDiscountBannerProps) {
  return (
    <View className="mx-4 mb-3 rounded-xl bg-success/10 border border-success/20 p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-2">
          <Text className="text-sm font-bold text-ink">Welcome! 🎉</Text>
          <Text className="mt-0.5 text-xs text-ink-secondary">
            Here's 15% off your next order
          </Text>
          <View className="mt-1.5 flex-row items-center">
            <Text className="text-xs text-ink-muted">Code: </Text>
            <Text className="text-xs font-bold text-success">{code}</Text>
          </View>
        </View>

        {/* Dismiss */}
        <Pressable onPress={onDismiss} className="p-1" hitSlop={8}>
          <Text className="text-sm text-ink-muted">✕</Text>
        </Pressable>
      </View>
    </View>
  );
}
