import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { convertAvatarUrl } from '../utils/imageUtils';

interface MessageNotificationProps {
  visible: boolean;
  message: {
    senderName: string;
    senderAvatar?: string;
    text: string;
    senderId: string;
  };
  onPress: () => void;
  onDismiss: () => void;
}

const MessageNotification: React.FC<MessageNotificationProps> = ({
  visible,
  message,
  onPress,
  onDismiss,
}) => {
  const { theme } = useTheme();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide in and fade in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after 5 seconds
      const timeout = setTimeout(() => {
        dismissNotification();
      }, 5000);

      return () => clearTimeout(timeout);
    } else {
      // Slide out and fade out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const dismissNotification = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 50 : 10,
      left: 16,
      right: 16,
      zIndex: 9999,
      elevation: 10,
    },
    notification: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      ...theme.shadows.large,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      marginRight: 12,
    },
    avatarPlaceholder: {
      width: 44,
      height: 44,
      borderRadius: 22,
      marginRight: 12,
      backgroundColor: theme.colors.primary + '30',
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    content: {
      flex: 1,
      marginRight: 8,
    },
    senderName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 2,
    },
    messageText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    closeButton: {
      padding: 4,
    },
    closeText: {
      fontSize: 18,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.notification}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {message.senderAvatar ? (
          <Image
            source={{ uri: convertAvatarUrl(message.senderAvatar) || '' }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {message.senderName?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
        )}
        <View style={styles.content}>
          <Text style={styles.senderName} numberOfLines={1}>
            {message.senderName}
          </Text>
          <Text style={styles.messageText} numberOfLines={2}>
            {message.text || 'Sent a message'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={(e) => {
            e.stopPropagation();
            dismissNotification();
          }}
        >
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default MessageNotification;
