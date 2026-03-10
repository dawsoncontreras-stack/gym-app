import { TextInput, View, Text, type TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export function Input({ label, error, containerClassName, className, ...props }: InputProps) {
  return (
    <View className={containerClassName}>
      {label && <Text className="text-sm font-medium text-gray-700 mb-1">{label}</Text>}
      <TextInput
        className={`border rounded-xl px-4 py-3 text-base ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${className ?? ''}`}
        placeholderTextColor="#9ca3af"
        autoComplete="off"
        textContentType={props.secureTextEntry ? 'oneTimeCode' : 'none'}
        {...props}
      />
      {error && <Text className="text-sm text-red-500 mt-1">{error}</Text>}
    </View>
  );
}
