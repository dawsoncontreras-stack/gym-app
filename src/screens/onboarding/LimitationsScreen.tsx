import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProgressBar, Button } from '../../components';
import { useOnboardingStore, BODY_AREAS } from '../../store/useOnboardingStore';
import type { OnboardingStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Limitations'>;

function formatBodyArea(area: string): string {
  return area
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function LimitationsScreen({ navigation }: Props) {
  const { limitations, toggleLimitation, setLimitationSeverity } = useOnboardingStore();

  const isActive = (area: string) => limitations.some((l) => l.bodyArea === area);
  const getSeverity = (area: string) => limitations.find((l) => l.bodyArea === area)?.severity;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ProgressBar currentStep={5} totalSteps={6} />
      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 100 }}>
        <Text className="text-2xl font-bold text-gray-900 mt-6 mb-2">Any limitations?</Text>
        <Text className="text-gray-500 mb-6">
          Select any body areas with injuries or discomfort. We'll avoid or modify exercises
          accordingly.
        </Text>

        {BODY_AREAS.map((area) => {
          const active = isActive(area);
          const severity = getSeverity(area);

          return (
            <View key={area} className="mb-3">
              <TouchableOpacity
                className={`border-2 rounded-xl p-4 ${
                  active ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
                onPress={() => toggleLimitation(area)}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-base font-semibold ${active ? 'text-blue-600' : 'text-gray-900'}`}
                >
                  {formatBodyArea(area)}
                </Text>
              </TouchableOpacity>

              {active && (
                <View className="flex-row gap-2 mt-2 ml-2">
                  <TouchableOpacity
                    className={`px-4 py-2 rounded-lg border ${
                      severity === 'caution'
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-gray-200 bg-white'
                    }`}
                    onPress={() => setLimitationSeverity(area, 'caution')}
                  >
                    <Text
                      className={`text-sm font-medium ${severity === 'caution' ? 'text-yellow-700' : 'text-gray-500'}`}
                    >
                      Caution
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`px-4 py-2 rounded-lg border ${
                      severity === 'avoid'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 bg-white'
                    }`}
                    onPress={() => setLimitationSeverity(area, 'avoid')}
                  >
                    <Text
                      className={`text-sm font-medium ${severity === 'avoid' ? 'text-red-700' : 'text-gray-500'}`}
                    >
                      Avoid
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View className="px-6 pb-6 pt-3 flex-row gap-3">
        <View className="flex-1">
          <Button title="Back" onPress={() => navigation.goBack()} variant="outline" />
        </View>
        <View className="flex-1">
          <Button title="Continue" onPress={() => navigation.navigate('AnchorLifts')} />
        </View>
      </View>
    </SafeAreaView>
  );
}
