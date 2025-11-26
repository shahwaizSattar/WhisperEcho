import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useTheme } from '../context/ThemeContext';
import { userAPI } from '../services/api';
import { useNavigation } from '@react-navigation/native';
import { convertAvatarUrl } from '../utils/imageUtils';

interface NotificationDropdownProps {
  visible: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  onNotificationsRead?: (clearedCount: number) => void;
}

interface Notification {
  _id: string;
  type: 'reaction' | 'comment' | 'track' | 'follow' | 'mention' | 'message' | 'chat';
  read: boolean;
  createdAt: string;
  user?: {
    _id: string;
    username: string;
    avatar?: string;
  };
  post?: {
    _id: string;
    content?: {
      text?: string;
    };
  };
  comment?: {
    content: string;
  };
  reactionType?: string;
}

const notificationSound = require('../../assets/sounds/tudum.wav');
const RELEVANT_NOTIFICATION_TYPES: Array<Notification['type']> = ['reaction', 'comment', 'track'];

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  visible,
  onClose,
  position,
  onNotificationsRead,
}) => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const playerRef = useRef<AudioPlayer | null>(null);
  const hasInitializedRef = useRef(false);
  const seenNotificationsRef = useRef(new Set<string>());
  const hasMarkedReadRef = useRef(false);

  const playNotificationSound = async () => {
    try {
      if (!playerRef.current) {
        playerRef.current = createAudioPlayer(notificationSound);
      } else {
        playerRef.current.replace(notificationSound);
      }
      playerRef.current.seekTo(0);
      playerRef.current.play();
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (visible) {
      hasMarkedReadRef.current = false;
      loadNotifications();
    } else {
      hasMarkedReadRef.current = false;
    }
  }, [visible]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response: any = await userAPI.getNotifications();
      const rawNotifications = Array.isArray(response?.notifications)
        ? response.notifications
        : Array.isArray(response?.data?.notifications)
        ? response.data.notifications
        : Array.isArray(response?.data)
        ? response.data
        : [];
      // Filter out message notifications
      const filteredNotifs = rawNotifications.filter((n: Notification) =>
        n.type !== 'message' && n.type !== 'chat'
      );

      const newImportantNotifications = filteredNotifs.filter((notification: Notification) => 
        RELEVANT_NOTIFICATION_TYPES.includes(notification.type) &&
        !notification.read &&
        !!notification._id &&
        !seenNotificationsRef.current.has(notification._id)
      );

      filteredNotifs.forEach((notification: Notification) => {
        if (notification._id) {
          seenNotificationsRef.current.add(notification._id);
        }
      });

      if (hasInitializedRef.current && newImportantNotifications.length > 0) {
        await playNotificationSound();
      }

      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
      }

      setNotifications(filteredNotifs);
      await markNotificationsAsRead(filteredNotifs);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markNotificationsAsRead = async (incomingNotifications: Notification[]) => {
    if (hasMarkedReadRef.current) {
      return;
    }

    const unreadIds = incomingNotifications
      .filter((notification) => !notification.read && notification._id)
      .map((notification) => notification._id);

    if (unreadIds.length === 0) {
      hasMarkedReadRef.current = true;
      onNotificationsRead?.(0);
      return;
    }

    try {
      await userAPI.markNotificationsRead(unreadIds);
      const unreadSet = new Set(unreadIds);
      setNotifications((prev) =>
        prev.map((notification) =>
          unreadSet.has(notification._id)
            ? { ...notification, read: true }
            : notification
        )
      );
      hasMarkedReadRef.current = true;
      onNotificationsRead?.(unreadIds.length);
    } catch (error) {
      console.error('Mark notifications read error:', error);
      hasMarkedReadRef.current = false;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reaction':
        return '👍';
      case 'comment':
        return '💬';
      case 'track':
      case 'follow':
        return '👤';
      case 'mention':
        return '📢';
      default:
        return '🔔';
    }
  };

  const getNotificationText = (notification: Notification) => {
    const username = notification.user?.username || 'Someone';
    switch (notification.type) {
      case 'reaction':
        const reactionEmoji = notification.reactionType === 'love' ? '❤️' :
                             notification.reactionType === 'funny' ? '😂' :
                             notification.reactionType === 'rage' ? '😡' :
                             notification.reactionType === 'shock' ? '😱' :
                             notification.reactionType === 'relatable' ? '😮' :
                             notification.reactionType === 'thinking' ? '🤔' : '👍';
        return `${username} reacted ${reactionEmoji} to your post`;
      case 'comment':
        return `${username} commented on your post`;
      case 'track':
      case 'follow':
        return `${username} started tracking you`;
      case 'mention':
        return `${username} mentioned you`;
      default:
        return 'New notification';
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    if (notification.post?._id) {
      (navigation as any).navigate('PostDetail', { postId: notification.post._id });
    } else if (notification.user?.username) {
      (navigation as any).navigate('UserProfile', { username: notification.user.username });
    }
    onClose();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const dropdownWidth = Math.min(350, screenWidth - 32);
  const maxDropdownHeight = 400;
  const horizontalPadding = 16;
  const verticalPadding = 16;
  const glassBg = theme.dark ? 'rgba(20, 20, 20, 0.35)' : 'rgba(255, 255, 255, 0.35)';
  const glassBorder = theme.dark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.12)';
  const dropdownLeft = Math.min(
    Math.max(position.x - dropdownWidth / 2, horizontalPadding),
    screenWidth - dropdownWidth - horizontalPadding
  );
  const dropdownTop = Math.min(
    Math.max(position.y + 10, verticalPadding + 30),
    screenHeight - maxDropdownHeight - verticalPadding
  );

  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      position: 'relative',
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      backgroundColor: 'transparent',
    },
    dropdown: {
      position: 'absolute',
      width: dropdownWidth,
      maxHeight: maxDropdownHeight,
      backgroundColor: glassBg,
      borderRadius: 12,
      ...theme.shadows.large,
      borderWidth: 1,
      borderColor: glassBorder,
      zIndex: 1001,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border + '40',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    closeButton: {
      padding: 4,
    },
    closeText: {
      fontSize: 20,
      color: theme.colors.textSecondary,
    },
    scrollView: {
      maxHeight: 350,
    },
    notificationItem: {
      flexDirection: 'row',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border + '20',
      backgroundColor: 'transparent',
    },
    unreadNotification: {
      backgroundColor: theme.colors.primary + '10',
    },
    avatarContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.primary + '20',
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    avatarText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.primary,
    },
    notificationContent: {
      flex: 1,
    },
    notificationText: {
      fontSize: 14,
      color: theme.colors.text,
      marginBottom: 4,
    },
    notificationTime: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
      backgroundColor: theme.colors.background,
    },
    emptyContainer: {
      padding: 40,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    loadingContainer: {
      padding: 40,
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
  });

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalContainer} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[
          styles.dropdown,
          { top: dropdownTop, left: dropdownLeft },
          Platform.OS === 'web' ? ({ backdropFilter: 'blur(24px)' } as any) : {},
        ]}
          pointerEvents="box-none"
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No notifications yet</Text>
              </View>
            ) : (
              notifications.map((notification) => (
                <TouchableOpacity
                  key={notification._id}
                  style={[
                    styles.notificationItem,
                    !notification.read && styles.unreadNotification,
                  ]}
                  onPress={() => handleNotificationPress(notification)}
                  activeOpacity={0.7}
                >
                  <View style={styles.iconContainer}>
                    <Text style={{ fontSize: 18 }}>{getNotificationIcon(notification.type)}</Text>
                  </View>
                  {notification.user?.avatar ? (
                    <Image
                      source={{ uri: convertAvatarUrl(notification.user.avatar) || '' }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarContainer}>
                      <Text style={styles.avatarText}>
                        {notification.user?.username?.charAt(0).toUpperCase() || '?'}
                      </Text>
                    </View>
                  )}
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationText}>
                      {getNotificationText(notification)}
                    </Text>
                    <Text style={styles.notificationTime}>
                      {formatTime(notification.createdAt)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default NotificationDropdown;
