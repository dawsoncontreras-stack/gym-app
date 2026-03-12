import { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CalendarStackParamList } from '../navigation/CalendarStack';
import type { TabParamList } from '../navigation/TabNavigator';
import type { UserCalendarView, UserSessionHistoryView } from '../lib/types';
import { useScheduledWorkouts } from '../hooks/useScheduledWorkouts';
import { useSessionHistory } from '../hooks/useSessionHistory';
import { useAuthStore } from '../stores/authStore';
import { formatEstimatedMinutes, formatDuration, formatVolume } from '../utils/formatters';

type Nav = NativeStackNavigationProp<CalendarStackParamList, 'Calendar'>;

function getWeekStart(offset: number): Date {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatWeekRange(days: { date: Date }[]): string {
  const first = days[0].date;
  const last = days[days.length - 1].date;
  const firstMonth = MONTH_NAMES[first.getMonth()];
  const lastMonth = MONTH_NAMES[last.getMonth()];
  if (first.getMonth() === last.getMonth()) {
    return `${firstMonth} ${first.getDate()} – ${last.getDate()}`;
  }
  return `${firstMonth} ${first.getDate()} – ${lastMonth} ${last.getDate()}`;
}

function useWeekDays(weekOffset: number) {
  return useMemo(() => {
    const monday = getWeekStart(weekOffset);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return { date: d, key: formatDateKey(d), label: DAY_LABELS[i] };
    });
  }, [weekOffset]);
}

type DaySummary = {
  total: number;
  completed: number;
  scheduled: number;
  sessions: number;
  thumbnail: string | null;
};

