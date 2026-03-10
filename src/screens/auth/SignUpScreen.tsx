import { useState } from 'react';
import {
  View,
  Text,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { Button, Input, SocialAuthButtons } from '../../components';
import type { AuthStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

export function SignUpScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp, verifySignUpOtp } = useAuth();

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password);
      setOtpSent(true);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      Alert.alert('Error', 'Please enter the code from your email');
      return;
    }

    setLoading(true);
    try {
      await verifySignUpOtp(email, otp);
      // onAuthStateChange will fire and redirect automatically
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      await signUp(email, password);
      Alert.alert('Sent', 'A new code has been sent to your email');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
        className="px-6"
      >
        {!otpSent ? (
          <>
            <Text className="text-3xl font-bold text-gray-900 mb-8">Create account</Text>

            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              containerClassName="mb-4"
            />

            <Input
              label="Password"
              placeholder="Choose a password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              containerClassName="mb-4"
            />

            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              containerClassName="mb-6"
            />

            <Button title="Sign Up" onPress={handleSignUp} loading={loading} />

            <Button
              title="Already have an account? Log In"
              onPress={() => navigation.navigate('Login')}
              variant="outline"
              className="mt-3"
            />

            <SocialAuthButtons />
          </>
        ) : (
          <>
            <Text className="text-3xl font-bold text-gray-900 mb-3">Check your email</Text>
            <Text className="text-gray-500 mb-8">
              We sent a 6-digit code to {email}. Enter it below to verify your account.
            </Text>

            <Input
              label="Verification code"
              placeholder="123456"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              containerClassName="mb-6"
            />

            <Button title="Verify" onPress={handleVerifyOtp} loading={loading} />

            <Button
              title="Resend code"
              onPress={handleResend}
              variant="outline"
              className="mt-3"
              disabled={loading}
            />

            <Button
              title="Use a different email"
              onPress={() => { setOtpSent(false); setOtp(''); }}
              variant="outline"
              className="mt-3"
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
