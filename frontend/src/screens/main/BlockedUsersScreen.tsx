import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { userAPI } from '../../services/api';
import Toast from 'react-native-toast-message';

const BlockedUsersScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);

  const loadBlockedUsers = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getBlockedUsers();
      if (response.success) {
        setBlockedUsers((response as any).blockedUsers || []);
      }
    } catch (error: any) {
      console.error('Error loading blocked users:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load blocked users',
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBlockedUsers();
    setRefreshing(false);
  };

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const handleUnblock = async (userId: string, username: string) => {
    try {
      setUnblockingUserId(userId);
      await userAPI.unblockUser(userId);
      
      setBlockedUsers(prev => prev.filter(u => u._id !== userId));
      
      Toast.show({
        type: 'success',
        text1: 'User unblocked',
        text2: `@${username} has been unblocked`,
      });
    } catch (error) {
      console.error('Error unblocking user:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to unblock user',
      });
    } finally {
      setUnblockingUserId(null);
    }
  };

  const renderBlockedUser = ({ item }: { item: any }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {item.username?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
        )}
        <View style={styles.userDetails}>
          <Text style={styles.username}>@{item.username}</Text>
          {item.bio && (
            <Text style={styles.bio} numberOfLines={2}>
              {item.bio}
            </Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={styles.unblockButton}
        onPress={() => handleUnblock(item._id, item.username)}
        disabled={unblockingUserId === item._id}
      >
        {unblockingUserId === item._id ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Text style={styles.unblockText}>Unblock</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      padding: theme.spacing.sm,
      marginRight: theme.spacing.md,
    },
    backText: {
      fontSize: 24,
      color: theme.colors.primary,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
    },
    content: {
      flex: 1,
    },
    userCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border + '30',
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      marginRight: theme.spacing.md,
    },
    avatarPlaceholder: {
      backgroundColor: theme.colors.primary + '30',
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    userDetails: {
      flex: 1,
    },
    username: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    bio: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    unblockButton: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      minWidth: 90,
      alignItems: 'center',
    },
    unblockText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    emptyIcon: {
      fontSize: 64,
      marginBottom: theme.spacing.lg,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Blocked Users</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blocked Users</Text>
      </View>
      
      {blockedUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🚫</Text>
          <Text style={styles.emptyTitle}>No Blocked Users</Text>
          <Text style={styles.emptyText}>
            You haven't blocked anyone yet. When you block users, they'll appear here and you can unblock them anytime.
          </Text>
        </View>
      ) : (
        <FlatList
          style={styles.content}
          data={blockedUsers}
          keyExtractor={(item) => item._id}
          renderItem={renderBlockedUser}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
};

export default BlockedUsersScreen;
