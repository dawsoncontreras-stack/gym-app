/**
 * RevenueCat Purchases Setup
 *
 * This module initializes RevenueCat for subscription management.
 * All subscription-related logic should be centralized here.
 *
 * Setup steps:
 * 1. Create a RevenueCat account and project at https://www.revenuecat.com
 * 2. Add your app's API keys to .env
 * 3. Configure products/entitlements in the RevenueCat dashboard
 * 4. Implement the functions below
 */

import Purchases, { type PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';

const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS ?? '';
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? '';

/**
 * Initialize RevenueCat SDK. Call this once at app startup.
 */
export async function initializePurchases(userId?: string): Promise<void> {
  const apiKey =
    Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

  if (!apiKey) {
    console.warn('RevenueCat API key not configured. Skipping initialization.');
    return;
  }

  Purchases.configure({ apiKey, appUserID: userId });
}

/**
 * Check if the user has an active subscription.
 *
 * TODO: Define your entitlement identifiers in RevenueCat dashboard
 * and check for them here (e.g. "premium", "pro").
 */
export async function checkSubscriptionStatus(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return Object.keys(customerInfo.entitlements.active).length > 0;
  } catch {
    return false;
  }
}

/**
 * Fetch available subscription packages.
 */
export async function getOfferings() {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error('Error fetching offerings:', error);
    return null;
  }
}

/**
 * Purchase a subscription package.
 */
export async function purchasePackage(pkg: PurchasesPackage) {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

/**
 * Restore previous purchases.
 */
export async function restorePurchases() {
  const customerInfo = await Purchases.restorePurchases();
  return customerInfo;
}
