import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiClient, type MobileNotification } from '@/lib/api-client';
import { theme } from '@/lib/mobile-theme';
import { clearSession, getSessionUser, type SessionUser } from '@/lib/session';
import { getStoredPushToken, registerForPushNotifications } from '@/lib/notifications';
import { Button, Card, CardContent, Input, SectionHeader } from '@/components/ui';
import type { IoniconName } from '@/components/native/ios-shell';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    getSessionUser().then((sessionUser) => {
      setUser(sessionUser);
      setFirstName(sessionUser?.firstName || '');
      setLastName(sessionUser?.lastName || '');
    });
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      setPushToken(window.localStorage?.getItem('mobile_push_token') ?? null);
    } else {
      getStoredPushToken().then(setPushToken).catch(() => setPushToken(null));
    }
    apiClient.alerts
      .notifications(20)
      .then((rows: MobileNotification[]) => setNotificationCount(rows.length))
      .catch(() => {
        setNotificationCount(0);
      });
  }, []);

  const saveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'First and last name are required.');
      return;
    }
    try {
      const response = await apiClient.users.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      const updatedUser = response.data;
      setUser((prev) =>
        prev
          ? { ...prev, firstName: updatedUser.firstName, lastName: updatedUser.lastName }
          : prev,
      );
      setIsEditing(false);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Update failed');
    }
  };

  const handleEnablePush = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not available', 'Push notifications are not supported in the browser.');
      return;
    }
    const token = await registerForPushNotifications();
    if (!token) {
      Alert.alert('Push disabled', 'Notification permissions are required.');
      return;
    }
    setPushToken(token);
    Alert.alert('Push enabled', 'Notifications are now active on this device.');
  };

  const handleLogout = async () => {
    try {
      await apiClient.auth.logout();
    } catch {
      
    }
    await clearSession();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader title="Profile" subtitle="Manage account and preferences" />

        <View style={styles.userSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.firstName?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>
            {user ? `${user.firstName} ${user.lastName}` : 'User'}
          </Text>
          <Text style={styles.userEmail}>{user?.email ?? 'Not signed in'}</Text>
        </View>

        {/* Menu Items */}
        <Card style={styles.menuSection}>
          <CardContent style={styles.menuContent}>
          <MenuItem
            iconName="notifications-outline"
            title={`Notifications (${notificationCount})`}
            onPress={() => router.push('/notifications' as any)}
          />
          <MenuItem
            iconName="search-outline"
            title="Search listings"
            onPress={() => router.push('/search' as any)}
          />
          <MenuItem
            iconName="phone-portrait-outline"
            title="Enable Push Notifications"
            onPress={handleEnablePush}
          />
          <MenuItem
            iconName="key-outline"
            title={pushToken ? 'Push token saved on device' : 'Push token missing'}
            onPress={handleEnablePush}
          />
          </CardContent>
        </Card>

        <Card style={styles.profileCard}>
          <CardContent>
          <View style={styles.profileCardHeader}>
            <Text style={styles.profileCardTitle}>Personal Information</Text>
            {!isEditing ? (
              <Button label="Edit" variant="outline" onPress={() => setIsEditing(true)} />
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>First Name</Text>
            <Input
              style={styles.fieldInput}
              value={firstName}
              onChangeText={setFirstName}
              editable={isEditing}
              placeholder="First name"
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Last Name</Text>
            <Input
              style={styles.fieldInput}
              value={lastName}
              onChangeText={setLastName}
              editable={isEditing}
              placeholder="Last name"
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
            <Input
              style={styles.fieldInputDisabled}
              value={user?.email || ''}
              editable={false}
              placeholder="Email"
            />
          </View>

          {isEditing ? (
            <View style={styles.editActions}>
              <Button label="Save Changes" onPress={saveProfile} style={styles.primaryAction} />
              <Button
                label="Cancel"
                variant="outline"
                onPress={() => setIsEditing(false)}
                style={styles.secondaryAction}
              />
            </View>
          ) : null}
          </CardContent>
        </Card>

        <Button label="Sign Out" variant="destructive" onPress={handleLogout} style={styles.logoutButton} />

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({
  iconName,
  title,
  onPress,
}: {
  iconName: IoniconName;
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <Ionicons name={iconName} size={22} color={theme.colors.text} style={styles.menuLeadingIcon} />
      <Text style={styles.menuTitle}>{title}</Text>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
  },
  userSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: theme.colors.primaryText,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  menuSection: { marginBottom: 24 },
  menuContent: { padding: 0 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    borderRadius: 0,
  },
  menuLeadingIcon: {
    marginRight: 12,
  },
  menuTitle: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  logoutButton: { marginBottom: 24 },
  version: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  profileCard: { marginBottom: 20 },
  profileCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileCardTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  fieldGroup: {
    marginBottom: 10,
  },
  fieldLabel: {
    color: theme.colors.textMuted,
    marginBottom: 4,
    fontSize: 12,
  },
  fieldInput: {
    backgroundColor: theme.colors.cardMuted,
  },
  fieldInputDisabled: {
    color: theme.colors.textMuted,
    backgroundColor: '#171717',
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  primaryAction: { flex: 1 },
  secondaryAction: { flex: 1 },
});
