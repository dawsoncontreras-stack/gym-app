import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Hook that handles push notification setup after onboarding:
 * 1. Requests notification permissions
 * 2. Gets the Expo push token
 * 3. Saves it to user_profiles.expo_push_token
 * 4. Sets up a notification response handler for deep linking
 *
 * Call once in the authenticated app root.
 */
export function useNotificationSetup(
  userId: string | undefined,
  onNotificationTap?: (data: Record<string, unknown>) => void
) {
  const hasRegistered = useRef(false);

  // Register for push notifications
  useEffect(() => {
    if (!userId || hasRegistered.current) return;
    hasRegistered.current = true;

    registerForPushNotifications(userId);
  }, [userId]);

  // Handle notification taps (deep linking)
  useEffect(() => {
    if (!onNotificationTap) return;

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data && typeof data === 'object') {
          onNotificationTap(data as Record<string, unknown>);
        }
      }
    );

    return () => subscription.remove();
  }, [onNotificationTap]);
}

async function registerForPushNotifications(userId: string) {
  try {
    // Must be a physical device
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return;
    }

    // Get the Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId ?? undefined,
    });
    const token = tokenData.data;

    // Save token to user_profiles
    const { error } = await supabase
      .from('user_profiles')
      .update({ expo_push_token: token })
      .eq('id', userId);

    if (error) {
      console.warn('Failed to save push token:', error.message);
    }

    // Android-specific: set notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2f7fff',
      });
    }
  } catch (err) {
    console.warn('Push notification registration failed:', err);
  }
}
