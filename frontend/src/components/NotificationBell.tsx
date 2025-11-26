import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { View, Text, TouchableOpacity, AppState, AppStateStatus, Dimensions, Modal, Platform, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { useTheme } from '../context/ThemeContext';
import { navigate, navigationRef } from '../navigation/navigationRef';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import { getSocket } from '../services/socket';
import NotificationDropdown from './NotificationDropdown';

type NotificationSummary = {
  _id?: string;
  type?: 'reaction' | 'comment' | 'track' | 'follow' | 'mention' | 'message' | 'chat';
  read?: boolean;
  user?: {
    username?: string;
  };
  reactionType?: string;
};

type RealtimeNotificationPayload = {
  notification?: NotificationSummary | null;
  unreadCount?: number;
};

const NotificationBell: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<any>(null);
  const prevCountRef = useRef(0);
  const appIsActiveRef = useRef(AppState.currentState === 'active');
  const hasInitializedRef = useRef(false);
  const toastNotificationIdRef = useRef<string | null>(null);
  const toastCooldownRef = useRef<number>(0);
  const socketRef = useRef<Socket | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewDescription, setPreviewDescription] = useState('');
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
  const previewTimerRef = useRef<any>(null);
  const [previewPeer, setPreviewPeer] = useState<{ _id?: string; username?: string; avatar?: string } | null>(null);

  const getNotificationPreview = (notification: NotificationSummary | null) => {
    if (!notification) {
      return 'Tap the bell to view your alerts';
    }

    const username = notification.user?.username || 'Someone';
    switch (notification.type) {
      case 'reaction':
        return `${username} reacted ${notification.reactionType === 'love' ? '❤️' :
          notification.reactionType === 'funny' ? '😂' :
          notification.reactionType === 'rage' ? '😡' :
          notification.reactionType === 'shock' ? '😱' :
          notification.reactionType === 'relatable' ? '😮' :
          notification.reactionType === 'thinking' ? '🤔' : '👍'} to your post`;
      case 'comment':
        return `${username} commented on your post`;
      case 'track':
      case 'follow':
        return `${username} started tracking you`;
      case 'mention':
        return `${username} mentioned you`;
      default:
        return `${username} sent you a notification`;
    }
  };

  const showNotificationToast = useCallback((notification: NotificationSummary | null, diff: number) => {
    if (!notification && diff <= 0) {
      return;
    }

    const now = Date.now();
    if (
      toastNotificationIdRef.current &&
      notification?._id === toastNotificationIdRef.current &&
      now - toastCooldownRef.current < 2000
    ) {
      return;
    }

    toastNotificationIdRef.current = notification?._id || null;
    toastCooldownRef.current = now;

    const title = diff > 1 ? `${diff} new notifications` : 'New notification';
    const fallback = diff > 1 ? 'Open notifications to see details' : 'Tap to view';
    const description = getNotificationPreview(notification) || fallback;

    const measureAndShow = () => {
      if (buttonRef.current) {
        (buttonRef.current as any).measure((fx: number, fy: number, width: number, height: number, px: number, py: number) => {
          setPreviewPosition({ x: px + width / 2, y: py + height });
          setPreviewTitle(title);
          setPreviewDescription(description);
          setPreviewVisible(true);
          if (previewTimerRef.current) {
            clearTimeout(previewTimerRef.current);
          }
          previewTimerRef.current = setTimeout(() => setPreviewVisible(false), 4000);
        });
      } else {
        const defaultX = Math.min(Math.max(200, 16), Dimensions.get('window').width - 16);
        setPreviewPosition({ x: defaultX, y: 60 });
        setPreviewTitle(title);
        setPreviewDescription(description);
        setPreviewVisible(true);
        if (previewTimerRef.current) {
          clearTimeout(previewTimerRef.current);
        }
        previewTimerRef.current = setTimeout(() => setPreviewVisible(false), 4000);
      }
    };

    measureAndShow();
  }, []);

  const showMessagePreview = useCallback((sender: { _id?: string; username?: string; avatar?: string } | undefined, text: string | undefined) => {
    const title = sender?.username ? `Message from @${sender.username}` : 'New message';
    const description = (text || '').slice(0, 120);
    const measureAndShow = () => {
      if (buttonRef.current) {
        (buttonRef.current as any).measure((fx: number, fy: number, width: number, height: number, px: number, py: number) => {
          setPreviewPosition({ x: px + width / 2, y: py + height });
          setPreviewTitle(title);
          setPreviewDescription(description);
          setPreviewPeer(sender || null);
          setPreviewVisible(true);
          if (previewTimerRef.current) {
            clearTimeout(previewTimerRef.current);
          }
          previewTimerRef.current = setTimeout(() => setPreviewVisible(false), 5000);
        });
      } else {
        const defaultX = Math.min(Math.max(200, 16), Dimensions.get('window').width - 16);
        setPreviewPosition({ x: defaultX, y: 60 });
        setPreviewTitle(title);
        setPreviewDescription(description);
        setPreviewPeer(sender || null);
        setPreviewVisible(true);
        if (previewTimerRef.current) {
          clearTimeout(previewTimerRef.current);
        }
        previewTimerRef.current = setTimeout(() => setPreviewVisible(false), 5000);
      }
    };
    measureAndShow();
  }, []);

  const loadCounts = useCallback(async ({ skipToast = false }: { skipToast?: boolean } = {}) => {
    try {
      const notifRes: any = await userAPI.getNotifications();
      const notifications: NotificationSummary[] = Array.isArray(notifRes?.notifications)
        ? notifRes.notifications
        : Array.isArray(notifRes?.data?.notifications)
        ? notifRes.data.notifications
        : Array.isArray(notifRes?.data)
        ? notifRes.data
        : [];
      const unreadNotifs = typeof notifRes?.unreadCount === 'number'
        ? notifRes.unreadCount
        : typeof notifRes?.data?.unreadCount === 'number'
        ? notifRes.data.unreadCount
        : 0;
      const previousCount = prevCountRef.current;
      prevCountRef.current = unreadNotifs;
      setCount(unreadNotifs);

      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
      } else if (!skipToast && appIsActiveRef.current && !dropdownVisible && unreadNotifs > previousCount) {
        const newestUnread = notifications.find((notification) => !notification.read) || null;
        const diff = unreadNotifs - previousCount;
        if (diff > 0) {
          showNotificationToast(newestUnread, diff);
        }
      }
    } catch (e) {
      setCount(0);
    }
  }, [dropdownVisible, showNotificationToast]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      appIsActiveRef.current = nextAppState === 'active';
      if (nextAppState === 'active') {
        loadCounts({ skipToast: true });
      }
    });

    return () => {
      if (typeof (subscription as any)?.remove === 'function') {
        (subscription as any).remove();
      }
    };
  }, [loadCounts]);

  useEffect(() => {
    loadCounts({ skipToast: true });
  }, [loadCounts]);

  useEffect(() => {
    if (!user?._id) {
      return;
    }

    const socket = getSocket();
    socketRef.current = socket;
    const roomId = user._id;

    const handleRealtimeNotification = (payload: RealtimeNotificationPayload = {}) => {
      const previousCount = prevCountRef.current || 0;
      const nextCount = typeof payload.unreadCount === 'number'
        ? payload.unreadCount
        : previousCount + 1;

      prevCountRef.current = nextCount;
      setCount(nextCount);

      if (appIsActiveRef.current && !dropdownVisible) {
        const diff = Math.max(nextCount - previousCount, 1);
        showNotificationToast(payload.notification || null, diff);
      }
    };

    socket.emit('join-room', roomId);
    socket.on('notification:new', handleRealtimeNotification);
    socket.on('chat:new-message', (payload: any) => {
      try {
        const { sender, message } = payload || {};
        const currentRoute = navigationRef.getCurrentRoute()?.name;
        const inChatView = currentRoute === 'Chat' || currentRoute === 'Messages' || currentRoute === 'Messenger';
        if (appIsActiveRef.current && !dropdownVisible && !inChatView) {
          showMessagePreview(sender, message?.text);
        }
      } catch (e) {}
    });

    return () => {
      socket.off('notification:new', handleRealtimeNotification);
      socket.off('chat:new-message');
      socket.emit('leave-room', roomId);
    };
  }, [user?._id, dropdownVisible, showNotificationToast]);

  useEffect(() => {
    let delay = 5000;
    let timer: any;
    let cancelled = false;
    const tick = async () => {
      try {
        await loadCounts();
        delay = 5000;
      } catch (e: any) {
        delay = Math.min(delay * 2, 60000);
      } finally {
        if (!cancelled) {
          timer = setTimeout(tick, delay);
        }
      }
    };
    tick();
    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [loadCounts]);


  useFocusEffect(
    useCallback(() => {
      loadCounts({ skipToast: true });
      return () => {};
    }, [loadCounts])
  );

  const handlePress = () => {
    if (buttonRef.current) {
      (buttonRef.current as any).measure((fx: number, fy: number, width: number, height: number, px: number, py: number) => {
        setDropdownPosition({
          x: px + width / 2,
          y: py + height,
        });
        setDropdownVisible(true);
      });
    } else {
      // Fallback position
      setDropdownPosition({ x: 200, y: 60 });
      setDropdownVisible(true);
    }
  };

  const handleNotificationsRead = (clearedCount: number = 0) => {
    if (clearedCount > 0) {
      setCount((prev) => {
        const next = Math.max(prev - clearedCount, 0);
        prevCountRef.current = next;
        return next;
      });
    }
    loadCounts({ skipToast: true });
  };

  return (
    <>
      <TouchableOpacity
        ref={buttonRef}
        onPress={handlePress}
      >
      <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 18 }}>🔔</Text>
        {count > 0 && (
          <View style={{ position: 'absolute', top: -4, right: -6, backgroundColor: '#FF3B30', borderRadius: 10, paddingHorizontal: 6, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{count > 99 ? '99+' : count}</Text>
          </View>
        )}
      </View>
      </TouchableOpacity>
      <Modal transparent visible={previewVisible} animationType="fade" onRequestClose={() => setPreviewVisible(false)}>
        <View style={{ flex: 1 }}>
          <AnchoredPreview
            x={previewPosition.x}
            y={previewPosition.y}
            title={previewTitle}
            description={previewDescription}
            themeColors={theme.colors}
            onPress={() => {
              if (previewPeer?._id) {
                navigate('Chat', { peerId: previewPeer._id as any, username: previewPeer.username as any, avatar: previewPeer.avatar as any });
                setPreviewVisible(false);
              }
            }}
          />
        </View>
      </Modal>
      <NotificationDropdown
        visible={dropdownVisible}
        onClose={() => setDropdownVisible(false)}
        position={dropdownPosition}
        onNotificationsRead={handleNotificationsRead}
      />
    </>
  );
};

