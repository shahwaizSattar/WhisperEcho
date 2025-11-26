import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';

type ReactionType = 'funny' | 'rage' | 'shock' | 'relatable' | 'love' | 'thinking';

const REACTION_ICONS: Record<ReactionType, string> = {
  funny: '😂',
  rage: '😡',
  shock: '😱',
  relatable: '💯',
  love: '❤️',
  thinking: '🤔',
};

const REACTION_LABELS: Record<ReactionType, string> = {
  funny: 'Funny',
  rage: 'Rage',
  shock: 'Shock',
  relatable: 'Relatable',
  love: 'Love',
  thinking: 'Thinking',
};

interface ReactionPopupProps {
  visible: boolean;
  onSelect: (reaction: ReactionType) => void;
  onClose: () => void;
  position: { x: number; y: number };
}

const ReactionPopup: React.FC<ReactionPopupProps> = ({ visible, onSelect, onClose, position }) => {
  const { theme } = useTheme();
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const popupWidth = 130;
  let leftPosition = position.x - popupWidth / 2;
  
  // Keep popup within screen bounds
  if (leftPosition < 10) leftPosition = 10;
  if (leftPosition + popupWidth > screenWidth - 10) {
    leftPosition = screenWidth - popupWidth - 10;
  }
  
  // Calculate top position (above the button) - position.y is the top of the button
  // We want to position the popup above it, so we use top positioning
  const topPosition = position.y - 80; // 80px above the button top

  const handleReactionSelect = (reaction: ReactionType) => {
    onSelect(reaction);
    onClose();
  };

  const styles = StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
    },
    container: {
      position: 'absolute',
      left: leftPosition,
      top: topPosition,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      paddingHorizontal: 6,
      paddingVertical: 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      ...theme.shadows.large,
      borderWidth: 1,
      borderColor: theme.colors.border,
      zIndex: 1001,
      minWidth: popupWidth,
    },
    reactionButton: {
      paddingHorizontal: 2,
      paddingVertical: 2,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 18,
      borderRadius: 12,
    },
    reactionEmoji: {
      fontSize: 20,
      marginBottom: 0,
    },
    reactionLabel: {
      fontSize: 7,
      color: theme.colors.textSecondary,
      fontWeight: '600',
      marginTop: 1,
    },
  });

  return (
    <>
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      />
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        {Object.entries(REACTION_ICONS).map(([type, emoji]) => (
          <TouchableOpacity
            key={type}
            style={styles.reactionButton}
            onPress={() => handleReactionSelect(type as ReactionType)}
            activeOpacity={0.7}
          >
            <Text style={styles.reactionEmoji}>{emoji}</Text>
            <Text style={styles.reactionLabel}>{REACTION_LABELS[type as ReactionType]}</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>
    </>
  );
};

export default ReactionPopup;

