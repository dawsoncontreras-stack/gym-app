import { View, Text, ScrollView, Alert, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProgressBar, Button, Input, OptionCard } from '../../components';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import type { OnboardingStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'BasicInfo'>;

export function BasicInfoScreen({ navigation }: Props) {
  const { age, gender, heightFt, heightIn, weightLbs, setGender } = useOnboardingStore();
  const setState = useOnboardingStore.setState;

  const canContinue = age && gender && heightFt && weightLbs;

  const handleContinue = () => {
    const ageNum = parseInt(age, 10);
    const ftNum = parseInt(heightFt, 10);
    const inNum = heightIn ? parseInt(heightIn, 10) : 0;
    const weightNum = parseFloat(weightLbs);

    if (isNaN(ageNum) || ageNum < 13 || ageNum > 100) {
      Alert.alert('Invalid age', 'Please enter an age between 13 and 100.');
      return;
    }
    if (isNaN(ftNum) || ftNum < 3 || ftNum > 8) {
      Alert.alert('Invalid height', 'Please enter feet between 3 and 8.');
      return;
    }
    if (inNum < 0 || inNum > 11) {
      Alert.alert('Invalid height', 'Inches must be between 0 and 11.');
      return;
    }
    if (isNaN(weightNum) || weightNum < 50 || weightNum > 1000) {
      Alert.alert('Invalid weight', 'Please enter a weight between 50 and 1000 lbs.');
      return;
    }

    navigation.navigate('Experience');
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView className="flex-1 bg-white">
        <ProgressBar currentStep={1} totalSteps={6} />
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-2xl font-bold text-gray-900 mt-6 mb-2">About you</Text>
          <Text className="text-gray-500 mb-6">Help us personalize your training plan.</Text>

          <Input
            label="Age"
            placeholder="25"
            value={age}
            onChangeText={(v) => setState({ age: v })}
            keyboardType="number-pad"
            containerClassName="mb-4"
          />

          <Text className="text-sm font-medium text-gray-700 mb-2">Gender</Text>
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <OptionCard
                label="Male"
                selected={gender === 'male'}
                onPress={() => setGender('male')}
              />
            </View>
            <View className="flex-1">
              <OptionCard
                label="Female"
                selected={gender === 'female'}
                onPress={() => setGender('female')}
              />
            </View>
          </View>

          <Text className="text-sm font-medium text-gray-700 mb-1">Height</Text>
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Input
                placeholder="5"
                value={heightFt}
                onChangeText={(v) => setState({ heightFt: v })}
                keyboardType="number-pad"
              />
              <Text className="text-xs text-gray-400 mt-1 ml-1">ft</Text>
            </View>
            <View className="flex-1">
              <Input
                placeholder="10"
                value={heightIn}
                onChangeText={(v) => setState({ heightIn: v })}
                keyboardType="number-pad"
              />
              <Text className="text-xs text-gray-400 mt-1 ml-1">in</Text>
            </View>
          </View>

          <Input
            label="Weight (lbs)"
            placeholder="165"
            value={weightLbs}
            onChangeText={(v) => setState({ weightLbs: v })}
            keyboardType="numeric"
            containerClassName="mb-4"
          />
        </ScrollView>

        <View className="px-6 pb-6 pt-3">
          <Button title="Continue" onPress={handleContinue} disabled={!canContinue} />
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}