export default NotificationBell;

const AnchoredPreview: React.FC<{ x: number; y: number; title: string; description: string; themeColors: any; onPress?: () => void }> = ({ x, y, title, description, themeColors, onPress }) => {
  const screenWidth = Dimensions.get('window').width;
  const maxWidth = Math.min(320, screenWidth - 32);
  const left = Math.min(Math.max(x - maxWidth / 2, 16), screenWidth - maxWidth - 16);
  const glassBg = themeColors?.background === '#000' ? 'rgba(20,20,20,0.45)' : 'rgba(255,255,255,0.45)';
  const glassBorder = themeColors ? themeColors.border + '40' : 'rgba(0,0,0,0.12)';
  const s = StyleSheet.create({
    container: {
      position: 'absolute',
      top: y + 8,
      left,
      width: maxWidth,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: glassBorder,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 5,
      overflow: 'hidden',
      backgroundColor: glassBg,
    },
    content: {
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    title: {
      fontSize: 14,
      fontWeight: '700',
      color: themeColors?.text,
      marginBottom: 2,
    },
    desc: {
      fontSize: 13,
      color: themeColors?.textSecondary,
    },
  });

  if (Platform.OS === 'web') {
    return (
      <div style={{ position: 'absolute', top: s.container.top as number, left: s.container.left as number, width: s.container.width as number, borderRadius: 12, border: `1px solid ${glassBorder}`, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', backdropFilter: 'blur(24px)', background: glassBg, cursor: onPress ? 'pointer' : 'default' }} onClick={onPress}>
        <div style={{ padding: '10px 14px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: themeColors?.text }}>{title}</div>
          <div style={{ fontSize: 13, color: themeColors?.textSecondary }}>{description}</div>
        </div>
      </div>
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.8} style={s.container} onPress={onPress}>
      <View style={s.content}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.desc}>{description}</Text>
      </View>
    </TouchableOpacity>
  );
};
