import { Tabs, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '@/lib/mobile-theme';
import { BrandLogo } from '@/components/brand-logo';
import { IosTabBarBackground, IosTabBarIcon } from '@/components/native/ios-shell';

function HeaderLogoButton() {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="PricePulse, go to dashboard"
      onPress={() => router.push('/dashboard' as any)}
      style={styles.headerLogoBtn}
      hitSlop={10}
    >
      <BrandLogo size={Platform.OS === 'ios' ? 22 : 20} />
    </Pressable>
  );
}

function NotificationsHeaderButton() {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open notifications"
      onPress={() => router.push('/notifications' as any)}
      style={styles.headerIconBtn}
      hitSlop={12}
    >
      <Ionicons name="file-tray-outline" size={24} color={theme.colors.text} />
    </Pressable>
  );
}

function ProfileHeaderButton() {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open profile"
      onPress={() => router.push('/profile' as any)}
      style={styles.headerIconBtn}
      hitSlop={12}
    >
      <Ionicons name="person-circle-outline" size={26} color={theme.colors.text} />
    </Pressable>
  );
}

function HeaderRightActions() {
  return (
    <View style={styles.headerRightRow}>
      <NotificationsHeaderButton />
      <ProfileHeaderButton />
    </View>
  );
}

/** Frosted top bar (material blur only — colors still come from `theme`). */
const liquidGlassHeader =
  Platform.OS === 'ios' || Platform.OS === 'android'
    ? ({
        headerLargeTitle: false,
        headerShadowVisible: false,
        headerBackground: () => (
          <BlurView
            tint={Platform.OS === 'ios' ? 'systemUltraThinMaterialDark' : 'dark'}
            intensity={Platform.OS === 'ios' ? 96 : 78}
            style={StyleSheet.absoluteFill}
          />
        ),
        headerStyle: {
          backgroundColor: 'transparent',
        },
      } as const)
    : {
        headerStyle: {
          backgroundColor: theme.colors.background,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border,
        },
      };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.text,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: [
          Platform.OS === 'ios' || Platform.OS === 'android'
            ? {
                position: 'absolute',
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: 'rgba(255,255,255,0.12)',
                backgroundColor: 'transparent',
                elevation: 0,
              }
            : {
                backgroundColor: theme.colors.card,
                borderTopColor: theme.colors.border,
              },
        ],
        tabBarBackground:
          Platform.OS === 'ios' || Platform.OS === 'android'
            ? () => <IosTabBarBackground />
            : undefined,
        ...liquidGlassHeader,
        headerTintColor: theme.colors.text,
        headerTitle: () => null,
        headerLeft: () => <HeaderLogoButton />,
        headerRight: () => <HeaderRightActions />,
        sceneStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard/index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <IosTabBarIcon outline="home-outline" filled="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="search/index"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <IosTabBarIcon outline="search-outline" filled="search" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts/index"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, focused }) => (
            <IosTabBarIcon outline="notifications-outline" filled="notifications" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications/index"
        options={{
          title: 'Notifs',
          href: null,
        }}
      />
      <Tabs.Screen
        name="live-alerts/index"
        options={{
          title: 'Live',
          tabBarIcon: ({ color, focused }) => (
            <IosTabBarIcon outline="pulse-outline" filled="pulse" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerLogoBtn: {
    marginLeft: Platform.OS === 'ios' ? 4 : 8,
    paddingVertical: 6,
    paddingRight: 8,
    justifyContent: 'center',
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Platform.OS === 'ios' ? 2 : 4,
  },
  headerIconBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
