import './global.css';

import { useState, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';

import TabNavigator from './src/navigation/TabNavigator';
import AuthScreen from './src/screens/AuthScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import { useAuth } from './src/hooks/useAuth';
import { useUserProfile } from './src/hooks/useUserProfile';
import { useNotificationSetup } from './src/hooks/useNotificationSetup';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('=== ERROR BOUNDARY CAUGHT ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('Component stack:', info.componentStack);
    console.error('=============================');
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>Something went wrong</Text>
          <Text style={{ fontSize: 12, color: '#666', textAlign: 'center' }}>
            {this.state.error?.message}
          </Text>
          <Text style={{ fontSize: 10, color: '#999', marginTop: 12, textAlign: 'center' }}>
            Check console for full stack trace
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function RootNavigator() {
  const { session, user, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useUserProfile(user?.id);
  const qc = useQueryClient();

  const [justCompletedOnboarding, setJustCompletedOnboarding] = useState(false);

  const needsOnboarding =
    !justCompletedOnboarding && (!profile || !profile.has_completed_onboarding);
  useNotificationSetup(!authLoading && session && !profileLoading && !needsOnboarding ? user?.id : undefined);

  if (authLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color="#2f7fff" />
      </View>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  if (profileLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color="#2f7fff" />
      </View>
    );
  }

  if (needsOnboarding) {
    return (
      <WelcomeScreen
        onComplete={() => {
          setJustCompletedOnboarding(true);
          qc.invalidateQueries({ queryKey: ['user-profile', user?.id] });
        }}
      />
    );
  }

  return <TabNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <ErrorBoundary>
            <RootNavigator />
          </ErrorBoundary>
          <StatusBar style="auto" />
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
