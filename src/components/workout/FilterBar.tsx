import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { DIFFICULTY_OPTIONS, EQUIPMENT_OPTIONS } from '../../constants/filters';
import type { Category, DifficultyLevel } from '../../lib/types';

export type ActiveFilters = {
  difficulties: DifficultyLevel[];
  equipment: string[];
  categoryIds: string[];
  search: string;
};

type FilterBarProps = {
  filters: ActiveFilters;
  categories: Category[];
  onFiltersChange: (filters: ActiveFilters) => void;
};

function ChipToggle({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`mr-2 rounded-full px-3 py-2 ${
        active ? 'bg-accent' : 'bg-surface-tertiary'
      }`}
    >
      <Text className={`text-xs font-medium ${active ? 'text-white' : 'text-ink-secondary'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function FilterBar({ filters, categories, onFiltersChange }: FilterBarProps) {
  const toggleDifficulty = (value: DifficultyLevel) => {
    const next = filters.difficulties.includes(value)
      ? filters.difficulties.filter((d) => d !== value)
      : [...filters.difficulties, value];
    onFiltersChange({ ...filters, difficulties: next });
  };

  const toggleEquipment = (value: string) => {
    const next = filters.equipment.includes(value)
      ? filters.equipment.filter((e) => e !== value)
      : [...filters.equipment, value];
    onFiltersChange({ ...filters, equipment: next });
  };

  const toggleCategory = (id: string) => {
    const next = filters.categoryIds.includes(id)
      ? filters.categoryIds.filter((c) => c !== id)
      : [...filters.categoryIds, id];
    onFiltersChange({ ...filters, categoryIds: next });
  };

  return (
    <View className="gap-3 border-b border-surface-tertiary pb-3">
      <View className="px-4">
        <TextInput
          className="h-11 rounded-xl bg-surface-tertiary px-3 text-sm text-ink"
          placeholder="Search workouts..."
          placeholderTextColor="#8888a0"
          value={filters.search}
          onChangeText={(text) => onFiltersChange({ ...filters, search: text })}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4">
        {DIFFICULTY_OPTIONS.map((opt) => (
          <ChipToggle
            key={opt.value}
            label={opt.label}
            active={filters.difficulties.includes(opt.value)}
            onPress={() => toggleDifficulty(opt.value)}
          />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4">
        {EQUIPMENT_OPTIONS.map((equip) => (
          <ChipToggle
            key={equip}
            label={equip}
            active={filters.equipment.includes(equip)}
            onPress={() => toggleEquipment(equip)}
          />
        ))}
      </ScrollView>

      {categories.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4">
          {categories.map((cat) => (
            <ChipToggle
              key={cat.id}
              label={cat.name}
              active={filters.categoryIds.includes(cat.id)}
              onPress={() => toggleCategory(cat.id)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
