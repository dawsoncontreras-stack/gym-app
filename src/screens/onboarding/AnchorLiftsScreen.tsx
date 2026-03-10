import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProgressBar, Button, Input } from '../../components';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { useAuth } from '../../hooks/useAuth';
import type { OnboardingStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'AnchorLifts'>;

export function AnchorLiftsScreen({ navigation }: Props) {
  const { anchorLifts, updateAnchorLift, completeOnboarding } = useOnboardingStore();
  const { session } = useAuth();
  const [saving, setSaving] = useState(false);

  const handleComplete = async () => {
    if (!session?.user.id) return;

    setSaving(true);
    try {
      await completeOnboarding(session.user.id);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to save. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <SafeAreaView className="flex-1 bg-white">
          <ProgressBar currentStep={6} totalSteps={6} />
          <ScrollView
            className="flex-1 px-6"
            contentContainerStyle={{ paddingBottom: 120 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <Text className="text-2xl font-bold text-gray-900 mt-6 mb-2">
              Your current lifts
            </Text>
            <Text className="text-gray-500 mb-6">
              Enter the weight you typically use for 8-10 reps. Leave blank for lifts you don't
              perform.
            </Text>

            {anchorLifts.map((lift) => (
              <View
                key={lift.exerciseSlug}
                className="border border-gray-200 rounded-xl p-4 mb-4"
              >
                <Text className="text-base font-semibold text-gray-900 mb-3">{lift.name}</Text>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Input
                      label="Weight (lbs)"
                      placeholder="0"
                      value={lift.weightLbs}
                      onChangeText={(v) => updateAnchorLift(lift.exerciseSlug, 'weightLbs', v)}
                      keyboardType="numeric"
                    />
                  </View>
                  <View className="flex-1">
                    <Input
                      label="Reps"
                      placeholder="10"
                      value={lift.repCount}
                      onChangeText={(v) => updateAnchorLift(lift.exerciseSlug, 'repCount', v)}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          <View className="px-6 pb-6 pt-3 flex-row gap-3">
            <View className="flex-1">
              <Button title="Back" onPress={() => navigation.goBack()} variant="outline" />
            </View>
            <View className="flex-1">
              <Button title="Complete" onPress={handleComplete} loading={saving} />
            </View>
          </View>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
