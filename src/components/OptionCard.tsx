import { TouchableOpacity, Text } from 'react-native';

interface OptionCardProps {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}

export function OptionCard({ label, description, selected, onPress }: OptionCardProps) {
  return (
    <TouchableOpacity
      className={`border-2 rounded-xl p-4 mb-3 ${selected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'}`}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text className={`text-base font-semibold ${selected ? 'text-blue-600' : 'text-gray-900'}`}>
        {label}
      </Text>
      {description && (
        <Text className={`text-sm mt-1 ${selected ? 'text-blue-500' : 'text-gray-500'}`}>
          {description}
        </Text>
      )}
    </TouchableOpacity>
  );
}
