import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { Card } from '../components';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export function HomeScreen() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateProgram = async () => {
    if (!session?.user?.id) {
      setError('Not signed in');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-program', {
        body: { user_id: session.user.id },
      });

      if (fnError) {
        // FunctionsHttpError has the actual response body with details
        const errorBody = typeof data === 'object' ? JSON.stringify(data) : data;
        const msg = `${fnError.message} — ${errorBody ?? 'no detail'}`;
        setError(msg);
        console.error('generate-program error:', fnError, 'body:', data);
        return;
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message ?? 'Unknown error');
      console.error('generate-program exception:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4">
      <Text className="text-2xl font-bold text-gray-900 mb-4">Home</Text>

      <Card>
        <Text className="text-lg font-semibold text-gray-800">Welcome to GymApp</Text>
        <Text className="text-gray-600 mt-2">Your fitness journey starts here.</Text>
      </Card>

      <Pressable
        onPress={handleGenerateProgram}
        disabled={loading}
        className="mt-4 bg-blue-600 rounded-xl py-3 px-4 items-center active:bg-blue-700 disabled:opacity-50"
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-semibold text-base">Generate Program</Text>
        )}
      </Pressable>

      {error && (
        <Card>
          <Text className="text-red-600 font-semibold">Error</Text>
          <Text className="text-red-500 mt-1">{error}</Text>
        </Card>
      )}

      {result && (
        <View className="mt-4">
          <Text className="text-lg font-bold text-gray-900 mb-2">
            Generated: {result.days?.length ?? 0} days
          </Text>

          {result.days?.map((day: any) => (
            <Card key={day.day_number}>
              <Text className="text-base font-semibold text-gray-800">
                Day {day.day_number}: {day.name}
              </Text>
              {day.exercises?.map((ex: any, i: number) => (
                <Text key={i} className="text-gray-600 mt-1">
                  {i + 1}. {ex.name} — {ex.sets}x{ex.rep_range_low}-{ex.rep_range_high} @ {ex.estimated_weight_lbs}lbs
                </Text>
              ))}
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
