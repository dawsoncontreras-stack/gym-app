import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';

type DaysRemainingSliderProps = {
  value: number;
  onChange: (days: number) => void;
  min?: number;
  max?: number;
};

const PRESETS = [5, 10, 15, 20, 25, 30];

export default function DaysRemainingSlider({
  value,
  onChange,
  min = 1,
  max = 30,
}: DaysRemainingSliderProps) {
  return (
    <View className="mt-2">
      <Text className="text-xs font-medium text-ink-secondary mb-2">
        About how many days left?
      </Text>

      {/* Preset buttons */}
      <View className="flex-row flex-wrap gap-2">
        {PRESETS.filter((d) => d >= min && d <= max).map((days) => {
          const isSelected = value === days;
          return (
            <Pressable
              key={days}
              onPress={() => onChange(days)}
              className={`rounded-lg px-3 py-1.5 ${
                isSelected ? 'bg-accent' : 'bg-surface-tertiary'
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  isSelected ? 'text-white' : 'text-ink-secondary'
                }`}
              >
                {days} days
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Fine adjustment */}
      <View className="flex-row items-center mt-2 gap-3">
        <Pressable
          onPress={() => onChange(Math.max(min, value - 1))}
          className="h-8 w-8 items-center justify-center rounded-full bg-surface-tertiary"
        >
          <Text className="text-base font-bold text-ink-secondary">−</Text>
        </Pressable>
        <Text className="text-sm font-semibold text-ink min-w-[60px] text-center">
          {value} {value === 1 ? 'day' : 'days'}
        </Text>
        <Pressable
          onPress={() => onChange(Math.min(max, value + 1))}
          className="h-8 w-8 items-center justify-center rounded-full bg-surface-tertiary"
        >
          <Text className="text-base font-bold text-ink-secondary">+</Text>
        </Pressable>
      </View>
    </View>
  );
}
