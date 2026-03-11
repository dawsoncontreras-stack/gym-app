import { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { NavigationModal } from './NavigationModal';
import type { Exercise } from '../types';
import { fetchReplacementCandidates, fetchAddableExercises } from '../services/exercise-actions';

type ExerciseSummary = Pick<
  Exercise,
  'id' | 'name' | 'slug' | 'movement_pattern' | 'exercise_type' | 'difficulty_tier' | 'default_sets' | 'default_rep_range_low' | 'default_rep_range_high' | 'default_rest_seconds'
>;

interface TemplateSlot {
  slot_role: string;
  movement_pattern: string;
}

interface ExercisePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: ExerciseSummary) => void;
  userId: string;
  movementPattern?: string;
  excludeIds?: string[];
  missingSlots?: TemplateSlot[];
}

const MOVEMENT_LABELS: Record<string, string> = {
  horizontal_push: 'Horizontal Push',
  horizontal_pull: 'Horizontal Pull',
  vertical_push: 'Vertical Push',
  vertical_pull: 'Vertical Pull',
  squat: 'Squat',
  hinge: 'Hinge',
  lunge: 'Lunge',
  carry: 'Carry',
  isolation: 'Isolation',
  core: 'Core',
  cardio: 'Cardio',
  plyometric: 'Plyometric',
};

export function ExercisePickerModal({
  visible,
  onClose,
  onSelect,
  userId,
  movementPattern,
  excludeIds = [],
  missingSlots = [],
}: ExercisePickerModalProps) {
  const [exercises, setExercises] = useState<ExerciseSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  const [tab, setTab] = useState<'suggested' | 'all'>('suggested');

  const isAddMode = !movementPattern;
  const hasMissingSlots = isAddMode && missingSlots.length > 0;

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setSearch('');
    setSelectedPattern(null);
    setTab(hasMissingSlots ? 'suggested' : 'all');

    const load = movementPattern
      ? fetchReplacementCandidates(movementPattern, excludeIds, userId)
      : fetchAddableExercises(userId);

    load
      .then(setExercises)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [visible, movementPattern, userId]);

  const missingMovementPatterns = useMemo(
    () => [...new Set(missingSlots.map(s => s.movement_pattern))],
    [missingSlots],
  );

  const movementPatterns = useMemo(() => {
    const patterns = [...new Set(exercises.map(e => e.movement_pattern))];
    return patterns.sort();
  }, [exercises]);

  const filtered = useMemo(() => {
    let list = exercises;

    if (tab === 'suggested' && hasMissingSlots) {
      list = list.filter(e => missingMovementPatterns.includes(e.movement_pattern));
    }

    if (selectedPattern) {
      list = list.filter(e => e.movement_pattern === selectedPattern);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(q));
    }
    if (excludeIds.length > 0) {
      list = list.filter(e => !excludeIds.includes(e.id));
    }
    return list;
  }, [exercises, search, selectedPattern, excludeIds, tab, hasMissingSlots, missingMovementPatterns]);

  const activePatterns = tab === 'suggested' && hasMissingSlots
    ? missingMovementPatterns.sort()
    : movementPatterns;

  return (
    <NavigationModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/40 justify-end">
        <View className="bg-white rounded-t-3xl flex-1 mt-16">
          {/* Header */}
          <View className="p-4 border-b border-gray-100">
            <View className="w-10 h-1 bg-gray-300 rounded-full self-center mb-4" />
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-semibold text-gray-900">
                {movementPattern ? 'Replace Exercise' : 'Add Exercise'}
              </Text>
              <Pressable onPress={onClose}>
                <Text className="text-base text-blue-600 font-medium">Close</Text>
              </Pressable>
            </View>

            {/* Suggested / All tabs */}
            {hasMissingSlots && (
              <View className="flex-row mb-3 bg-gray-100 rounded-lg p-0.5">
                <Pressable
                  className={`flex-1 py-2 rounded-md items-center ${tab === 'suggested' ? 'bg-white shadow-sm' : ''}`}
                  onPress={() => { setTab('suggested'); setSelectedPattern(null); }}
                >
                  <Text className={`text-sm font-medium ${tab === 'suggested' ? 'text-blue-600' : 'text-gray-500'}`}>
                    Suggested
                  </Text>
                </Pressable>
                <Pressable
                  className={`flex-1 py-2 rounded-md items-center ${tab === 'all' ? 'bg-white shadow-sm' : ''}`}
                  onPress={() => { setTab('all'); setSelectedPattern(null); }}
                >
                  <Text className={`text-sm font-medium ${tab === 'all' ? 'text-blue-600' : 'text-gray-500'}`}>
                    All Exercises
                  </Text>
                </Pressable>
              </View>
            )}

            <TextInput
              className="bg-gray-100 rounded-xl px-4 py-2.5 text-base text-gray-900"
              placeholder="Search exercises..."
              placeholderTextColor="#9ca3af"
              value={search}
              onChangeText={setSearch}
            />

            {/* Movement pattern filter chips — using ScrollView instead of FlatList */}
            {!movementPattern && activePatterns.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mt-3"
                contentContainerStyle={{ paddingRight: 8 }}
              >
                <Pressable
                  className={`mr-2 px-3 py-1.5 rounded-full ${
                    selectedPattern === null ? 'bg-blue-600' : 'bg-gray-100'
                  }`}
                  onPress={() => setSelectedPattern(null)}
                >
                  <Text
                    className={`text-sm font-medium ${
                      selectedPattern === null ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    All
                  </Text>
                </Pressable>
                {activePatterns.map(pattern => (
                  <Pressable
                    key={pattern}
                    className={`mr-2 px-3 py-1.5 rounded-full ${
                      pattern === selectedPattern ? 'bg-blue-600' : 'bg-gray-100'
                    }`}
                    onPress={() => setSelectedPattern(pattern)}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        pattern === selectedPattern ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      {MOVEMENT_LABELS[pattern] ?? pattern}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Exercise list — using ScrollView instead of FlatList */}
          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          ) : filtered.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <Text className="text-gray-500 text-center py-8">No exercises found.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {filtered.map(item => (
                <Pressable
                  key={item.id}
                  className="py-3 px-2 border-b border-gray-100 active:bg-gray-50"
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                >
                  <Text className="text-base font-medium text-gray-900">{item.name}</Text>
                  <View className="flex-row mt-1 gap-2">
                    <Text className="text-xs text-blue-700 bg-blue-50 rounded-full px-2 py-0.5">
                      {MOVEMENT_LABELS[item.movement_pattern] ?? item.movement_pattern}
                    </Text>
                    <Text className="text-xs text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">
                      {item.exercise_type}
                    </Text>
                    <Text className="text-xs text-gray-500">
                      {item.default_sets}x{item.default_rep_range_low}-{item.default_rep_range_high}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </NavigationModal>
  );
}
