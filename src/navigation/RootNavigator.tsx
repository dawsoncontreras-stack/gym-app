import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from '../components';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';

export function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <NavigationContainer>{session ? <MainNavigator /> : <AuthNavigator />}</NavigationContainer>
  );
}
