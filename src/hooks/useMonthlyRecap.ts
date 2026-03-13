import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { MonthlyRecap } from '../lib/types';

/**
 * Builds a monthly recap for the previous calendar month:
 * - Workout count + total volume (with month-over-month % change)
 * - Per-product supplement adherence (days logged / trackable days)
 * - Longest active stack item
 */
async function fetchMonthlyRecap(userId: string): Promise<MonthlyRecap | null> {
  const now = new Date();
  // Previous month boundaries
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  // Two months ago (for comparison)
  const twoMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const twoMonthsAgoEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59);

  const monthLabel = prevMonthStart.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // ── 1. Workout stats for previous month ──
  const { data: prevSessions, error: prevErr } = await supabase
    .from('workout_sessions')
    .select('total_volume_lbs')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('started_at', prevMonthStart.toISOString())
    .lte('started_at', prevMonthEnd.toISOString());

  if (prevErr) throw prevErr;
  if (!prevSessions || prevSessions.length === 0) return null; // No data → no recap

  const workoutCount = prevSessions.length;
  const totalVolume = prevSessions.reduce(
    (sum, s) => sum + (Number(s.total_volume_lbs) || 0),
    0
  );

  // ── 2. Comparison month for volume % change ──
  const { data: compSessions } = await supabase
    .from('workout_sessions')
    .select('total_volume_lbs')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('started_at', twoMonthsAgoStart.toISOString())
    .lte('started_at', twoMonthsAgoEnd.toISOString());

  let volumeChangePercent: number | null = null;
  if (compSessions && compSessions.length > 0) {
    const compVolume = compSessions.reduce(
      (sum, s) => sum + (Number(s.total_volume_lbs) || 0),
      0
    );
    if (compVolume > 0) {
      volumeChangePercent = Math.round(((totalVolume - compVolume) / compVolume) * 100);
    }
  }

  // ── 3. Supplement adherence for previous month ──
  const prevMonthStartDate = prevMonthStart.toISOString().split('T')[0];
  const prevMonthEndDate = prevMonthEnd.toISOString().split('T')[0];
  const daysInPrevMonth = prevMonthEnd.getDate();

  // Get active/running_low stack items that were activated before or during last month
  const { data: stackItems } = await supabase
    .from('user_stack_items')
    .select('id, activated_at, products!inner ( name )')
    .eq('user_id', userId)
    .not('activated_at', 'is', null)
    .lte('activated_at', prevMonthEnd.toISOString());

  const supplementAdherence: MonthlyRecap['supplementAdherence'] = [];

  if (stackItems && stackItems.length > 0) {
    const stackItemIds = stackItems.map((si) => si.id);

    // Get dose logs for previous month
    const { data: doseLogs } = await supabase
      .from('dose_logs')
      .select('stack_item_id, logged_date')
      .in('stack_item_id', stackItemIds)
      .gte('logged_date', prevMonthStartDate)
      .lte('logged_date', prevMonthEndDate);

    // Count logs per stack item
    const logCountMap = new Map<string, number>();
    for (const log of doseLogs ?? []) {
      logCountMap.set(log.stack_item_id, (logCountMap.get(log.stack_item_id) ?? 0) + 1);
    }

    for (const si of stackItems) {
      const product = si.products as unknown as { name: string };
      const activatedDate = new Date(si.activated_at!);
      // How many days in prev month was this item trackable?
      const trackableStart = activatedDate > prevMonthStart ? activatedDate : prevMonthStart;
      const totalDays = Math.max(
        1,
        Math.min(
          daysInPrevMonth,
          Math.ceil(
            (prevMonthEnd.getTime() - trackableStart.getTime()) / 86400000
          ) + 1
        )
      );
      const daysLogged = logCountMap.get(si.id) ?? 0;

      supplementAdherence.push({
        productName: product.name,
        daysLogged,
        totalDays,
      });
    }
  }

  // ── 4. Longest active stack item ──
  let longestStack: MonthlyRecap['longestStack'] = null;

  if (stackItems && stackItems.length > 0) {
    let maxWeeks = 0;
    let maxName = '';

    for (const si of stackItems) {
      if (!si.activated_at) continue;
      const product = si.products as unknown as { name: string };
      const weeks = Math.floor(
        (now.getTime() - new Date(si.activated_at).getTime()) / (7 * 86400000)
      );
      if (weeks > maxWeeks) {
        maxWeeks = weeks;
        maxName = product.name;
      }
    }

    if (maxWeeks > 0) {
      longestStack = { productName: maxName, weeks: maxWeeks };
    }
  }

  return {
    workoutCount,
    totalVolume,
    volumeChangePercent,
    supplementAdherence,
    longestStack,
    month: monthLabel,
  };
}

export function useMonthlyRecap(userId: string | undefined) {
  return useQuery({
    queryKey: ['monthly-recap', userId],
    queryFn: () => fetchMonthlyRecap(userId!),
    enabled: !!userId,
    staleTime: 60 * 60 * 1000, // refresh at most once per hour
  });
}
