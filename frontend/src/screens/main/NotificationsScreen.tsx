import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import { userAPI } from '../../services/api';
import Toast from 'react-native-toast-message';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'request' | 'invite' | 'mention';
  user: {
    id: string;
    username: string;
    avatar?: string;
  };
  content: string;
  timestamp: number;
  isRead: boolean;
  postId?: string;
  commentId?: string;
  groupId?: string;
}

const NotificationsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'Notifications'>>();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      // Load from backend using existing userAPI.getNotifications helper
      const response: any = await userAPI.getNotifications();

      const backendNotifications = Array.isArray(response.notifications)
        ? response.notifications
        : [];

      const mapped: Notification[] = backendNotifications.map((n: any, index: number) => ({
        id: String(n.id || index),
        type: (n.type as Notification['type']) || 'mention',
        user: n.user && n.user.username
          ? {
              id: String(n.user.id || ''),
              username: String(n.user.username || 'someone'),
              avatar: n.user.avatar,
            }
          : {
              id: '',
              username: 'Someone',
            },
        content: String(n.message || n.content || ''),
        timestamp: new Date(n.timestamp || Date.now()).getTime(),
        isRead: Boolean(n.read ?? n.isRead ?? false),
        postId: n.postId,
        commentId: n.commentId,
        groupId: n.groupId,
      }));

      setNotifications(mapped);
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to load notifications';
      Toast.show({ type: 'error', text1: 'Error', text2: message });
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, isRead: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, isRead: true }))
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like': return '❤️';
      case 'comment': return '💬';
      case 'follow': return '👤';
      case 'request': return '🤝';
      case 'invite': return '📨';
      case 'mention': return '📢';
      default: return '🔔';
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleNotificationPress = (notification: Notification) => {
    markAsRead(notification.id);
    
    // Navigate based on notification type
    if (notification.postId) {
      navigation.navigate('PostDetail', { postId: notification.postId });
    } else if (notification.groupId) {
      // Navigate to group
      console.log('Navigate to group:', notification.groupId);
    } else {
      // Navigate to user profile (UserProfile stack screen)
      navigation.navigate('UserProfile', { username: notification.user.username });
    }
  };

  const filteredNotifications = notifications.filter(notif => 
    filter === 'all' || !notif.isRead
  );

  const unreadCount = notifications.filter(notif => !notif.isRead).length;

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.isRead && styles.unreadNotification,
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationIcon}>
          <Text style={styles.iconText}>{getNotificationIcon(item.type)}</Text>
        </View>
        <View style={styles.notificationText}>
          <Text style={styles.notificationMessage}>
            <Text style={styles.username}>{item.user.username}</Text> {item.content}
          </Text>
          <Text style={styles.notificationTime}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
        {item.user.avatar && (
          <Image source={{ uri: item.user.avatar }} style={styles.userAvatar} />
        )}
      </View>
    </TouchableOpacity>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      marginRight: theme.spacing.md,
    },
    backButtonText: {
      fontSize: 20,
      color: theme.colors.text,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    markAllButton: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    markAllText: {
      fontSize: 14,
      color: theme.colors.primary,
      fontWeight: '600',
    },
    filterContainer: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    filterButton: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      marginRight: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.background,
    },
    filterButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    filterText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    filterTextActive: {
      color: theme.colors.textInverse,
    },
    notificationItem: {
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    unreadNotification: {
      backgroundColor: theme.colors.primary + '05',
    },
    notificationContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    notificationIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    iconText: {
      fontSize: 20,
    },
    notificationText: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    notificationMessage: {
      fontSize: 16,
      color: theme.colors.text,
      lineHeight: 22,
      marginBottom: theme.spacing.xs,
    },
    username: {
      fontWeight: 'bold',
      color: theme.colors.primary,
    },
    notificationTime: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    userAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    emptyIcon: {
      fontSize: 60,
      marginBottom: theme.spacing.lg,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: 'bold',
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
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Notifications {unreadCount > 0 && `(${unreadCount})`}
          </Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'all' && styles.filterButtonActive,
          ]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'all' && styles.filterTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'unread' && styles.filterButtonActive,
          ]}
          onPress={() => setFilter('unread')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'unread' && styles.filterTextActive,
            ]}
          >
            Unread
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      {filteredNotifications.length > 0 ? (
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>
            {filter === 'unread' ? 'No Unread Notifications' : 'No Notifications'}
          </Text>
          <Text style={styles.emptyText}>
            {filter === 'unread'
              ? 'You\'re all caught up!'
              : 'You\'ll see notifications for likes, comments, follows, and more here'}
          </Text>
        </View>
      )}
    </View>
  );
};

export default NotificationsScreen;
