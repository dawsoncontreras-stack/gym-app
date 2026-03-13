import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/authStore';
import { useOnboardingStore } from '../stores/onboardingStore';
import { useProducts } from '../hooks/useProducts';
import { useUserProfileMutations } from '../hooks/useUserProfile';
import { supabase } from '../lib/supabase';
import ProductCard from '../components/supplement/ProductCard';
import DaysRemainingSlider from '../components/supplement/DaysRemainingSlider';
import type { FitnessGoal, Product } from '../lib/types';

// ── Goal Selection ──

const GOALS: { key: FitnessGoal; label: string; emoji: string }[] = [
  { key: 'build_muscle', label: 'Build Muscle', emoji: '💪' },
  { key: 'lose_fat', label: 'Lose Fat', emoji: '🔥' },
  { key: 'stay_active', label: 'Stay Active', emoji: '🏃' },
  { key: 'general_health', label: 'General Health', emoji: '❤️' },
];

function GoalSection() {
  const selectedGoal = useOnboardingStore((s) => s.selectedGoal);
  const setGoal = useOnboardingStore((s) => s.setGoal);

  return (
    <View className="mb-8">
      <Text className="text-xl font-bold text-ink mb-1">What's your fitness goal?</Text>
      <Text className="text-sm text-ink-muted mb-4">
        This helps us personalize your experience
      </Text>

      <View className="flex-row flex-wrap gap-3">
        {GOALS.map((goal) => {
          const isSelected = selectedGoal === goal.key;
          return (
            <Pressable
              key={goal.key}
              onPress={() => setGoal(goal.key)}
              className={`flex-1 min-w-[45%] items-center rounded-xl border-2 px-4 py-5 ${
                isSelected ? 'border-accent bg-brand-50' : 'border-surface-tertiary bg-surface'
              }`}
            >
              <Text className="text-2xl mb-1">{goal.emoji}</Text>
              <Text
                className={`text-sm font-semibold ${
                  isSelected ? 'text-accent' : 'text-ink'
                }`}
              >
                {goal.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── Product Selection ──

function ProductStatusPicker({ productId }: { productId: string }) {
  const product = useOnboardingStore((s) => s.selectedProducts.get(productId));
  const setProductStatus = useOnboardingStore((s) => s.setProductStatus);
  const setProductDaysRemaining = useOnboardingStore((s) => s.setProductDaysRemaining);

  if (!product) return null;

  return (
    <View className="mt-3 ml-15 pl-3 border-l-2 border-accent/20">
      <View className="flex-row gap-2">
        <Pressable
          onPress={() => setProductStatus(productId, 'arriving')}
          className={`rounded-lg px-3 py-1.5 ${
            product.status === 'arriving' ? 'bg-accent' : 'bg-surface-tertiary'
          }`}
        >
          <Text
            className={`text-xs font-medium ${
              product.status === 'arriving' ? 'text-white' : 'text-ink-secondary'
            }`}
          >
            Just ordered
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setProductStatus(productId, 'have_it')}
          className={`rounded-lg px-3 py-1.5 ${
            product.status === 'have_it' ? 'bg-accent' : 'bg-surface-tertiary'
          }`}
        >
          <Text
            className={`text-xs font-medium ${
              product.status === 'have_it' ? 'text-white' : 'text-ink-secondary'
            }`}
          >
            I already have this
          </Text>
        </Pressable>
      </View>

      {product.status === 'have_it' && (
        <DaysRemainingSlider
          value={product.daysRemaining}
          onChange={(days) => setProductDaysRemaining(productId, days)}
        />
      )}
    </View>
  );
}

function ProductSelectionSection() {
  const { data: products, isLoading, error } = useProducts();
  const selectedProducts = useOnboardingStore((s) => s.selectedProducts);
  const toggleProduct = useOnboardingStore((s) => s.toggleProduct);

  if (isLoading) {
    return (
      <View className="items-center py-8">
        <ActivityIndicator color="#2f7fff" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="rounded-lg bg-error/10 px-4 py-3">
        <Text className="text-sm text-error">Failed to load products. Please try again.</Text>
      </View>
    );
  }

  return (
    <View className="mb-8">
      <Text className="text-xl font-bold text-ink mb-1">
        What supplements are you taking?
      </Text>
      <Text className="text-sm text-ink-muted mb-4">
        Select any products you're currently using or have ordered
      </Text>

      <View className="gap-3">
        {products?.map((product) => {
          const isSelected = selectedProducts.has(product.id);
          return (
            <View key={product.id}>
              <ProductCard
                product={product}
                isSelected={isSelected}
                onPress={() => toggleProduct(product.id)}
                variant="onboarding"
              />
              {isSelected && <ProductStatusPicker productId={product.id} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Main WelcomeScreen ──

export default function WelcomeScreen({ onComplete }: { onComplete: () => void }) {
  const userId = useAuthStore((s) => s.user?.id);
  const { createProfile } = useUserProfileMutations();
  const selectedGoal = useOnboardingStore((s) => s.selectedGoal);
  const selectedProducts = useOnboardingStore((s) => s.selectedProducts);
  const reset = useOnboardingStore((s) => s.reset);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const canContinue = selectedGoal != null;

  const handleComplete = async () => {
    if (!userId || !selectedGoal) return;

    setIsSubmitting(true);

    try {
      // 1. Create user profile
      await createProfile.mutateAsync({ userId, fitnessGoal: selectedGoal });

      // 2. Create stack items for selected products
      if (selectedProducts.size > 0) {
        const stackItems = Array.from(selectedProducts.values()).map((item) => {
          const base: Record<string, unknown> = {
            user_id: userId,
            product_id: item.productId,
            status: item.status === 'have_it' ? 'active' : 'arriving',
            days_supply: 30, // default; overridden by product default on insert trigger if present
          };

          if (item.status === 'have_it') {
            const daysRemaining = item.daysRemaining;
            const now = new Date();
            // activated_at = now - (days_supply - daysRemaining) days
            const activatedAt = new Date(now.getTime() - (30 - daysRemaining) * 86400000);
            // estimated_depletion_date = today + daysRemaining
            const depletionDate = new Date(now.getTime() + daysRemaining * 86400000);

            base.activated_at = activatedAt.toISOString();
            base.estimated_depletion_date = depletionDate.toISOString().split('T')[0];
          }

          return base;
        });

        const { error: stackError } = await supabase
          .from('user_stack_items')
          .insert(stackItems);

        if (stackError) throw stackError;
      }

      // 3. Create welcome discount
      const { error: discountError } = await supabase
        .from('user_welcome_discounts')
        .insert({
          user_id: userId,
          discount_code: 'WELCOME15',
        });

      // Non-critical — ignore if it fails (e.g., already exists)
      if (discountError) {
        console.warn('Welcome discount insert failed:', discountError.message);
      }

      // 4. Clean up and navigate
      reset();
      onComplete();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 py-6"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="mb-8">
          <Text className="text-3xl font-bold text-ink">Welcome 👋</Text>
          <Text className="mt-2 text-sm text-ink-secondary">
            Let's set up your profile and supplement stack
          </Text>
        </View>

        {/* Section 1: Goal */}
        <GoalSection />

        {/* Section 2: Products */}
        <ProductSelectionSection />

        {/* Skip option */}
        {selectedProducts.size === 0 && (
          <View className="mb-4 items-center">
            <Text className="text-xs text-ink-muted">
              Nothing yet? No problem — you can set up your stack later.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Continue Button — sticky at bottom */}
      <View className="px-4 pb-4 pt-2 border-t border-surface-tertiary bg-surface">
        <Pressable
          onPress={handleComplete}
          disabled={!canContinue || isSubmitting}
          className={`w-full rounded-xl py-4 items-center ${
            canContinue && !isSubmitting ? 'bg-accent' : 'bg-muted/30'
          }`}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text
              className={`text-lg font-semibold ${
                canContinue ? 'text-white' : 'text-ink-muted'
              }`}
            >
              Continue
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
