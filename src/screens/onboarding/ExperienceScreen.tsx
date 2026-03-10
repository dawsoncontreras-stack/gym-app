import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProgressBar, Button, OptionCard } from '../../components';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import type { OnboardingStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Experience'>;

const EXPERIENCE_OPTIONS = [
  { value: 'beginner' as const, label: 'Beginner', description: 'Less than 6 months of training' },
  {
    value: 'intermediate' as const,
    label: 'Intermediate',
    description: '6 months to 2 years of consistent training',
  },
  {
    value: 'advanced' as const,
    label: 'Advanced',
    description: '2+ years of structured training',
  },
];

const GOAL_OPTIONS = [
  { value: 'muscle_size' as const, label: 'Build Muscle', description: 'Hypertrophy-focused training' },
  { value: 'strength' as const, label: 'Get Stronger', description: 'Strength and power focused' },
  {
    value: 'lose_weight' as const,
    label: 'Lose Weight',
    description: 'Fat loss with muscle retention',
  },
  { value: 'stay_fit' as const, label: 'Stay Fit', description: 'General health and fitness' },
];

export function ExperienceScreen({ navigation }: Props) {
  const { experienceLevel, trainingGoal, setExperienceLevel, setTrainingGoal } =
    useOnboardingStore();

  const canContinue = experienceLevel && trainingGoal;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ProgressBar currentStep={2} totalSteps={6} />
      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 100 }}>
        <Text className="text-2xl font-bold text-gray-900 mt-6 mb-2">Your experience</Text>
        <Text className="text-gray-500 mb-6">
          This helps us pick the right exercises and progression.
        </Text>

        <Text className="text-sm font-medium text-gray-700 mb-2">Training experience</Text>
        {EXPERIENCE_OPTIONS.map((opt) => (
          <OptionCard
            key={opt.value}
            label={opt.label}
            description={opt.description}
            selected={experienceLevel === opt.value}
            onPress={() => setExperienceLevel(opt.value)}
          />
        ))}

        <Text className="text-sm font-medium text-gray-700 mb-2 mt-4">Primary goal</Text>
        {GOAL_OPTIONS.map((opt) => (
          <OptionCard
            key={opt.value}
            label={opt.label}
            description={opt.description}
            selected={trainingGoal === opt.value}
            onPress={() => setTrainingGoal(opt.value)}
          />
        ))}
      </ScrollView>

      <View className="px-6 pb-6 pt-3 flex-row gap-3">
        <View className="flex-1">
          <Button title="Back" onPress={() => navigation.goBack()} variant="outline" />
        </View>
        <View className="flex-1">
          <Button
            title="Continue"
            onPress={() => navigation.navigate('Equipment')}
            disabled={!canContinue}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
