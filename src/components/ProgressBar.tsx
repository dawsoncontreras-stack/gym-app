import { View } from 'react-native';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  return (
    <View className="flex-row px-6 pt-4 gap-2">
      {Array.from({ length: totalSteps }, (_, i) => (
        <View
          key={i}
          className={`flex-1 h-1.5 rounded-full ${i < currentStep ? 'bg-blue-600' : 'bg-gray-200'}`}
        />
      ))}
    </View>
  );
}
