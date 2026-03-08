# GymApp

A React Native gym tracking app built with Expo, Supabase, and TypeScript.

## Tech Stack

- **Expo** (managed workflow, `app.config.ts`)
- **TypeScript** (strict mode)
- **Supabase** (auth, database, storage)
- **Zustand** (client/UI state)
- **TanStack React Query** (server state)
- **React Navigation** (stack + bottom tabs)
- **NativeWind v4** (Tailwind CSS styling)
- **RevenueCat** (subscription management — stubbed)
- **ESLint + Prettier** (code quality)

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Fill in your Supabase URL and anon key in .env

# Start the dev server
npx expo start
```

## Project Structure

```
├── App.tsx                    # Root component with providers
├── index.ts                   # Entry point
├── app.config.ts              # Expo config (replaces app.json)
├── global.css                 # Tailwind CSS entry point
├── tailwind.config.js         # Tailwind/NativeWind config
├── metro.config.js            # Metro bundler config (NativeWind)
├── babel.config.js            # Babel config (NativeWind JSX)
├── supabase/
│   └── migrations/            # SQL migration files
│       └── 00001_initial_schema.sql
└── src/
    ├── components/            # Reusable UI primitives
    │   ├── Button.tsx
    │   ├── Card.tsx
    │   ├── Input.tsx
    │   ├── LoadingSpinner.tsx
    │   └── index.ts           # Barrel export
    ├── hooks/                 # Custom hooks (all Supabase calls go here)
    │   ├── useAuth.ts         # Auth state & helpers
    │   └── useProfile.ts      # Example React Query hook
    ├── lib/                   # Third-party client setup
    │   ├── supabase.ts        # Supabase client
    │   ├── queryClient.ts     # React Query client
    │   └── purchases.ts       # RevenueCat stub
    ├── navigation/            # React Navigation setup
    │   ├── AuthNavigator.tsx   # Login/SignUp stack
    │   ├── MainNavigator.tsx   # Bottom tab navigator
    │   └── RootNavigator.tsx   # Auth gate (switches auth ↔ main)
    ├── screens/               # Screen components
    │   ├── auth/
    │   │   ├── LoginScreen.tsx
    │   │   └── SignUpScreen.tsx
    │   ├── HomeScreen.tsx
    │   ├── WorkoutsScreen.tsx
    │   └── ProfileScreen.tsx
    ├── services/              # External service integrations
    │   └── ai-workouts.ts     # AI workout generation stub
    ├── store/                 # Zustand stores (client state only)
    │   └── useAppStore.ts
    └── types/                 # TypeScript type definitions
        ├── index.ts           # Database types + re-exports
        └── navigation.ts      # Navigation param lists
```

## State Management Conventions

### React Query = Server State

All data from Supabase (profiles, workouts, exercises) lives in React Query.

- Fetching is done via custom hooks in `/hooks` (e.g., `useProfile`)
- Components never call `supabase.from(...)` directly
- Mutations should use `useMutation` and invalidate relevant queries

```tsx
// Pattern for a new data hook
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

async function fetchWorkouts(userId: string) {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data;
}

export function useWorkouts(userId: string | undefined) {
  return useQuery({
    queryKey: ['workouts', userId],
    queryFn: () => fetchWorkouts(userId!),
    enabled: !!userId,
  });
}
```

### Zustand = Client/UI State

Zustand is for transient client-side state that doesn't come from the server.

- Active workout tracking (in-progress, not yet saved)
- Onboarding flags
- UI preferences (theme, layout mode)
- Form state that spans multiple screens

```tsx
// Reading from the store
const isOnboarded = useAppStore((s) => s.isOnboarded);

// Calling actions
const startWorkout = useAppStore((s) => s.startWorkout);
```

### Rule of Thumb

| Question | Answer |
|----------|--------|
| Does it come from Supabase? | React Query |
| Is it persisted on the server? | React Query |
| Is it local UI state? | Zustand |
| Is it a form value on one screen? | `useState` |

## Adding a New Feature

### 1. Database Changes

Add a new migration file in `supabase/migrations/` (e.g., `00002_add_goals.sql`).

### 2. Types

Add corresponding TypeScript types in `src/types/index.ts`.

### 3. Data Hook

Create a new hook in `src/hooks/` following the `useProfile` pattern:

```tsx
// src/hooks/useGoals.ts
export function useGoals(userId: string | undefined) {
  return useQuery({
    queryKey: ['goals', userId],
    queryFn: () => fetchGoals(userId!),
    enabled: !!userId,
  });
}
```

### 4. Screen

Create the screen in `src/screens/` using NativeWind classes for all styling.

### 5. Navigation

Add the screen to the appropriate navigator in `src/navigation/`.

### 6. Components

If you need reusable UI, add it to `src/components/` and export from `index.ts`.

## Styling

All styling uses NativeWind v4 (Tailwind CSS for React Native). Use `className` on
React Native components:

```tsx
<View className="flex-1 bg-gray-50 p-4">
  <Text className="text-lg font-bold text-gray-900">Hello</Text>
</View>
```

Avoid `StyleSheet.create` unless NativeWind cannot express the style you need.

## Database Schema

See `supabase/migrations/00001_initial_schema.sql` for the full schema. Tables:

- **profiles** — user profile data, linked to `auth.users`
- **workouts** — workout sessions
- **exercises** — exercise library
- **workout_sets** — individual sets within a workout

All tables have Row Level Security (RLS) enabled. Users can only access their own data.

## Scripts

```bash
npm start        # Start Expo dev server
npm run android  # Start on Android
npm run ios      # Start on iOS
npm run web      # Start on web
npm run lint     # Run ESLint
npm run format   # Format code with Prettier
```
