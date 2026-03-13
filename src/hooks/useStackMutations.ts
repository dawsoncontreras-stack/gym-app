import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export function useStackMutations() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  const invalidateStack = () => {
    queryClient.invalidateQueries({ queryKey: ['user-stack', userId] });
  };

  /** Add a product to the user's stack with status = 'arriving' */
  const addToStack = useMutation({
    mutationFn: async ({
      productId,
      daysSupply,
    }: {
      productId: string;
      daysSupply: number;
    }) => {
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_stack_items')
        .upsert(
          {
            user_id: userId,
            product_id: productId,
            status: 'arriving',
            days_supply: daysSupply,
          },
          { onConflict: 'user_id,product_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: invalidateStack,
  });

  /** Activate a stack item ("Arrived? Start tracking") */
  const activateItem = useMutation({
    mutationFn: async ({ stackItemId }: { stackItemId: string }) => {
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_stack_items')
        .update({
          status: 'active',
          activated_at: new Date().toISOString(),
          estimated_depletion_date: null, // will be set by trigger or computed
        })
        .eq('id', stackItemId)
        .eq('user_id', userId)
        .select('*, days_supply')
        .single();

      if (error) throw error;

      // Set estimated_depletion_date = today + days_supply
      const depletionDate = new Date();
      depletionDate.setDate(depletionDate.getDate() + data.days_supply);

      const { error: updateError } = await supabase
        .from('user_stack_items')
        .update({
          estimated_depletion_date: depletionDate.toISOString().split('T')[0],
        })
        .eq('id', stackItemId)
        .eq('user_id', userId);

      if (updateError) throw updateError;
      return data;
    },
    onSuccess: invalidateStack,
  });

  /** Archive a stack item */
  const archiveItem = useMutation({
    mutationFn: async ({ stackItemId }: { stackItemId: string }) => {
      if (!userId) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_stack_items')
        .update({ status: 'archived' })
        .eq('id', stackItemId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: invalidateStack,
  });

  /** Remove a stack item entirely */
  const removeItem = useMutation({
    mutationFn: async ({ stackItemId }: { stackItemId: string }) => {
      if (!userId) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_stack_items')
        .delete()
        .eq('id', stackItemId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: invalidateStack,
  });

  /** Restart an archived item (sets back to arriving, increments cycle) */
  const restartItem = useMutation({
    mutationFn: async ({ stackItemId }: { stackItemId: string }) => {
      if (!userId) throw new Error('Not authenticated');

      // Fetch current cycle count
      const { data: current, error: fetchError } = await supabase
        .from('user_stack_items')
        .select('reorder_cycle_count')
        .eq('id', stackItemId)
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('user_stack_items')
        .update({
          status: 'arriving',
          activated_at: null,
          estimated_depletion_date: null,
          reorder_entered_at: null,
          last_reorder_notified_at: null,
          reorder_cycle_count: (current?.reorder_cycle_count ?? 0) + 1,
        })
        .eq('id', stackItemId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: invalidateStack,
  });

  /** Update days_supply for a stack item */
  const updateDaysSupply = useMutation({
    mutationFn: async ({
      stackItemId,
      daysSupply,
    }: {
      stackItemId: string;
      daysSupply: number;
    }) => {
      if (!userId) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_stack_items')
        .update({ days_supply: daysSupply })
        .eq('id', stackItemId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: invalidateStack,
  });

  return {
    addToStack,
    activateItem,
    archiveItem,
    removeItem,
    restartItem,
    updateDaysSupply,
  };
}
