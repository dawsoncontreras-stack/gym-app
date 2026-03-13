import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import WorkoutDetailScreen from '../screens/WorkoutDetailScreen';
import WorkoutPlayerScreen from '../screens/WorkoutPlayerScreen';
import SessionSummaryScreen from '../screens/SessionSummaryScreen';
import ProductCatalogScreen from '../screens/ProductCatalogScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import StackScreen from '../screens/StackScreen';
import EducationListScreen from '../screens/EducationListScreen';
import SavedWorkoutsScreen from '../screens/SavedWorkoutsScreen';
import CategoryWorkoutsScreen from '../screens/CategoryWorkoutsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SessionDetailScreen from '../screens/SessionDetailScreen';

export type HomeStackParamList = {
  Home: undefined;
  WorkoutDetail: { workoutId: string };
  WorkoutPlayer: { workoutId: string };
  SessionSummary: { sessionData: unknown };
  ProductCatalog: undefined;
  ProductDetail: { productId: string };
  Stack: undefined;
  EducationList: undefined;
  SavedWorkouts: undefined;
  CategoryWorkouts: { categoryId: string; categoryName: string };
  Profile: undefined;
  SessionDetail: { sessionId: string };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
      <Stack.Screen name="WorkoutPlayer" component={WorkoutPlayerScreen} />
      <Stack.Screen name="SessionSummary" component={SessionSummaryScreen} />
      <Stack.Screen name="ProductCatalog" component={ProductCatalogScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Stack" component={StackScreen} />
      <Stack.Screen name="EducationList" component={EducationListScreen} />
      <Stack.Screen name="SavedWorkouts" component={SavedWorkoutsScreen} />
      <Stack.Screen name="CategoryWorkouts" component={CategoryWorkoutsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="SessionDetail" component={SessionDetailScreen} />
    </Stack.Navigator>
  );
}
