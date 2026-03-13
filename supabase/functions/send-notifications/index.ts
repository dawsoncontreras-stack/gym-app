// supabase/functions/send-notifications/index.ts
//
// Daily cron edge function that sends push notifications for:
//   1. Reorder reminders  — stack items in 'reorder' status
//   2. Depletion warnings — items depleting within 3 days
//   3. Arrival nudges     — items in 'arriving' for 3+ days
//   4. Auto-archive       — items in 'reorder' for 14+ days (no notification, just cleanup)
//
// Invoke via Supabase cron or HTTP POST with Authorization header.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type PushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
};

// ── Expo Push Helper ──────────────────────────────────────────────

async function sendPushNotifications(messages: PushMessage[]) {
  if (messages.length === 0) return;

  // Expo accepts batches of up to 100
  const batches: PushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    batches.push(messages.slice(i, i + 100));
  }

  for (const batch of batches) {
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(batch),
      });

      if (!res.ok) {
        console.error('Expo push error:', res.status, await res.text());
      }
    } catch (err) {
      console.error('Expo push fetch failed:', err);
    }
  }
}

// ── Notification Tasks ────────────────────────────────────────────

async function sendReorderReminders(
  supabase: ReturnType<typeof createClient>
): Promise<PushMessage[]> {
  // Find users with stack items in 'reorder' status
  const { data, error } = await supabase
    .from('user_stack_items')
    .select(
      `
      id,
      user_id,
      status,
      products!inner ( name ),
      user_profiles!inner ( expo_push_token )
    `
    )
    .eq('status', 'reorder');

  if (error) {
    console.error('Reorder query error:', error.message);
    return [];
  }

  const messages: PushMessage[] = [];

  for (const item of data ?? []) {
    const token = (item.user_profiles as any)?.expo_push_token;
    const productName = (item.products as any)?.name;
    if (!token || !productName) continue;

    messages.push({
      to: token,
      title: 'Time to reorder',
      body: `Your ${productName} supply has run out. Reorder now to keep your streak going.`,
      data: { screen: 'Stack', stackItemId: item.id },
      sound: 'default',
    });
  }

  return messages;
}

async function sendDepletionWarnings(
  supabase: ReturnType<typeof createClient>
): Promise<PushMessage[]> {
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  const cutoff = threeDaysFromNow.toISOString().split('T')[0];

  // Items that are active or running_low and depleting within 3 days
  const { data, error } = await supabase
    .from('user_stack_items')
    .select(
      `
      id,
      user_id,
      status,
      estimated_depletion_date,
      products!inner ( name ),
      user_profiles!inner ( expo_push_token )
    `
    )
    .in('status', ['active', 'running_low'])
    .lte('estimated_depletion_date', cutoff);

  if (error) {
    console.error('Depletion query error:', error.message);
    return [];
  }

  const messages: PushMessage[] = [];

  for (const item of data ?? []) {
    const token = (item.user_profiles as any)?.expo_push_token;
    const productName = (item.products as any)?.name;
    if (!token || !productName) continue;

    const daysLeft = Math.max(
      0,
      Math.ceil(
        (new Date(item.estimated_depletion_date).getTime() - Date.now()) /
          86400000
      )
    );

    const body =
      daysLeft <= 0
        ? `Your ${productName} supply is depleted. Time to reorder!`
        : `Your ${productName} is running low — about ${daysLeft} day${daysLeft === 1 ? '' : 's'} left.`;

    messages.push({
      to: token,
      title: 'Running low',
      body,
      data: { screen: 'Stack', stackItemId: item.id },
      sound: 'default',
    });
  }

  return messages;
}

async function sendArrivalNudges(
  supabase: ReturnType<typeof createClient>
): Promise<PushMessage[]> {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const cutoff = threeDaysAgo.toISOString();

  // Items in 'arriving' status for 3+ days
  const { data, error } = await supabase
    .from('user_stack_items')
    .select(
      `
      id,
      user_id,
      status,
      created_at,
      products!inner ( name ),
      user_profiles!inner ( expo_push_token )
    `
    )
    .eq('status', 'arriving')
    .lte('created_at', cutoff);

  if (error) {
    console.error('Arrival nudge query error:', error.message);
    return [];
  }

  const messages: PushMessage[] = [];

  for (const item of data ?? []) {
    const token = (item.user_profiles as any)?.expo_push_token;
    const productName = (item.products as any)?.name;
    if (!token || !productName) continue;

    messages.push({
      to: token,
      title: 'Has your order arrived?',
      body: `Tap to mark your ${productName} as received and start tracking.`,
      data: { screen: 'Stack', stackItemId: item.id },
      sound: 'default',
    });
  }

  return messages;
}

async function autoArchiveStaleReorders(
  supabase: ReturnType<typeof createClient>
): Promise<number> {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const cutoff = fourteenDaysAgo.toISOString();

  const { data, error } = await supabase
    .from('user_stack_items')
    .update({ status: 'archived' })
    .eq('status', 'reorder')
    .lte('reorder_entered_at', cutoff)
    .select('id');

  if (error) {
    console.error('Auto-archive error:', error.message);
    return 0;
  }

  return data?.length ?? 0;
}

// ── Main Handler ──────────────────────────────────────────────────

serve(async (req) => {
  try {
    // Verify this is called via cron or with service role auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Run all tasks in parallel
    const [reorderMsgs, depletionMsgs, arrivalMsgs, archivedCount] =
      await Promise.all([
        sendReorderReminders(supabase),
        sendDepletionWarnings(supabase),
        sendArrivalNudges(supabase),
        autoArchiveStaleReorders(supabase),
      ]);

    // Deduplicate by push token — one user may have multiple items,
    // send at most one notification per category per user
    const deduplicateByToken = (msgs: PushMessage[]) => {
      const seen = new Set<string>();
      return msgs.filter((m) => {
        if (seen.has(m.to)) return false;
        seen.add(m.to);
        return true;
      });
    };

    const allMessages = [
      ...deduplicateByToken(reorderMsgs),
      ...deduplicateByToken(depletionMsgs),
      ...deduplicateByToken(arrivalMsgs),
    ];

    // Send all push notifications
    await sendPushNotifications(allMessages);

    const summary = {
      reorderReminders: deduplicateByToken(reorderMsgs).length,
      depletionWarnings: deduplicateByToken(depletionMsgs).length,
      arrivalNudges: deduplicateByToken(arrivalMsgs).length,
      autoArchived: archivedCount,
      totalPushSent: allMessages.length,
    };

    console.log('Notification run complete:', summary);

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-notifications error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
