import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/authStore';

export default function AuthScreen() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple } = useAuthStore();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const result = isSignUp
      ? await signUpWithEmail(email.trim(), password)
      : await signInWithEmail(email.trim(), password);

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setIsSubmitting(true);
    const result = await signInWithGoogle();
    setIsSubmitting(false);
    if (result.error) {
      setError(result.error);
    }
  };

  const handleAppleAuth = async () => {
    setError(null);
    setIsSubmitting(true);
    const result = await signInWithApple();
    setIsSubmitting(false);
    if (result.error) {
      setError(result.error);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-12"
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
        >
          <Pressable onPress={Keyboard.dismiss}>
          {/* Header */}
          <View className="items-center mb-10">
            <Text className="text-3xl font-bold text-ink">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </Text>
            <Text className="text-sm text-ink-secondary mt-2">
              {isSignUp
                ? 'Sign up to start tracking your workouts'
                : 'Sign in to continue your fitness journey'}
            </Text>
          </View>

          {/* Error Banner */}
          {error && (
            <View className="w-full rounded-lg bg-error/10 px-4 py-3 mb-4">
              <Text className="text-sm text-error">{error}</Text>
            </View>
          )}

          {/* Email Field */}
          <TextInput
            className="w-full rounded-xl border border-muted/40 bg-surface-secondary px-4 py-3.5 text-ink mb-3"
            placeholder="Email"
            placeholderTextColor="#8888a0"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError(null);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            editable={!isSubmitting}
          />

          {/* Password Field */}
          <TextInput
            className="w-full rounded-xl border border-muted/40 bg-surface-secondary px-4 py-3.5 text-ink mb-5"
            placeholder="Password"
            placeholderTextColor="#8888a0"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError(null);
            }}
            secureTextEntry
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            editable={!isSubmitting}
          />

          {/* Submit Button */}
          <Pressable
            className="w-full rounded-xl bg-accent py-4 items-center mb-4"
            onPress={handleEmailAuth}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-lg font-semibold text-white">
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </Text>
            )}
          </Pressable>

          {/* Toggle Sign In / Sign Up */}
          <Pressable
            onPress={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="items-center mb-8"
            disabled={isSubmitting}
          >
            <Text className="text-sm text-ink-secondary">
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <Text className="text-accent font-semibold">
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Text>
            </Text>
          </Pressable>

          {/* Divider */}
          <View className="w-full flex-row items-center mb-8">
            <View className="flex-1 h-px bg-muted/30" />
            <Text className="mx-4 text-xs text-ink-muted">or continue with</Text>
            <View className="flex-1 h-px bg-muted/30" />
          </View>

          {/* Social Auth Buttons */}
          <View className="w-full flex-row gap-4">
            <Pressable
              className="flex-1 flex-row items-center justify-center rounded-xl border border-muted/40 py-3.5 gap-2"
              onPress={handleGoogleAuth}
              disabled={isSubmitting}
            >
              <Text className="text-base font-medium text-ink">Google</Text>
            </Pressable>

            <Pressable
              className="flex-1 flex-row items-center justify-center rounded-xl border border-muted/40 py-3.5 gap-2"
              onPress={handleAppleAuth}
              disabled={isSubmitting}
            >
              <Text className="text-base font-medium text-ink">Apple</Text>
            </Pressable>
          </View>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
