import { View, Text } from 'react-native';
import { Card } from '../components';

export function WorkoutsScreen() {
  return (
    <View className="flex-1 bg-gray-50 p-4">
      <Text className="text-2xl font-bold text-gray-900 mb-4">Workouts</Text>
      <Card>
        <Text className="text-lg font-semibold text-gray-800">Your Workouts</Text>
        <Text className="text-gray-600 mt-2">Track and manage your workout routines.</Text>
      </Card>
    </View>
  );
}
