import { View, Text, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export function SocialAuthButtons() {
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const busy = googleLoading || appleLoading;

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    try {
      await signInWithApple();
    } catch (error) {
      // User dismissed the Apple dialog — not an error
      if ((error as any)?.code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert('Error', error instanceof Error ? error.message : 'Apple sign-in failed');
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <View className="mt-6">
      {/* Divider */}
      <View className="flex-row items-center mb-6">
        <View className="flex-1 h-px bg-gray-300" />
        <Text className="mx-4 text-sm text-gray-500">or continue with</Text>
        <View className="flex-1 h-px bg-gray-300" />
      </View>

      {/* Google */}
      <TouchableOpacity
        className="flex-row items-center justify-center py-3 rounded-xl border-2 border-gray-300 bg-white"
        onPress={handleGoogleSignIn}
        disabled={busy}
        activeOpacity={0.7}
      >
        {googleLoading ? (
          <ActivityIndicator color="#4285F4" />
        ) : (
          <Text className="text-base font-semibold text-gray-700">Continue with Google</Text>
        )}
      </TouchableOpacity>

      {/* Apple — iOS only */}
      {Platform.OS === 'ios' && (
        <TouchableOpacity
          className="flex-row items-center justify-center py-3 rounded-xl bg-black mt-3"
          onPress={handleAppleSignIn}
          disabled={busy}
          activeOpacity={0.7}
        >
          {appleLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-base font-semibold text-white">Continue with Apple</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
