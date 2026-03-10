import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BasicInfoScreen } from '../screens/onboarding/BasicInfoScreen';
import { ExperienceScreen } from '../screens/onboarding/ExperienceScreen';
import { EquipmentScreen } from '../screens/onboarding/EquipmentScreen';
import { ScheduleScreen } from '../screens/onboarding/ScheduleScreen';
import { LimitationsScreen } from '../screens/onboarding/LimitationsScreen';
import { AnchorLiftsScreen } from '../screens/onboarding/AnchorLiftsScreen';
import type { OnboardingStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="BasicInfo" component={BasicInfoScreen} />
      <Stack.Screen name="Experience" component={ExperienceScreen} />
      <Stack.Screen name="Equipment" component={EquipmentScreen} />
      <Stack.Screen name="Schedule" component={ScheduleScreen} />
      <Stack.Screen name="Limitations" component={LimitationsScreen} />
      <Stack.Screen name="AnchorLifts" component={AnchorLiftsScreen} />
    </Stack.Navigator>
  );
}
