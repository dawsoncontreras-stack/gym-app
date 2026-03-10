import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { LoadingSpinner } from '../components';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';

const linking = {
  prefixes: [Linking.createURL('/'), 'gymapp://'],
};

export function RootNavigator() {
  const { session, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile(session?.user?.id);

  if (authLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!session) {
    return (
      <NavigationContainer linking={linking}>
        <AuthNavigator />
      </NavigationContainer>
    );
  }

  if (profileLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <NavigationContainer linking={linking}>
      {profile?.onboarding_completed ? (
        <MainNavigator />
      ) : (
        <OnboardingNavigator />
      )}
    </NavigationContainer>
  );
}
