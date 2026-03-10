import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProgressBar, Button, OptionCard, LoadingSpinner } from '../../components';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { supabase } from '../../lib/supabase';
import type { Equipment } from '../../types';
import type { OnboardingStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Equipment'>;

const TIER_OPTIONS = [
  {
    value: 'large_gym' as const,
    label: 'Full Gym',
    description: 'Commercial gym with full equipment',
  },
  {
    value: 'apartment_gym' as const,
    label: 'Apartment Gym',
    description: 'Basic machines, dumbbells, cables',
  },
  {
    value: 'home_gym' as const,
    label: 'Home Gym',
    description: 'Personal setup at home',
  },
  {
    value: 'bodyweight' as const,
    label: 'Bodyweight Only',
    description: 'No equipment needed',
  },
];

function formatEquipmentName(name: string): string {
  return name
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function EquipmentScreen({ navigation }: Props) {
  const { equipmentTier, setEquipmentTier, selectedEquipmentIds, toggleEquipment } =
    useOnboardingStore();

  const showEquipmentList = equipmentTier && equipmentTier !== 'large_gym';

  const { data: equipment, isLoading } = useQuery<Equipment[]>({
    queryKey: ['equipment', equipmentTier],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .contains('tier_available', [equipmentTier!]);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!showEquipmentList,
  });

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ProgressBar currentStep={3} totalSteps={6} />
      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 100 }}>
        <Text className="text-2xl font-bold text-gray-900 mt-6 mb-2">Your equipment</Text>
        <Text className="text-gray-500 mb-6">
          Where do you train? This determines which exercises we recommend.
        </Text>

        {TIER_OPTIONS.map((opt) => (
          <OptionCard
            key={opt.value}
            label={opt.label}
            description={opt.description}
            selected={equipmentTier === opt.value}
            onPress={() => setEquipmentTier(opt.value)}
          />
        ))}

        {showEquipmentList && (
          <View className="mt-4">
            <Text className="text-sm font-medium text-gray-700 mb-3">
              Select the equipment you have access to:
            </Text>
            {isLoading && <LoadingSpinner size="small" />}
            {equipment?.map((eq) => {
              const isSelected = selectedEquipmentIds.includes(eq.id);
              return (
                <TouchableOpacity
                  key={eq.id}
                  className={`flex-row items-center border-2 rounded-xl p-3 mb-2 ${
                    isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'
                  }`}
                  onPress={() => toggleEquipment(eq.id)}
                  activeOpacity={0.7}
                >
                  <View
                    className={`w-5 h-5 rounded border-2 mr-3 items-center justify-center ${
                      isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                    }`}
                  >
                    {isSelected && <Text className="text-white text-xs font-bold">✓</Text>}
                  </View>
                  <Text
                    className={`text-base ${isSelected ? 'text-blue-600 font-medium' : 'text-gray-900'}`}
                  >
                    {formatEquipmentName(eq.name)}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {!isLoading && equipment?.length === 0 && (
              <Text className="text-gray-400 text-sm italic">
                No equipment data available yet. You can continue and update this later.
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      <View className="px-6 pb-6 pt-3 flex-row gap-3">
        <View className="flex-1">
          <Button title="Back" onPress={() => navigation.goBack()} variant="outline" />
        </View>
        <View className="flex-1">
          <Button
            title="Continue"
            onPress={() => navigation.navigate('Schedule')}
            disabled={!equipmentTier}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
