import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Image } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { convertAvatarUrl } from '../utils/imageUtils';

interface SignInAnimationProps {
  visible: boolean;
  onComplete: () => void;
  avatar?: string;
  username?: string;
}

const SignInAnimation: React.FC<SignInAnimationProps> = ({ visible, onComplete, avatar, username }) => {
  const { theme } = useTheme();
  const avatarScale = useRef(new Animated.Value(1)).current;
  const avatarOpacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const finalScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      const screenWidth = Dimensions.get('window').width;
      const screenHeight = Dimensions.get('window').height;
      
      // Calculate final position (header avatar position)
      // Header is at top, avatar is in left section
      // Based on HomeScreen header structure:
      // - SafeAreaView top padding: ~44px (iPhone) or ~24px (Android)
      // - Header padding: ~16px
      // - Avatar size: 40x40, positioned at left with ~12px margin
      const safeAreaTop = 44; // Approximate SafeAreaView top
      const headerPadding = 16;
      const avatarMargin = 12;
      const headerAvatarX = avatarMargin + 20; // Left edge + half avatar width
      const headerAvatarY = safeAreaTop + headerPadding + 20; // Top + padding + half avatar height
      const centerX = screenWidth / 2;
      const centerY = screenHeight / 2;
      
      // Calculate translation needed (from center to header position)
      const targetX = headerAvatarX - centerX;
      const targetY = headerAvatarY - centerY;
      
      // Initial avatar size: 120px, final size: 40px
      const initialSize = 120;
      const finalSize = 40;
      const scaleFactor = finalSize / initialSize;

      // Reset animations
      avatarScale.setValue(1);
      avatarOpacity.setValue(1);
      translateX.setValue(0);
      translateY.setValue(0);
      finalScale.setValue(1);

      // Animation sequence
      Animated.sequence([
        // Step 1: Avatar appears in center (0.2s)
        Animated.parallel([
          Animated.spring(avatarScale, {
            toValue: 1.1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(300),
        // Step 2: Avatar moves up to header position (0.8s)
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: targetX,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: targetY,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.spring(finalScale, {
            toValue: scaleFactor,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
        // Step 3: Brief hold (0.1s)
        Animated.delay(100),
        // Step 4: Fade out smoothly (0.2s)
        Animated.timing(avatarOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
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
      overflow: 'hidden',
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
  });

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View
        style={[
          styles.avatarContainer,
          {
            transform: [
              { translateX },
              { translateY },
              { scale: Animated.multiply(avatarScale, finalScale) },
            ],
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
    </View>
  );
};

export default SignInAnimation;

