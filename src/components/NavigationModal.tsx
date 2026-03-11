/**
 * A View-based overlay that replaces React Native's <Modal>.
 *
 * React Native's <Modal> renders in a new native view hierarchy that loses
 * all ancestor React contexts. Components using nativewind className props
 * trigger code paths that access NavigationStateContext, which crashes
 * with "Couldn't find a navigation context" when inside a plain Modal.
 *
 * Fix: We use an absolutely-positioned Animated.View instead of Modal.
 * This keeps everything in the same React tree, preserving all contexts.
 * Android back-button handling is provided via BackHandler.
 *
 * IMPORTANT: This component must be rendered at a screen-root level (e.g.
 * inside HomeScreen's top-level View), NOT inside a scroll-list item,
 * because it uses `position: absolute` relative to its parent.
 */
import { useEffect, useRef } from 'react';
import { Animated, BackHandler, Platform, useWindowDimensions } from 'react-native';

interface NavigationModalProps {
  visible: boolean;
  transparent?: boolean;
  animationType?: 'none' | 'fade' | 'slide';
  onRequestClose?: () => void;
  children: React.ReactNode;
}

export function NavigationModal({
  visible,
  animationType = 'none',
  onRequestClose,
  children,
}: NavigationModalProps) {
  const { width, height } = useWindowDimensions();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (visible) {
      if (animationType === 'fade') {
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      } else if (animationType === 'slide') {
        slideAnim.setValue(height);
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [visible, animationType, fadeAnim, slideAnim, height]);

  // Android hardware back button
  useEffect(() => {
    if (!visible || !onRequestClose) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onRequestClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onRequestClose]);

  if (!visible) return null;

  const animStyle =
    animationType === 'fade'
      ? { opacity: fadeAnim }
      : animationType === 'slide'
        ? { transform: [{ translateY: slideAnim }] }
        : {};

  return (
    <Animated.View
      style={[
        {
          position: 'absolute' as const,
          top: 0,
          left: 0,
          width,
          height,
          zIndex: 9999,
        },
        Platform.OS === 'android' && { elevation: 9999 },
        animStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
}
