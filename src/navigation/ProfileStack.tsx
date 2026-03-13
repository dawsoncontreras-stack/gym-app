import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ProfileScreen from '../screens/ProfileScreen';
import SessionDetailScreen from '../screens/SessionDetailScreen';
import WorkoutDetailScreen from '../screens/WorkoutDetailScreen';
import WorkoutPlayerScreen from '../screens/WorkoutPlayerScreen';
import SessionSummaryScreen from '../screens/SessionSummaryScreen';
import StackScreen from '../screens/StackScreen';
import ProductCatalogScreen from '../screens/ProductCatalogScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import EducationListScreen from '../screens/EducationListScreen';

export type ProfileStackParamList = {
  Profile: undefined;
  SessionDetail: { sessionId: string };
  WorkoutDetail: { workoutId: string };
  WorkoutPlayer: { workoutId: string };
  SessionSummary: { sessionData: unknown };
  Stack: undefined;
  ProductCatalog: undefined;
  ProductDetail: { productId: string };
  EducationList: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="SessionDetail" component={SessionDetailScreen} />
      <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
      <Stack.Screen name="WorkoutPlayer" component={WorkoutPlayerScreen} />
      <Stack.Screen name="SessionSummary" component={SessionSummaryScreen} />
      <Stack.Screen name="Stack" component={StackScreen} />
      <Stack.Screen name="ProductCatalog" component={ProductCatalogScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="EducationList" component={EducationListScreen} />
    </Stack.Navigator>
  );
}
