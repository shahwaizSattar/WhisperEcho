import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Image,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { userAPI } from '../../services/api';
import Toast from 'react-native-toast-message';
import { convertAvatarUrl } from '../../utils/imageUtils';

const { width } = Dimensions.get('window');

interface AvatarOption {
  id: string;
  url: string;
  seed: string;
}

interface PreferenceCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

const categories: PreferenceCategory[] = [
  { id: 'Gaming', name: 'Gaming', icon: '🎮', color: '#FF6B35', description: 'Video games, esports, streaming' },
  { id: 'Education', name: 'Education', icon: '📚', color: '#4ECDC4', description: 'Learning, studies, knowledge' },
  { id: 'Beauty', name: 'Beauty', icon: '💄', color: '#FFB6C1', description: 'Makeup, skincare, fashion' },
  { id: 'Fitness', name: 'Fitness', icon: '💪', color: '#32CD32', description: 'Workouts, health, wellness' },
  { id: 'Music', name: 'Music', icon: '🎵', color: '#9B59B6', description: 'Songs, artists, concerts' },
  { id: 'Technology', name: 'Technology', icon: '💻', color: '#3498DB', description: 'Tech news, gadgets, coding' },
  { id: 'Art', name: 'Art', icon: '🎨', color: '#E74C3C', description: 'Drawing, design, creativity' },
  { id: 'Food', name: 'Food', icon: '🍕', color: '#F39C12', description: 'Cooking, recipes, restaurants' },
  { id: 'Travel', name: 'Travel', icon: '✈️', color: '#1ABC9C', description: 'Adventures, destinations, culture' },
  { id: 'Sports', name: 'Sports', icon: '⚽', color: '#27AE60', description: 'Athletes, teams, competitions' },
  { id: 'Movies', name: 'Movies', icon: '🎬', color: '#8E44AD', description: 'Films, actors, reviews' },
  { id: 'Books', name: 'Books', icon: '📖', color: '#D35400', description: 'Reading, authors, literature' },
  { id: 'Fashion', name: 'Fashion', icon: '👗', color: '#E91E63', description: 'Style, trends, brands' },
  { id: 'Photography', name: 'Photography', icon: '📸', color: '#607D8B', description: 'Photos, cameras, editing' },
  { id: 'Comedy', name: 'Comedy', icon: '😂', color: '#FFC107', description: 'Humor, memes, entertainment' },
  { id: 'Science', name: 'Science', icon: '🔬', color: '#00BCD4', description: 'Research, discoveries, facts' },
  { id: 'Politics', name: 'Politics', icon: '🏛️', color: '#795548', description: 'News, debates, governance' },
  { id: 'Business', name: 'Business', icon: '💼', color: '#455A64', description: 'Entrepreneurship, finance, career' },
];

const EditProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useTheme();
  const { user, updateUser } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [bioLoading, setBioLoading] = useState(false);
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [avatarOptions, setAvatarOptions] = useState<AvatarOption[]>([]);
  const [isGeneratingAvatars, setIsGeneratingAvatars] = useState(false);
  const [showAvatarGrid, setShowAvatarGrid] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>(user?.preferences || []);
  const [showPreferencesSection, setShowPreferencesSection] = useState(false);

  const handleUpdateBio = async () => {
    if (bio === user?.bio) {
      Toast.show({
        type: 'info',
        text1: 'No changes',
        text2: 'Bio is the same as current',
      });
      return;
    }

    try {
      setBioLoading(true);
      const response = await userAPI.updateProfile({ bio });
      if (response.success && response.user) {
        await updateUser(response.user);
        Toast.show({
          type: 'success',
          text1: 'Bio updated successfully',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.message || 'Failed to update bio',
        });
      }
    } catch (error: any) {
      console.error('Bio update error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Failed to update bio',
      });
    } finally {
      setBioLoading(false);
    }
  };

  const handleChangeUsername = async () => {
    if (username.length < 3) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Username must be at least 3 characters',
      });
      return;
    }

    if (username === user?.username) {
      Toast.show({
        type: 'info',
        text1: 'No changes',
        text2: 'New username is the same as current',
      });
      return;
    }

    try {
      setUsernameLoading(true);
      const response = await userAPI.changeUsername(username);
      if (response.success && response.user) {
        await updateUser(response.user);
        Toast.show({
          type: 'success',
          text1: 'Username changed successfully',
        });
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Failed to change username',
      });
      setUsername(user?.username || '');
    } finally {
      setUsernameLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Current password is required',
      });
      return;
    }

    if (newPassword.length < 6) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'New password must be at least 6 characters',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Passwords do not match',
      });
      return;
    }

    try {
      setPasswordLoading(true);
      const response = await userAPI.changePassword(currentPassword, newPassword);
      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Password changed successfully',
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordSection(false);
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Failed to change password',
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const generateAvatarOptions = () => {
    setIsGeneratingAvatars(true);
    const options: AvatarOption[] = [];
    
    const avatarStyles = ['avataaars', 'adventurer', 'big-smile', 'bottts', 'croodles', 'fun-emoji'];
    const seeds = [
      user?.username || 'user1',
      `${user?.username || 'user'}_alt1`,
      `${user?.username || 'user'}_alt2`,
      `random_${Math.random().toString(36).substring(7)}`,
      `avatar_${Math.random().toString(36).substring(7)}`,
      `user_${Math.random().toString(36).substring(7)}`,
      `profile_${Math.random().toString(36).substring(7)}`,
      `pic_${Math.random().toString(36).substring(7)}`,
      `image_${Math.random().toString(36).substring(7)}`,
      `face_${Math.random().toString(36).substring(7)}`,
      `char_${Math.random().toString(36).substring(7)}`,
      `person_${Math.random().toString(36).substring(7)}`,
    ];

    seeds.forEach((seed, index) => {
      const style = avatarStyles[index % avatarStyles.length];
      const url = `https://api.dicebear.com/7.x/${style}/png?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9&size=150`;
      
      options.push({
        id: `${style}_${seed}`,
        url,
        seed: `${style}_${seed}`,
      });
    });

    setAvatarOptions(options);
    setIsGeneratingAvatars(false);
    setShowAvatarGrid(true);
  };

  const handleAvatarSelect = async (avatar: AvatarOption) => {
    try {
      setAvatarLoading(true);
      setSelectedAvatar(avatar.url);
      
      const updateResponse = await userAPI.updateProfile({ avatar: avatar.url });
      
      if (updateResponse.success && updateResponse.user) {
        await updateUser(updateResponse.user);
        Toast.show({
          type: 'success',
          text1: 'Avatar updated successfully',
        });
        setShowAvatarGrid(false);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to update avatar',
        });
      }
    } catch (error: any) {
      console.error('Avatar update error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Failed to update avatar',
      });
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleUpdatePreferences = async () => {
    if (selectedPreferences.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please select at least one preference',
      });
      return;
    }

    try {
      setPreferencesLoading(true);
      const response = await userAPI.updateProfile({ preferences: selectedPreferences });
      if (response.success && response.user) {
        await updateUser(response.user);
        Toast.show({
          type: 'success',
          text1: 'Preferences updated successfully',
        });
        setShowPreferencesSection(false);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to update preferences',
        });
      }
    } catch (error: any) {
      console.error('Preferences update error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Failed to update preferences',
      });
    } finally {
      setPreferencesLoading(false);
    }
  };

  const togglePreference = (categoryId: string) => {
    setSelectedPreferences(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    backButton: {
      padding: 8,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    section: {
      marginBottom: 24,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: 16,
      ...theme.shadows.small,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border + '40',
      paddingBottom: 8,
    },
    formGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: theme.colors.text,
      minHeight: 44,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    button: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 12,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      marginTop: 12,
      ...theme.shadows.small,
    },
    buttonText: {
      color: theme.colors.textInverse,
      fontWeight: '600',
      fontSize: 14,
    },
    secondaryButton: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: 12,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      marginTop: 8,
    },
    secondaryButtonText: {
      color: theme.colors.text,
      fontWeight: '600',
      fontSize: 14,
    },
    charCount: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
      textAlign: 'right',
    },
    avatarContainer: {
      alignItems: 'center',
      marginBottom: 16,
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarImage: {
      width: 100,
      height: 100,
      borderRadius: 50,
    },
    avatarText: {
      fontSize: 40,
      fontWeight: 'bold',
      color: theme.colors.primary,
    },
    avatarGrid: {
      marginBottom: 12,
    },
    columnWrapper: {
      justifyContent: 'space-between',
      gap: 8,
    },
    avatarItem: {
      width: (width - 80) / 3,
      height: (width - 80) / 3,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: 2,
      borderColor: theme.colors.border,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarItemSelected: {
      borderColor: theme.colors.primary,
      borderWidth: 3,
    },
    avatarItemImage: {
      width: '100%',
      height: '100%',
    },
    selectedBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: theme.colors.primary,
      width: 30,
      height: 30,
      borderRadius: 15,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.surface,
    },
    selectedBadgeText: {
      color: theme.colors.textInverse,
      fontSize: 18,
      fontWeight: 'bold',
    },
    loadingText: {
      textAlign: 'center',
      color: theme.colors.textSecondary,
      fontSize: 14,
      marginVertical: 24,
    },
    preferenceGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    preferenceItem: {
      width: (width - 32 - 16) / 2,
      marginBottom: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: 12,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    preferenceItemSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '10',
    },
    preferenceIcon: {
      fontSize: 28,
      textAlign: 'center',
      marginBottom: 8,
    },
    preferenceName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 4,
    },
    preferenceDescription: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 14,
    },
  });

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: theme.colors.primary, fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.avatarContainer}>
            {selectedAvatar ? (
              <Image
                source={{ uri: selectedAvatar }}
                style={styles.avatarImage}
              />
            ) : user?.avatar ? (
              <Image
                source={{ uri: convertAvatarUrl(user.avatar) || '' }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '20' }]}>
                <Text style={styles.avatarText}>
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              if (showAvatarGrid) {
                setShowAvatarGrid(false);
              } else {
                generateAvatarOptions();
              }
            }}
            disabled={isGeneratingAvatars}
          >
            {isGeneratingAvatars ? (
              <ActivityIndicator color={theme.colors.textInverse} />
            ) : (
              <Text style={styles.buttonText}>
                {showAvatarGrid ? '✕ Close' : '✨ Generate Avatars'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {showAvatarGrid && (
          <View style={[styles.section, { marginTop: 8 }]}>
            <Text style={styles.sectionTitle}>Select Avatar</Text>
            <View style={styles.avatarGrid}>
              {avatarOptions.length === 0 ? (
                <Text style={styles.loadingText}>Generating avatars...</Text>
              ) : (
                <FlatList
                  data={avatarOptions}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.avatarItem,
                        selectedAvatar === item.url && styles.avatarItemSelected,
                      ]}
                      onPress={() => handleAvatarSelect(item)}
                      disabled={avatarLoading}
                    >
                      <Image source={{ uri: item.url }} style={styles.avatarItemImage} />
                      {selectedAvatar === item.url && (
                        <View style={styles.selectedBadge}>
                          <Text style={styles.selectedBadgeText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item) => item.id}
                  numColumns={3}
                  scrollEnabled={false}
                  columnWrapperStyle={styles.columnWrapper}
                />
              )}
            </View>
            <TouchableOpacity
              style={styles.button}
              onPress={generateAvatarOptions}
              disabled={isGeneratingAvatars || avatarLoading}
            >
              {isGeneratingAvatars ? (
                <ActivityIndicator color={theme.colors.textInverse} />
              ) : (
                <Text style={styles.buttonText}>🔄 Generate New</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Username</Text>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter new username"
              value={username}
              onChangeText={setUsername}
              editable={!usernameLoading}
            />
            <Text style={styles.charCount}>3-30 characters, letters, numbers, _, -</Text>
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={handleChangeUsername}
            disabled={usernameLoading}
          >
            {usernameLoading ? (
              <ActivityIndicator color={theme.colors.textInverse} />
            ) : (
              <Text style={styles.buttonText}>Update Username</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bio</Text>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell us about yourself..."
              value={bio}
              onChangeText={setBio}
              maxLength={500}
              multiline
              editable={!bioLoading}
            />
            <Text style={styles.charCount}>{bio.length}/500</Text>
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={handleUpdateBio}
            disabled={bioLoading}
          >
            {bioLoading ? (
              <ActivityIndicator color={theme.colors.textInverse} />
            ) : (
              <Text style={styles.buttonText}>Update Bio</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email</Text>
          <View style={styles.formGroup}>
            <Text style={styles.label}>{user?.email}</Text>
            <Text style={styles.charCount}>Email cannot be changed for security reasons</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setShowPasswordSection(!showPasswordSection)}
          disabled={passwordLoading}
        >
          <Text style={styles.secondaryButtonText}>
            {showPasswordSection ? 'Hide' : 'Change'} Password
          </Text>
        </TouchableOpacity>

        {showPasswordSection && (
          <View style={[styles.section, { marginTop: 16 }]}>
            <Text style={styles.sectionTitle}>Change Password</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Current Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter current password"
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
                editable={!passwordLoading}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter new password (min 6 characters)"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                editable={!passwordLoading}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!passwordLoading}
              />
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleChangePassword}
              disabled={passwordLoading}
            >
              {passwordLoading ? (
                <ActivityIndicator color={theme.colors.textInverse} />
              ) : (
                <Text style={styles.buttonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setShowPreferencesSection(!showPreferencesSection)}
          disabled={preferencesLoading}
        >
          <Text style={styles.secondaryButtonText}>
            {showPreferencesSection ? 'Hide' : 'Edit'} Preferences ({selectedPreferences.length})
          </Text>
        </TouchableOpacity>

        {showPreferencesSection && (
          <View style={[styles.section, { marginTop: 16 }]}>
            <Text style={styles.sectionTitle}>Select Your Interests</Text>
            <Text style={styles.label}>Choose categories that interest you</Text>
            <View style={styles.preferenceGrid}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.preferenceItem,
                    selectedPreferences.includes(category.id) && styles.preferenceItemSelected,
                  ]}
                  onPress={() => togglePreference(category.id)}
                  disabled={preferencesLoading}
                >
                  <Text style={styles.preferenceIcon}>{category.icon}</Text>
                  <Text style={styles.preferenceName}>{category.name}</Text>
                  <Text style={styles.preferenceDescription}>{category.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.button}
              onPress={handleUpdatePreferences}
              disabled={preferencesLoading || selectedPreferences.length === 0}
            >
              {preferencesLoading ? (
                <ActivityIndicator color={theme.colors.textInverse} />
              ) : (
                <Text style={styles.buttonText}>Update Preferences</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default EditProfileScreen;
