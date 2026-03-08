import { View, Text } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { Button, Card, LoadingSpinner } from '../components';

export function ProfileScreen() {
  const { session, signOut } = useAuth();
  const { data: profile, isLoading } = useProfile(session?.user?.id);

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <View className="flex-1 bg-gray-50 p-4">
      <Text className="text-2xl font-bold text-gray-900 mb-4">Profile</Text>

      <Card className="mb-4">
        <Text className="text-lg font-semibold text-gray-800">
          {profile?.full_name ?? 'No name set'}
        </Text>
        <Text className="text-gray-600 mt-1">{profile?.email ?? session?.user?.email}</Text>
      </Card>

      <Button title="Sign Out" onPress={signOut} variant="outline" />
    </View>
  );
}
