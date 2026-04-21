import 'react-native-gesture-handler';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import {
  getCycleLetter,
  parseKey,
  todayKey as cycleTodayKey,
  resolvePhysicalBriefing,
} from '@lifestyle-os/shared/cycleEngine';
import { SEED_STATE } from '@lifestyle-os/shared/schema';
import { useMobileAuth } from './src/hooks/useMobileAuth';
import { useMobileState } from './src/hooks/useMobileState';
import { API_BASE_URL } from './src/lib/api';

const Tab = createBottomTabNavigator();

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('Mobile app crashed', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.loadingRoot}>
          <Text style={styles.screenTitle}>Something went wrong</Text>
          <Text style={styles.cardHint}>Restart the app and try again.</Text>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

function formatLoadedAt(value) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function InlineError({ text }) {
  if (!text) return null;
  return (
    <View style={styles.errorCard}>
      <Text style={styles.errorCardText}>{text}</Text>
    </View>
  );
}

function AuthScreen({ onSignIn, errorMessage, loading }) {
  return (
    <SafeAreaView style={styles.authRoot}>
      <StatusBar barStyle="light-content" />
      <View style={styles.authCard}>
        <Text style={styles.kicker}>Lifestyle OS Mobile</Text>
        <Text style={styles.authTitle}>Sign in with Google</Text>
        <Text style={styles.authSubtitle}>
          Sign in to access your synced dashboard and capture inbox.
        </Text>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        <Pressable style={styles.authButton} onPress={onSignIn} disabled={loading}>
          <Text style={styles.authButtonText}>{loading ? 'Connecting...' : 'Continue with Google'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function DashboardScreen({ stateData, syncError, refreshing, onRefresh }) {
  const today = cycleTodayKey();
  const metric = stateData.metrics?.[today] ?? null;
  const cycleStartDate = stateData.settings?.cycleStartDate || SEED_STATE.cycleStartDate;
  const cyclePlans = stateData.cyclePlans || SEED_STATE.cyclePlans;
  const reference = stateData.reference || SEED_STATE.reference;
  const lowEnergyThreshold =
    typeof stateData.settings?.energyLowThreshold === 'number'
      ? stateData.settings.energyLowThreshold
      : SEED_STATE.settings.energyLowThreshold;

  const cycleLetter = getCycleLetter(parseKey(today), parseKey(cycleStartDate));
  const briefing = resolvePhysicalBriefing(
    today,
    cycleStartDate,
    cyclePlans,
    reference,
    metric?.energy ?? null,
    lowEnergyThreshold,
  );

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.screenTitle}>Today</Text>
      <InlineError text={syncError} />

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Cycle</Text>
        <Text style={styles.cardValue}>Week {cycleLetter}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Workout</Text>
        <Text style={styles.cardValue}>{briefing.workout?.name || 'No workout assigned yet'}</Text>
        <Text style={styles.cardHint}>{briefing.day} plan from shared cycle engine</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Meal protocol</Text>
        <Text style={styles.cardValue}>{briefing.mealProtocol?.name || 'No meal protocol assigned yet'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Sync</Text>
        <Text style={styles.cardHint}>Last loaded: {formatLoadedAt(stateData.lastLoadedAt)}</Text>
        <Pressable style={styles.secondaryButton} onPress={onRefresh} disabled={refreshing}>
          <Text style={styles.secondaryButtonText}>{refreshing ? 'Refreshing...' : 'Sync now'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function CaptureScreen({ items, onAddCapture, syncError }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const addCaptureItem = async () => {
    const value = text.trim();
    if (!value || saving) return;

    setSaveError(null);
    setSaving(true);
    try {
      await onAddCapture(value);
      setText('');
    } catch (error) {
      setSaveError(error.message || 'Failed to save capture.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.screenTitle}>Capture</Text>
      <InlineError text={saveError || syncError} />

      <View style={styles.card}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Capture a thought"
          placeholderTextColor="#6b7280"
          style={styles.input}
        />
        <Pressable style={styles.primaryButton} onPress={addCaptureItem} disabled={saving}>
          <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Add'}</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.listRow}>
            <Text style={styles.listText}>{item.text}</Text>
            <Text style={styles.listMeta}>{new Date(item.createdAt).toLocaleString()}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.cardHint}>No captured items yet.</Text>}
      />
    </SafeAreaView>
  );
}

function CyclesScreen({ cyclePlans }) {
  const rows = useMemo(
    () =>
      ['A', 'B', 'C'].map((letter) => {
        const plan = cyclePlans?.[letter] || SEED_STATE.cyclePlans[letter];
        return {
          letter,
          meal: plan.mealProtocolId || 'Not set',
          workoutCount: Object.values(plan.workoutsByDay || {}).filter(Boolean).length,
        };
      }),
    [cyclePlans],
  );

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.screenTitle}>Cycles</Text>
      {rows.map((row) => (
        <View style={styles.card} key={row.letter}>
          <Text style={styles.cardLabel}>Week {row.letter}</Text>
          <Text style={styles.cardValue}>{row.workoutCount} assigned workouts</Text>
          <Text style={styles.cardHint}>Meal protocol: {row.meal}</Text>
        </View>
      ))}
    </SafeAreaView>
  );
}

function SettingsScreen({ profile, onSignOut, stateData, refreshing, onRefresh, syncError }) {
  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.screenTitle}>Settings</Text>
      <InlineError text={syncError} />

      <View style={styles.card}>
        <Text style={styles.cardLabel}>API base URL</Text>
        <Text style={styles.cardHint}>{API_BASE_URL}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Signed in as</Text>
        <Text style={styles.cardValue}>{profile?.email || profile?.username || 'Unknown user'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Last sync</Text>
        <Text style={styles.cardHint}>{formatLoadedAt(stateData.lastLoadedAt)}</Text>
        <Pressable style={styles.secondaryButton} onPress={onRefresh} disabled={refreshing}>
          <Text style={styles.secondaryButtonText}>{refreshing ? 'Refreshing...' : 'Refresh now'}</Text>
        </Pressable>
      </View>

      <Pressable style={styles.secondaryButton} onPress={onSignOut}>
        <Text style={styles.secondaryButtonText}>Sign out</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function AppTabs({ profile, onSignOut, mobileState }) {
  const { data, error, refreshing, refresh, addCapture } = mobileState;

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: '#111827',
          tabBarInactiveTintColor: '#6b7280',
          tabBarStyle: {
            borderTopColor: '#e5e7eb',
            backgroundColor: '#ffffff',
          },
          tabBarIcon: ({ color, size }) => {
            const iconMap = {
              Dashboard: 'home-outline',
              Capture: 'download-outline',
              Cycles: 'sync-outline',
              Settings: 'settings-outline',
            };
            const iconName = iconMap[route.name] || 'ellipse-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Dashboard">
          {() => (
            <DashboardScreen
              stateData={data}
              syncError={error}
              refreshing={refreshing}
              onRefresh={refresh}
            />
          )}
        </Tab.Screen>

        <Tab.Screen name="Capture">
          {() => (
            <CaptureScreen
              items={data.capture}
              onAddCapture={addCapture}
              syncError={error}
            />
          )}
        </Tab.Screen>

        <Tab.Screen name="Cycles">
          {() => <CyclesScreen cyclePlans={data.cyclePlans} />}
        </Tab.Screen>

        <Tab.Screen name="Settings">
          {() => (
            <SettingsScreen
              profile={profile}
              onSignOut={onSignOut}
              stateData={data}
              refreshing={refreshing}
              onRefresh={refresh}
              syncError={error}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const { token, profile, loading, authError, signInWithGoogle, signOut } = useMobileAuth();
  const mobileState = useMobileState(token);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const handleSignIn = async () => {
    setAuthSubmitting(true);
    try {
      await signInWithGoogle();
    } finally {
      setAuthSubmitting(false);
    }
  };

  if (loading || (token && mobileState.loading)) {
    return (
      <SafeAreaView style={styles.loadingRoot}>
        <ActivityIndicator size="large" color="#111827" />
      </SafeAreaView>
    );
  }

  if (!token) {
    return (
      <AuthScreen
        loading={authSubmitting}
        errorMessage={authError}
        onSignIn={handleSignIn}
      />
    );
  }

  return (
    <RootErrorBoundary>
      <AppTabs profile={profile} onSignOut={signOut} mobileState={mobileState} />
    </RootErrorBoundary>
  );
}

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#f8fafc',
    card: '#ffffff',
    text: '#111827',
    border: '#e5e7eb',
    primary: '#111827',
    notification: '#111827',
  },
};

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  authRoot: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#111827',
  },
  authCard: {
    borderRadius: 20,
    backgroundColor: '#1f2937',
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
    gap: 10,
  },
  kicker: {
    color: '#9ca3af',
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  authTitle: {
    color: '#f9fafb',
    fontSize: 26,
    fontWeight: '700',
  },
  authSubtitle: {
    color: '#d1d5db',
    fontSize: 14,
    lineHeight: 20,
  },
  authButton: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    paddingVertical: 12,
    alignItems: 'center',
  },
  authButtonText: {
    color: '#111827',
    fontWeight: '700',
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
  },
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    marginBottom: 10,
  },
  cardLabel: {
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 11,
    marginBottom: 4,
  },
  cardValue: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '600',
  },
  cardHint: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#111827',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 6,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secondaryButtonText: {
    color: '#111827',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
    gap: 8,
  },
  listRow: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  listText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '500',
  },
  listMeta: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  errorCardText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '500',
  },
});