export default function CalendarScreen() {
  const navigation = useNavigation<Nav>();
  const userId = useAuthStore((s) => s.user?.id);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const days = useWeekDays(weekOffset);
  const weekStart = days[0].key;
  const today = formatDateKey(new Date());

  // Reset to defaults when the calendar tab is pressed
  const parent = navigation.getParent<BottomTabNavigationProp<TabParamList>>();
  useEffect(() => {
    if (!parent) return;
    const unsubscribe = parent.addListener('tabPress', () => {
      setWeekOffset(0);
      setSelectedDayKey(null);
    });
    return unsubscribe;
  }, [parent]);

  const { data: scheduled, isLoading } = useScheduledWorkouts(userId, weekStart);
  const { data: sessions } = useSessionHistory(userId);

  // Group scheduled workouts by date
  const byDate = useMemo(() => {
    const map = new Map<string, UserCalendarView[]>();
    for (const item of scheduled ?? []) {
      const list = map.get(item.scheduled_date) ?? [];
      list.push(item);
      map.set(item.scheduled_date, list);
    }
    return map;
  }, [scheduled]);

  // Group sessions by completed date
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, UserSessionHistoryView[]>();
    for (const session of sessions ?? []) {
      if (!session.completed_at) continue;
      const dateKey = session.completed_at.split('T')[0];
      const list = map.get(dateKey) ?? [];
      list.push(session);
      map.set(dateKey, list);
    }
    return map;
  }, [sessions]);

  // Pre-compute summary per day for the header cells
  const daySummaries = useMemo(() => {
    const map = new Map<string, DaySummary>();
    for (const day of days) {
      const items = byDate.get(day.key) ?? [];
      const daySessions = sessionsByDate.get(day.key) ?? [];
      const completed = items.filter((i) => i.is_completed).length;
      const thumb =
        items.find((i) => i.thumbnail_url)?.thumbnail_url ??
        daySessions.find((s) => s.thumbnail_url)?.thumbnail_url ??
        null;
      map.set(day.key, {
        total: items.length + daySessions.length,
        completed,
        scheduled: items.length - completed,
        sessions: daySessions.length,
        thumbnail: thumb,
      });
    }
    return map;
  }, [days, byDate, sessionsByDate]);

  const handlePrev = useCallback(() => {
    setWeekOffset((o) => o - 1);
    setSelectedDayKey(null);
  }, []);
  const handleNext = useCallback(() => {
    setWeekOffset((o) => o + 1);
    setSelectedDayKey(null);
  }, []);
  const handleDayPress = useCallback((dayKey: string) => {
    setSelectedDayKey((prev) => (prev === dayKey ? null : dayKey));
  }, []);

  const handleResetView = useCallback(() => {
    if (weekOffset !== 0) {
      setWeekOffset(0);
      setSelectedDayKey(null);
    } else {
      setSelectedDayKey(null);
    }
  }, [weekOffset]);

  const handleZoomOut = useCallback(() => {
    setSelectedDayKey(null);
  }, []);

  const selectedDay = selectedDayKey
    ? days.find((d) => d.key === selectedDayKey) ?? null
    : null;
  const selectedScheduled = selectedDayKey ? byDate.get(selectedDayKey) ?? [] : [];
  const selectedSessions = selectedDayKey ? sessionsByDate.get(selectedDayKey) ?? [] : [];

  // Split scheduled into completed vs upcoming/missed
  const selectedCompleted = useMemo(
    () => selectedScheduled.filter((i) => i.is_completed),
    [selectedScheduled]
  );
  const selectedUpcoming = useMemo(
    () => selectedScheduled.filter((i) => !i.is_completed),
    [selectedScheduled]
  );

  // Deduplicate: sessions that are already represented in scheduled (via session_id)
  const scheduledSessionIds = useMemo(
    () => new Set(selectedScheduled.filter((i) => i.session_id).map((i) => i.session_id)),
    [selectedScheduled]
  );
  const extraSessions = useMemo(
    () => selectedSessions.filter((s) => !scheduledSessionIds.has(s.session_id)),
    [selectedSessions, scheduledSessionIds]
  );

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Header with week navigation */}
      <View className="flex-row items-center justify-between px-4 pb-3 pt-4">
        <Text className="text-2xl font-bold text-ink">Calendar</Text>
        <View className="flex-row items-center gap-3">
          <Pressable onPress={handlePrev} hitSlop={8}>
            <Text className="text-lg font-bold text-accent">←</Text>
          </Pressable>
          <Text className="text-sm font-semibold text-ink">
            {formatWeekRange(days)}
          </Text>
          <Pressable onPress={handleNext} hitSlop={8}>
            <Text className="text-lg font-bold text-accent">→</Text>
          </Pressable>
        </View>
      </View>

      {/* Context action buttons */}
      {(selectedDayKey || weekOffset !== 0) && (
        <View className="flex-row items-center justify-end gap-4 px-4 pb-2">
          {selectedDayKey && (
            <Pressable onPress={handleZoomOut} hitSlop={8}>
              <Text className="text-sm font-medium text-accent">Full Week</Text>
            </Pressable>
          )}
          {weekOffset !== 0 && (
            <Pressable onPress={handleResetView} hitSlop={8}>
              <Text className="text-sm font-medium text-accent">Current Week</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Week day headers – tappable, with summary info */}
      <View className="flex-row border-b border-surface-tertiary px-2 pb-2">
        {days.map((day) => {
          const isToday = day.key === today;
          const isSelected = day.key === selectedDayKey;
          const summary = daySummaries.get(day.key);
          return (
            <Pressable
              key={day.key}
              onPress={() => handleDayPress(day.key)}
              className="flex-1 items-center"
            >
              <Text
                className={`text-2xs font-medium ${
                  isSelected ? 'text-accent' : isToday ? 'text-accent' : 'text-ink-muted'
                }`}
              >
                {day.label}
              </Text>
              <View
                className={`mt-0.5 h-8 w-8 items-center justify-center rounded-full ${
                  isSelected ? 'bg-accent shadow-card' : ''
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    isSelected
                      ? 'text-white'
                      : isToday
                        ? 'text-accent'
                        : 'text-ink'
                  }`}
                >
                  {day.date.getDate()}
                </Text>
              </View>
              {/* Workout count indicators */}
              {summary && summary.total > 0 && (
                <View className="mt-0.5 flex-row items-center gap-0.5">
                  {(summary.completed > 0 || summary.sessions > 0) && (
                    <View className="h-2 w-2 rounded-full bg-success" />
                  )}
                  {summary.scheduled > 0 && (
                    <View className="h-2 w-2 rounded-full bg-accent" />
                  )}
                  {summary.total > 1 && (
                    <Text className="text-2xs text-ink-muted">{summary.total}</Text>
                  )}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Content area */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {isLoading && (
          <View className="items-center py-12">
            <ActivityIndicator color="#2f7fff" />
          </View>
        )}

        {/* ── Selected day inline detail ── */}
        {!isLoading && selectedDay && (
          <View className="px-4 py-3">
            <Text className="mb-3 text-base font-semibold text-ink">
              {selectedDay.label}, {MONTH_NAMES[selectedDay.date.getMonth()]}{' '}
              {selectedDay.date.getDate()}
            </Text>

            {/* Completed workouts (from schedule) */}
            {selectedCompleted.length > 0 && (
              <View className="mb-3">
                <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-success">
                  Completed
                </Text>
                {selectedCompleted.map((item) => (
                  <ScheduledWorkoutCard
                    key={item.scheduled_id}
                    item={item}
                    isPast={false}
                    showThumbnail
                    onPress={() =>
                      navigation.navigate('WorkoutDetail', { workoutId: item.workout_id })
                    }
                  />
                ))}
              </View>
            )}

            {/* Extra sessions not tied to schedule */}
            {extraSessions.length > 0 && (
              <View className="mb-3">
                <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-success">
                  {selectedCompleted.length > 0 ? 'Other Sessions' : 'Sessions'}
                </Text>
                {extraSessions.map((session) => (
                  <SessionCard
                    key={session.session_id}
                    session={session}
                    onPress={() =>
                      navigation.navigate('SessionDetail', { sessionId: session.session_id })
                    }
                  />
                ))}
              </View>
            )}

            {/* Upcoming / Missed */}
            {selectedUpcoming.length > 0 && (
              <View className="mb-3">
                <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  {selectedDayKey! < today ? 'Missed' : 'Scheduled'}
                </Text>
                {selectedUpcoming.map((item) => (
                  <ScheduledWorkoutCard
                    key={item.scheduled_id}
                    item={item}
                    isPast={selectedDayKey! < today}
                    showThumbnail
                    onPress={() =>
                      navigation.navigate('WorkoutDetail', { workoutId: item.workout_id })
                    }
                  />
                ))}
              </View>
            )}

            {selectedScheduled.length === 0 && extraSessions.length === 0 && (
              <View className="items-center rounded-lg bg-surface-secondary py-8">
                <Text className="text-sm text-ink-muted">
                  Nothing scheduled or completed this day
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Full week view when no day is selected ── */}
        {!isLoading &&
          !selectedDay &&
          days.map((day) => {
            const items = byDate.get(day.key) ?? [];
            const daySessions = sessionsByDate.get(day.key) ?? [];
            const isPast = day.key < today;
            const summary = daySummaries.get(day.key);
            // Deduplicate sessions already in schedule
            const schedSessionIds = new Set(
              items.filter((i) => i.session_id).map((i) => i.session_id)
            );
            const extraDaySessions = daySessions.filter(
              (s) => !schedSessionIds.has(s.session_id)
            );
            const allCount = items.length + extraDaySessions.length;

            return (
              <Pressable
                key={day.key}
                onPress={() => handleDayPress(day.key)}
                className="border-b border-surface-tertiary px-4 py-4"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="mb-1 text-xs font-medium text-ink-muted">
                    {day.label} {day.date.getDate()}
                  </Text>
                  {summary && summary.total > 0 && (
                    <View className="flex-row items-center gap-2">
                      {(summary.completed > 0 || summary.sessions > 0) && (
                        <Text className="text-2xs text-success">
                          {summary.completed + summary.sessions} done
                        </Text>
                      )}
                      {summary.scheduled > 0 && (
                        <Text className="text-2xs text-ink-muted">
                          {summary.scheduled} scheduled
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                {allCount === 0 && (
                  <Text className="py-2 text-xs text-ink-muted">No workouts</Text>
                )}

                {/* Show first item with thumbnail */}
                {items.length > 0 && (
                  <ScheduledWorkoutCard
                    item={items[0]}
                    isPast={isPast}
                    showThumbnail
                    onPress={() =>
                      navigation.navigate('WorkoutDetail', {
                        workoutId: items[0].workout_id,
                      })
                    }
                  />
                )}

                {/* Show first extra session if no scheduled items */}
                {items.length === 0 && extraDaySessions.length > 0 && (
                  <SessionCard
                    session={extraDaySessions[0]}
                    onPress={() =>
                      navigation.navigate('WorkoutDetail', {
                        workoutId: extraDaySessions[0].workout_id,
                      })
                    }
                  />
                )}

                {allCount > 1 && (
                  <Text className="mt-1 text-xs text-accent">
                    +{allCount - 1} more workout{allCount - 1 > 1 ? 's' : ''}
                  </Text>
                )}
              </Pressable>
            );
          })}

        <View className="h-4" />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Scheduled workout card ──────────────────────────────────────────────────

function ScheduledWorkoutCard({
  item,
  isPast,
  showThumbnail,
  onPress,
}: {
  item: UserCalendarView;
  isPast: boolean;
  showThumbnail?: boolean;
  onPress: () => void;
}) {
  const isCompleted = item.is_completed;
  const isMissed = isPast && !isCompleted;

  return (
    <Pressable
      onPress={onPress}
      className={`mb-2 flex-row items-center rounded-lg px-3 py-3 ${
        isCompleted
          ? 'bg-success/10'
          : isMissed
            ? 'bg-surface-tertiary opacity-50'
            : 'bg-surface-secondary'
      }`}
    >
      {showThumbnail && item.thumbnail_url && (
        <Image
          source={{ uri: item.thumbnail_url }}
          className="mr-3 h-10 w-10 rounded-lg"
          resizeMode="cover"
        />
      )}

      {isCompleted && <Text className="mr-2 text-base text-success">✓</Text>}
      {isMissed && <Text className="mr-2 text-base text-ink-muted">–</Text>}

      <View className="flex-1">
        <Text
          className={`text-sm font-medium ${isMissed ? 'text-ink-muted' : 'text-ink'}`}
          numberOfLines={1}
        >
          {item.workout_title}
        </Text>
        <View className="mt-0.5 flex-row items-center gap-2">
          <Text className="text-xs capitalize text-ink-secondary">{item.difficulty}</Text>
          <Text className="text-xs text-ink-muted">
            {formatEstimatedMinutes(item.estimated_minutes)}
          </Text>
        </View>
      </View>

      {isCompleted && item.rating != null && (
        <Text className="text-xs text-warning">{item.rating}/5</Text>
      )}
    </Pressable>
  );
}

// ── Session history card ────────────────────────────────────────────────────

function SessionCard({
  session,
  onPress,
}: {
  session: UserSessionHistoryView;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-2 flex-row items-center rounded-lg bg-success/10 px-3 py-3"
    >
      {session.thumbnail_url && (
        <Image
          source={{ uri: session.thumbnail_url }}
          className="mr-3 h-10 w-10 rounded-lg"
          resizeMode="cover"
        />
      )}

      <Text className="mr-2 text-base text-success">✓</Text>

      <View className="flex-1">
        <Text className="text-sm font-medium text-ink" numberOfLines={1}>
          {session.workout_title}
        </Text>
        <View className="mt-0.5 flex-row items-center gap-2">
          <Text className="text-xs capitalize text-ink-secondary">{session.difficulty}</Text>
          {session.duration_sec != null && (
            <Text className="text-xs text-ink-muted">
              {formatDuration(session.duration_sec)}
            </Text>
          )}
          {session.total_volume_lbs != null && session.total_volume_lbs > 0 && (
            <Text className="text-xs text-ink-muted">
              {formatVolume(Number(session.total_volume_lbs))}
            </Text>
          )}
        </View>
      </View>

      {session.rating != null && (
        <Text className="text-xs text-warning">{session.rating}/5</Text>
      )}
    </Pressable>
  );
}
