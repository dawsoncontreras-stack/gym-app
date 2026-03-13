import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/HomeStack';
import { useUserStack } from '../hooks/useUserStack';
import { useStackMutations } from '../hooks/useStackMutations';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import type { StackStatusView, ArchivedStackView } from '../lib/types';
import { useQuery } from '@tanstack/react-query';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Stack'>;

// ── Adherence hook (inline — used only here) ──

function useAdherence(userId: string | undefined) {
  return useQuery({
    queryKey: ['adherence', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_adherence_view')
        .select('*')
        .eq('user_id', userId!);
      if (error) throw error;
      return data as { stack_item_id: string; logged_days: number; trackable_days: number; adherence_pct: number }[];
    },
    enabled: !!userId,
    staleTime: 0,
  });
}

function useArchivedStack(userId: string | undefined) {
  return useQuery({
    queryKey: ['archived-stack', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_archived_stack_view')
        .select('*')
        .eq('user_id', userId!);
      if (error) throw error;
      return data as ArchivedStackView[];
    },
    enabled: !!userId,
    staleTime: 0,
  });
}

// ── Status badge ──

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    arriving: { label: 'Arriving', bg: 'bg-brand-100', text: 'text-accent' },
    active: { label: 'Active', bg: 'bg-success/10', text: 'text-success' },
    running_low: { label: 'Running Low', bg: 'bg-warning/10', text: 'text-warning' },
    reorder: { label: 'Reorder', bg: 'bg-error/10', text: 'text-error' },
  };
  const c = config[status] ?? config.active;
  return (
    <View className={`rounded-full px-2 py-0.5 ${c.bg}`}>
      <Text className={`text-2xs font-semibold ${c.text}`}>{c.label}</Text>
    </View>
  );
}

// ── Active Item Card ──

