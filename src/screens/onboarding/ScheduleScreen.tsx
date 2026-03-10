import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProgressBar, Button, OptionCard } from '../../components';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import type { OnboardingStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Schedule'>;

const SESSIONS_OPTIONS = [
  { value: 2, label: '2 days' },
  { value: 3, label: '3 days' },
  { value: 4, label: '4 days' },
  { value: 5, label: '5 days' },
  { value: 6, label: '6 days' },
];

const DURATION_OPTIONS = [
  { value: 30, label: '30 min', description: 'Quick session' },
  { value: 45, label: '45 min', description: 'Standard session' },
  { value: 60, label: '60 min', description: 'Full session' },
  { value: 90, label: '90 min', description: 'Extended session' },
];

const SPLIT_OPTIONS = [
  {
    value: 'balanced' as const,
    label: 'Balanced',
    description: 'Equal focus on all muscle groups',
  },
  {
    value: 'upper_focused' as const,
    label: 'Upper Body Focus',
    description: 'More volume for chest, back, shoulders, arms',
  },
  {
    value: 'lower_focused' as const,
    label: 'Lower Body Focus',
    description: 'More volume for quads, hamstrings, glutes',
  },
];

export function ScheduleScreen({ navigation }: Props) {
  const {
    sessionsPerWeek,
    sessionDurationMinutes,
    splitPreference,
    setSessionsPerWeek,
    setSessionDuration,
    setSplitPreference,
  } = useOnboardingStore();

  const canContinue = sessionsPerWeek && sessionDurationMinutes && splitPreference;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ProgressBar currentStep={4} totalSteps={6} />
      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 100 }}>
        <Text className="text-2xl font-bold text-gray-900 mt-6 mb-2">Your schedule</Text>
        <Text className="text-gray-500 mb-6">
          How often and how long can you train each week?
        </Text>

        <Text className="text-sm font-medium text-gray-700 mb-2">Sessions per week</Text>
        <View className="flex-row flex-wrap gap-2 mb-5">
          {SESSIONS_OPTIONS.map((opt) => (
            <View key={opt.value} className="flex-1 min-w-[60px]">
              <OptionCard
                label={opt.label}
                selected={sessionsPerWeek === opt.value}
                onPress={() => setSessionsPerWeek(opt.value)}
              />
            </View>
          ))}
        </View>

        <Text className="text-sm font-medium text-gray-700 mb-2">Session duration</Text>
        {DURATION_OPTIONS.map((opt) => (
          <OptionCard
            key={opt.value}
            label={opt.label}
            description={opt.description}
            selected={sessionDurationMinutes === opt.value}
            onPress={() => setSessionDuration(opt.value)}
          />
        ))}

        <Text className="text-sm font-medium text-gray-700 mb-2 mt-4">Split preference</Text>
        {SPLIT_OPTIONS.map((opt) => (
          <OptionCard
            key={opt.value}
            label={opt.label}
            description={opt.description}
            selected={splitPreference === opt.value}
            onPress={() => setSplitPreference(opt.value)}
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
            onPress={() => navigation.navigate('Limitations')}
            disabled={!canContinue}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
