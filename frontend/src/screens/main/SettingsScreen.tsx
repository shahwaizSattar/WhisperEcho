import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemeType } from '../../context/ThemeContext';

const SettingsScreen: React.FC = () => {
  const { theme, themeName, setTheme } = useTheme();

  const themes: Array<{
    id: ThemeType;
    name: string;
    description: string;
    icon: string;
    previewColors: { primary: string; background: string; surface: string };
  }> = [
    {
      id: 'light',
      name: 'Effortless Clarity',
      description: 'A clean, modern interface built for precision and simplicity. Soft whites, subtle shadows, and crisp typography create a space where content feels breathable and focus comes naturally.',
      icon: '🌤️',
      previewColors: {
        primary: '#6366F1',
        background: '#FFFFFF',
        surface: '#F8FAFC',
      },
    },
    {
      id: 'dark',
      name: 'Midnight Balance',
      description: 'A gentle dark mode engineered for comfort. Smooth charcoal tones reduce eye strain, while muted contrasts maintain readability without harsh glare.',
      icon: '🌙',
      previewColors: {
        primary: '#818CF8',
        background: '#111827',
        surface: '#1F2937',
      },
    },
    {
      id: 'amoled',
      name: 'True Black Silence',
      description: 'An ultra-deep, battery-saving theme made for OLED displays. Every pixel that turns off disappears into absolute darkness, giving the UI a luxurious, void-like aesthetic.',
      icon: '🖤',
      previewColors: {
        primary: '#00FFD1',
        background: '#000000',
        surface: '#0B0F15',
      },
    },
    {
      id: 'neon-whisper',
      name: 'Futuristic Cyberglow',
      description: 'A high-tech theme infused with soft neon accents shimmering over a dark canvas. Think subtle glows, electric gradients, and ambient highlights — creating the feeling of a hidden digital world beneath the surface.',
      icon: '⚡',
      previewColors: {
        primary: '#00FFD1',
        background: '#0B0F15',
        surface: '#111827',
      },
    },
    {
      id: 'mood-shift',
      name: 'Emotion-Adaptive Visuals',
      description: 'A dynamic theme that transforms based on the emotional tone of posts. Calm posts bring soft hues, energetic posts spark vivid colors, and darker content shifts the UI into deeper tones.',
      icon: '🎭',
      previewColors: {
        primary: '#6366F1',
        background: '#FFFFFF',
        surface: '#F8FAFC',
      },
    },
  ];

  // Create styles with useMemo to make them reactive to theme changes
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    header: {
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border + '40',
      backgroundColor: theme.colors.surface,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    section: {
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.lg,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    themeCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      borderWidth: 2,
      borderColor: theme.colors.border + '40',
      ...theme.shadows.small,
    },
    themeCardSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '10',
      ...theme.shadows.medium,
    },
    themeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    themeIcon: {
      fontSize: 32,
      marginRight: theme.spacing.md,
    },
    themeNameContainer: {
      flex: 1,
    },
    themeName: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    themeDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      marginBottom: theme.spacing.md,
    },
    themePreview: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing.sm,
    },
    previewColor: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: theme.spacing.sm,
      borderWidth: 2,
      borderColor: theme.colors.border,
    },
    previewLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginRight: theme.spacing.sm,
    },
    selectedBadge: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.round,
      marginLeft: theme.spacing.sm,
    },
    selectedBadgeText: {
      color: theme.colors.textInverse,
      fontSize: 12,
      fontWeight: '600',
    },
    checkmark: {
      fontSize: 20,
      color: theme.colors.primary,
      marginLeft: theme.spacing.sm,
    },
  }), [theme]);

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Customize your experience</Text>
        </View>

        {/* Theme Selection Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎨 Theme Selection</Text>
          <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginBottom: theme.spacing.lg }}>
            Choose a theme that matches your style. Changes apply instantly across all screens.
          </Text>

          {themes.map((themeOption) => {
            const isSelected = themeName === themeOption.id;
            return (
              <TouchableOpacity
                key={themeOption.id}
                style={[styles.themeCard, isSelected && styles.themeCardSelected]}
                onPress={() => {
                  console.log('Setting theme to:', themeOption.id);
                  setTheme(themeOption.id);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.themeHeader}>
                  <Text style={styles.themeIcon}>{themeOption.icon}</Text>
                  <View style={styles.themeNameContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={styles.themeName}>{themeOption.name}</Text>
                      {isSelected && (
                        <View style={styles.selectedBadge}>
                          <Text style={styles.selectedBadgeText}>Active</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                <Text style={styles.themeDescription}>{themeOption.description}</Text>
                <View style={styles.themePreview}>
                  <Text style={styles.previewLabel}>Preview:</Text>
                  <View
                    style={[
                      styles.previewColor,
                      { backgroundColor: themeOption.previewColors.primary },
                    ]}
                  />
                  <View
                    style={[
                      styles.previewColor,
                      { backgroundColor: themeOption.previewColors.background },
                    ]}
                  />
                  <View
                    style={[
                      styles.previewColor,
                      { backgroundColor: themeOption.previewColors.surface },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <View style={[styles.themeCard, { backgroundColor: theme.colors.primary + '10' }]}>
            <Text style={{ fontSize: 14, color: theme.colors.text, lineHeight: 20 }}>
              <Text style={{ fontWeight: '600' }}>💡 Tip:</Text> The theme you select will be applied to all screens in the app, including Home, Profile, Messages, and more. Your preference is saved automatically.
            </Text>
          </View>
    </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;