function ActiveItemCard({
  item,
  adherence,
}: {
  item: StackStatusView;
  adherence?: { logged_days: number; trackable_days: number };
}) {
  const { activateItem, removeItem } = useStackMutations();

  const handleActivate = () => {
    activateItem.mutate(
      { stackItemId: item.stack_item_id },
      {
        onError: (err) =>
          Alert.alert('Error', err instanceof Error ? err.message : 'Failed to activate'),
      }
    );
  };

  const handleRemove = () => {
    Alert.alert('Remove from Stack', `Remove ${item.product_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () =>
          removeItem.mutate(
            { stackItemId: item.stack_item_id },
            {
              onError: (err) =>
                Alert.alert(
                  'Error',
                  err instanceof Error ? err.message : 'Failed to remove'
                ),
            }
          ),
      },
    ]);
  };

  const handleReorder = () => {
    if (item.product_shopify_url) {
      Linking.openURL(item.product_shopify_url);
    } else {
      Alert.alert('Coming Soon', 'Online ordering will be available soon.');
    }
  };

  return (
    <View className="mb-3 rounded-xl bg-surface-secondary p-4">
      {/* Header row */}
      <View className="flex-row items-center">
        {item.product_thumbnail_url ? (
          <Image
            source={{ uri: item.product_thumbnail_url }}
            className="h-10 w-10 rounded-lg mr-3"
            resizeMode="cover"
          />
        ) : (
          <View className="h-10 w-10 items-center justify-center rounded-lg bg-surface-tertiary mr-3">
            <Text className="text-lg">💊</Text>
          </View>
        )}
        <View className="flex-1">
          <Text className="text-sm font-semibold text-ink">{item.product_name}</Text>
          <View className="flex-row items-center gap-2 mt-0.5">
            <StatusBadge status={item.status} />
            {item.days_remaining != null && (item.status === 'active' || item.status === 'running_low') && (
              <Text className="text-xs text-ink-muted">
                {item.days_remaining} {item.days_remaining === 1 ? 'day' : 'days'} left
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Adherence stat */}
      {adherence && (
        <View className="mt-2 flex-row items-center">
          <Text className="text-xs text-ink-muted">
            Logged {adherence.logged_days} of last {adherence.trackable_days} days
          </Text>
        </View>
      )}

      {/* Action buttons */}
      <View className="flex-row gap-2 mt-3">
        {item.status === 'arriving' && (
          <Pressable
            onPress={handleActivate}
            disabled={activateItem.isPending}
            className="flex-1 items-center rounded-lg bg-accent py-2"
          >
            <Text className="text-xs font-semibold text-white">
              {activateItem.isPending ? 'Activating...' : 'Arrived? Start tracking'}
            </Text>
          </Pressable>
        )}

        {(item.status === 'running_low' || item.status === 'reorder') && (
          <Pressable
            onPress={handleReorder}
            className="flex-1 items-center rounded-lg bg-warning/10 py-2"
          >
            <Text className="text-xs font-semibold text-warning">Reorder</Text>
          </Pressable>
        )}

        <Pressable
          onPress={handleRemove}
          className="items-center rounded-lg bg-error/10 px-3 py-2"
        >
          <Text className="text-xs font-semibold text-error">Remove</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Archived Item Card ──

function ArchivedItemCard({ item }: { item: ArchivedStackView }) {
  const { restartItem } = useStackMutations();

  const handleRestart = () => {
    restartItem.mutate(
      { stackItemId: item.stack_item_id },
      {
        onError: (err) =>
          Alert.alert('Error', err instanceof Error ? err.message : 'Failed to restart'),
      }
    );
  };

  return (
    <View className="mb-2 flex-row items-center rounded-lg bg-surface-secondary px-3 py-3">
      {item.product_thumbnail_url ? (
        <Image
          source={{ uri: item.product_thumbnail_url }}
          className="h-8 w-8 rounded-md mr-3"
          resizeMode="cover"
        />
      ) : (
        <View className="h-8 w-8 items-center justify-center rounded-md bg-surface-tertiary mr-3">
          <Text className="text-sm">💊</Text>
        </View>
      )}
      <Text className="text-sm text-ink-muted flex-1" numberOfLines={1}>
        {item.product_name}
      </Text>
      <Pressable
        onPress={handleRestart}
        disabled={restartItem.isPending}
        className="rounded-lg bg-accent/10 px-3 py-1.5"
      >
        <Text className="text-xs font-semibold text-accent">Restart</Text>
      </Pressable>
    </View>
  );
}

// ── Main StackScreen ──

export default function StackScreen() {
  const navigation = useNavigation<Nav>();
  const userId = useAuthStore((s) => s.user?.id);
  const { data: stackItems, isLoading, error, refetch } = useUserStack(userId);
  const { data: adherenceData } = useAdherence(userId);
  const { data: archivedItems } = useArchivedStack(userId);

  const [showArchived, setShowArchived] = useState(false);

  const adherenceMap = new Map(
    adherenceData?.map((a) => [a.stack_item_id, a]) ?? []
  );

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-3 pt-4">
        <View className="flex-row items-center">
          <Pressable onPress={() => navigation.goBack()} className="mr-3 p-1">
            <Text className="text-lg text-accent">‹ Back</Text>
          </Pressable>
          <Text className="text-xl font-bold text-ink">My Stack</Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate('ProductCatalog')}
          className="rounded-lg bg-accent px-3 py-1.5"
        >
          <Text className="text-xs font-semibold text-white">+ Add</Text>
        </Pressable>
      </View>

      {/* Loading */}
      {isLoading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2f7fff" />
        </View>
      )}

      {/* Error */}
      {error && !isLoading && (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-sm text-error mb-3">Failed to load your stack.</Text>
          <Pressable onPress={() => refetch()} className="rounded-lg bg-accent px-4 py-2">
            <Text className="text-sm font-medium text-white">Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Content */}
      {!isLoading && !error && (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-8"
          showsVerticalScrollIndicator={false}
        >
          {/* Empty state */}
          {(!stackItems || stackItems.length === 0) && (
            <View className="items-center py-12">
              <Text className="text-3xl mb-3">💊</Text>
              <Text className="text-base font-semibold text-ink mb-1">No supplements yet</Text>
              <Text className="text-sm text-ink-muted mb-4 text-center">
                Browse our catalog to add products to your stack
              </Text>
              <Pressable
                onPress={() => navigation.navigate('ProductCatalog')}
                className="rounded-xl bg-accent px-6 py-3"
              >
                <Text className="text-sm font-semibold text-white">Browse Products</Text>
              </Pressable>
            </View>
          )}

          {/* Active Items */}
          {stackItems && stackItems.length > 0 && (
            <View className="mt-2">
              <Text className="text-sm font-bold text-ink mb-3">
                Active ({stackItems.length})
              </Text>
              {stackItems.map((item) => (
                <ActiveItemCard
                  key={item.stack_item_id}
                  item={item}
                  adherence={adherenceMap.get(item.stack_item_id)}
                />
              ))}
            </View>
          )}

          {/* Archived Items */}
          {archivedItems && archivedItems.length > 0 && (
            <View className="mt-4">
              <Pressable
                onPress={() => setShowArchived(!showArchived)}
                className="flex-row items-center justify-between py-2"
              >
                <Text className="text-sm font-bold text-ink-muted">
                  Archived ({archivedItems.length})
                </Text>
                <Text className="text-xs text-ink-muted">
                  {showArchived ? '▲ Hide' : '▼ Show'}
                </Text>
              </Pressable>

              {showArchived && (
                <View className="mt-1">
                  {archivedItems.map((item) => (
                    <ArchivedItemCard key={item.stack_item_id} item={item} />
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
