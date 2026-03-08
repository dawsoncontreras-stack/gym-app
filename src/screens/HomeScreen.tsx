import { View, Text } from 'react-native';
import { Card } from '../components';

export function HomeScreen() {
  return (
    <View className="flex-1 bg-gray-50 p-4">
      <Text className="text-2xl font-bold text-gray-900 mb-4">Home</Text>
      <Card>
        <Text className="text-lg font-semibold text-gray-800">Welcome to GymApp</Text>
        <Text className="text-gray-600 mt-2">Your fitness journey starts here.</Text>
      </Card>
    </View>
  );
}
