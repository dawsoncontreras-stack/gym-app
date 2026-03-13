import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { StackStatusView } from '../lib/types';

/**
 * Client-side fast path for stack item status transitions.
 *
 * Runs on home screen mount. Checks each stack item and updates status
 * immediately so the UI reflects the correct state without waiting for
 * the daily edge function cron.
 *
 * Transitions:
 *   active → running_low  (when estimated_depletion_date <= today + 5)
 *   running_low → reorder  (when estimated_depletion_date <= today)
 *   reorder → archived     (when reorder_entered_at <= today - 14 days)
 */
export function useStackLifecycle(
  userId: string | undefined,
  stackItems: StackStatusView[] | undefined
) {
  const queryClient = useQueryClient();
  // Prevent running multiple times per mount
  const hasRun = useRef(false);

  useEffect(() => {
    if (!userId || !stackItems || stackItems.length === 0 || hasRun.current) return;
    hasRun.current = true;

    runLifecycleTransitions(userId, stackItems).then((didUpdate) => {
      if (didUpdate) {
        queryClient.invalidateQueries({ queryKey: ['user-stack', userId] });
      }
    });
  }, [userId, stackItems, queryClient]);
}

async function runLifecycleTransitions(
  userId: string,
  items: StackStatusView[]
): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  const fiveDaysFromNow = new Date(todayMs + 5 * 86400000);
  const fourteenDaysAgo = new Date(todayMs - 14 * 86400000);

  const toRunningLow: string[] = [];
  const toReorder: string[] = [];
  const toArchived: string[] = [];

  for (const item of items) {
    if (item.status === 'active' && item.estimated_depletion_date) {
      const depletion = new Date(item.estimated_depletion_date);
      if (depletion <= fiveDaysFromNow) {
        toRunningLow.push(item.stack_item_id);
      }
    }

    if (item.status === 'running_low' && item.estimated_depletion_date) {
      const depletion = new Date(item.estimated_depletion_date);
      if (depletion <= today) {
        toReorder.push(item.stack_item_id);
      }
    }

    // reorder items won't appear in user_stack_status_view (it excludes archived),
    // but reorder status items ARE included in the view
    if (item.status === 'reorder') {
      // We need reorder_entered_at which isn't in the view — fetch it
      toArchived.push(item.stack_item_id);
    }
  }

  let didUpdate = false;

  // Batch: active → running_low
  if (toRunningLow.length > 0) {
    const { error } = await supabase
      .from('user_stack_items')
      .update({ status: 'running_low' })
      .eq('user_id', userId)
      .in('id', toRunningLow)
      .eq('status', 'active'); // guard: only if still active

    if (!error) didUpdate = true;
  }

  // Batch: running_low → reorder
  if (toReorder.length > 0) {
    const { error } = await supabase
      .from('user_stack_items')
      .update({ status: 'reorder', reorder_entered_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('id', toReorder)
      .eq('status', 'running_low'); // guard

    if (!error) didUpdate = true;
  }

  // Batch: reorder → archived (only if reorder_entered_at is old enough)
  if (toArchived.length > 0) {
    // Need to check reorder_entered_at from the actual table
    const { data: reorderItems } = await supabase
      .from('user_stack_items')
      .select('id, reorder_entered_at')
      .eq('user_id', userId)
      .in('id', toArchived)
      .eq('status', 'reorder');

    const idsToArchive = (reorderItems ?? [])
      .filter((item) => {
        if (!item.reorder_entered_at) return false;
        return new Date(item.reorder_entered_at) <= fourteenDaysAgo;
      })
      .map((item) => item.id);

    if (idsToArchive.length > 0) {
      const { error } = await supabase
        .from('user_stack_items')
        .update({ status: 'archived' })
        .eq('user_id', userId)
        .in('id', idsToArchive);

      if (!error) didUpdate = true;
    }
  }

  return didUpdate;
}
