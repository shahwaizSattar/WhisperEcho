import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Image } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { convertAvatarUrl } from '../utils/imageUtils';

interface LogoutAnimationProps {
  visible: boolean;
  onComplete: () => void;
  avatar?: string;
  username?: string;
}

const LogoutAnimation: React.FC<LogoutAnimationProps> = ({ visible, onComplete, avatar, username }) => {
  const { theme } = useTheme();
  const avatarScale = useRef(new Animated.Value(1)).current;
  const avatarOpacity = useRef(new Animated.Value(1)).current;
  const silhouetteOpacity = useRef(new Animated.Value(0)).current;
  const silhouetteScale = useRef(new Animated.Value(0.8)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      // Reset all animations
      avatarScale.setValue(1);
      avatarOpacity.setValue(1);
      silhouetteOpacity.setValue(0);
      silhouetteScale.setValue(0.8);
      textOpacity.setValue(0);
      textScale.setValue(0.8);

      // Animation sequence
      Animated.sequence([
        // Step 1: Avatar appears and scales up slightly (0.3s)
        Animated.parallel([
          Animated.spring(avatarScale, {
            toValue: 1.1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
        ]),
        // Step 2: Avatar transforms into silhouette (0.6s)
        Animated.parallel([
          Animated.timing(avatarOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(silhouetteOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(silhouetteScale, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
        ]),
        // Step 3: Hold silhouette (0.3s)
        Animated.delay(300),
        // Step 4: Silhouette fades out and "Logged Out" appears (0.5s)
        Animated.parallel([
          Animated.timing(silhouetteOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(silhouetteScale, {
            toValue: 0.8,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(textScale, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
        ]),
        // Step 5: Hold "Logged Out" text (0.8s)
        Animated.delay(800),
        // Step 6: Fade out text (0.3s)
        Animated.parallel([
          Animated.timing(textOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(textScale, {
            toValue: 0.9,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        onComplete();
      });
    }
  }, [visible]);

  if (!visible) return null;

  const avatarSize = 120;

  const styles = StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.background,
      zIndex: 9999,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatar: {
      width: avatarSize,
      height: avatarSize,
      borderRadius: avatarSize / 2,
      backgroundColor: theme.colors.surface,
      borderWidth: 3,
      borderColor: theme.colors.primary,
    },
    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: avatarSize / 2,
    },
    avatarPlaceholder: {
      width: '100%',
      height: '100%',
      borderRadius: avatarSize / 2,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarPlaceholderText: {
      fontSize: avatarSize * 0.5,
      color: theme.colors.surface,
      fontWeight: 'bold',
    },
    silhouetteContainer: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    silhouette: {
      fontSize: avatarSize,
      opacity: 0.9,
    },
    textContainer: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 40,
    },
    logoutText: {
      fontSize: 28,
      fontWeight: '600',
      color: theme.colors.text,
      letterSpacing: 1,
    },
  });

  return (
    <View style={styles.overlay}>
      {/* User Avatar */}
      <Animated.View
        style={[
          styles.avatarContainer,
          {
            transform: [{ scale: avatarScale }],
            opacity: avatarOpacity,
          },
        ]}
      >
        <View style={styles.avatar}>
          {avatar ? (
            <Image 
              source={{ uri: convertAvatarUrl(avatar) || '' }} 
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>
                {username?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Silhouette */}
      <Animated.View
        style={[
          styles.silhouetteContainer,
          {
            transform: [{ scale: silhouetteScale }],
            opacity: silhouetteOpacity,
          },
        ]}
      >
        <Text style={styles.silhouette}>👤</Text>
      </Animated.View>

      {/* Logged Out Text */}
      <Animated.View
        style={[
          styles.textContainer,
          {
            transform: [{ scale: textScale }],
            opacity: textOpacity,
          },
        ]}
      >
        <Text style={styles.logoutText}>Logged Out</Text>
      </Animated.View>
    </View>
  );
};

export default LogoutAnimation;

