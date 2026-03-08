import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  className,
}: ButtonProps) {
  const baseStyles = 'py-3 px-6 rounded-xl items-center justify-center flex-row';

  const variantStyles = {
    primary: 'bg-blue-600',
    secondary: 'bg-gray-600',
    outline: 'border-2 border-blue-600 bg-transparent',
  };

  const textVariantStyles = {
    primary: 'text-white',
    secondary: 'text-white',
    outline: 'text-blue-600',
  };

  return (
    <TouchableOpacity
      className={`${baseStyles} ${variantStyles[variant]} ${disabled ? 'opacity-50' : ''} ${className ?? ''}`}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#2563eb' : '#ffffff'} />
      ) : (
        <Text className={`text-base font-semibold ${textVariantStyles[variant]}`}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
