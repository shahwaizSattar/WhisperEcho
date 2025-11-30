import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface Top3ReactionsDisplayProps {
  reactionCounts: {
    funny?: number;
    rage?: number;
    shock?: number;
    relatable?: number;
    love?: number;
    thinking?: number;
    total?: number;
  };
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
}

const REACTION_ICONS: Record<string, string> = {
  funny: '😂',
  rage: '😡',
  shock: '😱',
  relatable: '💯',
  love: '❤️',
  thinking: '🤔',
};

export const Top3ReactionsDisplay: React.FC<Top3ReactionsDisplayProps> = ({
  reactionCounts,
  onPress,
  size = 'medium',
}) => {
  const { theme } = useTheme();

  // Get top 3 reactions by count
  const getTop3Reactions = () => {
    const reactions = Object.entries(reactionCounts)
      .filter(([key]) => key !== 'total')
      .map(([type, count]) => ({ type, count: count || 0 }))
      .filter(({ count }) => count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    return reactions;
  };

  const top3 = getTop3Reactions();
  const total = reactionCounts.total || 0;

  if (total === 0) {
    return null;
  }

  const iconSizes = {
    small: 16,
    medium: 20,
    large: 24,
  };

  const textSizes = {
    small: 11,
    medium: 13,
    large: 15,
  };

  const containerPadding = {
    small: 4,
    medium: 6,
    large: 8,
  };

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      paddingHorizontal: containerPadding[size],
      paddingVertical: containerPadding[size] - 2,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignSelf: 'flex-start',
    },
    emojiContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 6,
    },
    emoji: {
      fontSize: iconSizes[size],
      marginLeft: -4,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.colors.background,
      overflow: 'hidden',
    },
    firstEmoji: {
      marginLeft: 0,
    },
    countText: {
      fontSize: textSizes[size],
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginLeft: 2,
    },
  });

  const content = (
    <View style={styles.container}>
      <View style={styles.emojiContainer}>
        {top3.map((reaction, index) => (
          <Text
            key={reaction.type}
            style={[styles.emoji, index === 0 && styles.firstEmoji]}
          >
            {REACTION_ICONS[reaction.type]}
          </Text>
        ))}
      </View>
      <Text style={styles.countText}>{total}</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};
