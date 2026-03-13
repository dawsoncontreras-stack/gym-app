import { createNativeStackNavigator } from '@react-navigation/native-stack';

import BrowseScreen from '../screens/BrowseScreen';
import WorkoutDetailScreen from '../screens/WorkoutDetailScreen';
import WorkoutPlayerScreen from '../screens/WorkoutPlayerScreen';
import SessionSummaryScreen from '../screens/SessionSummaryScreen';

export type BrowseStackParamList = {
  Browse: { categoryId?: string } | undefined;
  WorkoutDetail: { workoutId: string };
  WorkoutPlayer: { workoutId: string };
  SessionSummary: { sessionData: unknown };
};

const Stack = createNativeStackNavigator<BrowseStackParamList>();

export default function BrowseStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <Stack.Screen name="Browse" component={BrowseScreen} />
      <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
      <Stack.Screen name="WorkoutPlayer" component={WorkoutPlayerScreen} />
      <Stack.Screen name="SessionSummary" component={SessionSummaryScreen} />
    </Stack.Navigator>
  );
}
